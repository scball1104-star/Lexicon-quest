"""Write a CBR MP3 with a proper Xing/"Info" + LAME tag frame so browsers decode it gaplessly.

lameenc (the Python wrapper) emits raw audio frames without the Info frame, so decoders cannot know the
encoder delay (576 samples) and end padding. Chrome, Firefox and Safari all honor the LAME tag and trim
exactly, which is what makes sample-accurate loopStart/loopEnd possible. We build the frame by hand:
a valid silent MPEG-1 Layer III frame whose payload carries the Info header and LAME extension, with
both CRC-16 (ARC) checksums filled in.
"""
import struct
import numpy as np
import lameenc

ENCODER_DELAY = 576          # LAME's fixed analysis delay at 44.1 kHz
DECODER_DELAY = 528 + 1      # what decoders add on top (ffmpeg / LAME convention)
SAMPLES_PER_FRAME = 1152

_BITRATES_V1_L3 = {32: 1, 40: 2, 48: 3, 56: 4, 64: 5, 80: 6, 96: 7, 112: 8, 128: 9, 160: 10,
                   192: 11, 224: 12, 256: 13, 320: 14}
_SR_IDX = {44100: 0, 48000: 1, 32000: 2}

_CRC_TABLE = None


def _crc_table():
    global _CRC_TABLE
    if _CRC_TABLE is None:
        t = []
        for i in range(256):
            c = i
            for _ in range(8):
                c = (c >> 1) ^ 0xA001 if (c & 1) else (c >> 1)
            t.append(c)
        _CRC_TABLE = np.array(t, dtype=np.uint16)
    return _CRC_TABLE


def crc16_arc(data, crc=0):
    tbl = _crc_table()
    for b in data:
        crc = int(tbl[(crc ^ b) & 0xFF]) ^ (crc >> 8)
    return crc & 0xFFFF


def encode_pcm(stereo_float, sr, kbps=160, quality=2):
    """Encode float stereo (-1..1) to raw CBR MP3 frames. Returns (bytes, n_frames, padding)."""
    pcm = np.clip(stereo_float, -1.0, 1.0)
    i16 = (pcm * 32767.0).round().astype('<i2').tobytes()
    enc = lameenc.Encoder()
    enc.set_bit_rate(kbps)
    enc.set_in_sample_rate(sr)
    enc.set_channels(2)
    enc.set_quality(quality)
    data = enc.encode(i16) + enc.flush()
    n_frames = _count_frames(data, sr, kbps)
    padding = n_frames * SAMPLES_PER_FRAME - ENCODER_DELAY - stereo_float.shape[0]
    return data, n_frames, padding


def _frame_len(kbps, sr, pad):
    return 144 * kbps * 1000 // sr + pad


def _count_frames(data, sr, kbps):
    pos, n = 0, 0
    while pos + 4 <= len(data):
        h = struct.unpack('>I', data[pos:pos + 4])[0]
        if (h >> 21) & 0x7FF != 0x7FF:
            raise ValueError('lost MP3 sync at byte %d' % pos)
        pad = (h >> 9) & 1
        pos += _frame_len(kbps, sr, pad)
        n += 1
    return n


def info_frame(sr, kbps, n_audio_frames, audio_bytes, enc_delay, enc_padding, music_crc):
    flen = _frame_len(kbps, sr, 0)
    frame = bytearray(flen)
    # header: sync, MPEG-1, Layer III, no CRC, bitrate idx, sr idx, no padding, stereo
    h = (0x7FF << 21) | (3 << 19) | (1 << 17) | (1 << 16) | (_BITRATES_V1_L3[kbps] << 12) | (_SR_IDX[sr] << 10) | (0 << 6)
    struct.pack_into('>I', frame, 0, h)
    off = 4 + 32  # side info for MPEG-1 stereo is 32 bytes (all zero = silent frame)
    frame[off:off + 4] = b'Info'
    off += 4
    struct.pack_into('>I', frame, off, 0x0F); off += 4
    struct.pack_into('>I', frame, off, n_audio_frames); off += 4
    struct.pack_into('>I', frame, off, audio_bytes + flen); off += 4
    for i in range(100):               # seek table (linear for CBR)
        frame[off + i] = int(i * 256 / 100)
    off += 100
    struct.pack_into('>I', frame, off, 50); off += 4   # quality indicator
    # LAME extension
    frame[off:off + 9] = b'LAME3.100'; off += 9
    frame[off] = 0x01; off += 1                         # tag revision 0, VBR method 1 = CBR
    frame[off] = 0; off += 1                            # lowpass (unknown)
    struct.pack_into('>I', frame, off, 0); off += 4     # replay gain peak
    struct.pack_into('>H', frame, off, 0); off += 2     # radio gain
    struct.pack_into('>H', frame, off, 0); off += 2     # audiophile gain
    frame[off] = 0; off += 1                            # encoding flags
    frame[off] = kbps if kbps < 255 else 255; off += 1  # bitrate
    v = ((enc_delay & 0xFFF) << 12) | (enc_padding & 0xFFF)
    frame[off:off + 3] = v.to_bytes(3, 'big'); off += 3
    frame[off] = 0x44; off += 1                         # misc: 44.1 kHz source, stereo
    frame[off] = 0; off += 1                            # mp3 gain
    struct.pack_into('>H', frame, off, 0); off += 2     # preset / surround
    struct.pack_into('>I', frame, off, audio_bytes + flen); off += 4   # music length
    struct.pack_into('>H', frame, off, music_crc); off += 2
    tag_crc = crc16_arc(bytes(frame[:190]))
    struct.pack_into('>H', frame, off, tag_crc); off += 2
    assert off == 192
    return bytes(frame)


def write_mp3(path, stereo_float, sr, kbps=160, quality=2):
    """Encode and write an MP3 with a gapless LAME tag. Returns a dict of what was written."""
    data, n_frames, padding = encode_pcm(stereo_float, sr, kbps, quality)
    if padding < 0 or padding > 4095:
        raise ValueError('unexpected padding %d' % padding)
    music_crc = crc16_arc(data)
    head = info_frame(sr, kbps, n_frames, len(data), ENCODER_DELAY, padding, music_crc)
    with open(path, 'wb') as f:
        f.write(head)
        f.write(data)
    return {'frames': n_frames, 'bytes': len(head) + len(data), 'encoder_delay': ENCODER_DELAY,
            'padding': padding, 'decoded_samples': n_frames * SAMPLES_PER_FRAME - ENCODER_DELAY - padding}
