"""Episode 8 autoplay route (E8-integrate, docs/EPISODE8_PLAN.md 12), loaded by qa/autoplay.py --episode 8:

    python next/qa/autoplay.py --episode 8 [--start new] [--device phone] [--all-fights] [--ending choose] [--choose c1]
                                           [--from-choice <game.json>] [--postgame]

build(ap) takes the autoplay module (the Bot, Fail and Episode6 it extends) and returns a namespace with Episode8 and fixture().
Episode 8, "The Last Word" (docs/story/EPISODE8.md, STAGING_EP8.md, MAPS_EP8_A.md, MAPS_EP8_B.md): from the morning after the
Episode 7 credits (Continue on the credits save, or the title's Episode 8 quick start) through the Stair, the Scriptorium, the
First Library and the Last Word, both endings (one per run: --ending return | choose), the open street, home and Hazel, the bell
night, the credits and the wake at home (hooks.js WAKE8: hero_home, bed); with --postgame the walk back north after it.

Pop-up books follow the map agents' reported solutions: a read is one confirm on a named book from a named cell facing a named
way, and the open directions the field reports after it must be the ones the solution names (Episode8.read). Every read is one
decision of its map (plan 4.10: a close counts, a pair swap is one); the main-path total is checked against 16 and written to
the notes and to <device>-books.json, where qa/integrate/story_time.py reads it. Every refusal is logged. The bot rests at each
floor's fountain on arrival and at font_l2b before the Sentry (PLAYTEST_REVIEW_8 item 9). Every Unwrite pin and how it ended
(read back by Read Aloud, a Break, landed), every Last Silence and how it ended (Answer, a Break, landed) is logged with the
encounter, and the Eraser's level, wins and game overs go to the notes.
"""
import collections
import json
import pathlib
import re
import types

# QA only: a RULE_EXT entry that records every Erasure event of Episode 8 with the encounter (plan 12: each Unwrite and Silence
# recorded with how it was answered).
ERASE_LOG_JS = """(async () => {
  const R = await import('./src/battle/rules.js');
  if (R.RULE_EXT.some((h) => h && h.id === 'qa_erase_log')) return true;
  window.__lqErase = window.__lqErase || [];
  R.RULE_EXT.push({ id: 'qa_erase_log', start(ctx) {
    const st = ctx.state || {}, o = st.options || {}, enc = o.encounterId || o.encounter || o.id || null;
    window.__lqErase.push({ type: 'start', enc });
    if (typeof ctx.emit !== 'function' || ctx.__qaErase) return;
    ctx.__qaErase = true;
    const emit = ctx.emit.bind(ctx);
    const name = (uid) => { try { const u = ctx.U(uid); return u ? u.id : uid; } catch (e) { return uid; } };
    ctx.emit = (ev) => {
      if (ev && ['unwrite_pin', 'unwrite_broken', 'unwrite_land', 'silence_broken', 'rub', 'unwritten', 'read', 'erasure'].includes(ev.type)) {
        window.__lqErase.push({ type: ev.type, enc, reason: ev.reason || null, skill: ev.skill || null, moved: !!ev.moved,
          target: name(ev.target), command: ev.command || null });
      } else if (ev && ev.type === 'message' && ev.kind === 'silence' && /quiet/.test(ev.text || '')) {
        window.__lqErase.push({ type: 'silence', enc });
      }
      return emit(ev);
    };
  } });
  return true;
})()"""

# FIELD_JS (qa/autoplay.py) reports f.books as `books`; this is the same read for a page that wants only the books.
BOOKS_JS = "(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); return f && f.books ? f.books.debugState() : null; })()"

EP8_FLAG_HINTS = ('ep8_started', 'ep8_morning_done', 'ep8_roofed')
EP8_SOUNDS = ['scriptorium_town:music', 'first_library:music', 'boss_eraser:music', 'the_last_word:music', 'page_open:sfx',
              'page_fold:sfx', 'rub_out:sfx', 'ink_slide:sfx', 'read_cast:sfx', 'unwrite_read:sfx', 'unwrite_break:sfx',
              'silence_gather:sfx', 'library_hush:ambience', 'palehaven:music', 'sky_wind:ambience']
# plan 4.10: the main path's book decisions, by map
BUDGET = {'ep8_stair': 4, 'ep8_library_f1': 4, 'ep8_library_f2': 4, 'ep8_library_f3': 4}
EP8_START = {'level': 31, 'exp': 22200, 'gold': 4300}
# staging warnings from seams in files E8-seams owns (reported in the run's notes, never hidden): meet_librarian sets librarian_met
# before the Librarian walks out, so the map's NPC (show: ifNot librarian_met) is gone when the walk and the despawn look for him
KNOWN_SEAM_WARNINGS = ('no actor "ep8_librarian"',)
ENDING_LABEL = {'return': 'Return every stolen name', 'choose': 'Let each person choose'}


