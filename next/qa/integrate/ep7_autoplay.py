"""Episode 7 autoplay route (E7-integrate, docs/EPISODE7_PLAN.md 12), loaded by qa/autoplay.py --episode 7:

    python next/qa/autoplay.py --episode 7 [--start new] [--device phone] [--all-fights] [--from-all]

build(ap) takes the autoplay module (the Bot, Fail and Episode6 it extends) and returns a namespace with Episode7 and fixture().
Episode 7, "The Vanishing World" (docs/story/EPISODE7.md, STAGING_EP7.md, MAPS_EP7_A.md, MAPS_EP7_B.md): from the morning after
the Episode 6 credits (Continue on the credits save, or the title's Episode 7 quick start) to the Episode 7 credits and the wake in
the Keeper's Watch (hooks.js WAKE7: ep7_ph_watch, watch_cot). Name stones follow the map agents' reported reads: a read is one
confirm on a named cairn from a named cell facing a named way, and the holds the field reports after it must be the ones the
solution names (Episode7.read). Every read is one decision of its map (plan 4.10: a re-read counts); the main-path total is
checked against 16 and written to the notes, where qa/integrate/story_time.py reads it. The bot rests at each floor's font on
arrival and at font_v2b (PLAYTEST_REVIEW_8 item 9). Every Farewell and Borrowed Light is logged with how it ended (Call, a Break,
gone, landed), and every Stilled ally with how they came back.
"""
import collections
import json
import pathlib
import re
import types

# QA only: a RULE_EXT entry that records every pin (Farewell, Borrowed Light), how it ended, every Stilled member's return and every
# Frozen turn, with the encounter (plan 12: the bot notes every Farewell and how it was answered).
RIME_LOG_JS = """(async () => {
  const R = await import('./src/battle/rules.js');
  if (R.RULE_EXT.some((h) => h && h.id === 'qa_rime_log')) return true;
  window.__lqRime = window.__lqRime || [];
  R.RULE_EXT.push({ id: 'qa_rime_log', start(ctx) {
    const st = ctx.state || {}, o = st.options || {}, enc = o.encounterId || o.encounter || o.id || null;
    window.__lqRime.push({ type: 'start', enc, rime: !!st.rime });
    if (typeof ctx.emit !== 'function' || ctx.__qaRime) return;
    ctx.__qaRime = true;
    const emit = ctx.emit.bind(ctx);
    const name = (uid) => { try { const u = ctx.U(uid); return u ? u.id : uid; } catch (e) { return uid; } };
    ctx.emit = (ev) => {
      if (ev && ['farewell', 'farewell_broken', 'farewell_land', 'stilled_end', 'frozen'].includes(ev.type)) {
        window.__lqRime.push({ type: ev.type, enc, reason: ev.reason || null, skill: ev.skill || null, target: name(ev.target) });
      }
      return emit(ev);
    };
  } });
  return true;
})()"""

EP7_FLAG_HINTS = ('ep7_started', 'ep7_morning_done', 'ep7_boarded')
EP7_SOUNDS = ['palehaven:music', 'frostbound_vault:music', 'boss_phantom:music', 'stone_hold:sfx', 'stone_letgo:sfx', 'frost_seal:sfx',
              'rime_bite:sfx', 'rime_freeze:sfx', 'call_cast:sfx', 'farewell_read:sfx', 'farewell_break:sfx', 'snow_wind:ambience',
              'vault_hush:ambience']
# plan 4.10: the main path's stone decisions, by map
BUDGET = {'ep7_white_road': 4, 'ep7_vault_f1': 4, 'ep7_vault_f2': 3, 'ep7_vault_f3': 5}


