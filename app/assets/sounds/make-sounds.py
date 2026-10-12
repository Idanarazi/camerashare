# PicMe "connected" sounds. Each option = the scanning phone's note + the camera phone's answer.
import numpy as np, wave, os, sys

SR = 48000
OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

def t_(dur): return np.arange(int(SR * dur)) / SR

def env(t, attack, tau):
    a = np.clip(t / attack, 0, 1)
    return a * np.exp(-np.maximum(t - attack, 0) / tau)

def partials(f, dur, parts, attack=0.004):
    """parts: list of (ratio, amp, tau)"""
    t = t_(dur); y = np.zeros_like(t)
    for r, a, tau in parts:
        y += a * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 1)) * env(t, attack, tau)
    return y

def bell(f, dur=1.0):   # warm chime: near-harmonic, slightly inharmonic shimmer
    return partials(f, dur, [(1, 1, .38), (2.0, .32, .18), (3.01, .12, .09), (4.2, .05, .05), (1.003, .35, .42)])

def glass(f, dur=1.0):  # bright, pure, Apple-ish
    return partials(f, dur, [(1, 1, .32), (2.76, .18, .07), (5.4, .06, .03)], attack=.002)

def marimba(f, dur=.7): # wooden, warm, quick
    return partials(f, dur, [(1, 1, .16), (3.93, .35, .03), (9.2, .08, .012)], attack=.0015)

def pop(f, dur=.35):    # bubble: pitch glides up into the note
    t = t_(dur)
    freq = f * (1 - 0.45 * np.exp(-t / .018))
    ph = 2 * np.pi * np.cumsum(freq) / SR
    return (np.sin(ph) + .2 * np.sin(2 * ph)) * env(t, .003, .07)


def soft_marimba(f, dur=.8):  # felt mallet: rounder, less knock, rings a bit longer
    return partials(f, dur, [(1, 1, .24), (3.93, .14, .03), (9.2, .02, .01)], attack=.004)

def kalimba(f, dur=1.0):  # thumb piano: woody pluck with a bright metallic overtone
    t = t_(dur)
    tick = rng.normal(0, 1, len(t)) * env(t, .0003, .002) * .25
    return partials(f, dur, [(1, 1, .45), (5.92, .22, .05), (2.0, .08, .2)], attack=.001) + tick

def musicbox(f, dur=1.0):  # small comb of steel: high, sparkly
    return partials(f, dur, [(1, 1, .5), (2.0, .25, .2), (3.0, .1, .09), (4.07, .08, .05), (5.94, .05, .03)], attack=.0008)

def epiano(f, dur=1.3):  # electric piano (FM): soft bell-like "tine" on top of a round note
    t = t_(dur)
    index = 2.2 * np.exp(-t / .12) + .25
    y = np.sin(2 * np.pi * f * t + index * np.sin(2 * np.pi * f * t)) * env(t, .002, .55)
    y += .18 * np.sin(2 * np.pi * f * 14 * t) * env(t, .0005, .012)  # tine strike
    return y

def pluck(f, dur=1.0):  # harp/guitar string (Karplus-Strong)
    n = int(SR * dur); p = int(round(SR / f))
    buf = rng.uniform(-1, 1, p); buf = np.convolve(buf, np.ones(3) / 3, 'same')
    y = np.zeros(n)
    for i in range(n):
        y[i] = buf[i % p]
        buf[i % p] = .996 * .5 * (buf[i % p] + buf[(i + 1) % p])
    return y * env(np.arange(n) / SR, .001, 10)

def whoosh(dur=.22, f0=500, f1=4000):  # air swept upward, like a card sliding in
    n = int(SR * dur); x = rng.normal(0, 1, n); y = np.zeros(n)
    lo = bp = 0.0; q = .35
    for i in range(n):
        fc = f0 * (f1 / f0) ** (i / n)
        F = 2 * np.sin(np.pi * fc / SR)
        hi = x[i] - lo - q * bp; bp += F * hi; lo += F * bp; y[i] = bp
    t = np.arange(n) / SR
    shape = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return y * shape / (np.abs(y).max() + 1e-9)