def build(ap):
    Fail = ap.Fail
    OUT = ap.OUT

    def fixture(device, src_tag=''):
        """The Episode 7 credits save (EPISODE8_PLAN 10): built from the newest finished Episode 7 game (<device>-ep7<src_tag>-last-
        game.json, else the desktop one) by putting the party where the Episode 7 credits wake it: ep7_ph_watch watch_cot (14, 5),
        facing down. Written to <device>-ep7<src_tag>-credits-save.json. Returns the path."""
        path = OUT / f'{device}-ep7{src_tag}-credits-save.json'
        if path.exists():
            return path
        for src in (OUT / f'{device}-ep7{src_tag}-last-game.json', OUT / f'desktop-ep7{src_tag}-last-game.json'):
            if src.exists():
                g = json.loads(src.read_text(encoding='utf-8'))
                if not (g.get('flags') or {}).get('ep7_complete') or not (g.get('counters') or {}).get('credits7_rolled'):
                    continue
                if any(k in EP8_FLAG_HINTS for k, v in (g.get('flags') or {}).items() if v):
                    continue
                g['map'] = 'ep7_ph_watch'
                g['pos'] = {'x': 14, 'y': 5, 'dir': 'down'}
                g['autosaveSlot'] = 1
                path.write_text(json.dumps(g), encoding='utf-8')
                return path
        raise Fail('no finished Episode 7 game to build the credits save from: run python qa/autoplay.py --episode 7 first')

    class Episode8(ap.Episode6):
        """Episode 8 on the plan's route; see the module docstring."""

        # The EXP each zone is left at on the plan's route (tools/sim/ep8.mjs progression(1), from the quick start's 22,200): optional
        # fights stop there, so a Continue run and the quick start meet the Eraser near Lv 33. F2's cap is before the Sentry (320 EXP),
        # which is always fought. --all-fights clears it.
        ZONE_EXP = {'ep8_stair': 22740, 'ep8_library_f1': 23670, 'ep8_library_f2': 24430, 'ep8_library_f3': 25688}

        def __init__(self, bot, side=True, until=None, start='save', ending='return', choose='c2', postgame=False):
            super().__init__(bot, side=side, until=until, start=start)
            self.ending = ending
            self.choose_book = choose
            self.postgame_on = postgame
            self.reads = collections.Counter()          # map -> book decisions (main path)
            self.optional_reads = collections.Counter()  # map -> optional reads
            self.read_log = []
            self.refusals = []
            self.gold_at = {}
            self.level_at = {}
            self.first_fight_s = None

        # ---- pop-up books
        def books(self, f=None):
            f = f or self.b.field() or {}
            return f.get('books') or {}

        def books_quiet(self, timeout=30000):
            self.b.page.wait_for_function("(() => { const f = LQ_ENGINE.stack.find(s => s.name === 'field'); const s = f && f.books; "
                                          "return !f || !s || !s.active || (!s.busy && !s.anim && !s.revealing); })()", timeout=timeout, polling=20)

        def read(self, ent_id, spot, d, expect, label='', optional=False):
            """One book read: stand on `spot`, face `d` (the book), confirm; afterwards each book of `expect` must stand open that way
            ('n' 's' 'e' 'w') or shut ('-') (the map agent's solution). One decision of this map (optional ones are counted apart).
            A refusal is logged with its reason and fails the run (the main path never needs one)."""
            b = self.b
            for attempt in range(3):
                f = b.settle()
                if self.leader(f) != tuple(spot):
                    self.walk([tuple(spot)], f'{label or ent_id}: to {spot}')
                    f = b.settle()
                if self.leader(f) != tuple(spot):
                    raise Fail(f'{ent_id}: could not stand on {spot} (at {self.leader(f)})')
                bk = self.books(f)
                n0, r0 = bk.get('reads') or 0, bk.get('refusals') or 0
                b.face(d)
                b.frames(12)                              # the read guard: 10 frames after a finished page
                b.tap('confirm', 3)
                b.frames(6)
                self.books_quiet()
                f = b.settle(max_s=900)
                bk = self.books(f)
                last = bk.get('lastRead') or {}
                if (bk.get('refusals') or 0) > r0:
                    self.refusals.append({'map': f['map'], 'book': ent_id, 'spot': list(spot), 'refused': last.get('refused'), 'main': not optional})
                    b.notes.append(f'REFUSED read {ent_id} on {f["map"]} from {spot}: {last.get("refused")} (state {bk.get("state")})')
                    raise Fail(f'{ent_id}: the read was refused ({last.get("refused")}) at {spot}; books {bk.get("open")}')
                if (bk.get('reads') or 0) > n0:
                    got = bk.get('open') or {}
                    bad = {k: (got.get(k), v) for k, v in expect.items() if got.get(k) != v}
                    if bad:
                        raise Fail(f'{ent_id}: after the read the books stand {got}, the solution says {expect} (wrong: {bad})')
                    m = f['map']
                    (self.optional_reads if optional else self.reads)[m] += 1
                    self.read_log.append({'map': m, 'book': ent_id, 'from': list(spot), 'open': got, 'opened': last.get('opened'),
                                          'closed': last.get('closed'), 'ms': last.get('ms'), 'optional': optional,
                                          'game_s': round(((b.game() or {}).get('playtime') or 0), 1)})
                    b.notes.append(f'read {ent_id} on {m}: from {tuple(spot)}, {bk.get("describe")}' + (' (optional)' if optional else ''))
                    return f
                if last.get('refused') == 'side':
                    self.refusals.append({'map': f['map'], 'book': ent_id, 'spot': list(spot), 'refused': 'side', 'main': not optional})
                b.notes.append(f'read {ent_id}: the press at {spot} facing {d} did not read (attempt {attempt + 1})')
            raise Fail(f'{ent_id}: no read from {spot} facing {d}')

        # every ew book is read from its top cell's side (the maps' own *_face marks)

        def map_reads_done(self, m):
            n, plan = self.reads.get(m, 0), BUDGET.get(m)
            self.b.notes.append(f'books {m}: {n} main-path decisions (plan {plan}), {self.optional_reads.get(m, 0)} optional')
            if plan is not None and n > plan:
                raise Fail(f'{m}: {n} main-path book decisions, over the plan\'s {plan}')

        def round_trip(self, label):
            """Save to this run's own slot only, quit, load it back; opened doors kept and every book back at its authored start
            (plan 12, saves: no new save field, a reload resets the books)."""
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
            bk = self.books(after)
            start = self.authored(after['map'])
            if bk.get('active') is not False and bk.get('open') is not None and start is not None and bk.get('open') != start:
                raise Fail(f'after the reload at {label}: books {bk.get("open")}, the authored start is {start}')
            b.notes.append(f'reload at {label}: books {bk.get("open")}, doors {opened(after)}')

        def authored(self, map_id):
            """The books' authored start of a map ({id: dir or '-'}), from the static grid's module."""
            g = self.b.grid(map_id)
            mod = g.get('popbooks') or {}
            ids = list((mod.get('books') or {}).keys())
            if not ids:
                return None
            st = mod.get('start') or {}
            return {k: st.get(k, '-') for k in ids}

        def inn_if_hurt(self, frac=0.7):
            b = self.b
            vit = b.party_vitals()
            if not vit or min(v['hp'] / max(1, v['maxHp']) for v in vit) >= frac:
                return
            f = b.settle()
            if f['map'] != 'ep8_scriptorium':
                return
            b.through('door_inn')
            self.ensure_map('ep8_sc_inn')
            b.rest_at_inn('ep8_innkeeper')
            b.through('inn_exit', exact=False)

        def erase_log(self):
            return self.b.js('window.__lqErase || []') or []

        # tier 15 at the Atelier on arrival, tier 16 after library_f2_done (src/data/ep8/shops.js EP8_GOLD_LINE; plan 7.6)
        TOWN = (('vellum_plate', 3600), ('glyphweave_robe', 3500))
        PRE_F3 = (('quillsteel_sword', 5000), ('lexicon_staff', 4900))

        def gear(self, table, gold_floor=300, pieces=2):
            gold = (self.b.game() or {}).get('gold') or 0
            buy = []
            for item, price in table:
                if price and len(buy) < pieces and gold - price >= gold_floor:
                    buy.append((item, 1))
                    gold -= price
            return buy

        def atelier(self, table, label):
            b = self.b
            g0 = (b.game() or {}).get('gold')
            self.ensure_map('ep8_scriptorium')
            b.through('door_atelier')
            self.ensure_map('ep8_sc_atelier')
            want = self.gear(table)
            b.visit_shop('sorel', want)
            b.through('atelier_exit', exact=False)
            b.menu_optimize_all()
            g1 = (b.game() or {}).get('gold')
            b.notes.append(f'gold {label}: {g0} G in, bought {[w[0] for w in want]}, {g1} G left (plan 7.6)')
            self.gold_at[label] = g0
            if len(want) < len(table):
                b.notes.append(f'gold {label}: only {len(want)} of the {len(table)} pieces with 300 G to spare (economy8)')

        def ensure_out(self, f=None):
            """A resumed game inside a Scriptorium interior: out to the square."""
            b = self.b
            f = f or b.settle()
            for door in ('index_exit', 'shop_exit', 'atelier_exit', 'inn_exit'):
                if b.ent(f, door):
                    if door == 'inn_exit' and f['leader']['x'] >= 13:
                        b.through('inn_down')
                    b.through(door, exact=False)
                    break
            return b.settle()

        def arrival_note(self, label):
            g = self.b.game() or {}
            party = g.get('party') or [{}]
            self.level_at[label] = [m.get('level') for m in party]
            self.gold_at.setdefault(label, g.get('gold'))
            return g

        # ---- phases
        def title_start(self):
            """Title -> Continue on the Episode 7 credits save (record 1), or Title -> Episode 8: new party -> the slot notice ->
            Start -> name -> the Watch. The quick start's row and slot notice are answered with real key presses."""
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
            b.page.wait_for_function("(() => { const s = LQ_ENGINE.scene; return !!(s && s.menu && ((s.quickStarts && s.quickStarts().includes('ep8')) || s.menu.items.some(i => i.id === 'ep8'))); })()",
                                     timeout=90000, polling=50)
            b.frames(6)
            b.js("(() => { const s = LQ_ENGINE.scene; if (!s.menu.items.some(i => i.id === 'ep8') && s.openQuick) s.openQuick('ep8'); return true; })()")
            b.frames(4)
            items = [i['id'] for i in (b.js("LQ_ENGINE.scene.menu.items.map(i => ({ id: i.id }))") or [])]
            if 'ep8' not in items:
                raise Fail(f'the title does not offer Episode 8 (items {items})')
            b.shot('title_ep8')
            want = items.index('ep8')
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
                b.page.wait_for_function("LQ_DEBUG.scene() === 'ep8Ask'", timeout=10000, polling=30)
                st = b.scene_state()['ss'] or {}
                b.notes.append(f'quick start notice: {st.get("notice")!r} options {st.get("options")}')
                b.shot('ep8_slot_notice')
                b.page.keyboard.press('ArrowDown')
                b.frames(4)
                b.page.keyboard.press('KeyZ')
            b.page.wait_for_function("LQ_DEBUG.scene() === 'nameEntryEp8' && !LQ_DEBUG.state().transition", timeout=20000, polling=30)
            b.frames(10)
            for _ in range(8):
                b.page.keyboard.press('Backspace')
            b.page.keyboard.type(b.hero, delay=30)
            b.frames(6)
            b.shot('name_entry_ep8')
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
                           "const has = (k, id) => !!((m[k] || {})[id]); return " + json.dumps(EP8_SOUNDS) +
                           ".filter((s) => { const [id, k] = s.split(':'); return !has(k, id); }); })()")
            if missing:
                raise Fail(f'the quick start party is missing sounds {missing}')
            b.mark('ep8_new_game')

        def morning(self):
            b = self.b
            f = b.settle(max_s=900)
            if not self.has('ep8_started'):
                raise Fail(f'ep8_morning did not run (on {f["map"]} at {f["leader"]})')
            b.mark('ep8_morning')
            g = self.arrival_note('ep8_morning')
            party = g.get('party') or [{}]
            exp = [m.get('exp') for m in party]
            src = 'the quick start' if self.start == 'new' else 'the Episode 7 save'
            b.notes.append(f'Episode 8 arrival: Lv {[m.get("level") for m in party]}, {exp} EXP, {g.get("gold")} G ({src}; EP8_START Lv 31, 22,200, 4,300)')
            lead = (party[0] or {}).get('exp') or 0
            if abs(lead - EP8_START['exp']) > 300 or abs((g.get('gold') or 0) - EP8_START['gold']) > 500:
                b.notes.append(f'ARRIVAL OFF EP8_START by {lead - EP8_START["exp"]} EXP and {(g.get("gold") or 0) - EP8_START["gold"]} G: report for E8-battle')
            self.check_slots('the morning')

        def roof(self):
            b = self.b
            if self.has('stair_arrived'):
                return
            f = b.settle()
            if f['map'] == 'ep7_ph_watch':
                b.through('watch_exit', exact=False)
            f = b.settle()
            if f['map'] == 'ep7_palehaven':
                b.through('nave_door', exact=False)
            b.settle(max_s=900)
            if not self.has('ep8_roofed'):
                raise Fail(f'ep8_roof did not run (on {b.settle()["map"]})')
            b.notes.append(f'ep8_roof: {"Yes. (afraid_yes)" if self.has("afraid_yes") else "No. (afraid_no)"}')
            b.mark('ep8_roof')
            if b.settle()['map'] == 'ep7_stillheart':
                b.through('stair_up', exact=False)
            self.ensure_map('ep8_stair')
            b.settle(max_s=900)
            if not self.has('stair_arrived'):
                raise Fail('stair_arrival did not run')
            b.mark('stair')

        def stair(self):
            b = self.b
            if self.has('saw_scriptorium') and b.settle()['map'] != 'ep8_stair':
                return
            self.ensure_map('ep8_stair')
            if self.side:
                self.try_chest('chest_foot')
            if not self.has('first_rub_done'):
                self.trigger([(x, 49) for x in range(10, 21)], 'first_rub_done', 'rub_row', max_s=900)
                g = b.game() or {}
                self.first_fight_s = g.get('playtime')
                b.mark('first_fight_done')
            self.trigger([(x, 48) for x in range(10, 21)], 'first_book_read', 'first_trig', max_s=900)
            b.mark('first_book')
            self.hunt(2, label='the hounds')
            # Gap A: the Willowmere book from its south side
            if self.leader()[1] > 41:
                self.read('pb_willow', (15, 45), 'up', {'a': 'n'}, 'Gap A')
                self.walk([(14, 40), (15, 40)], 'over the willow')
            # the ledge (optional): read from the landing, the chest, back
            if (self.side or self.once) and self.leader()[1] >= 36 and not b.opened('ep8_stair', 'chest_ledge') and not b.opened('ep8_stair', 'chest_ledge_page'):
                try:
                    self.read('pb_ledge', (18, 39), 'right', {'l': 'e'}, 'the ledge', optional=True)
                    self.try_chest('chest_ledge_page' if self.has('drift_started') else 'chest_ledge')
                except Fail as e:
                    b.notes.append(f'the ledge skipped: {e}')
            # Gap B: round to the pocket, read it from the south (it opens north)
            if self.leader()[1] > 33:
                self.read('pb_b', (16, 37), 'up', {'b': 'n'}, 'Gap B')
                self.walk([(x, 31) for x in range(12, 19)], 'over Gap B')
            self.hunt(2, label='the cranes')
            if self.side or True:
                self.try_chest('satchel')
            self.trigger([(x, 27) for x in range(10, 21)], 'eraser_seen', 'rubbed_trig', max_s=900)
            b.mark('rubbed_steps')
            self.arrival_font('desk_save', 'the reading desk')
            if not getattr(self, '_desk_trip', False):
                self._desk_trip = True
                self.round_trip('the reading desk')
                self.ensure_map('ep8_stair')
                self.check_slots('the desk')
            # Gap C: cross on its open pages, close it from the north, reopen it the other way
            if self.leader()[1] > 20:
                if self.books().get('open', {}).get('c') == 's':
                    self.walk([(15, 21)], 'over the open book to its north side')
                    self.read('pb_c', (15, 21), 'down', {'c': '-'}, 'Gap C close')
                self.read('pb_c', (15, 23), 'up', {'c': 'n'}, 'Gap C open')
                self.walk([(14, 18), (15, 18)], 'over Gap C')
            self.map_reads_done('ep8_stair')
            self.trigger([(x, 11) for x in range(11, 25)], 'saw_scriptorium', 'margin_trig', max_s=900)
            b.mark('south_margin')
            b.exit_to((21, 9), label='to the Scriptorium')
            self.ensure_map('ep8_scriptorium')
            b.settle(max_s=900)
            if not self.has('scriptorium_arrived'):
                raise Fail('scriptorium_arrival did not run')
            g = self.arrival_note('Scriptorium')
            self.gold_at['Scriptorium'] = g.get('gold')
            b.notes.append(f'gold at the Scriptorium: {g.get("gold")} G (economy8 binding: 7,810 from the 4,300 quick start), Lv {self.level()}')
            b.mark('scriptorium')

        def town(self):
            b = self.b
            if self.has('library_open') and b.settle()['map'] != 'ep8_scriptorium':
                return
            self.ensure_out()
            self.ensure_map('ep8_scriptorium')
            self.trigger([(x, 27) for x in range(22, 25)], 'read_learned', 'word_trig', max_s=900)
            b.mark('first_word')
            if not getattr(self, '_shopped8', False):
                self._shopped8 = True
                self.atelier(self.TOWN, 'the Scriptorium')
                self.ensure_map('ep8_scriptorium')
                b.through('door_shop')
                self.ensure_map('ep8_sc_shop')
                b.visit_shop('ep8_shopkeeper', [('fresh_ink', 2), ('hi_ether', 1)])
                b.through('shop_exit', exact=False)
            self.ensure_map('ep8_scriptorium')
            if self.side and not self.has('concordance_started'):
                for npc in ('ione', 'fen'):
                    try:
                        self.talk(npc)
                    except Fail as e:
                        b.notes.append(f'talk {npc} skipped: {e}')
            if not self.has('librarian_met'):
                b.through('door_index')
                self.ensure_map('ep8_sc_index')
                self.trigger([(x, 11) for x in range(1, 11)], 'card_read', 'index_trig', max_s=900)
                b.mark('meet_librarian')
                b.interact_no_settle(ent_id='save_bell_index')
                self.save_from_bell(self.run_slot or 1)
                b.close_menu()
                b.through('index_exit', exact=False)
            self.ensure_map('ep8_scriptorium')
            if not self.has('elowen_met'):
                self.talk('elowen')
                b.settle(max_s=900)
                if not self.has('elowen_met'):
                    raise Fail('elowen_scriptorium did not set elowen_met')
                b.notes.append(f'elowen_scriptorium: {"Not really. (told_elowen)" if self.has("told_elowen") else "Every day. (spared_elowen)"}')
                b.mark('elowen')
            if self.side and self.has('concordance_started'):
                try:
                    if not self.has('testimony_elowen'):
                        self.talk('elowen')
                    if self.has('testimony_fen') and self.has('testimony_elowen') and not self.has('concordance_lit'):
                        b.interact(ent_id='folio', label='the Concordance folio')
                        b.settle(max_s=900)
                    b.notes.append(f'concordance: lit {self.has("concordance_lit")}')
                except Fail as e:
                    b.notes.append(f'concordance skipped: {e}')
            self.inn_if_hurt(0.8)
            self.ensure_map('ep8_scriptorium')
            self.trigger([(x, 10) for x in range(20, 27)], 'library_open', 'gate_trig', max_s=900)
            b.mark('library_door')
            f = b.settle()
            if f['map'] == 'ep8_scriptorium':
                # SEAM (story.js library_door, E8-seams): the scene leaves Nox (nox_t) standing on nox_gate (23,9), the one cell in front of
                # the Library door; a player must leave the square and come back. The bot does that by the Index door and logs it.
                if any(a['id'] == 'nox_t' and (a['x'], a['y']) == (23, 9) for a in f['actors']):
                    b.notes.append('SEAM library_door: Nox stays on nox_gate (23,9) in front of the Library door after the scene; out by the Index door and back')
                    b.through('door_index')
                    self.ensure_map('ep8_sc_index')
                    b.through('index_exit', exact=False)
                    self.ensure_map('ep8_scriptorium')
                b.through('library_door', exact=False)
            self.ensure_map('ep8_library_f1')
            b.settle(max_s=900)
            if not self.has('lib_f1_arrived'):
                raise Fail('catalog_arrival did not run')
            b.mark('library_f1')

        def f1(self):
            b = self.b
            if self.has('library_f1_done'):
                return
            self.ensure_map('ep8_library_f1')
            self.arrival_font('font_l1', 'fountain F1')
            if self.side:
                self.try_chest('chest_a')
            self.hunt(2, label='the gallery')
            if not self.has('keeper_memory_a'):
                self.trigger([(x, 17) for x in range(12, 16)], 'keeper_memory_a', 'memory_a_trig', max_s=900)
                b.mark('keeper_memory_a')
            if not b.items().get('ink_key'):
                if self.leader()[1] > 14:
                    self.read('pb_a', (21, 19), 'up', {'a': 'n'}, 'F1 B')
                    self.walk([(21, 13), (22, 13)], 'over a to the island')
                if self.side:
                    self.try_chest('chest_b')
                if self.leader()[0] < 26:
                    self.read('pb_b', (24, 10), 'right', {'b': 'e'}, 'F1 B')
                    self.walk([(30, 10), (30, 11)], 'over b to the wall behind')
                self.hunt(2, label='the wall behind')
                if self.leader()[1] > 7:
                    self.read('pb_ember', (34, 9), 'up', {'c': 'n'}, 'F1 C')
                    self.walk([(32, 5), (33, 3)], 'over the Emberpeak book to the shelf')
                self.try_chest('chest_cache')
                self.hunt(2, label='the shelf')
                if self.leader()[0] > 21:
                    self.read('pb_hollow', (23, 4), 'left', {'h': 'w'}, 'F1 E')
                    self.walk([(15, 4)], 'over the Hollow book')
                self.chest('chest_key')
                if not b.items().get('ink_key') or not self.has('ink_key_found'):
                    raise Fail('chest_key did not give the Original Ink Key')
            self.map_reads_done('ep8_library_f1')
            self.walk([(30, 4), (31, 4), (30, 3)], 'back along the shelf')
            # no font here: F1's fountain is back across all four books, and a walk to it would leave the shelf (and its lift) behind
            # four re-reads after the reload; Optimize and Ethers only
            b.menu_optimize_all()
            if self.ethers() > 2:
                b.top_up_mp(0.3)
            self.round_trip('F1 shelf')
            self.ensure_map('ep8_library_f1')
            self.check_slots('F1')
            self.trigger([(28, 4)], 'library_f1_done', 'lift_trig')
            if b.settle()['map'] == 'ep8_library_f1':
                b.through('lift_up', exact=False)
            self.ensure_map('ep8_library_f2')
            b.settle(max_s=900)
            if not self.has('lib_f2_arrived'):
                raise Fail('palimpsest_arrival did not run')
            b.mark('library_f2')

        def f2(self):
            b = self.b
            if self.has('sentry_defeated'):
                return
            self.ensure_map('ep8_library_f2')
            f = b.settle()
            if self.leader(f)[0] < 11 and self.leader(f)[1] > 13:
                self.arrival_font('font_l2', 'fountain F2 stair')
                self.hunt(2, label='the overwritten stair')
                self.read('pb_valewyn', (6, 16), 'right', {'v': 'e'}, 'F2 B')
                self.walk([(11, 16), (11, 17)], 'over Valewyn to the island')
            if not self.has('keeper_memory_b'):
                self.trigger([(x, 15) for x in range(11, 17)], 'keeper_memory_b', 'memory_b_trig', max_s=900)
                b.mark('keeper_memory_b')
            self.hunt(2, label='the printing room')
            if self.leader()[1] > 7:
                self.read('pb_w', (13, 11), 'up', {'w': 'n', 'v': '-'}, 'F2 B')
                self.walk([(13, 6), (14, 6)], 'over w to the landing')
            if self.leader()[0] < 23:
                self.read('pb_desert', (21, 4), 'right', {'x': 'e', 'y': '-'}, 'F2 C')
                self.walk([(27, 5), (27, 4)], 'over the desert book')
            f = b.settle()
            if self.leader(f)[1] < 7:
                self.read('pb_y', (28, 5), 'down', {'y': 's', 'x': '-'}, 'F2 C')
                self.walk([(27, 11), (28, 11)], 'down the wrong version')
            self.map_reads_done('ep8_library_f2')
            self.arrival_font('font_l2b', 'fountain F2 Seal Gallery')
            self.try_chest('chest_gallery')
            self.hunt(2, label='the Seal Gallery')
            self.keep('before the Sentry', reserve=0, frac=0.6)
            self.arrival_font('font_l2b', 'fountain F2 before the Sentry')
            self.round_trip('F2 Seal Gallery')
            self.ensure_map('ep8_library_f2')
            self.check_slots('F2')
            for attempt in range(5):
                if self.has('sentry_defeated'):
                    break
                if attempt:
                    b.notes.append(f'Unnamed Sentry attempt {attempt + 1} (Lv {self.level()})')
                    self.arrival_font('font_l2b', 'fountain F2 again')
                    self.keep('before the Sentry again', reserve=0, frac=0.6)
                b.mark('unnamed_sentry')
                b.walk_to([(25, y) for y in range(19, 22)], label='sentry_trig')
                b.settle(max_s=1500)
            if not self.has('sentry_defeated'):
                raise Fail('the Unnamed Sentry did not fall in 5 attempts')
            self.keep('after the Sentry')

        def town_trip(self):
            """library_f2_done, down the Seal Gallery cage to F1's fountain, the stair to the Scriptorium, the two pre-F3 pieces,
            and back up: the Library door, F1's lift to the Seal Gallery, the lift to F3 (plan 5.4 and 7.6)."""
            b = self.b
            if self.has('lib_f3_arrived'):
                return
            self.ensure_map('ep8_library_f2')
            self.trigger([(22, 12)], 'library_f2_done', 'lift_trig')
            g = b.game() or {}
            self.gold_at['before F3'] = g.get('gold')
            b.notes.append(f'gold before F3: {g.get("gold")} G (economy8 binding: 11,160), Lv {self.level()}')
            if not getattr(self, '_tripped', False):
                self._tripped = True
                b.through('lift_l2_down', exact=False)
                self.ensure_map('ep8_library_f1')
                b.through('to_scriptorium', exact=False)
                self.ensure_map('ep8_scriptorium')
                self.atelier(self.PRE_F3, 'before F3')
                self.inn_if_hurt(0.9)
                self.ensure_map('ep8_scriptorium')
                b.through('library_door', exact=False)
                self.ensure_map('ep8_library_f1')
                b.through('lift_l1_up', exact=False)
                self.ensure_map('ep8_library_f2')
                b.notes.append('two-way lifts: F2 Seal Gallery -> F1 fountain -> the Scriptorium -> F1 -> F2 Seal Gallery, no read needed')
            f = b.settle()
            if f['map'] == 'ep8_library_f2':
                b.through('lift_up', exact=False)
            self.ensure_map('ep8_library_f3')
            b.settle(max_s=900)
            if not self.has('lib_f3_arrived'):
                raise Fail('unwritten_arrival did not run')
            b.mark('library_f3')

        def f3(self):
            b = self.b
            if self.has('name_told'):
                return
            self.ensure_map('ep8_library_f3')
            self.arrival_font('font_l3', 'fountain F3')
            if not self.has('keeper_memory_c'):
                self.trigger([(x, 35) for x in range(8, 27)], 'keeper_memory_c', 'memory_c_trig', max_s=900)
                b.mark('keeper_memory_c')
            if self.leader()[1] > 26:
                self.read('pb_s', (24, 28), 'up', {'s': 'n'}, 'F3 SEE')
                self.walk([(23, 24), (24, 24)], 'over SEE')
            self.hunt(2, label='SHELTER')
            if self.leader()[1] > 20:
                self.read('pb_isles', (21, 22), 'up', {'i': 'n'}, 'F3 SHELTER')
                self.walk([(23, 18), (23, 19)], 'over the isles book into the pocket')
            if self.leader()[1] > 16 and self.books().get('open', {}).get('n') == '-':
                self.read('pb_north', (23, 17), 'right', {'n': 'e', 'i': '-'}, 'F3 SHELTER')
                self.walk([(21, 16), (22, 16)], 'through the neck to CHOOSE')
            self.hunt(2, label='CHOOSE')
            if self.leader()[1] > 13:
                if self.choose_book == 'c1':
                    self.read('pb_c1', (13, 15), 'up', {'c1': 'n'}, 'F3 CHOOSE')
                    self.walk([(13, 11), (14, 11)], 'over c1 to the keyhole')
                else:
                    self.read('pb_c2', (21, 15), 'up', {'c2': 'n'}, 'F3 CHOOSE')
                    self.walk([(20, 11), (21, 11)], 'over c2 to the keyhole')
                b.notes.append(f'CHOOSE by {self.choose_book}')
            self.map_reads_done('ep8_library_f3')
            if not self.has('name_told'):
                self.trigger([(x, 11) for x in range(12, 23)], 'name_told', 'name_trig', max_s=900)
                b.mark('the_name')
            if self.side:
                self.try_chest('chest_ink')

        def eraser8(self):
            b = self.b
            if self.has('eraser_defeated'):
                return
            f = b.settle()
            if f['map'] == 'ep8_library_f3':
                self.keep('the ink door', reserve=0, frac=0.9)
                b.notes.append(f'into the Last Word with {self.ethers()} Ethers, {b.items().get("fresh_ink", 0)} Fresh Ink, Lv {self.level()}')
                self.round_trip('before the Eraser')
                self.ensure_map('ep8_library_f3')
            prefer = [ENDING_LABEL[self.ending], 'Yes.']
            for attempt in range(5):
                f = b.settle(prefer=prefer)
                if f['map'] == 'ep8_library_f3':
                    b.through('ink_door', exact=False)
                self.ensure_map('ep8_last_word')
                if attempt == 0:
                    b.mark('eraser')
                b.notes.append(f'Eraser attempt {attempt + 1}: Lv {self.level()}')
                self.level_at['Eraser'] = [m.get('level') for m in ((b.game() or {}).get('party') or [])]
                b.walk_to([(x, 17) for x in range(3, 25)], label='eraser_trig', prefer=prefer)
                b.settle(prefer=prefer, max_s=1800)
                if self.has('eraser_defeated'):
                    break
                self.keep('before the Eraser again', reserve=0, frac=0.9)
            if not self.has('eraser_defeated'):
                raise Fail('the Eraser did not fall in 5 attempts')
            b.settle(prefer=prefer, max_s=900)
            if not self.has('keeper_named') or not b.items().get('name_fragment_8'):
                raise Fail('eraser_after did not name the First Keeper and give the eighth fragment')
            b.mark('eraser_after')
            self.erase_summary()

        def erase_summary(self):
            b = self.b
            log = self.erase_log()
            for enc in ('e8s_first', 'unnamed_sentry', 'eraser'):
                ev = [e for e in log if e.get('enc') == enc]
                if not ev:
                    continue
                pins = sum(1 for e in ev if e['type'] == 'unwrite_pin' and not e.get('moved'))
                ended = collections.Counter(e.get('reason') for e in ev if e['type'] == 'unwrite_broken')
                landed = sum(1 for e in ev if e['type'] == 'unwrite_land')
                sil = sum(1 for e in ev if e['type'] == 'silence')
                sil_end = collections.Counter(e.get('reason') for e in ev if e['type'] == 'silence_broken')
                rubs = collections.Counter(f'{e.get("target")}:{e.get("command")}' for e in ev if e['type'] == 'rub')
                reads = collections.Counter(e.get('target') for e in ev if e['type'] == 'read')
                b.notes.append(f'{enc}: Unwrites {pins} (ended {dict(ended)}, landed {landed}); Last Silences {sil} (ended {dict(sil_end)}, '
                               f'landed {max(0, sil - sum(sil_end.values()))}); Read Aloud casts on {dict(reads)}; rubs {dict(rubs)}')

        def ending8(self):
            b = self.b
            if self.has('ep8_complete') and (b.game() or {}).get('counters', {}).get('credits8_rolled'):
                return
            prefer = [ENDING_LABEL[self.ending], 'Yes.']
            f = b.settle(prefer=prefer, max_s=900)
            got = 'return' if self.has('ending_return') else 'choose' if self.has('ending_choose') else None
            if got is None:
                # No twice over would leave it open: the lectern asks again
                b.walk_to([(x, 10) for x in range(13, 16)], label='lectern_trig', prefer=prefer)
                b.settle(prefer=prefer, max_s=900)
                got = 'return' if self.has('ending_return') else 'choose' if self.has('ending_choose') else None
            if got != self.ending:
                raise Fail(f'the ending is {got}, the run asked for {self.ending}')
            b.notes.append(f'ENDING {got} (ending_{got}); the other ending flag set: {self.has("ending_choose" if got == "return" else "ending_return")}')
            if not self.has('page_shelved') or not self.has('hero_kept'):
                raise Fail('last_page did not shelve the page and keep the name')
            b.mark('last_page')
            f = b.settle()
            if f['map'] == 'ep8_last_word':
                b.through('square_return', exact=False)
            self.ensure_map('ep8_scriptorium')
            b.settle(max_s=900)
            if not self.has('scriptorium_open'):
                raise Fail('scriptorium_open did not run on the way back into the square')
            b.mark('scriptorium_open')
            self.trigger([(x, 33) for x in range(21, 26)], 'home_reached', 'home_trig', max_s=900)
            b.notes.append(f'home: {"I did. (told_hazel)" if self.has("told_hazel") else "No. (spared_hazel)"}')
            b.mark('home')
            self.ensure_map('ep8_bell_night')
            f = b.settle(max_s=900)
            b.mark('bell_night')
            steps = {e['script']: tuple(e['cells'][0]) for e in f['ents'] if e['type'] == 'trigger' and e['script']}
            for n in range(1, 13):
                cell = steps.get(f'ep8_toll_{n}')
                if not cell:
                    raise Fail(f'ep8_bell_night has no trigger for ep8_toll_{n}')
                b.walk_to([cell], label=f'ep8_toll_{n}')
                b.settle()
                if not self.has(f'ep8_toll_{n}'):
                    raise Fail(f'ep8_toll_{n} did not toll on its step {cell}')
            b.notes.append('the bell night: all twelve tolls')
            top = steps.get('thirteenth_name')
            if not top:
                raise Fail('ep8_bell_night has no thirteenth_name trigger')
            b.mark('thirteenth')
            b.walk_to([(12, 6)], label='trig_thirteenth')
            ended = False
            for _ in range(900):
                sc = b.handle()
                fs = b.field() or {}
                if not ended and self.has('ep8_complete'):
                    ended = True
                    b.mark('ep8_end_title')       # story_time.py: the end of the first play (the credits are excluded)
                if self.has('ep8_complete') and sc == 'field' and fs.get('map') == 'hero_home' and not fs.get('locked') and not fs.get('running'):
                    break
            if not self.has('ep8_complete'):
                raise Fail(f'ep8_complete was not set (on {(b.field() or {}).get("map")})')
            f = b.settle()
            if f['map'] != 'hero_home':
                raise Fail(f'after the Episode 8 credits the party woke on {f["map"]}, not hero_home')
            if not (b.game() or {}).get('counters', {}).get('credits8_rolled'):
                raise Fail('credits8_rolled was not counted')
            b.notes.append(f'woke at {f["map"]} {f["leader"]}')
            b.mark('ep8_credits_done')
            self.check_slots('the credits')

        def postgame(self):
            """The post-game (plan 12): home, the world map stone to Palehaven, the nave door to the roof, the Stair (its page lift
            from the foot to the Margin), the Scriptorium, lexicon_door into the Last Word, then save and reload; no ending scene
            plays again. The Deep Stacks' first floor is through Willowmere's library trapdoor while the Stacks are live."""
            b = self.b
            if not self.postgame_on or not self.has('ep8_complete'):
                return
            seen = set(self.b.js("Object.keys(LQ_ENGINE.game.flags).filter(k => LQ_ENGINE.game.flags[k])") or [])
            b.menu_talk()
            b.mark('postgame')
            f = b.settle()
            if f['map'] == 'hero_home':
                door = next((e['id'] for e in f['ents'] if e['type'] == 'door' and e.get('to') and e['to'][0] == 'willowmere'), None)
                if not door:
                    raise Fail('hero_home has no door to Willowmere')
                b.through(door, exact=False)
            self.ensure_map('willowmere')
            self.travel('palehaven')
            self.ensure_map('ep7_palehaven')
            b.through('nave_door', exact=False)
            self.ensure_map('ep7_stillheart')
            b.settle(max_s=300)
            b.through('stair_up', exact=False)
            self.ensure_map('ep8_stair')
            b.through('lift_foot', exact=False)
            b.settle()
            b.exit_to((21, 9), label='to the Scriptorium (post-game)')
            self.ensure_map('ep8_scriptorium')
            b.settle(max_s=300)
            b.through('lexicon_door', exact=False)
            self.ensure_map('ep8_last_word')
            b.settle(max_s=300)
            b.mark('postgame_last_word')
            self.round_trip('the Last Word, post-game')
            after = set(self.b.js("Object.keys(LQ_ENGINE.game.flags).filter(k => LQ_ENGINE.game.flags[k])") or [])
            if after - seen:
                raise Fail(f'the post-game walk set story flags {sorted(after - seen)} (an ending scene ran again?)')
            b.notes.append('post-game: Willowmere -> Palehaven (map stone) -> the roof -> the Stair (page lift) -> the Scriptorium -> lexicon_door -> the Last Word, save and reload, no new flag')

        def travel(self, town):
            """The world map from a town's map stone: pick `town` in the list with real keys, confirm."""
            b = self.b
            f = b.settle()
            stone = next((e['id'] for e in f['ents'] if e['id'].startswith('wm_stone')), None)
            if not stone:
                raise Fail(f'no map stone on {f["map"]}')
            b.interact_no_settle(ent_id=stone)
            b.page.wait_for_function("LQ_DEBUG.scene() === 'worldmap' && LQ_ENGINE.scene.debugState().composed", timeout=30000, polling=50)
            b.frames(10)
            ss = "LQ_ENGINE.scene.debugState()"
            for _ in range(20):
                st = b.js(ss) or {}
                if st.get('sel') == town:
                    break
                want = (st.get('towns') or []).index(town)
                b.tap('down' if want > (st.get('index') or 0) else 'up', 6)
            st = b.js(ss) or {}
            if st.get('sel') != town or (st.get('ok') or {}).get(town) != 'ok':
                raise Fail(f'the world map list: {town} not chosen or not open ({st.get("sel")}, {st.get("ok")})')
            b.tap('confirm', 10)
            for _ in range(400):
                sc = b.handle()
                fs = b.field() or {}
                if sc == 'field' and fs.get('map') and fs.get('map') != f['map']:
                    break
            b.settle()

        def run(self):
            b = self.b
            b.mark('boot')
            phases = [('ep8_start', self.title_start), ('ep8_morning', self.morning), ('roof', self.roof), ('stair', self.stair),
                      ('town', self.town), ('library_f1', self.f1), ('library_f2', self.f2), ('town_trip', self.town_trip),
                      ('library_f3', self.f3), ('eraser', self.eraser8), ('ending', self.ending8), ('postgame', self.postgame)]
            for step_id, fn in phases:
                print(f'-- {step_id}', flush=True)
                if step_id == 'ep8_morning' and self.has('ep8_roofed'):
                    continue
                fn()
                if step_id == 'ep8_start':
                    b.js(ERASE_LOG_JS)
                if b.resume and step_id == 'ep8_start':
                    b.resume = None
                    self.ensure_any()
                b.check_errors()
                if self.until == step_id:
                    print(f'stopping after {step_id} (--until)', flush=True)
                    break
            self.check_slots('the end')
            total = sum(self.reads.values())
            b.notes.append(f'BOOKS main path {total} decisions (plan 16): {dict(self.reads)}; optional {dict(self.optional_reads)}; refusals {len(self.refusals)}')
            if total > 16:
                raise Fail(f'{total} main-path book decisions, over the plan\'s 16')
            g = b.game() or {}
            (ap.OUT / f'{b.device}-books.json').write_text(json.dumps({
                'reads': self.read_log, 'main': dict(self.reads), 'optional': dict(self.optional_reads), 'refusals': self.refusals,
                'gold': self.gold_at, 'levels': self.level_at, 'first_fight_s': self.first_fight_s, 'ending': self.ending,
                'choose': self.choose_book, 'start': self.start, 'final_level': [m.get('level') for m in g.get('party') or []],
                'erase': self.erase_log()}, indent=1), encoding='utf-8')
            if self.has('ep8_complete'):
                warn = {w for w in b.warnings if re.search(r'unknown .*\bid\b|unknown (object|target|sprite|map|item|npc|encounter|scene)|no actor|no path|no scene', w, re.I)}
                seams = sorted(w for w in warn if any(k in w for k in KNOWN_SEAM_WARNINGS))
                if seams:
                    b.notes.append(f'SEAM warnings (reported, not a bot failure): {seams}')
                bad = sorted(warn - set(seams))
                if bad:
                    raise Fail(f'{len(bad)} unknown-id or staging warnings: {bad[:6]}')
                b.notes.append('warnings: no "unknown ... id", "no actor", "no path" or "no scene" line in the run')

    return types.SimpleNamespace(Episode8=Episode8, fixture=fixture, BUDGET=BUDGET, BOOKS_JS=BOOKS_JS)
