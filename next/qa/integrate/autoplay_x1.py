"""The completionist route of qa/autoplay.py (X1-integrate, docs/EXPANSION1_PLAN.md 7.2 and 15): Episode 1 with every optional piece of
"The Wider Valley" played in the order the plan intends, from a fresh game to the Episode 1 credits and on to the late quests.

    python next/qa/autoplay.py --route complete [--device phone]

The regular route (the unchanged bot) walks the main path only. This route subclasses the same Episode plan and keeps its main-path
phases (town, valley, Archive F1 to F3, the Archivore, the credits) exactly as they are; between them it plays the expansion:

    after the valley's first fight   the Downs and Thornfold (Strays, the Stones, Patch, the fold crack, the well), the High Moor, the Wethers'
                                     Barrow and the Reeve (slabs, Shove, Dash, the plate), Larchhill, the Terrace
    after Archive F1                 the Millrace, the Culvert (plates, Shove, Dash, the pin) and the Millstone Golem
    after the Lantern                the Lantern chests and marks (the valley's two star marks, the moor's tower and islet), the Orrery, the
                                     Cellar's ink route and chart, the Archive alcoves
    after the credits                Pell's Crates, Four Rolls for the Miller (the pin at the wheel), Things Not To Forget

It travels by the door graph of the live maps (`travel`), so any slice can be run alone from a save made by qa/integrate/x1_mksave.mjs:

    node qa/integrate/x1_mksave.mjs --out qa/out/autoplay/s.json --map willowmere --pos 20,28,down --level 4 --flags main:left_town,first_fight_done
    python qa/autoplay.py --route complete --resume qa/out/autoplay/s.json --phases west_downs,west_barrow

Every module checks its flags first, so a phase that is already done is a no-op. A module that cannot finish raises Fail with the map and the
step; the one deliberate exception is `try_` (an optional secret is recorded in the report's notes instead of failing the run).
"""
import collections
import json
import time


