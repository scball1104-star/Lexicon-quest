"""Jingles for Lexicon Quest NEXT, written as tracker scores (see tracker.py for the syntax).

All melodies are original. Several use the score's shared four-note "name" motif (rising fifth,
whole-step lift, falling major third; e.g. G-D-E-C), the same leitmotif the music tracks use, so
the jingles feel like part of one soundtrack.

Each entry: fn() -> stereo float array at RENDER_SR. build.py masters to -17 LUFS and writes
assets/audio/jingles/<id>.wav (16-bit stereo 22050 Hz).
"""
from __future__ import annotations

from tracker import Song, Track, render

REG: dict = {}


def jingle(id_, intent, target=None, keep=0.75):
    """keep = seconds of ring-out kept after the last note ends (then a smooth fade)."""
    def deco(fn):
        REG[id_] = dict(id=id_, fn=lambda: render(fn()), intent=intent, target=target, keep=keep, song=fn)
        return fn
    return deco


@jingle("item_get", "Ordinary item received (chest, gift). About 2 s. A quick bright flourish (C-E-G up, F-A) "
        "that lands on a held G over a plagal IV-I cadence. Brass and pulse lead, harp sparkle, timpani on the "
        "resolution. In D major.")
def item_get():
    lead = "C6:16 E6:16 G6:8 F6:8 A6:8 G6:2"
    return Song(bpm=152, transpose=2, tail=1.0, tracks=[
        Track("brass", lead, vol=0.7, pan=-0.05, rev=0.18, echo=0.12),
        Track("pulse", lead, vol=0.32, pan=0.2, rev=0.1, echo=0.3),
        Track("brass", "[E5,G5]:4 [F5,A5]:4 [E5,G5,C6]:2", vol=0.3, pan=-0.35, rev=0.2, seed=2),
        Track("strings", "[C4,G4,E5]:4 [C4,A4,F5]:4 [C4,G4,E5]:2", vol=0.32, pan=0.35, rev=0.25),
        Track("tri_bass", "C3:4 F2:4 C3:2", vol=0.45),
        Track("harp", "r:2 C5:16 E5:16 G5:16 C6:16 E6:16 G6:16 C7:8", vol=0.4, pan=0.35, rev=0.3),
        Track("bell", "r:2 G6:2", vol=0.35, pan=-0.2, rev=0.3, echo=0.2),
        Track("timpani", "r:2 C3:4", vol=0.5, rev=0.2),
        Track("crash", "r:2 C5:4", vol=0.22, vel=0.6, pan=0.25, rev=0.2),
    ])


@jingle("key_item", "Story key item obtained (Lantern of Recall, keys, letters, the name fragment). About 3.5 s. "
        "A shimmering Lydian harp arpeggio (Cmaj7, then D over a C pedal, the 'wonder' chord) under a bell and "
        "flute line B-A-F#-G, resolving to a warm horn chord with timpani and a cymbal swell. In Eb major.", keep=1.0)
def key_item():
    return Song(bpm=108, transpose=3, tail=1.4, reverb=dict(t60=1.8, bright=0.65, predelay=0.02), tracks=[
        Track("flute", "r:4 B5:4 A5:8. F#5:16 G5:2", vol=0.72, pan=0.12, rev=0.3, echo=0.1),
        Track("bell", "r:4 B6:4 A6:8. F#6:16 G6:2", vol=0.5, pan=-0.15, rev=0.35, echo=0.3),
        Track("harp", "C5:16t E5:16t G5:16t B5:16t D6:16t E6:16t r:4 D5:16t F#5:16t A5:16t D6:16t F#6:16t A6:16t "
                      "C5:16t E5:16t G5:16t C6:16t E6:16t G6:16t C7:4", vol=0.45, pan=-0.3, rev=0.35),
        Track("strings", "[E4,G4,B4]:2 [D4,F#4,A4]:4 [E4,G4,C5]:2", vol=0.22, pan=0.3, rev=0.35),
        Track("tri_bass", "C3:2. C2:2", vol=0.36),
        Track("horn", "r:2. [G4,C5,E5]:2", vol=0.3, pan=-0.1, rev=0.3),
        Track("timpani", "r:2. C2:4", vol=0.45, rev=0.3),
        Track("swell", "r:2 C5:4", vol=0.9, pan=0.2, rev=0.3),
        Track("triangle", "r:2. C5:4", vol=0.6, pan=0.4, rev=0.4),
    ])


