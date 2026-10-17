"""Decode an MP3 in headless Chromium (WebAudio decodeAudioData, the same path the game uses) and
measure the sample offset against the rendered WAV reference. Confirms the gapless LAME tag is honored
(offset 0) so loopStart/loopEnd in <id>.json are sample-accurate in the browser.

    python tools/music/verify_decode.py archive            # needs tools/music/out/archive.wav (render.py --wav)
    python tools/music/verify_decode.py archive --raw      # also test a copy without the Info frame

Prints the lag in samples (expect 0 with the tag, ~1105 without), the decoded length and a correlation
score (expect > 0.95: MP3 is lossy, so not 1.0).
"""
import base64
import json
import os
import struct
import sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.dirname(os.path.dirname(HERE))
MUSIC_DIR = os.path.join(NEXT, 'assets', 'audio', 'music')
OUT_DIR = os.path.join(HERE, 'out')

PAGE = """<!doctype html><html><body><script>
window.decodeB64 = async function(b64, secs) {
  const bin = atob(b64); const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const ctx = new OfflineAudioContext(2, 44100, 44100);
  const ab = await ctx.decodeAudioData(buf.buffer);
  const n = Math.min(ab.length, Math.floor(secs * ab.sampleRate));
  const ch = ab.getChannelData(0).slice(0, n);
  return {sampleRate: ab.sampleRate, length: ab.length, channels: ab.numberOfChannels, head: Array.from(ch)};
};
</script></body></html>"""


def read_wav(path):
    with open(path, 'rb') as f:
        data = f.read()
    assert data[:4] == b'RIFF' and data[8:12] == b'WAVE'
    pos = 12
    sr = None
    pcm = None
    while pos + 8 <= len(data):
        cid = data[pos:pos + 4]
        size = struct.unpack('<I', data[pos + 4:pos + 8])[0]
        body = data[pos + 8:pos + 8 + size]
        if cid == b'fmt ':
            sr = struct.unpack('<I', body[4:8])[0]
        elif cid == b'data':
            pcm = np.frombuffer(body, dtype='<i2').reshape(-1, 2).astype(np.float64) / 32767.0
        pos += 8 + size + (size & 1)
    return sr, pcm


def strip_info_frame(mp3_bytes):
    """Return the bytes with the first (Info) frame removed, for the control test."""
    h = struct.unpack('>I', mp3_bytes[:4])[0]
    pad = (h >> 9) & 1
    flen = 144 * 160000 // 44100 + pad
    return mp3_bytes[flen:]


def decode_in_chromium(mp3_bytes, secs=3.0):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_content(PAGE)
        res = page.evaluate('([b, s]) => window.decodeB64(b, s)', [base64.b64encode(mp3_bytes).decode('ascii'), secs])
        browser.close()
    return res


def lag_between(ref, dec, max_lag=4000):
    """Lag (samples) such that dec[n] ~ ref[n - lag]; via normalized cross-correlation."""
    n = min(len(ref), len(dec)) - max_lag - 1
    seg = dec[max_lag:max_lag + n]
    best, best_lag = -1.0, 0
    # coarse search with FFT correlation
    r = ref[:max_lag * 2 + n]
    corr = np.correlate(r - r.mean(), seg - seg.mean(), mode='valid')
    k = int(np.argmax(corr))
    best_lag = max_lag - k
    a = ref[max_lag - best_lag:max_lag - best_lag + n]
    best = float(np.dot(a, seg) / (np.linalg.norm(a) * np.linalg.norm(seg) + 1e-12))
    return best_lag, best


def main(argv):
    ids = [a for a in argv if not a.startswith('--')] or ['archive']
    raw = '--raw' in argv
    for sid in ids:
        mp3_path = os.path.join(MUSIC_DIR, sid + '.mp3')
        wav_path = os.path.join(OUT_DIR, sid + '.wav')
        with open(mp3_path, 'rb') as f:
            mp3 = f.read()
        sr, ref = read_wav(wav_path)
        meta = json.load(open(os.path.join(MUSIC_DIR, sid + '.json')))
        tests = [('with Info/LAME tag', mp3)]
        if raw:
            tests.append(('without tag (control)', strip_info_frame(mp3)))
        for label, data in tests:
            res = decode_in_chromium(data, secs=3.0)
            dec = np.array(res['head'])
            lag, score = lag_between(ref[:, 0], dec)
            expected_len = ref.shape[0]
            print('%s %-24s sr %d  decoded %d samples (reference %d, diff %+d)  lag %+d samples  corr %.3f' % (
                sid, label, res['sampleRate'], res['length'], expected_len, res['length'] - expected_len, lag, score))
        print('%s loop meta: start %.4fs end %.4fs (%d .. %d samples)' % (
            sid, meta['loopStart'], meta['loopEnd'], round(meta['loopStart'] * sr), round(meta['loopEnd'] * sr)))


if __name__ == '__main__':
    main(sys.argv[1:])
