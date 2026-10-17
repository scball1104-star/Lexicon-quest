"""Writes next/assets/audio/README.md from the generators' intent strings and measured stats."""
from __future__ import annotations

from pathlib import Path

HERE = Path(__file__).resolve().parent
NEXT = HERE.parent.parent

GROUP_TITLES = [
    ("ui", "Menus and interface"),
    ("text", "Dialogue text blips"),
    ("foot", "Footsteps"),
    ("field", "Field and dungeon"),
    ("story", "Story moments"),
    ("weapon", "Battle: weapon swings"),
    ("impact", "Battle: impacts"),
    ("magic", "Battle: magic and techs"),
    ("status", "Battle: status effects"),
    ("big", "Battle: big moments"),
    ("loot", "Loot drops (rarity)"),
]

HEADER = """# Lexicon Quest NEXT: sound effects, jingles and ambience

Everything in `sfx/`, `jingles/` and `ambience/` is synthesized in code by `next/tools/audio/` (Python +
numpy/scipy). Nothing here is sampled or downloaded, and every melody is original. This file is generated
by `python next/tools/audio/build.py`; edit the generators, not the WAVs.

**How to audit by ear.** Each row says what the sound is meant to be. Play the file and ask: does it read
as that, at a glance, in the classic SNES / Dragon Quest / Final Fantasy idiom, without harshness? If not,
note the id and the one change you want ("cursor: a little lower and softer"). The designs live in
`tools/audio/sfx_defs.py` (SFX), `jingles.py` (note-by-note scores) and `ambience.py`.

## Formats and levels

| Kind | Format | Level target |
|---|---|---|
| SFX | WAV 16-bit mono 22050 Hz | per group, max 200 ms K-weighted loudness: UI -19 (cursor -21), text -25, footsteps -27, field -18, story -17, weapons -15, impacts -14, magic -15.5, status -16.5, big moments -14, loot -16 |
| Jingles | MP3 stereo 32 kHz 160 kbps (WAV masters in `tools/audio/out/jingles_wav/`) | about -17 LUFS integrated, just under the music |
| Ambience | WAV 16-bit mono, seamless loop (river 22050 Hz; archive and wind 16000 Hz, nothing above 8 kHz) | -22 LUFS integrated (about 11 dB under the music at default sliders); the runtime plays two copies half a loop apart panned left/right for a wide stereo bed |
| Music | MP3 (Suno or code-composed) | manifest `volume` brings each track to about -16 LUFS |

Every file: true peak <= -1 dBFS, DC removed, 2 ms fade-in / 5 ms fade-out (loops excepted), TPDF dither.
Runtime sliders (master, music, sfx, ambience) multiply on top; jingles follow the music slider.
Jingles are MP3 because they never loop (encoder padding is harmless) and it saves about 2.7 MB; SFX stay
WAV for sample-accurate timing, ambience stays WAV so the loops are gapless.

## Runtime

`next/src/core/audio.js`, `createAudio({basePath})`. See the header comment there for the API. Ids below
are the exact ids to pass to `audio.sfx(id)`, `audio.jingle(id)` and `audio.ambience(id)`. Unknown ids are
silent no-ops. `text_blip` is an alias of `text_blip_mid`. Ids with several files pick a random variant
(never the same twice in a row); `vary` adds random pitch variance (fraction).

## Cue guide (where each sound belongs)

| Moment | Calls |
|---|---|
| Boot | `audio.preload(['jingle:item_get', 'jingle:level_up', 'jingle:victory_fanfare', 'battle'])` so the first chest and battle are instant |
| Menus | `cursor` on move (also on auto-repeat), `confirm`, `cancel`, `buzzer` for an invalid choice, `menu_open` / `menu_close`, `equip`, `buy`, `save_chime` |
| Dialogue | `text_blip_low/mid/high` every 2 to 3 visible characters (skip spaces), one voice per speaker; `emote_pop` with a balloon |
| Chest | `chest_open`, then about 0.35 s later `await audio.jingle('item_get')` (story items: `key_item`; battle loot: `drop_common/magic/rare/legendary` by rarity instead) |
| Doors and stairs | `door_open` when entering, `door_close` after the fade, `stairs` on stair exits, `door_locked` without a key, `door_unlock` with one |
| Dungeon toolkit | `block_push` per tile, `switch_on` / `switch_off`, `gate_open`, `crystal_hit`, `bridge_appear`, `lantern_reveal`, `brazier_light`, `shelf_move`, `jump` + `land` on ledges, `fall` into pits, `splash`, `pot_break` |
| Battle start | `sfx('encounter')` with the swirl, then `pushMusic('battle')` (boss: `pushMusic('boss_archivore')`) |
| Attacks | swing (`sword_slash`, `spear_thrust`, `staff_hit`, `axe_chop`, `bow_shot`) at the wind-up, then `hit_light` / `hit_heavy` / `crit` / `miss` on contact; `defend` for guards and blocked hits |
| Spells and states | `fire`, `ice`, `thunder`, `heal`, `revive`, `item_use`, `buff`, `debuff`, `poison`, `stun`; `break` when shields hit 0; `fury_ready` when the gauge fills, `fury_art` on use; `combo_start`; `telegraph` when a big move is announced |
| Enemy defeated | `enemy_die` (boss: `boss_die`) |
| Victory | `stopMusic(0.2)`, `await jingle('victory_fanfare', { duckMusic: false })`, `music('victory')` (silent until a track exists), level up: `jingle('level_up')` + `sfx('level_up_sparkle')`, then `popMusic(0.8)` back to the field track at its old position |
| Defeat | `stopMusic(0.5)`, `await jingle('gameover_sting', { duckMusic: false })`, `music('gameover')` |
| Inn / save | `await jingle('inn_rest')` across the fade to black (music pauses and resumes); the chapel Bell: `jingle('save')` |
| Party / quests | `party_join` when Mira or Bram joins, `quest_done` for side quests |
| Story | `bell_toll` (the Thirteenth Bell), `bell_peal`, `sign_fade`, `name_restore`, `door_rumble`, `ink_gurgle`, `page_flutter`, `summon`, `name_devour` |
| Ambience | map `ambience:` field: `river_birds` (Willowmere, riverside valley), `wind_valley` (open meadow, pilgrim road), `archive_hush` (all Archive floors) |
"""