@jingle("level_up", "Level up. About 3 s, energetic and triumphant. Three rising triplet pickups land on C, D, "
        "then a held E: the melody climbs over the heroic bVI-bVII-I cadence (Ab-Bb-C) with octave bass, "
        "timpani roll and a crash. In C major.")
def level_up():
    lead = "Eb5:8t F5:8t G5:8t C6:4> F5:8t G5:8t Bb5:8t D6:4> G5:8t B5:8t D6:8t E6:2.>"
    return Song(bpm=176, tail=1.0, tracks=[
        Track("brass", lead, vol=0.72, rev=0.18, echo=0.12),
        Track("pulse", lead, vol=0.32, pan=0.28, rev=0.1, echo=0.3),
        Track("brass", "r:4 [Eb5,Ab5]:4 r:4 [F5,Bb5]:4 r:4 [G5,C6]:2.", vol=0.36, pan=-0.32, rev=0.2, seed=3),
        Track("strings", "[Ab4,C5,Eb5]:2 [Bb4,D5,F5]:2 [C5,E5,G5]:1", vol=0.32, pan=0.32, rev=0.25),
        Track("tri_bass", "Ab2:8 Ab3:8 Ab2:8 Ab3:8 Bb2:8 Bb3:8 Bb2:8 Bb3:8 C3:8 C4:8 C3:8 C4:8 C3:2", vol=0.38),
        Track("timpani", "r:4 Ab2:4 r:4 Bb2:4 r:4 C3:16@0.35 C3:16@0.4 C3:16@0.45 C3:16@0.5 C3:16@0.56 C3:16@0.62 "
                         "C3:16@0.7 C3:16@0.78 C3:4@0.9", vol=0.45, vel=0.7, rev=0.2),
        Track("snare", "r:1 r:8 C4:16 C4:16 C4:4>", vol=0.4, pan=0.1, rev=0.15),
        Track("crash", "r:1 r:4 C5:4", vol=0.3, pan=-0.2, rev=0.2),
        Track("bell", "r:1 r:4 C7:8 E7:8 G7:4", vol=0.22, pan=0.3, rev=0.3, echo=0.3),
    ])


@jingle("inn_rest", "Resting at the inn. About 4.5 s. A gentle 3/4 lullaby: flute sighs C-A-F, Bb-A-G, settling on "
        "A over harp arpeggios, then a small celesta 'morning' chime as the screen comes back. In F major.", keep=1.1)
def inn_rest():
    return Song(bpm=120, tail=1.4, reverb=dict(t60=1.8, bright=0.5, predelay=0.02), echo=dict(beats=1.0, feedback=0.3, lp=3200), tracks=[
        Track("flute", "C6:4 A5:4 F5:4 | Bb5:4. A5:8 G5:4 | A5:2", vol=0.6, pan=0.05, rev=0.35, echo=0.12),
        Track("harp", "F3:8 A3:8 C4:8 F4:8 A4:8 C5:8 | G3:8 Bb3:8 D4:8 F4:8 C4:8 Bb4:8 | "
                      "F3:16 A3:16 C4:16 F4:16 A4:16 C5:16 F5:8", vol=0.5, pan=-0.28, rev=0.3),
        Track("strings", "[A4,C5]:2. | [G4,Bb4,D5]:2 [G4,Bb4,E5]:4 | [A4,C5,F5]:2", vol=0.28, pan=0.3, rev=0.35, vel=0.6),
        Track("pizz_bass", "F2:2. | G2:2 C3:4 | F2:2", vol=0.5),
        Track("celesta", "r:2. r:2. r:4 r:8 C7:8 F7:4", vol=0.4, pan=0.25, rev=0.3, echo=0.4),
    ])


@jingle("save", "Game saved at the chapel Bell. About 3 s. One warm bell strike, a soft organ 'amen' (F, Bb over F, "
        "F) and a celesta neighbor-tone line C-D-C, with a harp arpeggio at the close. In F major.", keep=1.2)