def svf_noise(n, fc, q=.3, x=None):  # noise through a resonant band-pass (fc may be an array)
    x = rng.normal(0, 1, n) if x is None else x
    fc = np.broadcast_to(np.asarray(fc, float), (n,))
    y = np.zeros(n); lo = bp = 0.0
    for i in range(n):
        F = 2 * np.sin(np.pi * min(fc[i], SR / 6) / SR)
        hi = x[i] - lo - q * bp; bp += F * hi; lo += F * bp; y[i] = bp
    return y / (np.abs(y).max() + 1e-9)

def beep(f, dur=.06):  # camera focus-confirm beep: soft square-ish tone
    t = t_(dur); ph = 2 * np.pi * f * t
    y = np.sin(ph) + .22 * np.sin(3 * ph) + .07 * np.sin(5 * ph)
    a = np.clip(t / .003, 0, 1) * np.clip((dur - t) / .006, 0, 1)
    return y * a

def clack(body=1300):  # mechanical shutter: two quick hits (mirror up, mirror down)
    n = int(SR * .09); t = np.arange(n) / SR
    y = np.zeros(n)
    for d0, g in ((0, 1), (.028, .7)):
        e = np.where(t >= d0, np.exp(-(t - d0) / .006), 0) * (t >= d0)
        y += g * e * (svf_noise(n, body, .25) + .5 * svf_noise(n, 4200, .4))
    return y

def motor(dur=.5):  # instant-film motor pushing the photo out
    t = t_(dur)
    f = 95 * (1 + .12 * np.sin(np.pi * t / dur))
    ph = 2 * np.pi * np.cumsum(f) / SR
    saw = sum(np.sin(k * ph) / k for k in range(1, 30))
    buzz = svf_noise(len(t), 900, .5, x=saw) * .8 + .25 * svf_noise(len(t), 2500, .6)
    shape = np.clip(t / .03, 0, 1) * np.clip((dur - t) / .05, 0, 1)
    return buzz * shape * (1 + .15 * np.sin(2 * np.pi * 31 * t))

def snap_mag(pitch=1.0):  # magnetic snap: low thunk + tiny click + short metal ring
    t = t_(.25)
    thunk = np.sin(2 * np.pi * np.cumsum(140 * pitch * (1 + 1.2 * np.exp(-t / .006))) / SR) * env(t, .0008, .03)
    click = svf_noise(len(t), 5000 * pitch, .5) * env(t, .0002, .0018)
    ring = (np.sin(2 * np.pi * 3100 * pitch * t) + .6 * np.sin(2 * np.pi * 4730 * pitch * t)) * env(t, .0005, .025) * .18
    return thunk + .8 * click + ring

def finger(pitch=1.0):  # finger snap
    t = t_(.15)
    return (svf_noise(len(t), 1900 * pitch, .18) * env(t, .0004, .011) +
            .5 * svf_noise(len(t), 3800 * pitch, .4) * env(t, .0002, .004) +
            .35 * np.sin(2 * np.pi * 240 * pitch * t) * env(t, .001, .01))

def glide(f0, f1, dur=.7):  # smooth synth slide up into place
    t = t_(dur)
    f = f1 * (f0 / f1) ** np.exp(-t / .05)
    ph = 2 * np.pi * np.cumsum(f) / SR
    ph2 = 2 * np.pi * np.cumsum(f * 1.004) / SR
    y = np.sin(ph) + .7 * np.sin(ph2) + .15 * np.sin(2 * ph)
    return y * env(t, .015, .28)