def build(ap):
    Fail = ap.Fail
    OUT = ap.OUT

    def fixture(device, src_tag=''):
        """The Episode 6 credits save (EPISODE7_PLAN 10): built from the newest finished Episode 6 game (<device>-ep6<src_tag>-last-
        game.json, else the desktop one) by putting the party where the Episode 6 credits wake it: ep6_zl_inn inn_bed (17, 7),
        facing down. Written to <device>-ep6<src_tag>-credits-save.json. Returns the path."""
        path = OUT / f'{device}-ep6{src_tag}-credits-save.json'
        if path.exists():
            return path
        for src in (OUT / f'{device}-ep6{src_tag}-last-game.json', OUT / f'desktop-ep6{src_tag}-last-game.json'):
            if src.exists():
                g = json.loads(src.read_text(encoding='utf-8'))
                if not (g.get('flags') or {}).get('ep6_complete') or not (g.get('counters') or {}).get('credits6_rolled'):
                    continue
                if any(k in EP7_FLAG_HINTS for k, v in (g.get('flags') or {}).items() if v):
                    continue
                g['map'] = 'ep6_zl_inn'
                g['pos'] = {'x': 17, 'y': 7, 'dir': 'down'}
                g['autosaveSlot'] = 1
                path.write_text(json.dumps(g), encoding='utf-8')
                return path
        raise Fail('no finished Episode 6 game to build the credits save from: run python qa/autoplay.py --episode 6 first')

    class Episode7(ap.Episode6):
        """Episode 7 on the plan's route; see the module docstring."""

        # The EXP each zone is left at on the plan's route (tools/sim/ep7.mjs progression(1), from the quick start's 17,900): optional
        # fights stop there, so a Continue run and the quick start meet the Phantom near Lv 30. --all-fights clears it.
        ZONE_EXP = {'ep7_white_road': 18405, 'ep7_vault_f1': 19253, 'ep7_vault_f2': 20212, 'ep7_vault_f3': 20836}

        def __init__(self, bot, side=True, until=None, start='save'):
            super().__init__(bot, side=side, until=until, start=start)
            self.reads = collections.Counter()          # map -> stone decisions (main path)
            self.optional_reads = collections.Counter()  # map -> optional reads
            self.read_log = []
            self.gold_at = {}

        # ---- name stones
        def stones(self, f=None):
            f = f or self.b.field() or {}
            return f.get('stones') or {}

        def held(self, f=None):
            return list(self.stones(f).get('held') or [])

        def stones_quiet(self, timeout=30000):
            self.b.page.wait_for_function("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); const s = f && f.stones; "
                                          "return !f || !s || !s.active || (!s.busy && !s.anim && !s.revealing); })()", timeout=timeout, polling=20)

        def read(self, cairn, spot, d, expect, label='', optional=False):
            """One stone read: stand on `spot`, face `d` (the cairn), confirm; the holds after it (oldest first) must be `expect`
            (the map agent's solution). One decision of this map (optional ones are counted apart)."""
            b = self.b
            expect = list(expect)
            for attempt in range(3):
                f = b.settle()
                if self.leader(f) != tuple(spot):
                    self.walk([tuple(spot)], f'{label or cairn}: to {spot}')
                    f = b.settle()
                if self.leader(f) != tuple(spot):
                    raise Fail(f'{cairn}: could not stand on {spot} (at {self.leader(f)})')
                n0, r0 = self.stones(f).get('reads') or 0, self.stones(f).get('refusals') or 0
                b.face(d)
                b.frames(12)                              # the read guard: 10 frames after a finished page
                b.tap('confirm', 3)
                b.frames(6)
                self.stones_quiet()
                f = b.settle(max_s=900)
                st = self.stones(f)
                if (st.get('refusals') or 0) > r0:
                    raise Fail(f'{cairn}: the read was refused ({(st.get("lastRead") or {}).get("refused")}) at {spot}; held {st.get("held")}')
                if (st.get('reads') or 0) > n0:
                    last = st.get('lastRead') or {}
                    if not last.get('ok'):
                        raise Fail(f'{cairn}: the read was refused ({last.get("refused")}) at {spot}; held {st.get("held")}')
                    got = list(st.get('held') or [])
                    if got != expect:
                        raise Fail(f'{cairn}: held {got} after the read, the solution says {expect}')
                    m = f['map']
                    (self.optional_reads if optional else self.reads)[m] += 1
                    self.read_log.append({'map': m, 'cairn': cairn, 'held': got, 'letGo': last.get('letGo'), 'reread': bool(last.get('reread')),
                                          'optional': optional, 'game_s': round(((b.game() or {}).get('playtime') or 0), 1)})
                    b.notes.append(f'read {cairn} on {m}: held {got}' + (f', let go {last.get("letGo")}' if last.get('letGo') else '') +
                                   (' (re-read)' if last.get('reread') else '') + (' (optional)' if optional else ''))
                    return f
                b.notes.append(f'read {cairn}: the press at {spot} facing {d} did not read (attempt {attempt + 1})')
            raise Fail(f'{cairn}: no read from {spot} facing {d}')

        def map_reads_done(self, m):
            n, plan = self.reads.get(m, 0), BUDGET.get(m)
            self.b.notes.append(f'stones {m}: {n} main-path decisions (plan {plan}), {self.optional_reads.get(m, 0)} optional')
            if plan is not None and n > plan:
                raise Fail(f'{m}: {n} main-path stone decisions, over the plan\'s {plan}')

        def round_trip(self, label):
            """Save to this run's own slot only, quit, load it back; opened doors kept and every stone back at its authored holds
            (plan 12, saves: no new save field)."""
            b = self.b
            before = b.field() or {}
            b.round_trip(self.run_slot or 1, label)
            after = b.settle()
            foes = lambda f: {a['id'] for a in f.get('actors') or [] if a['kind'] == 'enemy'}
            back = foes(after) - foes(before)
            if back and after.get('map') == before.get('map'):
                self.beaten[after['map']] |= back
                b.notes.append(f'reload at {label}: {len(back)} beaten foes back on {after["map"]} ({sorted(back)})' + ('; not hunted again' if self.once else ''))
            opened = lambda f: sorted(e['id'] for e in f['ents'] if e['type'] in ('gate', 'locked_door') and e.get('state') == 'open')
            if not set(opened(before)) <= set(opened(after)):
                raise Fail(f'after the reload at {label}: doors {opened(before)} -> {opened(after)}')
            st = self.stones(after)
            b.notes.append(f'reload at {label}: stones held {st.get("held")}, doors {opened(after)}')

        def inn_if_hurt(self, frac=0.7):
            b = self.b
            vit = b.party_vitals()
            if not vit or min(v['hp'] / max(1, v['maxHp']) for v in vit) >= frac:
                return
            f = b.settle()
            if f['map'] != 'ep7_palehaven':
                return
            b.through('door_inn')
            self.ensure_map('ep7_ph_inn')
            b.rest_at_inn('ep7_innkeeper')
            b.through('inn_exit', exact=False)

        def rime_log(self):
            return self.b.js('window.__lqRime || []') or []

        # tier 13 in town, tier 14 after vault_f2_done (src/data/ep7/items.js; plan 7.6), in the order a player picks them
        TOWN = (('rimeplate_mail', 3300), ('snowveil_robe', 3200), ('glassice_helm', 0), ('aurora_hood', 0))
        PRE_F3 = (('iceglass_sword', 4600), ('aurora_staff', 4500))

        def gear(self, table, gold_floor=300, pieces=2):
            gold = (self.b.game() or {}).get('gold') or 0
            buy = []
            for item, price in table:
                if price and len(buy) < pieces and gold - price >= gold_floor:
                    buy.append((item, 1))
                    gold -= price
            return buy

        def armory(self, table, label):
            b = self.b
            g0 = (b.game() or {}).get('gold')
            self.ensure_map('ep7_palehaven')
            b.through('door_armory')
            self.ensure_map('ep7_ph_armory')
            want = self.gear(table)
            b.visit_shop('eira_forge', want)
            b.through('armory_exit', exact=False)
            b.menu_optimize_all()
            g1 = (b.game() or {}).get('gold')
            b.notes.append(f'gold {label}: {g0} G in, bought {[w[0] for w in want]}, {g1} G left (plan 7.6)')
            self.gold_at[label] = g0

        def ensure_out(self, f=None):
            """A resumed game inside a Palehaven interior: out to the town."""
            b = self.b
            f = f or b.settle()
            for door in ('watch_exit', 'shop_exit', 'armory_exit', 'inn_exit'):
                if b.ent(f, door):
                    if door == 'inn_exit' and f['leader']['x'] >= 13:
                        b.through('inn_down')
                    b.through(door, exact=False)
                    break
            return b.settle()

        # ---- phases
        def title_start(self):
            """Title -> Continue on the Episode 6 credits save (record 1), or Title -> Episode 7: new party -> the slot notice ->
            Start -> name -> the inn. The quick start's row and slot notice are answered with real key presses."""
            b = self.b
            if b.scene() != 'title':
                return
            b.page.wait_for_function("LQ_DEBUG.scene() === 'title' && !LQ_DEBUG.state().transition", timeout=30000, polling=30)
            b.frames(10)
            for n in ap.EP3_SLOTS:
                self.slots0[n] = self.slot_raw(n)
            if b.resume and self.start == 'save':
                b.shot('title')
                b.title_continue(1)
                self.run_slot = 1
                b.notes.append(f'resumed from {b.resume} (record 1)')
                b.mark('resume')
                return
            b.page.wait_for_function("(() => { const s = LQ_ENGINE.scene; return !!(s && s.menu && ((s.quickStarts && s.quickStarts().includes('ep7')) || s.menu.items.some(i => i.id === 'ep7'))); })()",
                                     timeout=90000, polling=50)
            b.frames(6)
            b.js("(() => { const s = LQ_ENGINE.scene; if (!s.menu.items.some(i => i.id === 'ep7') && s.openQuick) s.openQuick('ep7'); return true; })()")
            b.frames(4)
            items = [i['id'] for i in (b.js("LQ_ENGINE.scene.menu.items.map(i => ({ id: i.id }))") or [])]
            if 'ep7' not in items:
                raise Fail(f'the title does not offer Episode 7 (items {items})')
            b.shot('title_ep7')
            want = items.index('ep7')
            cols = b.js('LQ_ENGINE.scene.menu.columns') or 1
            rows = b.js('LQ_ENGINE.scene.menu.rows') or len(items)
            for _ in range(20):
                idx = b.js('LQ_ENGINE.scene.menu.index') or 0
                if idx == want:
                    break
                if cols > 1 and idx // rows != want // rows:
                    b.page.keyboard.press('ArrowRight' if want // rows > idx // rows else 'ArrowLeft')
                else:
                    b.page.keyboard.press('ArrowDown' if want > idx else 'ArrowUp')
                b.frames(4)
            b.page.keyboard.press('KeyZ')
            b.frames(10)
            if self.slots0.get(0) is not None:
                b.page.wait_for_function("LQ_DEBUG.scene() === 'ep7Ask'", timeout=10000, polling=30)
                st = b.scene_state()['ss'] or {}
                b.notes.append(f'quick start notice: {st.get("notice")!r} options {st.get("options")}')
                b.shot('ep7_slot_notice')
                b.page.keyboard.press('ArrowDown')
                b.frames(4)
                b.page.keyboard.press('KeyZ')
            b.page.wait_for_function("LQ_DEBUG.scene() === 'nameEntryEp7' && !LQ_DEBUG.state().transition", timeout=20000, polling=30)
            b.frames(10)
            for _ in range(8):
                b.page.keyboard.press('Backspace')
            b.page.keyboard.type(b.hero, delay=30)
            b.frames(6)
            b.shot('name_entry_ep7')
            b.page.keyboard.press('Enter')
            b.page.wait_for_function("LQ_DEBUG.state().scenes.includes('field')", timeout=90000, polling=30)
            b.frames(30)
            g = b.game() or {}
            if g.get('heroName') != b.hero:
                raise Fail(f'hero name is {g.get("heroName")!r}, typed {b.hero!r}')
            self.run_slot = g.get('autosaveSlot')
            b.notes.append(f'quick start: the run saves to slot {self.run_slot} (slot 0 was {"taken" if self.slots0.get(0) else "empty"})')
            if self.slots0.get(0) is not None and self.run_slot == 0:
                raise Fail('the quick start took slot 0 although it holds another game')
            missing = b.js("(() => { const a = LQ_ENGINE.audio, m = a.manifest || (a.real && a.real.manifest) || {}; "
                           "const has = (k, id) => !!((m[k] || {})[id]); return " + json.dumps(EP7_SOUNDS) +
                           ".filter((s) => { const [id, k] = s.split(':'); return !has(k, id); }); })()")
            if missing:
                raise Fail(f'the quick start party is missing sounds {missing}')
            b.mark('ep7_new_game')

        def morning(self):
            b = self.b
            f = b.settle(max_s=900)
            if not self.has('ep7_started'):
                raise Fail(f'ep7_morning did not run (on {f["map"]} at {f["leader"]})')
            b.mark('ep7_morning')
            if not b.items().get('white_road_letter'):
                raise Fail('the party has no White Road letter after ep7_morning')
            g = b.game() or {}
            party = g.get('party') or [{}]
            b.notes.append(f'Episode 7 arrival: Lv {[m.get("level") for m in party]}, {[m.get("exp") for m in party]} EXP, {g.get("gold")} G '
                           f'({"the quick start" if self.start == "new" else "the Episode 6 save"}; plan: Lv 28, 4,000 G)')
            self.check_slots('the morning')

        def board(self):
            b = self.b
            if self.has('road_arrived'):
                return
            f = b.settle()
            if f['map'] == 'ep6_zl_charts':
                b.through('charts_exit', exact=False)
            elif f['map'] == 'ep6_zl_inn':
                if f['leader']['x'] >= 13:
                    b.through('inn_down')
                b.through('inn_exit', exact=False)
            self.ensure_map('ep6_zephyr')
            b.menu_talk()
            if not self.has('ep7_boarded'):
                b.interact(ent_id='north_gangway', label='the north gangway')
                b.settle(max_s=900)
            if not self.has('ep7_boarded'):
                raise Fail('ep7_board did not set ep7_boarded')
            b.mark('ep7_board')
            if b.settle()['map'] == 'ep6_zephyr':
                b.through('berth_white_road', exact=False)
            self.ensure_map('ep7_white_road')
            b.settle(max_s=900)
            if not self.has('road_arrived'):
                raise Fail('ep7_landing did not run')
            b.mark('white_road')

        def road(self):
            b = self.b
            if self.has('saw_palehaven') and b.settle()['map'] != 'ep7_white_road':
                return
            self.ensure_map('ep7_white_road')
            if self.side:
                self.try_chest('chest_lake')
            self.trigger([(x, 66) for x in range(10, 22)], 'vex_carved', 'wall_trig', max_s=900)
            b.notes.append(f'name_under_ice: {"Half of it. (told_vex)" if self.has("told_vex") else "All of it. (spared_vex)"}')
            b.mark('travelers_wall')
            self.trigger([(x, 57) for x in range(10, 22)], 'road_fight_done', 'fight_row', max_s=900)
            b.mark('first_fight_done')
            self.hunt(2, label='the wolves')
            self.trigger([(x, 53) for x in range(10, 22)], 'first_stone_read', 'first_trig', max_s=900)
            b.mark('first_stone')
            # Gap A: Asta from the west spur
            if 'a' not in self.held() and self.leader()[1] > 44:
                self.read('ns_asta', (12, 47), 'down', ['a'], 'Gap A')
            # Gap B: Bo, (Ilka with Bo held, optional), Nyx
            if self.leader()[1] > 36:
                self.walk([(19, 39)], 'over Asta to Bo')
                self.read('ns_bo', (19, 39), 'left', ['a', 'b'], 'Gap B')
                self.walk([(21, 34)], 'up onto the ledge')
                if (self.side or self.once) and not b.opened('ep7_white_road', 'chest_ilka') and not b.opened('ep7_white_road', 'chest_ilka_plaque'):
                    try:
                        self.read('ns_ilka', (18, 35), 'down', ['b', 'i'], "Ilka's ledge", optional=True)
                        self.walk([(7, 35)], "to Ilka's ledge")
                        self.try_chest('chest_ilka_plaque' if self.has('streets_started') else 'chest_ilka')
                        self.walk([(21, 34)], 'back onto the ledge')
                    except Fail as e:
                        b.notes.append(f"Ilka's ledge skipped: {e}")
                held = self.held()
                self.read('ns_nyx', (21, 34), 'right', [held[-1], 'n'] if held and held[-1] != 'n' else ['n'], 'Gap B')
            self.hunt(2, label='the owls')
            self.trigger([(x, 29) for x in range(17, 23)], 'call_learned', 'whiteout_trig', max_s=900)
            b.mark('whiteout')
            # Gap C: Senna
            if self.leader()[1] > 21:
                held = self.held()
                self.read('ns_senna', (15, 25), 'left', [held[-1], 's'] if held else ['s'], 'Gap C')
                self.walk([(16, 20)], 'over Senna')
            self.map_reads_done('ep7_white_road')
            if not self.has('saw_sevens'):
                b.through('door_waystation')
                self.ensure_map('ep7_waystation')
                self.trigger([(x, 6) for x in range(4, 10)], 'saw_sevens', 'tally_trig', max_s=900)
                b.mark('waystation')
                try:
                    b.rest_at_font('stove_lit', label='the Waystation stove')
                    b.notes.append('rested at the Waystation stove')
                except Fail as e:
                    b.notes.append(f'Waystation stove skipped: {e}')
                if self.side and not b.opened('ep7_waystation', 'chest_woodpile'):
                    try:
                        b.shove_to('woodpile', (11, 5), label='the woodpile')
                        self.try_chest('chest_woodpile')
                    except Fail as e:
                        b.notes.append(f'woodpile skipped: {e}')
                self.round_trip('the Waystation')
                self.ensure_map('ep7_waystation')
                self.check_slots('the Waystation')
                b.through('waystation_exit', exact=False)
            self.ensure_map('ep7_white_road')
            self.try_chest('strongbox')
            self.trigger([(x, 13) for x in range(15, 18)], 'saw_palehaven', 'icegate_trig', max_s=900)
            b.mark('palehaven_view')
            b.exit_to((16, 10), label='to Palehaven')
            self.ensure_map('ep7_palehaven')
            b.settle(max_s=900)
            if not self.has('palehaven_arrived'):
                raise Fail('palehaven_arrival did not run')
            g = b.game() or {}
            self.gold_at['Palehaven'] = g.get('gold')
            b.notes.append(f'gold at Palehaven: {g.get("gold")} G (plan 7.6: 6,880), Lv {self.level()}')
            b.mark('palehaven')

        def town(self):
            b = self.b
            if self.has('vault_open'):
                return
            self.ensure_out()
            self.ensure_map('ep7_palehaven')
            if not self.has('met_keeper'):
                self.talk('keeper')
                b.settle(max_s=900)
                if not self.has('met_keeper'):
                    raise Fail('meet_keeper did not set met_keeper')
                b.mark('meet_keeper')
            if self.side:
                for npc in ('eira', 'torr'):
                    try:
                        self.talk(npc)
                    except Fail as e:
                        b.notes.append(f'talk {npc} skipped: {e}')
            if not getattr(self, '_shopped7', False):
                self._shopped7 = True
                self.ensure_map('ep7_palehaven')
                b.through('door_shop')
                self.ensure_map('ep7_ph_shop')
                b.visit_shop('maera', [('ember_tea', 2), ('hi_ether', 1)])
                b.through('shop_exit', exact=False)
                self.armory(self.TOWN, 'Palehaven')
            self.inn_if_hurt(0.8)
            self.ensure_map('ep7_palehaven')
            if not self.has('keeper_told'):
                b.through('door_watch')
                self.ensure_map('ep7_ph_watch')
                self.trigger([(x, 9) for x in range(2, 10)], 'keeper_told', 'watch_trig', max_s=900)
                b.mark('keeper_and_vex')
                b.interact_no_settle(ent_id='save_bell_watch')
                self.save_from_bell(self.run_slot or 1)
                b.close_menu()
                b.through('watch_exit', exact=False)
            self.ensure_map('ep7_palehaven')
            self.trigger([(x, 9) for x in range(30, 33)], 'vault_open', 'vault_trig', max_s=900)
            b.mark('vault_gate')
            if b.settle()['map'] == 'ep7_palehaven':
                b.through('vault_door', exact=False)
            self.ensure_map('ep7_vault_f1')
            b.settle(max_s=900)
            if not self.has('vault_f1_arrived'):
                raise Fail('vault_f1_arrival did not run')
            b.mark('vault_f1')

        def f1(self):
            b = self.b
            if self.has('vault_f1_done'):
                return
            self.ensure_map('ep7_vault_f1')
            self.arrival_font('font_v1', 'font F1')
            if self.side:
                self.try_chest('chest_a')
            self.hunt(2, label='the basin')
            if not b.items().get('stillheart_key'):
                held = self.held()
                if self.leader()[1] > 14 and 'a' not in held:
                    self.read('ns_arvo', (15, 19), 'up', ['a'], 'F1 B')
                if self.leader()[1] > 12:
                    self.hunt(2, label='by Reach')
                    if self.side:
                        self.try_chest('chest_b')
                    self.walk([(14, 14)], 'over Arvo')
                    self.read('ns_liesl', (15, 12), 'up', ['a', 'l'], 'F1 B')
                    self.trigger([(22, 12)], 'keeper_memory_1', 'memory1_trig', max_s=900)
                    b.mark('keeper_memory_1')
                    self.hunt(2, label='the gate landing')
                    self.read('ns_arvo_3', (28, 15), 'up', ['l', 'a'], 'F1 C')
                    self.read('ns_sigrid', (28, 10), 'up', ['a', 's'], 'F1 C')
                self.walk([(26, 5)], 'to the balcony')
                self.chest('chest_key')
                if not b.items().get('stillheart_key'):
                    raise Fail('chest_key did not give the Stillheart Key')
                self.try_chest('chest_cache')
                if self.side and not b.opened('ep7_vault_f1', 'chest_plaque3') and not b.opened('ep7_vault_f1', 'chest_plaque3_alt'):
                    try:
                        if b.dash_break('crate_e', label='the balcony crate'):
                            self.try_chest('chest_plaque3' if self.has('streets_started') else 'chest_plaque3_alt')
                    except Fail as e:
                        b.notes.append(f'balcony crate skipped: {e}')
            self.map_reads_done('ep7_vault_f1')
            self.keep('end of F1')
            self.round_trip('F1 balcony')
            self.ensure_map('ep7_vault_f1')
            self.check_slots('F1')
            self.trigger([(24, 4)], 'vault_f1_done', 'lift_trig')
            if b.settle()['map'] == 'ep7_vault_f1':
                b.through('lift_up', exact=False)
            self.ensure_map('ep7_vault_f2')
            b.settle(max_s=900)
            if not self.has('vault_f2_arrived'):
                raise Fail('vault_f2_arrival did not run')
            b.mark('vault_f2')

        def f2(self):
            b = self.b
            if self.has('lantern_defeated'):
                return
            self.ensure_map('ep7_vault_f2')
            if not self.has('bell_found'):
                self.arrival_font('font_v2', 'font F2 stair foot')
                self.hunt(3, label='the stair foot and the hall')
                if self.side:
                    self.try_chest('chest_b')
                if not self.has('keeper_memory_2'):
                    self.trigger([(x, 21) for x in range(4, 14)], 'keeper_memory_2', 'memory2_trig', max_s=900)
                    b.mark('keeper_memory_2')
                self.read('ns_hakon', (12, 17), 'left', ['d', 'h'], 'F2 B')
                self.read('ns_runa', (14, 16), 'up', ['h', 'r'], 'F2 B')
                self.walk([(16, 16)], 'through the arch')
                self.hunt(2, label='the platform')
                self.walk([(18, 10)], "over Hakon's path")
                self.read('ns_dagny_2', (18, 8), 'up', ['r', 'd'], 'F2 C')
                self.trigger([(22, 8)], 'bell_found', 'bell_trig', max_s=900)
                b.mark('listening_bell')
                self.walk([(26, 16)], "down Runa's path")
            self.map_reads_done('ep7_vault_f2')
            f = b.settle()
            if b.ent(f, 'font_v2b'):
                self.arrival_font('font_v2b', 'font F2 lamp gallery')
            self.try_chest('chest_gallery')
            self.hunt(2, label='the lamp gallery')
            self.keep('before the Lantern', reserve=0, frac=0.6)
            f = b.settle()
            if b.ent(f, 'font_v2b'):
                self.arrival_font('font_v2b', 'font F2 before the Lantern')
            self.round_trip('F2 lamp gallery')
            self.ensure_map('ep7_vault_f2')
            self.check_slots('F2')
            for attempt in range(5):
                if self.has('lantern_defeated'):
                    break
                if attempt:
                    b.notes.append(f'Pale Lantern attempt {attempt + 1} (Lv {self.level()})')
                    f = b.settle()
                    if b.ent(f, 'font_v2b'):
                        self.arrival_font('font_v2b', 'font F2 again')
                    self.keep('before the Lantern again', reserve=0, frac=0.6)
                b.mark('pale_lantern')
                b.walk_to([(x, 18) for x in range(23, 33)], label='lantern_trig')
                b.settle(max_s=1500)
            if not self.has('lantern_defeated'):
                raise Fail('the Pale Lantern did not fall in 5 attempts')
            self.keep('after the Lantern')

        def town_trip(self):
            """vault_f2_done, down the lift to F1's basin, the stair to Palehaven, the two pre-F3 pieces, and back up: F1, the
            basin lift to F2's Lamp Gallery, the lift to F3 (plan 5.4 and 7.6)."""
            b = self.b
            if self.has('vault_f3_arrived'):
                return
            self.ensure_map('ep7_vault_f2')
            self.trigger([(x, 25) for x in range(24, 29)], 'vault_f2_done', 'lift_trig')
            g = b.game() or {}
            b.notes.append(f'gold before F3: {g.get("gold")} G (plan 7.6: 9,620), Lv {self.level()}')
            if not getattr(self, '_tripped', False):
                self._tripped = True
                b.through('lift_f2_down', exact=False)
                self.ensure_map('ep7_vault_f1')
                b.through('to_palehaven', exact=False)
                self.ensure_map('ep7_palehaven')
                self.armory(self.PRE_F3, 'before F3')
                self.inn_if_hurt(0.9)
                self.ensure_map('ep7_palehaven')
                b.through('vault_door', exact=False)
                self.ensure_map('ep7_vault_f1')
                b.through('lift_f1_up', exact=False)
                self.ensure_map('ep7_vault_f2')
                b.notes.append('two-way lifts: F2 -> F1 basin -> Palehaven -> F1 -> F2 Lamp Gallery, no read needed')
            f = b.settle()
            if f['map'] == 'ep7_vault_f2':
                b.through('lift_up', exact=False)
            self.ensure_map('ep7_vault_f3')
            b.settle(max_s=900)
            if not self.has('vault_f3_arrived'):
                raise Fail('vault_f3_arrival did not run')
            b.mark('vault_f3')

        def f3(self):
            b = self.b
            if self.has('stillheart_open'):
                return
            self.ensure_map('ep7_vault_f3')
            self.arrival_font('font_v3', 'font F3')
            if not self.has('keeper_memory_3'):
                self.trigger([(x, 34) for x in range(12, 26)], 'keeper_memory_3', 'memory3_trig', max_s=900)
                b.mark('keeper_memory_3')
            if self.leader()[1] > 30:
                self.read('ns_ylva', (18, 33), 'up', ['y'], 'F3 Shelter')
                self.walk([(17, 29)], 'over Ylva to Shelter')
            self.hunt(2, label='Shelter')
            if self.leader()[1] > 24:
                self.read('ns_greta', (11, 28), 'up', ['y', 'g'], 'F3 Remember')
                self.walk([(10, 23)], 'over Greta')
            self.hunt(2, label='Remember west')
            if self.leader()[0] < 18:
                self.read('ns_anders', (13, 21), 'up', ['g', 'a'], 'F3 Return')
                self.walk([(19, 21)], 'through the pillar gap')
            self.hunt(2, label='Remember east')
            if self.leader()[1] > 16:
                self.read('ns_ylva_3', (21, 20), 'up', ['a', 'y'], 'F3 Remember')
            if not self.has('keeper_came'):
                self.trigger([(22, 19)], 'keeper_came', 'keeper_trig', max_s=900)
                b.notes.append(f'keeper_comes: {"No. (told_nox)" if self.has("told_nox") else "I remember. (spared_nox)"}')
                b.mark('keeper_comes')
            if not self.has('stillheart_open'):
                raise Fail('keeper_comes did not set stillheart_open')
            self.walk([(22, 15)], "up Ylva's second stretch")
            self.hunt(2, label='Return')
            if self.side:
                pass
            self.read('ns_ida', (12, 13), 'up', ['y', 'i'], 'F3 Return')
            self.walk([(17, 10)], 'through door A')
            self.map_reads_done('ep7_vault_f3')
            if self.side:
                self.try_chest('chest_door')

        def phantom7(self):
            b = self.b
            if self.has('phantom_defeated'):
                return
            f = b.settle()
            if f['map'] == 'ep7_vault_f3':
                self.keep('the round door', reserve=0, frac=0.9)
                b.notes.append(f'into the Stillheart with {self.ethers()} Ethers, {b.items().get("ember_tea", 0)} Ember Tea, Lv {self.level()}')
                self.round_trip('before the White Phantom')
                self.ensure_map('ep7_vault_f3')
            for attempt in range(5):
                f = b.settle()
                if f['map'] == 'ep7_vault_f3':
                    b.through('grate', exact=False)
                self.ensure_map('ep7_stillheart')
                if attempt == 0:
                    b.mark('white_phantom')
                b.notes.append(f'White Phantom attempt {attempt + 1}: Lv {self.level()}')
                b.walk_to([(x, 16) for x in range(8, 26)], label='phantom_trig')
                b.settle(max_s=1800)
                if self.has('phantom_defeated'):
                    break
                f = b.settle()
                if f['map'] == 'ep7_stillheart':
                    b.through('nave_down')
                self.ensure_map('ep7_vault_f3')
                self.keep('before the Phantom again', reserve=0, frac=0.9)
            if not self.has('phantom_defeated'):
                raise Fail('the White Phantom did not fall in 5 attempts')
            b.settle(max_s=900)
            if not self.has('stillheart_restored') or not b.items().get('name_fragment_7'):
                raise Fail('phantom_after did not restore the Stillheart and give the seventh fragment')
            b.mark('phantom_after')
            log = self.rime_log()
            for enc in ('pale_lantern', 'white_phantom'):
                pins = collections.Counter(e.get('skill') for e in log if e.get('type') == 'farewell' and e.get('enc') == enc)
                ended = collections.Counter(f'{e.get("skill")}:{e.get("reason")}' for e in log if e.get('type') == 'farewell_broken' and e.get('enc') == enc)
                landed = collections.Counter(e.get('skill') for e in log if e.get('type') == 'farewell_land' and e.get('enc') == enc)
                back = collections.Counter(e.get('reason') for e in log if e.get('type') == 'stilled_end' and e.get('enc') == enc)
                b.notes.append(f'{enc}: pins {dict(pins)}; ended {dict(ended)} (call = Call, break = a Break, gone = owner or target fell); '
                               f'landed {dict(landed)}; Stilled back {dict(back)}')

        def ending7(self):
            b = self.b
            if self.has('ep7_complete') and (b.game() or {}).get('counters', {}).get('credits7_rolled'):
                return
            f = b.settle()
            if not self.has('page_whole'):
                if f['map'] == 'ep7_stillheart':
                    b.through('square_return', exact=False)
                self.ensure_map('ep7_palehaven')
                b.settle(max_s=900)
                if not self.has('doors_reopened'):
                    raise Fail('whole_page / doors_reopen did not run on the way back into the square')
                b.mark('doors_reopen')
            f = self.ensure_out()
            if f['map'] == 'ep7_palehaven':
                b.menu_talk()
                b.through('nave_door', exact=False)
            b.settle(max_s=900)
            if not self.has('ep7_complete'):
                raise Fail(f'ep7_complete was not set (on {b.settle()["map"]})')
            for _ in range(600):
                sc = b.handle()
                fs = b.field() or {}
                if sc == 'field' and fs.get('map') == 'ep7_ph_watch' and not fs.get('locked'):
                    break
            f = b.settle()
            if f['map'] != 'ep7_ph_watch':
                raise Fail(f'after the Episode 7 credits the party woke on {f["map"]}, not ep7_ph_watch')
            if not (b.game() or {}).get('counters', {}).get('credits7_rolled'):
                raise Fail('credits7_rolled was not counted')
            b.notes.append(f'woke at {f["map"]} {f["leader"]}')
            b.mark('ep7_credits_done')
            self.check_slots('the credits')

        def epilogue7(self):
            b = self.b
            if not self.side or not self.has('ep7_complete'):
                return
            self.ensure_map('ep7_ph_watch')
            b.menu_talk()
            b.mark('ep7_epilogue')

        def run(self):
            b = self.b
            b.mark('boot')
            phases = [('ep7_start', self.title_start), ('ep7_morning', self.morning), ('board', self.board), ('road', self.road),
                      ('town', self.town), ('vault_f1', self.f1), ('vault_f2', self.f2), ('town_trip', self.town_trip), ('vault_f3', self.f3),
                      ('phantom', self.phantom7), ('ending', self.ending7), ('epilogue7', self.epilogue7)]
            for step_id, fn in phases:
                print(f'-- {step_id}', flush=True)
                if step_id == 'ep7_morning' and self.has('ep7_boarded'):
                    continue
                fn()
                if step_id == 'ep7_start':
                    b.js(RIME_LOG_JS)
                if b.resume and step_id == 'ep7_start':
                    b.resume = None
                    self.ensure_any()
                b.check_errors()
                if self.until == step_id:
                    print(f'stopping after {step_id} (--until)', flush=True)
                    return
            self.check_slots('the end')
            total = sum(self.reads.values())
            b.notes.append(f'STONES main path {total} decisions (plan 16): {dict(self.reads)}; optional {dict(self.optional_reads)}')
            if total > 16:
                raise Fail(f'{total} main-path stone decisions, over the plan\'s 16')
            (ap.OUT / f'{b.device}-stones.json').write_text(json.dumps({'reads': self.read_log, 'main': dict(self.reads),
                                                                          'optional': dict(self.optional_reads), 'gold': self.gold_at}, indent=1), encoding='utf-8')
            starts = [e for e in self.rime_log() if e.get('type') == 'start']
            b.notes.append(f'battles with Rime: {sum(1 for e in starts if e.get("rime"))} of {len(starts)}')
            frozen = sum(1 for e in self.rime_log() if e.get('type') == 'frozen')
            b.notes.append(f'Frozen turns: {frozen}')
            bad = sorted({w for w in b.warnings if re.search(r'unknown .*\bid\b|unknown (object|target|sprite|map|item|npc|encounter|scene)|no actor|no path|no scene', w, re.I)})
            if bad:
                raise Fail(f'{len(bad)} unknown-id or staging warnings: {bad[:6]}')
            b.notes.append('warnings: no "unknown ... id", "no actor", "no path" or "no scene" line in the run')

    return types.SimpleNamespace(Episode7=Episode7, fixture=fixture, BUDGET=BUDGET)