def save():
    return Song(bpm=92, tail=1.6, reverb=dict(t60=2.0, bright=0.5, predelay=0.025), tracks=[
        Track("celesta", "C6:4 D6:4 C6:2", vol=0.75, pan=0.2, rev=0.3, echo=0.25),
        Track("chapel_bell", "C5:1", vol=0.55, pan=-0.1, rev=0.4),
        Track("organ", "[F3,A3,C4,F4]:4 [F3,Bb3,D4,F4]:4 [F3,A3,C4,F4]:2", vol=0.36, rev=0.4),
        Track("harp", "r:2 F4:16 A4:16 C5:16 F5:16 A5:16 C6:16 F6:4", vol=0.35, pan=-0.3, rev=0.3),
        Track("pizz_bass", "F2:4 Bb1:4 F2:2", vol=0.4),
    ])


@jingle("quest_done", "Side quest completed (Tess's letters, favors). About 3.5 s. A bright tutti statement: D "
        "major arpeggio up, G to E over G-A7, resolving to a held D with a snare pickup, crash and harp run. "
        "In D major.")
def quest_done():
    lead = "A4:8 D5:8 F#5:8 A5:8 | G5:4. E5:8 | F#5:8 A5:8 D6:2>"
    return Song(bpm=132, tail=1.1, tracks=[
        Track("brass", lead, vol=0.72, rev=0.18, echo=0.12),
        Track("pulse", lead, vol=0.3, pan=0.25, rev=0.1, echo=0.28),
        Track("brass", "[F#4,A4]:2 | [B4,D5]:4. [C#5,E5]:8 | [A4,D5]:4 [A4,D5,F#5]:2", vol=0.33, pan=-0.3, rev=0.2, seed=4),
        Track("strings", "[D4,F#4,A4]:2 [D4,G4,B4]:4. [C#4,E4,G4]:8 [D4,F#4,A4,D5]:4+2", vol=0.32, pan=0.3, rev=0.25),
        Track("tri_bass", "D3:4 A2:4 | G2:4. A2:8 | D3:8 D3:8 D2:2", vol=0.42),
        Track("timpani", "D3:4 r:2. D3:4", vol=0.45, rev=0.2),
        Track("snare", "r:2. r:8 C4:16 C4:16 C4:4>", vol=0.4, rev=0.15),
        Track("crash", "r:1 C5:4", vol=0.3, pan=-0.2, rev=0.2),
        Track("harp", "r:1 D5:32 F#5:32 A5:32 D6:32 F#6:32 A6:32 D7:4", vol=0.35, pan=0.35, rev=0.3),
    ])


@jingle("party_join", "Mira or Bram joins the party. About 4 s, warm and hopeful. The flute states the shared "
        "name motif G-D-E-C (rising fifth, whole-step lift, falling major third), answers B-C-D and opens onto "
        "a held G with harp, strings and a soft horn chord. In G major.", keep=0.9)
def party_join():
    return Song(bpm=112, tail=1.4, reverb=dict(t60=1.6, bright=0.6, predelay=0.02), tracks=[
        Track("flute", "G5:8 D6:8 E6:4 C6:4 | B5:8 C6:8 D6:4 G6:2", vol=0.6, pan=0.05, rev=0.3, echo=0.15),
        Track("celesta", "G6:8 D7:8 E7:4 C7:4 | B6:8 C7:8 D7:4 G7:2", vol=0.16, pan=0.3, rev=0.3, echo=0.2),
        Track("harp", "G3:8 D4:8 C4:8 G4:8 A3:8 E4:8 D4:8 A4:8 F#4:8 C5:8 G3:16 B3:16 D4:16 G4:16 B4:16 D5:16 G5:4",
              vol=0.45, pan=-0.3, rev=0.3),
        Track("strings", "[B4,D5]:4 [C5,E5]:4 [C5,E5]:4 [A4,F#5]:2 [B4,D5,G5]:2", vol=0.26, pan=0.3, rev=0.3),
        Track("pizz_bass", "G2:4 C3:4 A2:4 D3:4 D2:4 G2:2", vol=0.5),
        Track("horn", "r:1 r:4 [B4,D5,G5]:2", vol=0.3, pan=-0.1, rev=0.3),
        Track("triangle", "r:1 r:4 C5:4", vol=0.5, pan=0.4, rev=0.4),
    ])


@jingle("victory_fanfare", "Battle won. About 6.5 s, FF-flavored but an original melody: a triplet call up to C, "
        "a stepwise answer, a dotted-rhythm second phrase climbing to E, then the heroic bVI-bVII-I (Ab-Bb-C, "
        "written in C, sounding in Bb) ending on a held chord with a timpani roll, snare fill and crash.", keep=0.9)