def swell(freqs, dur=.42):  # reverse swell: grows, then stops short
    t = t_(dur)
    y = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) + .5 * np.sin(2 * np.pi * f * 1.006 * t) for f in freqs)
    y = y / len(freqs) + .35 * svf_noise(len(t), np.geomspace(800, 6000, len(t)), .5)
    grow = (t / dur) ** 3
    stop = np.clip((dur - t) / .012, 0, 1)
    return y * grow * stop

def heart(f=110, accent=1.0):  # soft heartbeat thump, with harmonics so phone speakers carry it
    t = t_(.3)
    fr = f * (1 + .6 * np.exp(-t / .015))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    return (np.sin(ph) + .5 * np.sin(2 * ph) + .25 * np.sin(3 * ph)) * env(t, .004, .07) * accent

def swell2(freqs, dur=.42, a0=0.0, a1=1.0, f_lo=800, f_hi=6000, stop=True, curve=3):
    t = t_(dur)
    y = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) + .5 * np.sin(2 * np.pi * f * 1.006 * t) for f in freqs)
    y = y / len(freqs) + .35 * svf_noise(len(t), np.geomspace(f_lo, f_hi, len(t)), .5)
    grow = a0 + (a1 - a0) * (t / dur) ** curve
    end = np.clip((dur - t) / (.012 if stop else .09), 0, 1)
    start = np.clip(t / .02, 0, 1)
    return y * grow * end * start

A4, Cs5, E5, A5, Cs6, E6, A6, Cs7, E7, A7 = 440, 554.37, 659.26, 880, 1108.73, 1318.51, 1760, 2217.46, 2637.02, 3520
SW = [A4, Cs5, E5]

def pure(f, dur=.75, tau=.22, bright=.12, attack=.0025):  # near-pure tone: the "Apple" ingredient
    t = t_(dur)
    y = partials(f, dur, [(1, 1, tau), (2, bright, tau * .35), (3, bright * .3, tau * .2), (4.18, .03, .02)], attack=attack)
    tick = svf_noise(len(t), min(f * 4, 7000), .6) * env(t, .0002, .0012) * .06
    return y + tick

def bloop(f, dur=.55, semis=4):  # round tone that rises a few steps into place
    t = t_(dur)
    fr = f * 2 ** (-semis / 12 * np.exp(-t / .016))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    return (np.sin(ph) + .22 * np.sin(2 * ph) + .06 * np.sin(3 * ph)) * env(t, .004, .14)

def click(dur=.05):     # shutter tick: short filtered noise + tiny thump
    t = t_(dur)
    n = rng.normal(0, 1, len(t))
    n = np.convolve(n, np.ones(6) / 6, 'same') - np.convolve(n, np.ones(40) / 40, 'same')  # band-pass-ish
    thump = np.sin(2 * np.pi * (220 * (1 - .5 * np.exp(-t / .01))) * t)
    return .7 * n * env(t, .0005, .006) + .5 * thump * env(t, .001, .012)

def tail(y, ms=60):
    n = min(len(y), int(SR * ms / 1000))
    y = y.copy(); y[-n:] *= 0.5 * (1 + np.cos(np.linspace(0, np.pi, n)))
    return y

def place(parts, total):
    y = np.zeros(int(SR * total))
    for start, sig, gain in parts:
        i = int(SR * start); j = min(len(y), i + len(sig))
        y[i:j] += gain * tail(sig[: j - i])
    return y

def room(y, mix=.14, length=.35):  # small, soft space so it doesn't sound dry/cheap
    t = t_(length)
    ir = rng.normal(0, 1, len(t)) * np.exp(-t / .08)
    ir = np.convolve(ir, np.ones(8) / 8, 'same')
    wet = np.convolve(y, ir)[: len(y)]
    wet /= (np.abs(wet).max() + 1e-9)
    return (1 - mix) * y / (np.abs(y).max() + 1e-9) + mix * wet

def finish(y, peak_db=-3):
    y = room(y)
    y = tail(y, 120)
    y = y / np.abs(y).max() * 10 ** (peak_db / 20)
    return y