def build(ap):
    """Return the route class. `ap` is the qa/autoplay module (it is __main__ when run as a script, so it is passed in, not imported)."""
    Episode, Fail, DIRS, OPP = ap.Episode, ap.Fail, ap.DIRS, ap.OPP
    WALK = ap.WALK

    class X1Route(Episode):
        def __init__(self, bot, side=True, until=None, hollow=False, phases=None, resumed=False):
            super().__init__(bot, side=side, until=until, hollow=hollow)
            self.only = phases              # None = the whole route; else the list of phase names to run (after the resume loads)
            self.resumed = resumed
            self.notes_x1 = []

        # ------------------------------------------------------------------ small things
        def note(self, text):
            self.b.notes.append(text)
            print('  ' + text, flush=True)

        def try_(self, label, fn, *a, **kw):
            """An optional secret: a failure is a note (and the first time a screenshot), never the end of the run."""
            try:
                return fn(*a, **kw)
            except ap.Softlock:
                raise
            except Fail as e:
                self.note(f'OPTIONAL {label} skipped: {e}')
                return None

        def lv(self):
            return ((self.b.game() or {}).get('party') or [{}])[0].get('level') or 1

        def wait_pack(self, timeout=40):
            """The x1 pack must be ready before a touched map is entered again (the map is re-imported then)."""
            b = self.b
            t0 = time.time()
            while time.time() - t0 < timeout:
                if b.js("!!(window.LQ_PACKS && LQ_PACKS.packReady('x1'))"):
                    return True
                b.frames(20)
            raise Fail('the x1 pack did not become ready (is X1_LIVE served on? python qa/autoplay.py --route complete sets it)')

        def mark(self, map_id, name):
            m = self.b.grid(map_id)['marks'].get(name)
            if not m:
                raise Fail(f'no mark {name} on {map_id}')
            return tuple(m)

        def ev_ok(self, e, flags):
            def lst(v):
                return [] if v is None else v if isinstance(v, list) else [v]
            return all(flags.get(f) for f in lst(e.get('if'))) and not any(flags.get(f) for f in lst(e.get('ifNot')))

        # ------------------------------------------------------------------ travel by the door graph
        # doors the plan never takes (the valley's cleft stair needs the ink bridge; the Terrace's way down is the edge drop) and the one pit it does
        BAD_DOORS = {('x1_terrace', 'stair_down'), ('valley', 'x1_terrace_stair')}
        PIT_EDGES = {('x1_terrace', 'edge_drop')}

        def edges(self, map_id):
            b = self.b
            flags = b.flags()
            g = b.grid(map_id)
            out = []
            for e in g['events']:
                if (map_id, e['id']) in self.BAD_DOORS:
                    continue
                if e.get('to') and e['type'] in ('door', 'locked_door') and self.ev_ok(e, flags):
                    out.append((e['to'][0], 'door', e['id']))
                elif e.get('to') and e['type'] == 'pit' and e['to'][0] != map_id and (map_id, e['id']) in self.PIT_EDGES and self.ev_ok(e, flags):
                    out.append((e['to'][0], 'pit', e))
            for ex in g['exits']:
                out.append((ex['to'][0], 'exit', ex))
            return out

        def path_to(self, src, dst, avoid=()):
            if src == dst:
                return []
            prev = {src: None}
            q = collections.deque([src])
            while q:
                m = q.popleft()
                for to, kind, how in self.edges(m):
                    if to in prev or to in avoid:
                        continue
                    prev[to] = (m, kind, how)
                    if to == dst:
                        hops = []
                        cur = to
                        while prev[cur]:
                            p, k, h = prev[cur]
                            hops.append((p, cur, k, h))
                            cur = p
                        return hops[::-1]
                    q.append(to)
            return None

        def exit_cell(self, f, ex):
            """A cell of an exit rectangle the party can walk to (nearest first)."""
            b = self.b
            L = (f['leader']['x'], f['leader']['y'])
            cells = sorted(((ex['x'] + i, ex['y'] + j) for j in range(ex.get('h', 1)) for i in range(ex.get('w', 1))), key=lambda c: abs(c[0] - L[0]) + abs(c[1] - L[1]))
            for c in cells:
                passable, _ = b.model(f, goal=c)
                if b.bfs(L, [c], passable) is not None:
                    return c
            return cells[0]

        def leave_pocket(self, f, hop=None):
            """Two dungeons hold a room behind a same-map door (the Barrow's Counting Room and hearth, the Culvert's pump room and Golem's chamber):
            step back through it before planning a way to another map."""
            b = self.b
            L = f['leader']
            if f['map'] == 'x1_barrow' and L['y'] <= 8 and b.ent(f, 'notch_e'):
                b.through('notch_e', label='back down the Barrow stair')
            elif f['map'] == 'x1_culvert' and L['y'] <= 12 and b.ent(f, 'notch_pump'):
                b.through('notch_pump', label='back down through the drain gate')
            elif f['map'] == 'archive_f1' and self.has('archive_f1_done') and hop:
                # F1 is two halves joined by the Keepers' back-stair (the plates and gates re-close on a reload)
                if hop == 'stairs_f2' and L['y'] >= 21 and b.ent(f, 'shortcut_j'):
                    b.through('shortcut_j', label='the back-stair up')
                elif hop == 'exit_valley' and L['y'] <= 12 and b.ent(f, 'shortcut_b'):
                    b.through('shortcut_b', label='the back-stair down')
            return b.settle()

        def reload_here(self, map_id, avoid=()):
            """Step to a neighbouring map and back: a touched map cached before the x1 pack was ready is re-imported on its next load."""
            b = self.b
            self.wait_pack()
            for to, kind, how in self.edges(map_id):
                if to == map_id or to in avoid or to.startswith('x1_'):
                    continue
                self.note(f'reloading {map_id} through {to} (stale until the pack was ready)')
                if kind == 'door':
                    b.through(how, label='reload')
                else:
                    b.exit_to(self.exit_cell(b.settle(), how), label='reload')
                b.settle()
                back = self.path_to(to, map_id)
                if not back:
                    raise Fail(f'no way back from {to} to {map_id}')
                p, t, k, h = back[0]
                if k == 'door':
                    b.through(h, label='reload back')
                else:
                    b.exit_to(self.exit_cell(b.settle(), h), label='reload back')
                return b.settle()
            raise Fail(f'cannot reload {map_id}')

        def travel(self, dst, avoid=()):
            """Walk, door by door, to a map. Fights on the way are the field's: the party walks round what it can see."""
            b = self.b
            for _ in range(8):
                f = b.settle()
                if f['map'] == dst:
                    return f
                f = self.leave_pocket(f)
                hops = self.path_to(f['map'], dst, avoid)
                if not hops:
                    raise Fail(f'no door route from {f["map"]} to {dst} with these flags')
                src, to, kind, how = hops[0]
                if kind == 'door':
                    f = self.leave_pocket(f, how)
                if kind == 'door':
                    if not b.ent(f, how):
                        # the live map is the stale one (loaded before the x1 pack was ready): leave and come back so it is re-imported
                        self.reload_here(f['map'], avoid=(to,))
                        continue
                    b.through(how, label=f'travel {src} to {to}')
                elif kind == 'pit':
                    cell = (how['x'], how['y'])
                    b.walk_to([cell], allow_pits=True, label=f'travel {src} to {to} (the drop)')
                else:
                    c = self.exit_cell(f, how)
                    b.exit_to(c, label=f'travel {src} to {to}')
            raise Fail(f'travel to {dst} did not converge (on {b.settle()["map"]})')

        # ------------------------------------------------------------------ upkeep
        def potions(self):
            it = self.b.items()
            return it.get('potion', 0) + it.get('hi_potion', 0)

        def hurt(self, frac):
            return [v for v in self.b.party_vitals() if v['hp'] < v['maxHp'] * frac]

        def rest_up(self, frac=0.55, label=''):
            """Mend before the next fight: a font on this map, else potions, else the Willowmere inn."""
            b = self.b
            low = self.hurt(frac)
            if not low:
                return False
            f = b.settle()
            fonts = [e['id'] for e in f['ents'] if e['type'] == 'font']
            if fonts:
                b.rest_at_font(fonts[0], label=f'rest {fonts[0]}')
                self.note(f'rested at {fonts[0]} ({label})')
                return True
            for _ in range(len(low)):
                item = 'potion' if b.items().get('potion', 0) else 'hi_potion' if b.items().get('hi_potion', 0) else None
                if not item:
                    break
                vit = b.party_vitals()
                i = min(range(len(vit)), key=lambda k: vit[k]['hp'] / max(1, vit[k]['maxHp']))
                if vit[i]['hp'] >= vit[i]['maxHp'] * frac:
                    break
                if not b.menu_use_item(item, i):
                    break
            if not self.hurt(frac):
                return True
            self.go_inn()
            return True

        def go_inn(self):
            b = self.b
            self.travel('willowmere')
            b.through('door_inn')
            self.ensure_map('inn')
            b.rest_at_inn()
            b.through('inn_exit')
            self.note('rested at the Willowmere inn')

        def need_level(self, want, label=''):
            """A caution, not a farm: say so when the party is under the level the plan names (the fight is still taken)."""
            if self.lv() < want:
                self.note(f'Lv {self.lv()} at {label}, the plan says Lv {want}')

        def select_ability(self, name):
            b = self.b
            for _ in range(6):
                cur = b.js("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return f && f.abilities ? f.abilities.selected() : null; })()")
                if cur == name:
                    return True
                b.tap('pageL', 3)
                b.frames(6)
            raise Fail(f'could not select the {name} ability')

        def appraise(self, ent_id, label=''):
            """Mira's Appraise on an object (docs/WORLD.md): stand beside it, select Appraise, face it, use."""
            b = self.b
            f = b.settle()
            e = b.ent(f, ent_id)
            if not e:
                raise Fail(f'no object {ent_id} on {f["map"]}')
            r = b.reachable_spot(f, [tuple(c) for c in e['cells']])
            if not r:
                raise Fail(f'no spot beside {ent_id}')
            _, spot, d = r
            b.walk_to([spot], label=f'appraise {ent_id}')
            self.select_ability('appraise')
            b.face(d)
            b.tap('pageR', 2)
            for _ in range(40):                     # the lens beam, then the object's lines in the dialogue window (settle presses on)
                b.frames(8)
                b.settle()
                if not b.js("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return !!(f && f.abilities && f.abilities.busy); })()"):
                    break
            self.select_ability('dash')

        def talk_to(self, npc, prefer=None, label=''):
            if not self.talk(npc, prefer=prefer):
                raise Fail(f'{npc} is not on {self.b.settle()["map"]} ({label})')

        def talk_until(self, npc, flag, tries=3):
            """Talk until `flag` is set: an NPC's first meeting scene takes the first talk (an old save has not met them yet)."""
            for _ in range(tries):
                if self.has(flag):
                    return
                self.talk_to(npc)
            if not self.has(flag):
                raise Fail(f'{flag} was not set after talking to {npc} {tries} times')

        def fight_guard(self, label, attempts=4, flag=None, walk=None):
            """Run `walk()` (it ends with a boss fight); after a loss the party is back at its save point: mend and go again."""
            b = self.b
            for attempt in range(attempts):
                walk()
                b.settle(max_s=900)
                if flag is None or self.has(flag):
                    return
                self.note(f'{label}: attempt {attempt + 1} lost; mending')
                self.rest_up(0.9, label)
            raise Fail(f'{label} did not resolve in {attempts} attempts')

        # ================================================================================================ West: the Downs
        def to_downs(self):
            b = self.b
            self.wait_pack()
            f = b.settle()
            if f['map'] != 'x1_downs':
                self.travel('x1_downs')
            b.settle()

        def west_downs(self):
            """Thornfold's strays, Patch, the well, the fold crack, Tamsin's shop, the Stones' first sight, and the groups that stand between them."""
            b = self.b
            if self.has('strays_done') and self.has('rollcall_started'):
                return
            self.to_downs()
            self.need_level(3, 'the Downs')
            if not self.has('strays_started'):
                self.talk_to('brindle')                                           # downs_arrival and thornfold_arrival ran on the way in
            self.chest('chest_well')
            # the Ridge: Patch and his pockets (Appraise), the third stray
            if not b.opened('x1_downs', 'chest_ridge'):
                b.walk_to([self.mark('x1_downs', 'ridge')], fight=True, label='the Ridge')
                self.appraise('x1_old_scarecrow')
                self.chest('chest_ridge')
            if self.has('strays_started') and not self.has('stray_3_found'):
                self.talk_to('stray_3')
            # the Old Fold: the first stray, the cracked knoll (Dash): the iron chest and the fifth stray
            b.hunt(limit=3, label='the Old Fold')
            if self.has('strays_started') and not self.has('stray_1_found'):
                self.talk_to('stray_1')
            if not b.opened('x1_downs', 'chest_fold'):
                b.dash_break('x1_crack_fold', label='the fold crack')
                self.chest('chest_fold')
            if self.has('strays_started') and not self.has('stray_5_found'):
                self.talk_to('stray_5')
            # the ring of stones: stones_arrival, the second stray
            b.walk_to([self.mark('x1_downs', 'ring_s')], fight=True, label='the ring')
            b.settle()
            b.hunt(limit=3, label='the Stones')
            if self.has('strays_started') and not self.has('stray_2_found'):
                self.talk_to('stray_2')
            if self.has('stones_seen') and not self.has('rollcall_started'):
                self.travel_brindle()
                self.talk_to('brindle')
            self.rest_up(0.5, 'the Downs')

        def travel_brindle(self):
            b = self.b
            b.walk_to([self.mark('x1_downs', 'brindle')], fight=True, label='to Brindle')

        def west_thornfold(self):
            """Tamsin's loom house and its hearth; the ford meadow's chase pack; a stop at the Thornfold well sign."""
            b = self.b
            if self.has('x1_thornfold_visited_by_bot'):
                return
            self.to_downs()
            b.hunt(limit=4, label='the ford meadow')
            b.through('door_loom')
            self.ensure_map('x1_loomhouse')
            self.talk_to('tamsin')
            b.interact(ent_id='x1_sampler', label='the sampler') if b.ent(b.settle(), 'x1_sampler') else None
            b.through('loom_exit')
            self.ensure_map('x1_downs')

        def west_strays_home(self):
            """The fourth stray (the valley pasture), then Brindle with all five."""
            b = self.b
            if not self.has('strays_started') or self.has('strays_done'):
                return
            if not self.has('stray_4_found'):
                self.travel('valley')
                self.talk_to('stray_4')
            if self.has('stray_1_found') and self.has('stray_2_found') and self.has('stray_3_found') and self.has('stray_4_found') and self.has('stray_5_found'):
                self.travel('x1_downs')
                b.walk_to([self.mark('x1_downs', 'brindle')], fight=True, label='to Brindle')
                self.talk_to('brindle')
                if not self.has('strays_done'):
                    raise Fail('strays_done did not run')
                self.note(f'Strays of Thornfold done at Lv {self.lv()}')

        # ================================================================================================ West: the Stones and the Barrow
        def west_papers(self):
            """The roll (Iris) and the copy (Quill): the two papers the Stones need."""
            if not self.has('rollcall_started') or (self.has('roll_found') and self.has('copy_found')) or self.has('stones_lettered'):
                return
            if not self.has('roll_found'):
                self.travel('library')
                self.talk_to('iris')
            if not self.has('copy_found'):
                self.travel('valley')
                self.talk_to('quill')
            if not (self.has('roll_found') and self.has('copy_found')):
                raise Fail('the roll and the copy are not both in hand')

        def west_stones(self):
            """Say the twelve names at the cairn (rollcall_stones): the letters come back."""
            b = self.b
            if self.has('stones_lettered') or not (self.has('roll_found') and self.has('copy_found')):
                return
            self.travel('x1_downs')
            b.interact(ent_id='stones_center_obj', label='the cairn')
            if not self.has('stones_lettered'):
                raise Fail('rollcall_stones did not set stones_lettered')
            self.note('the stones are lettered')

        def west_barrow(self):
            """The Wethers' Barrow: both slabs (switch), Dash and Shove chests, the plate, the hearth, the Reeve."""
            b = self.b
            if self.has('barrow_reeve_defeated'):
                return
            self.need_level(5, 'the Barrow')
            self.travel('x1_barrow')
            b.settle()
            self.chest('chest_bw_landing')
            # the Ossuary first (the switch starts off: the Ossuary is open): its guard, the Dash crack, the phoenix feather
            b.hunt(limit=3, label='the Long Hall')
            f = b.settle()
            sw = b.ent(f, 'sw_slab')
            if sw and sw['state'] == 'on':
                b.interact(ent_id='sw_slab', label='slab switch off')
            b.walk_to([(20, 16)], fight=True, label='the Ossuary')
            b.hunt(limit=3, label='the Ossuary')
            if not b.opened('x1_barrow', 'chest_bw_oss'):
                b.dash_break('x1_crack_oss', label='the Ossuary crack')
                self.chest('chest_bw_oss')
            # the Ewe Chamber: throw the switch, shove the niche block aside, the bow
            b.walk_to([(15, 12)], fight=True, label='to the switch')
            f = b.settle()
            sw = b.ent(f, 'sw_slab')
            if sw and sw['state'] != 'on':
                b.interact(ent_id='sw_slab', label='slab switch on')
            if not b.opened('x1_barrow', 'chest_bw_bow'):
                b.walk_to([(13, 16)], fight=True, label='the Ewe Chamber')
                b.shove_to('block_niche', (11, 16), label='the niche block')
                self.chest('chest_bw_bow')
            b.maintain('the Barrow hall')
            # the stair, the Counting Room: the block onto the plate opens the gate to the hearth
            b.through('stairs_e')
            b.push_block('block_c', (25, 6), label='the Counting Room plate')
            self.rest_up(0.7, 'before the Reeve')
            b.rest_at_font('barrow_hearth', label='the Barrow hearth')
            self.need_level(5, 'the Reeve')

            def go():
                b.walk_to([(12, 4)], label='the Reeve row')
                b.settle(max_s=900)
                if not self.has('barrow_reeve_defeated'):
                    b.walk_to([(11, 4)], label='the Reeve trigger')
            self.fight_guard('the Barrow Reeve', attempts=3, flag='barrow_reeve_defeated', walk=go)
            self.note(f'the Barrow Reeve down at Lv {self.lv()}')
            self.chest('chest_bw_reeve')
            if self.b.items().get('lantern_of_recall'):
                self.try_('barrow names', b.interact, ent_id='barrow_names', label='the names')
            f = b.settle()
            if f['map'] == 'x1_barrow' and f['leader']['y'] <= 8:
                b.through('notch_e')
            b.maintain('after the Reeve')

        def west_rollcall_done(self):
            b = self.b
            if self.has('rollcall_done') or not self.has('reeve_named'):
                return
            self.travel('x1_downs')
            b.walk_to([self.mark('x1_downs', 'brindle')], fight=True, label='to Brindle')
            self.talk_to('brindle')
            if not self.has('rollcall_done'):
                raise Fail('rollcall_done did not run')
            self.note(f'The Thirteenth Stone done at Lv {self.lv()}')

        # ================================================================================================ the High Moor
        def wild_moor(self):
            """Route A (the Chime Road with its cairn chest and the tower yard), the view chest (route B's spur), the gorse chest (Dash),
            Odo, and the stile (Dash) into the Terrace's west end."""
            b = self.b
            self.need_level(4, 'the High Moor')
            self.travel('x1_highmoor')
            b.settle()
            self.sign('moor_sign')
            b.hunt(limit=4, label='the moor road')
            b.walk_to([(23, 30)], fight=True, label='the bench')                  # route A starts west under the tarn
            b.hunt(limit=4, label='the moor west leg')
            self.chest('chest_moor_cairn')
            b.walk_to([self.mark('x1_highmoor', 'odo')], fight=True, label='the tower yard')   # the north shore, the tower mass, the yard
            b.hunt(limit=3, label='the tower yard')
            if not self.has('odo_met'):
                self.talk_to('odo')
            self.sign('x1_watchtower')
            # the Stile Road east to the gorse tunnel (Dash through the roots), from the yard end
            b.walk_to([(51, 18)], fight=True, label='the gorse tunnel')
            if not b.opened('x1_highmoor', 'chest_moor_gorse'):
                b.dash_break('x1_roots_gorse', label='the gorse roots')
                self.chest('chest_moor_gorse')
            # route B's view knoll (the scarab patrol guards the chest)
            if not b.opened('x1_highmoor', 'chest_moor_view'):
                b.walk_to([(50, 22)], fight=True, label='the view knoll')
                b.hunt(limit=3, label='the view knoll')
                self.chest('chest_moor_view')
            self.rest_up(0.5, 'the moor')

        def wild_moor_stile(self):
            """Dash through the stile's roots and out to the Terrace's west end."""
            b = self.b
            self.travel('x1_highmoor')
            if not b.opened('x1_highmoor', 'x1_roots_stile'):
                b.walk_to([(68, 13)], fight=True, label='the stile')
                b.dash_break('x1_roots_stile', label='the stile roots')
            b.exit_to(self.exit_cell(b.settle(), {'x': 71, 'y': 13, 'w': 1, 'h': 2}), label='out by the stile')
            self.ensure_map('x1_terrace')

        # ================================================================================================ the Terrace and the Orrery
        def north_terrace(self):
            b = self.b
            f = b.settle()
            if f['map'] != 'x1_terrace':
                self.travel('x1_terrace')
            self.need_level(6, 'the Terrace')
            b.settle()
            b.hunt(limit=3, label='the Beacon')
            self.chest('chest_beacon')
            if not b.opened('x1_terrace', 'chest_terrace'):
                b.walk_to([(47, 10)], fight=True, label='the Long Walk')
                b.dash_break('x1_roots_terrace', label='the Long Walk roots')
                self.chest('chest_terrace')
            b.walk_to([self.mark('x1_terrace', 'court')], fight=True, label='the Orrery Court')
            b.hunt(limit=3, label='the Orrery Court')
            b.through('orrery_door')
            self.ensure_map('x1_orrery')
            b.settle()                                    # hesper_meet
            if not self.has('stars_started'):
                raise Fail('hesper_meet did not set stars_started')
            if not b.opened('x1_orrery', 'chest_orrery'):
                self.appraise('x1_star_plate')
                self.chest('chest_orrery')
            b.interact(ent_id='keeper_star_ledger', label='the star ledger')
            b.through('orrery_exit')
            self.ensure_map('x1_terrace')

        # ================================================================================================ Larchhill
        def wild_larch(self):
            """Larchhill by route C (the aqueduct: the barrel Shove, the press Dash, the gold chest), the hive chest on route A's spur,
            Yarrow, the windmill ladder; then out by the hay chute (once Yarrow has opened it) to the Millrace jetty."""
            b = self.b
            self.need_level(5, 'Larchhill')
            self.travel('x1_larchhill')
            b.settle()
            self.sign('hill_sign')
            b.hunt(limit=3, label='the top terrace')
            if not b.opened('x1_larchhill', 'chest_lh_hive'):
                b.walk_to([self.mark('x1_larchhill', 'hive_stand')], fight=True, label='the hive stand')       # route A's dead-end spur
                self.chest('chest_lh_hive')
            b.hunt(limit=4, label='the switchback lane')
            # route C: the stair foot, the barrel (Shove it north), the deck, the press crack (Dash), the gold chest
            b.walk_to([(34, 18)], fight=True, label='the aqueduct stair')
            if not b.opened('x1_larchhill', 'chest_lh_aqueduct'):
                b.shove_to('x1_cider_barrel', (34, 15), label='the cider barrel')
            b.walk_to([(45, 14)], fight=True, label='the deck under the press')
            if not b.opened('x1_larchhill', 'chest_lh_press'):
                b.dash_break('x1_crack_press', label='the press wall')
                self.chest('chest_lh_press')
            self.chest('chest_lh_aqueduct')
            # the east end drops to the east lane (a one way ledge); then the Terrace Stairs' guard on route B
            b.walk_to([self.mark('x1_larchhill', 'east_gate')], fight=True, label='the east lane')
            b.hunt(limit=3, label='the east lane')
            b.hunt(limit=2, label='the apiary')
            if not self.has('yarrow_met'):
                self.talk_to('yarrow')
            b.interact(ent_id='x1_mill_ladder', label='the windmill ladder')
            self.rest_up(0.5, 'Larchhill')

        # ================================================================================================ South: the Millrace and the Culvert
        def south_millrace(self):
            """Ferrick, the orchard chest, the east bank (Dash), the yard millstone (Shove) and its two chests, the weevils and the wolves."""
            b = self.b
            self.need_level(5, 'the Millrace')
            self.travel('x1_millrace')
            b.settle()
            self.sign('millrace_sign')
            b.hunt(limit=3, label='the millrace road')
            if not self.has('ferrick_met'):
                self.talk_to('ferrick')
            self.chest('chest_mr_orchard')
            if not b.opened('x1_millrace', 'chest_mr_stone'):
                b.walk_to([(29, 15)], fight=True, label='the millstone yard')
                b.shove_to('block_stone', (30, 15), label='the millstone')
                b.walk_to([(31, 17)], fight=True, label='the cellar')
                self.chest('chest_mr_stone')
                self.chest('chest_mr_stone_b')
            if not b.opened('x1_millrace', 'chest_mr_bank'):
                b.walk_to([self.mark('x1_millrace', 'bank_crack')], fight=True, label='the east bank')
                b.hunt(limit=3, label='the east bank')
                b.dash_break('x1_crack_bank', label='the bank wall')
                self.chest('chest_mr_bank')
            self.sign('x1_weir_sign')
            self.rest_up(0.5, 'the Millrace')

        def south_culvert(self):
            """The Weir Culvert: both plates (the light block, then Bram's Shove on the heavy one), the Dash crack, the pin, the hearth, the Golem."""
            b = self.b
            if self.has('millstone_golem_defeated') and self.has('pin_found'):
                return
            self.need_level(6, 'the Culvert')
            self.travel('x1_culvert')
            b.settle()
            b.hunt(limit=3, label='the Drain Hall')
            b.push_block('block_b1', (21, 15), label='drain plate 1')
            b.hunt(limit=3, label='the Drain Hall')
            b.shove_to('block_b2', (22, 17), label='drain plate 2')
            if not b.opened('x1_culvert', 'chest_cv_drain'):
                b.walk_to([(17, 14)], fight=True, label='the drain crack')
                b.dash_break('x1_crack_drain', label='the drain wall')
                self.chest('chest_cv_drain')
            b.walk_to([(11, 14)], fight=True, label='the drain gate')
            b.through('gate_drain')
            b.hunt(limit=3, label='the Pump Room')
            self.chest('chest_cv_pin')
            if not self.has('pin_found'):
                raise Fail('the pin chest did not set pin_found')
            b.walk_to([self.mark('x1_culvert', 'hearth')], fight=True, label='the hearth')
            b.rest_at_font('culvert_font', label='the Culvert hearth')
            b.maintain('before the Golem')
            self.need_level(6, 'the Golem')

            def go():
                b.walk_to([(18, 7)], label='the Golem column')
            self.fight_guard('the Millstone Golem', attempts=3, flag='millstone_golem_defeated', walk=go)
            self.note(f'the Millstone Golem down at Lv {self.lv()}')
            self.chest('chest_cv_golem')
            b.maintain('after the Golem')
            b.through('notch_pump')                     # the notch back down to the Drain Hall

        # ================================================================================================ North: the Lantern's work
        def lantern_up(self):
            """Raise the Lantern here once (pageR) so a Lantern mark or a book reads."""
            self.b.raise_lantern()

        def ink_walk(self, cells, label=''):
            """Walk faint-ink cells in order, raising the Lantern whenever the next one is not lit yet (revealed cells stay revealed)."""
            b = self.b
            for c in cells:
                b.settle()
                lit = b.page.evaluate("(c) => !LQ_ENGINE.scene.map.idsAt(c[0], c[1]).some(id => /_faint$/.test(id))", list(c))
                if not lit:
                    b.raise_lantern()
                b.walk_to([tuple(c)], label=f'ink {label} {c}')

        def north_marks_valley(self):
            """The milestone's back and the Archive door's carving: two of the three dark stars (Lantern marks)."""
            b = self.b
            if not self.has('stars_started') or not self.b.items().get('lantern_of_recall'):
                return
            self.travel('valley')
            for ent_id, flag, cell in (('x1_star_mark_milestone', 'star_1_read', (38, 20)), ('x1_star_mark_door', 'star_2_read', (38, 6))):
                if self.has(flag):
                    continue
                b.interact(ent_id=ent_id, label=ent_id)
                if not self.has(flag):
                    raise Fail(f'{ent_id} did not set {flag}')

        def north_mark_tower(self):
            """The Watchtower's base: the third star, and the islet's gold chest across the ink (Lantern)."""
            b = self.b
            if not self.b.items().get('lantern_of_recall'):
                return
            self.travel('x1_highmoor')
            b.settle()
            if self.has('stars_started') and not self.has('star_3_read'):
                b.walk_to([(48, 13)], fight=True, label='the tower mark')
                b.interact(ent_id='x1_star_mark_tower', label='the tower mark')
                if not self.has('star_3_read'):
                    raise Fail('star_read_3 did not set star_3_read')
            if not b.opened('x1_highmoor', 'chest_moor_islet'):
                b.walk_to([(28, 27)], fight=True, label='the south shore')
                self.ink_walk([(28, y) for y in range(26, 17, -1)], label='the islet')
                self.chest('chest_moor_islet')
                self.note(f'the moor islet chest (chime_staff) open at Lv {self.lv()}')

        def north_align(self):
            """Hesper: all three stars read, the Orrery aligns and the hatch opens."""
            b = self.b
            if self.has('orrery_aligned') or not all(self.has(f) for f in ('star_1_read', 'star_2_read', 'star_3_read')):
                return
            self.travel('x1_orrery')
            b.settle()
            self.talk_to('hesper')
            if not self.has('orrery_aligned'):
                raise Fail('orrery_align did not set orrery_aligned')

        CELLAR_MAIN = [(12, 8), (12, 7), (12, 6), (12, 5), (12, 4), (12, 3), (13, 3), (14, 3), (14, 4), (14, 5), (14, 6), (14, 7), (15, 7), (16, 7), (16, 6),
                       (16, 5), (16, 4), (16, 3), (17, 3), (18, 3), (18, 4), (18, 5), (18, 6), (18, 7), (19, 7), (20, 7), (21, 7)]
        CELLAR_FORK = [(11, 6), (10, 6), (9, 6), (8, 6), (7, 6), (6, 6)]

        def north_cellar(self):
            """The Keepers' Cellar: the Well Hall's wraiths, the Dash vault, the ink route to the dais (the chart and the note), the nook fork."""
            b = self.b
            if self.has('stars_done') and b.opened('x1_cellar', 'chest_cl_vault') and b.opened('x1_cellar', 'chest_cl_nook'):
                return
            if not self.has('orrery_aligned'):
                return
            self.need_level(6, 'the Cellar')
            self.travel('x1_cellar')
            b.settle()
            b.hunt(limit=3, label='the Well Hall')
            if not b.opened('x1_cellar', 'chest_cl_vault'):
                b.walk_to([(18, 15)], fight=True, label='the vault wall')
                b.dash_break('x1_crack_vault', label='the vault crack')
                self.chest('chest_cl_vault')
            self.rest_up(0.5, 'the Cellar')
            b.walk_to([self.mark('x1_cellar', 'route_start')], fight=True, label='the constellation floor')
            # the nook fork first (it leaves the main route at (12, 6))
            if not b.opened('x1_cellar', 'chest_cl_nook'):
                self.ink_walk(self.CELLAR_MAIN[:3] + self.CELLAR_FORK, label='the nook')
                self.chest('chest_cl_nook')
                self.ink_walk(list(reversed(self.CELLAR_FORK)) + [(12, 6)], label='back from the nook')
            if not self.has('stars_done'):
                self.ink_walk(self.CELLAR_MAIN, label='the dais')
                self.chest('chest_cl_chart')
                b.interact(ent_id='cellar_note', label='the Keeper note')
                if not self.has('stars_done'):
                    raise Fail('cellar_note did not set stars_done')
                self.note(f'The Dark Stars done at Lv {self.lv()}')
            self.try_('the cellar walk out', self.cellar_out)

        def cellar_out(self):
            """The route back is lit; walk it in reverse and take the stair."""
            b = self.b
            b.walk_to([self.mark('x1_cellar', 'route_start')], label='back along the ink')
            b.walk_to([(3, 14)], label='the cellar landing')
            b.through('cellar_exit')

        # ================================================================================================ the Archive's alcoves
        def hub_alcoves(self):
            """The three Archive alcoves behind secrets: F1 (Dash), F2 (the Lantern's bridge), F3 (Shove)."""
            b = self.b
            if self.b.items().get('lantern_of_recall') and not b.opened('archive_f2', 'x1_chest_f2'):
                self.travel('archive_f2')
                self.try_('F2 alcove', self.f2_alcove)
            if self.has('archive_f2_done') and not b.opened('archive_f3', 'x1_chest_f3'):
                self.travel('archive_f3')
                self.try_('F3 niche', self.f3_niche)

        def f1(self):
            """Episode 1's Archive F1 exactly as the regular route plays it, plus the key alcove's roots (Dash) while the party stands in room D."""
            b = self.b
            if self.has('archive_f1_done'):
                return
            self.ensure_map('archive_f1')
            b.settle()
            self.sign('catalog_drawers')
            b.interact(ent_id='catalog_ledger', label='ledger')
            self.chest('chest_b')
            if self.side and not self.has('tess_letter_1_found'):
                b.interact(ent_id='prop_letter', label='letter 1')
            if self.side:
                b.through('hole_e')
                self.chest('chest_f')
                b.through('notch_f')
            if b.items().get('archive_key', 0) == 0 and not b.opened('archive_f1', 'chest_d'):
                b.hunt(limit=3, label='pot room')
                for pot in ('pot_c4', 'pot_c1', 'pot_c2', 'pot_c3', 'pot_c5', 'pot_c6', 'pot_c8'):
                    f = b.settle()
                    e = b.ent(f, pot)
                    if e and e['state'] == 'whole':
                        b.interact(ent_id=pot, label=pot)
                b.push_block('block_c', (4, 11), label='plate C')
                b.through('gate_c')
                self.chest('chest_d')
                self.try_('F1 alcove', self.f1_alcove)
                b.through('notch_d')
            b.walk_to([(31, 26), (32, 26), (30, 26)], label='room H')
            b.hunt(limit=2, label='room H')
            b.push_block('block_h1', (28, 22), label='plate H1')
            b.push_block('block_h2', (35, 22), label='plate H2')
            b.through('gate_h')
            b.hunt(limit=5, label='east wing')
            self.chest('chest_i')
            b.interact(ent_id='keeper_journal_1', label='journal 1')
            b.through('keydoor_i')
            b.walk_to([(31, 4)], label='bell landing')
            b.settle()
            if not self.has('archive_f1_done'):
                raise Fail('archive_f1_bell did not set archive_f1_done')
            b.mark('warden')
            b.maintain('end of F1')
            b.through('stairs_f2')
            self.ensure_map('archive_f2')

        def f1_alcove(self):
            b = self.b
            b.walk_to([(11, 5), (11, 6)], label='the key alcove wall')
            b.dash_break('x1_f1_roots', label='the F1 roots')
            self.chest('x1_chest_f1')

        def f2_alcove(self):
            b = self.b
            b.reveal_near([(10, 7), (11, 7), (12, 7)], label='the Reader bridge')
            b.walk_to([(7, 7)], label='the Reader alcove')
            self.chest('x1_chest_f2')
            b.interact(ent_id='x1_keeper_note_f2', label='the Keeper note')

        def f3_niche(self):
            b = self.b
            b.walk_to([(8, 11)], fight=True, label='the stacks niche')
            b.shove_to('x1_f3_shelf', (10, 11), label='the heavy shelf')
            self.chest('x1_chest_f3')

        # ================================================================================================ the late quests (after the credits)
        def arrivals(self, *flags):
            """The quests open on arrival flags (downs_arrived, millrace_arrived): an old save that never went there walks in once."""
            where = {'downs_arrived': 'x1_downs', 'millrace_arrived': 'x1_millrace', 'moor_arrived': 'x1_highmoor'}
            for fl in flags:
                if not self.has(fl):
                    self.travel(where[fl])
                    self.b.settle()
                    if not self.has(fl):
                        raise Fail(f'{fl} did not set on arrival')

        def late_crates(self):
            """Pell's Crates: Tamsin, Yarrow, Ferrick, then Pell."""
            b = self.b
            if self.has('crates_done') or not self.has('archivore_defeated'):
                return
            self.arrivals('downs_arrived')
            if not self.has('crates_started'):
                self.travel('item_shop')
                self.talk_to('pell')
            for n, npc, mp in ((1, 'tamsin', 'x1_loomhouse'), (2, 'yarrow', 'x1_larchhill'), (3, 'ferrick', 'x1_millrace')):
                if not self.has(f'crate_{n}_done'):
                    self.travel(mp)
                    self.talk_to(npc)
                    if not self.has(f'crate_{n}_done'):
                        self.talk_to(npc)                # the first meeting (yarrow_meet, ferrick_meet) takes the first talk
            self.travel('item_shop')
            self.talk_to('pell')
            if not self.has('crates_done'):
                raise Fail('crates_done did not run')
            self.note(f"Pell's Crates done at Lv {self.lv()}")

        def late_mill(self):
            """Four Rolls for the Miller: Hal asks, the pin goes in at the wheel."""
            b = self.b
            if self.has('mill_done') or not self.has('archivore_defeated'):
                return
            self.arrivals('millrace_arrived')
            if not self.has('mill_started'):
                self.travel('bakery')
                self.talk_to('hal')
                if not self.has('mill_started'):
                    self.talk_to('hal')                      # the reunion (hal_returns) takes the first talk
                if not self.has('mill_started'):
                    raise Fail('mill_start did not run (hal_returned and millrace_arrived needed)')
            if not self.has('pin_found'):
                self.south_culvert()
            self.travel('x1_millrace')
            b.walk_to([self.mark('x1_millrace', 'pin_socket')], fight=True, label='the wheel')
            b.interact(ent_id='x1_mill_wheel', label='the wheel')
            b.settle(max_s=900)
            if not self.has('mill_done'):
                raise Fail('pin_place and mill_done did not run')
            self.note(f'Four Rolls for the Miller done at Lv {self.lv()}')

        def late_list(self):
            """Things Not To Forget: Iris asks; Brindle's rhyme, the mill ledger, Odo's song; Iris again."""
            b = self.b
            if self.has('list_done') or not self.has('archivore_defeated'):
                return
            self.arrivals('downs_arrived')
            if not self.has('list_started'):
                self.travel('library')
                self.talk_to('iris')
                if not self.has('list_started'):
                    raise Fail('list_start did not run')
            if not self.has('list_rhyme'):
                self.travel('x1_downs')
                b.walk_to([self.mark('x1_downs', 'brindle')], fight=True, label='Brindle')
                self.talk_until('brindle', 'list_rhyme')
            if not self.has('list_ledger'):
                self.travel('x1_mill')
                b.interact(ent_id='mill_ledger_obj', label='the mill ledger')
            if not self.has('list_song'):
                self.travel('x1_highmoor')
                b.walk_to([self.mark('x1_highmoor', 'odo')], fight=True, label='Odo')
                self.talk_until('odo', 'list_song')
            self.travel('library')
            self.talk_to('iris')
            if not self.has('list_done'):
                raise Fail('list_done did not run')
            self.note(f'Things Not To Forget done at Lv {self.lv()}')

        # ================================================================================================ the valley, split around the expansion
        def valley_pre(self):
            """Episode 1's valley (the first fight, the shops, the pasture) up to the Archive door: the same steps as the regular route's valley()."""
            b = self.b
            if self.has('archive_entered') or self.has('valley_pre_done_by_bot'):
                return
            f = b.settle()
            if f['map'] == 'willowmere':
                b.exit_to((20, 31), label='to valley')
            self.ensure_map('valley')
            b.settle()
            b.mark('valley')
            if self.side:
                self.chest('chest_hollow')
            self.sign('bridge_plaque')
            b.hunt(limit=4, label='valley road')
            if not self.has('saw_milestone'):
                b.interact(ent_id='milestone', label='milestone')
            self.talk('quill')
            b.visit_shop('penny', [('potion', 2)])
            if self.side and self.has('nella_quest_started') and not self.has('ferry_bell_found'):
                b.interact(ent_id='prop_ferry_bell', label='ferry bell')
            self.sign('ferry_post')
            b.hunt(limit=6, label='valley north')
            b.top_up_mp()
            if not self.has('first_fight_done'):
                raise Fail('the valley hunts did not set first_fight_done')

        def valley_to_archive(self):
            b = self.b
            if self.has('archive_entered') and self.b.settle()['map'].startswith('archive'):
                return
            f = b.settle()
            if f['map'] != 'valley':
                self.travel('valley')
            b.hunt(limit=3, label='valley north')
            b.top_up_mp()
            b.walk_to([(36, 7)], label='door_step')
            b.settle()
            if not self.has('archive_entered'):
                raise Fail('archive_door did not open the Archive')
            b.through('archive_entrance')
            self.ensure_map('archive_f1')
            b.mark('catalog_halls')

        def terrace_drop(self):
            """Down from the Terrace's east end (the one way drop lands beside the Archive door)."""
            b = self.b
            f = b.settle()
            if f['map'] == 'x1_terrace':
                b.walk_to([(55, 10)], fight=True, label='the edge')
                b.walk_to([(56, 10)], allow_pits=True, label='the drop')
            self.ensure_map('valley')

        def back_to_f2(self):
            self.travel('archive_f2')

        def restock(self, potions=8):
            """Potions from Willowmere Goods when the purse allows (the party out-fights its healing on a long optional route)."""
            b = self.b
            have = b.items().get('potion', 0)
            gold = (b.game() or {}).get('gold', 0)
            if have >= potions or gold < 60:
                return
            self.travel('item_shop')
            b.visit_shop('pell', [('potion', min(potions - have, gold // 25))])

        def credits_save_note(self):
            b = self.b
            self.note(f'Episode 1 credits at Lv {self.lv()} with {(b.game() or {}).get("gold")} gold')
            src = ap.OUT / f'{b.device}-ep1-credits-save.json'
            if src.exists():
                self.note(f'credits save: {src.name}')

        # ================================================================================================ the secrets in the old maps
        def hub_secrets(self):
            """The valley's cliff roots (Dash), the sandbar log (Shove), Wick's hole in Willowmere's south wall (Dash)."""
            b = self.b
            self.wait_pack()
            if not b.opened('valley', 'x1_chest_roots'):
                self.travel('valley')
                self.try_('valley roots', self.valley_roots)
            if not b.opened('valley', 'x1_chest_sandbar'):
                self.travel('valley')
                self.try_('valley sandbar', self.valley_sandbar)
            if not b.opened('willowmere', 'x1_chest_wall'):
                self.travel('willowmere')
                self.try_('Wick hole', self.wick_hole)

        def valley_roots(self):
            b = self.b
            b.walk_to([(13, 6)], fight=True, label='the cliff roots')
            b.dash_break('x1_roots_valley', label='the cliff roots')
            self.chest('x1_chest_roots')

        def valley_sandbar(self):
            b = self.b
            b.walk_to([(25, 37)], fight=True, label='the drift log')
            b.shove_to('x1_driftlog', (27, 37), label='the drift log')       # east: (27, 37) is the sand cell the bushes cut off
            self.chest('x1_chest_sandbar')

        def wick_hole(self):
            b = self.b
            b.walk_to([(6, 29)], label="Wick's hole")
            b.dash_break('x1_wall_crack', label="Wick's wall")
            self.chest('x1_chest_wall')

        # ================================================================================================ the plan
        PHASES = ['wake', 'find_mael', 'errands', 'find_mira', 'south_gate', 'outfit', 'to_archive', 'valley_pre',
                  'restock', 'west_downs', 'west_thornfold', 'wild_moor', 'west_papers', 'west_stones', 'west_barrow', 'west_rollcall_done',
                  'wild_larch', 'west_strays_home', 'hub_secrets', 'wild_moor_stile', 'north_terrace', 'terrace_drop', 'valley_to_archive', 'f1', 'south_millrace', 'south_culvert',
                  'back_to_f2', 'f2', 'north_marks_valley', 'north_mark_tower', 'north_align', 'north_cellar', 'hub_alcoves', 'f3', 'boss', 'go_home', 'credits_save_note',
                  'epilogue_x1', 'late_crates', 'late_mill', 'late_list']

        def epilogue_x1(self):
            """The regular epilogue minus Elder Mael: his talk starts Episode 2 (ep2_mael sends Garrick and Hal to the ford, and Hal leaves the bakery until
            crossing_done), so the late quests of the expansion are played first and Hal's return (hal_returns) is taken at the bakery."""
            b = self.b
            if not self.has('ep1_complete'):
                return
            self.ensure_map('hero_home')
            self.talk('hazel')
            self.sign('home_doorframe')
            b.through('home_exit')
            self.ensure_map('willowmere')
            if self.has('tess_letter_3_found') and not self.has('tess_quest_done'):
                self.talk('tess')
            if self.has('ferry_bell_found') and not self.has('nella_bell_done'):
                self.talk('nella')
            b.through('door_bakery')
            self.talk_until('hal', 'hal_returned')
            b.through('bakery_exit')

        def table(self):
            own = {'wake': self.title_to_bed, 'find_mael': self.town_morning, 'errands': self.town_errands, 'find_mira': self.library,
                   'south_gate': self.south_gate, 'outfit': self.outfit, 'to_archive': self.leave_town, 'f1': self.f1, 'f2': self.f2, 'f3': self.f3,
                   'boss': self.boss, 'go_home': self.go_home, 'epilogue': self.epilogue_x1}
            return {n: own.get(n) or getattr(self, n) for n in self.PHASES}

        def run(self):
            b = self.b
            b.mark('boot')
            table = self.table()
            names = self.only if self.only else self.PHASES
            if b.resume and 'wake' not in names:
                self.title_to_bed()                 # the saved game: Continue loads it, then the named phases run
                b.resume = None
                self.ensure_any()
            for n in names:
                if n not in table:
                    raise Fail(f'unknown phase {n}')
                print(f'-- {n}', flush=True)
                table[n]()
                if b.resume and n == 'wake':
                    b.resume = None                 # loaded: from here on the plan runs as usual
                    self.ensure_any()
                b.check_errors()
                b.mark(n)
                if self.until == n:
                    print(f'stopping after {n} (--until)', flush=True)
                    return

    return X1Route