def _fmt_dur(d):
    return f"{d * 1000:.0f} ms" if d < 1 else f"{d:.2f} s"


def write(man: dict, stats: dict):
    import sfx_defs
    try:
        import jingles
        JREG = jingles.REG
    except Exception:  # noqa: BLE001
        JREG = {}
    try:
        import ambience
        AREG = ambience.REG
    except Exception:  # noqa: BLE001
        AREG = {}
    lines = [HEADER]
    lines.append("## Sound effects\n")
    for grp, title in GROUP_TITLES:
        ids = [i for i, r in sfx_defs.REG.items() if r["group"] == grp and i in man["sfx"]]
        if not ids:
            continue
        lines.append(f"### {title}\n")
        lines.append("| id | length | files | intent |")
        lines.append("|---|---|---|---|")
        for i in ids:
            e = man["sfx"][i]
            n = len(e["src"]) if isinstance(e["src"], list) else 1
            extra = []
            if e.get("vary"):
                extra.append(f"vary {e['vary']}")
            if e.get("maxVoices"):
                extra.append(f"max {e['maxVoices']} voices")
            note = f" ({', '.join(extra)})" if extra else ""
            lines.append(f"| `{i}` | {_fmt_dur(e['duration'])} | {n}{note} | {sfx_defs.REG[i]['intent']} |")
        lines.append("")
    lines.append("## Jingles\n")
    lines.append("| id | length | intent |")
    lines.append("|---|---|---|")
    for i, r in JREG.items():
        if i in man["jingles"]:
            lines.append(f"| `{i}` | {_fmt_dur(man['jingles'][i]['duration'])} | {r['intent']} |")
    lines.append("")
    lines.append("## Ambience loops\n")
    lines.append("| id | length | intent |")
    lines.append("|---|---|---|")
    for i, r in AREG.items():
        if i in man["ambience"]:
            lines.append(f"| `{i}` | {_fmt_dur(man['ambience'][i]['duration'])} | {r['intent']} |")
    lines.append("")
    lines.append("## Music ids\n")
    lines.append("| id | source now | fallback while src is null |")
    lines.append("|---|---|---|")
    for i, e in man["music"].items():
        if i.startswith("_"):
            continue
        lines.append(f"| `{i}` | {e['src'] or '(none yet)'} | {e.get('fallback') or 'silence'} |")
    lines.append("")
    lines.append("## Regenerate and check\n")
    lines.append("```bash")
    lines.append("python next/tools/audio/build.py            # all sounds + manifest + this README")
    lines.append("python next/tools/audio/build.py --manifest # after dropping new music into assets/audio/music/")
    lines.append("python next/tools/audio/review.py           # waveform + spectrogram contact sheets in tools/audio/out/")
    lines.append("python next/tools/audio/music_scan.py       # measure music loudness, find loop points -> music_levels.json")
    lines.append("python next/tools/audio/score_check.py      # jingle piano rolls, chords per beat, clashes, stem balance")
    lines.append("python next/tools/audio/browser_check.py    # decode every file in headless Chromium and drive audio.js")
    lines.append("node --test next/qa/audio/*.test.mjs        # manifest + WAV integrity, runtime import and logic")
    lines.append("```")
    lines.append("")
    text = "\n".join(lines)
    text = text.replace(chr(0x2014), " - ")  # never ship an em dash
    (NEXT / "assets" / "audio" / "README.md").write_text(text, encoding="utf-8")