def save(name, y):
    with wave.open(os.path.join(OUT, name + '.wav'), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((y * 32767).astype('<i2').tobytes())

N = dict(C5=523.25, E5=659.26, G5=783.99, A5=880.0, C6=1046.5, D6=1174.66, E6=1318.51, G6=1567.98, B6=1975.53)
GAP = .13  # the camera phone answers a beat later
gap = lambda name: {'heart': .17, 'swell': .40, 'polaroid': .16, 'swell-handoff': .30, 'arrive': .15}.get(name, .40 if name.startswith('swell-') else GAP)

options = {
    # first round
    'shutter': ([(0, click(), .55), (.035, bell(N['C6']), 1)], [(0, bell(N['E6']), 1), (0, bell(N['G6']), .35)], 1.15),
    'glass': ([(0, glass(N['E6']), 1)], [(0, glass(N['B6']), .85)], 1.1),
    'marimba': ([(0, marimba(N['C5']), 1), (.07, marimba(N['G5']), .9)], [(0, marimba(N['E5']), .9), (.07, marimba(N['C6']), 1)], .9),
    'pop': ([(0, pop(N['A5']), 1)], [(0, pop(N['E6']), 1)], .6),
    # marimba family
    'marimba-soft': ([(0, soft_marimba(N['C5']), 1), (.08, soft_marimba(N['G5']), .9)], [(0, soft_marimba(N['E5']), .9), (.08, soft_marimba(N['C6']), 1)], 1.0),
    'marimba-duo': ([(0, marimba(N['G5']), 1)], [(0, marimba(N['C6']), 1)], .75),
    'marimba-run': ([(0, marimba(N['C5']), .9), (.055, marimba(N['E5']), .9), (.11, marimba(N['G5']), 1)], [(0, marimba(N['C6']), 1), (0, marimba(N['E6']), .3)], 1.0),
    'marimba-sparkle': ([(0, marimba(N['C5']), 1), (.07, marimba(N['G5']), .9)], [(0, marimba(N['E5']), .8), (.07, marimba(N['C6']), 1), (.07, glass(N['C6'] * 2, 1.0), .22)], 1.1),
    # new styles
    'kalimba': ([(0, kalimba(N['C5']), 1), (.09, kalimba(N['G5']), .85)], [(0, kalimba(N['E5']), .85), (.09, kalimba(N['C6']), 1)], 1.1),
    'musicbox': ([(0, musicbox(N['C6']), .9), (.07, musicbox(N['E6']), .8), (.14, musicbox(N['G6']), .8)], [(0, musicbox(N['C6'] * 2, 1.2), .9)], 1.2),
    'epiano': ([(0, epiano(N['C5']), .9), (0, epiano(N['G5']), .6)], [(0, epiano(N['E5']), .7), (0, epiano(N['C6']), .8)], 1.35),
    'pluck': ([(0, pluck(N['C5']), 1), (.06, pluck(N['G5']), .8)], [(0, pluck(N['E5']), .8), (.06, pluck(N['C6']), 1)], 1.1),
    'whoosh': ([(0, whoosh(), .5), (.17, bell(N['G5']), 1)], [(0, bell(N['C6']), 1), (0, bell(N['E6']), .4)], 1.15),
    # round three: new directions
    'focus': ([(0, beep(2349), 1)], [(0, beep(2637), 1), (.1, beep(2637), 1)], .45),
    'polaroid': ([(0, clack(), 1)], [(0, motor(), .55)], .7),
    'magnet': ([(0, snap_mag(1.0), 1)], [(0, snap_mag(1.35), 1)], .4),
    'fingers': ([(0, finger(1.0), 1)], [(0, finger(1.12), 1)], .3),
    'glide': ([(0, glide(440, 659.26), 1)], [(0, glide(659.26, 880), 1)], .8),
    'swell': ([(0, swell([440, 554.37, 659.26]), 1)], [(0, snap_mag(1.2), .7), (0, bell(N['A5'], .6), .5)], .7),
    'air': ([(0, whoosh(.25, 400, 5000), 1)], [(0, whoosh(.2, 5000, 700), .8), (.15, heart(130), .5)], .55),
    'heart': ([(0, heart(110), 1)], [(0, heart(98, .8), 1)], .45),
    # round four: the swell family
    'swell-bloom': ([(0, swell2(SW), 1)], [(0, snap_mag(1.2), .55), (0, bell(A5, 1.1), .6), (0, bell(Cs6, 1.1), .45), (0, bell(E6, 1.1), .45), (0, glass(A6, 1.1), .3)], 1.15),
    'swell-pop': ([(0, swell2(SW), 1)], [(0, pop(A5), 1), (.075, pop(E6), .9)], .55),
    'swell-marimba': ([(0, swell2(SW), 1)], [(0, marimba(A5), 1), (.045, marimba(Cs6), .85), (.09, marimba(E6), .85), (.135, marimba(A6), .95)], .9),
    'swell-twinkle': ([(0, swell2(SW), 1)], [(0, snap_mag(1.25), .6)] + [(.03 + .035 * i, glass(f, .7), .28 - .04 * i) for i, f in enumerate([A6, Cs7, E7, A7])], 1.0),
    'swell-woo': ([(0, swell2(SW), 1)], [(0, snap_mag(1.2), .5), (0, glide(E5, A5, .7), .9), (.06, glide(A5, E6, .6), .5)], .8),
    'swell-handoff': ([(0, swell2([A4, E5], .34, 0, .55, 500, 2200, stop=False, curve=2), 1)],
                      [(0, swell2([Cs5, E5, A5], .2, .55, 1, 2200, 7000, curve=1.5), .9), (.2, snap_mag(1.25), .55), (.2, bell(A5, 1.0), .7), (.2, bell(E6, 1.0), .4)], 1.15),
    # round five: Apple-style satisfaction
    'ding-pure': ([(0, pure(E6), 1)], [(0, pure(A6), .9)], .8),
    'ding-grace': ([(0, pure(Cs6, tau=.12), .7), (.055, pure(E6), 1)], [(0, pure(A6, tau=.12), .65), (.055, pure(Cs7), .85)], .85),
    'ding-warm': ([(0, pure(A5, tau=.3, bright=.18), 1)], [(0, pure(E6, tau=.3, bright=.18), .9), (0, pure(A6, tau=.25), .25)], .95),
    'bloop': ([(0, bloop(880), 1)], [(0, bloop(1318.51), .9)], .6),
    'arrive': ([(0, whoosh(.2, 600, 4500), .35)], [(0, bloop(1318.51), 1), (.05, pure(A6, tau=.25), .35)], .7),
    'swell-ding': ([(0, swell2(SW), 1)], [(0, snap_mag(1.3), .3), (0, pure(A6), .9), (.03, pure(Cs7), .5)], .9),
}

for name, (a, b, total) in options.items():
    save(f'{name}-you', finish(place(a, total)))
    save(f'{name}-them', finish(place(b, total)))
    both = place(a, total + gap(name)) + place([(s + gap(name), sig, g) for s, sig, g in b], total + gap(name))
    save(f'{name}-both', finish(both))
print('done')


# ── Countdown beeps (3, 2, 1, then the shot) ──
# python make-sounds.py <out>  also writes beep.wav and beep-go.wav
def tick(f, total=.32, tau=.07):
    return finish(place([(0, pure(f, dur=total, tau=tau, bright=.1), 1)], total), peak_db=-6)

save('beep', tick(A5))
save('beep-go', finish(place([(0, pure(A6, dur=.6, tau=.16), 1), (0, pure(Cs7, dur=.6, tau=.14), .5)], .6), peak_db=-5))