def victory_fanfare():
    lead = ("C5:8t E5:8t G5:8t C6:4> B5:8 A5:8 G5:4 | A5:8. F5:16 C6:4> B5:8t C6:8t D6:8t E6:4> | "
            "Eb6:2> D6:4 F6:4> | G6:2>")
    return Song(bpm=144, transpose=-2, tail=1.4, reverb=dict(t60=1.5, bright=0.6, predelay=0.015), tracks=[
        Track("brass", lead, vol=0.72, rev=0.2, echo=0.1),
        Track("pulse", lead, vol=0.28, pan=0.3, rev=0.1, echo=0.28),
        Track("brass", "G4:8t C5:8t E5:8t G5:4 G5:8 F5:8 E5:4 | F5:8. C5:16 A5:4 G5:8t A5:8t B5:8t C6:4 | "
                       "C6:2 Bb5:4 D6:4 | E6:2", vol=0.45, pan=-0.32, rev=0.2, seed=5),
        Track("horn", "[C4,G4]:1 | [F4,A4]:2 [G4,B4]:4 [G4,C5]:4 | [Ab4,C5]:2 [Bb4,D5]:2 | [C5,E5]:2",
              vol=0.38, pan=0.18, rev=0.25),
        Track("strings", "[E4,G4,C5]:1 | [F4,A4,C5]:2 [G4,B4,D5]:4 [G4,C5,E5]:4 | [Ab4,C5,Eb5]:2 [Bb4,D5,F5]:2 | "
                         "[C5,E5,G5,C6]:2", vol=0.32, pan=0.35, rev=0.25),
        Track("tri_bass", "C3:4' G2:4' C3:4' G2:4' | F2:4' F2:4' G2:4' G2:4' | Ab2:4' Ab2:4' Bb2:4' Bb2:4' | C3:2",
              vol=0.46),
        Track("timpani", "C3:4> r:2. | F2:4> r:4 G2:4> r:4 | Ab2:4> r:4 Bb2:4> r:4 | "
                         "C3:16@0.45 C3:16@0.5 C3:16@0.55 C3:16@0.62 C3:16@0.7 C3:16@0.78 C3:16@0.86 C3:16@0.95",
              vol=0.45, vel=0.7, rev=0.2),
        Track("snare", "C4:8t C4:8t C4:8t r:2. | r:1 | r:2. C4:16 C4:16 C4:16 C4:16> | C4:4>", vol=0.36, rev=0.15),
        Track("crash", "C5:4 r:2. | r:1 | r:1 | C5:2>", vol=0.26, vel=0.6, pan=-0.2, rev=0.2),
        Track("harp", "r:1 r:1 r:2. r:16 C5:32 E5:32 G5:32 C6:32 E6:32 G6:32 C7:4", vol=0.32, pan=0.35, rev=0.3),
        Track("bell", "r:1 r:1 r:1 [C7,G7]:2", vol=0.2, pan=-0.3, rev=0.3, echo=0.25),
    ])


@jingle("gameover_sting", "Party defeated. About 5 s, somber, not melodramatic. A low bell tolls twice (an echo of "
        "the Thirteenth Bell) while an oboe falls A-G-F-E-D over Dm, Gm, A7, Dm strings. In D minor.", keep=1.3)
def gameover_sting():
    return Song(bpm=76, tail=1.6, reverb=dict(t60=2.2, bright=0.45, predelay=0.025), tracks=[
        Track("oboe", "A4:4 G4:8 F4:8 E4:4 D4:2", vol=1.0, pan=0.1, rev=0.4, echo=0.1),
        Track("strings", "[D4,F4]:4 [D4,G4,Bb4]:4 [C#4,E4,G4]:4 [A3,D4,F4]:2", vol=0.28, pan=-0.2, rev=0.35, vel=0.65),
        Track("tri_bass", "D2:4 Bb1:4 A1:4 D2:2", vol=0.36),
        Track("chapel_bell", "D4:2. D4:2", vol=0.4, pan=-0.25, rev=0.45, vel=0.7),
        Track("timpani", "r:2. D2:4", vol=0.35, vel=0.5, rev=0.3),
    ])
