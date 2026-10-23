"""Writes Beyond's start chime as a WAV (docs/sounds/beyond-chime.wav), from the same notes as Chime.java and
web/chime.js (ADR 0012). For the website and anything that would rather play a file than make the sound."""
import math, os, struct, wave

RATE = 44100
NOTES = [392.00, 493.88, 587.33, 739.99]
AT = [0.10, 0.34, 0.58, 0.82]


def samples():
    n = int(RATE * 3.2)
    mix = [0.0] * n
    for i in range(n):
        t = i / RATE
        hum = t / 0.5 if t < 0.5 else max(0.0, (3.0 - t) / 0.8) if t > 2.2 else 1.0
        mix[i] += math.sin(2 * math.pi * 196.00 * t) * 0.05 * hum
    for f, at in zip(NOTES, AT):
        start, dur = int(RATE * at), int(RATE * 2.2)
        for i in range(dur):
            if start + i >= n:
                break
            t = i / RATE
            env = t / 0.05 if t < 0.05 else math.exp(-(t - 0.05) / 0.45)
            if t > 2.1:
                env *= (2.2 - t) / 0.1
            w = 2 * math.pi * f * t
            mix[start + i] += (math.sin(w) + 0.15 * math.sin(2 * w)) * 0.12 * env
    return [max(-1.0, min(1.0, x)) for x in mix]


def main():
    out = os.path.join(os.path.dirname(__file__), '..', 'docs', 'sounds', 'beyond-chime.wav')
    with wave.open(out, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', int(round(x * 32767))) for x in samples()))
    print('Wrote', os.path.normpath(out))


if __name__ == '__main__':
    main()
