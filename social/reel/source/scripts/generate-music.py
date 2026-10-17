#!/usr/bin/env python3
"""Original Focus Trail instrumental. Python 3 + numpy; FFmpeg loudness finish.
No recordings, samples, model weights or third-party melodies are inputs.
Run: python scripts/generate-music.py [--out assets/music/focus-trail-bed.wav]
"""
from pathlib import Path
import argparse, json, subprocess, tempfile, wave, hashlib
import numpy as np

SR = 48000
BPM = 96
BEAT = 60 / BPM
DURATION = 20.0
SEED = 4162026
rng = np.random.default_rng(SEED)
mix = np.zeros((int(SR * (DURATION + 2)), 2), dtype=np.float64)

def hz(midi): return 440 * 2 ** ((midi - 69) / 12)
def time(duration): return np.arange(int(SR * duration)) / SR
def add(signal, start, gain=1.0, pan=0.0, delay=False):
    """Equal-power pan; quiet opposite-side eighth/dotted-eighth echoes."""
    if signal.ndim == 1:
        position = (pan + 1) * np.pi / 4
        stereo = np.column_stack((signal*np.cos(position), signal*np.sin(position)))
    else: stereo = signal
    def put(s, at, level):
        i = round(at * SR)
        if i >= len(mix): return
        n = min(len(s), len(mix)-i)
        mix[i:i+n] += s[:n] * level
    put(stereo, start, gain)
    if delay:
        put(stereo[:, ::-1], start+BEAT*.75, gain*.16)
        put(stereo, start+BEAT*1.5, gain*.055)

def pluck(note, length=.9, bright=False):
    t = time(length); f = hz(note)
    # Smooth wooden/mallet attack; higher partials decay more quickly.
    attack = 1 - np.exp(-t/.003)
    body = np.sin(2*np.pi*f*t) * np.exp(-t/.22)
    body += .24*np.sin(2*np.pi*2*f*t)*np.exp(-t/.095)
    body += .07*np.sin(2*np.pi*3*f*t)*np.exp(-t/.055)
    if bright: body += .08*np.sin(2*np.pi*4.01*f*t)*np.exp(-t/.065)
    return body * attack * np.minimum(1, np.maximum(0, (length-t)/.06))

def bass(note, length):
    t = time(length); f=hz(note)
    env=(1-np.exp(-t/.008))*np.exp(-t/.38)*np.minimum(1, np.maximum(0,(length-t)/.045))
    return (np.sin(2*np.pi*f*t)+.16*np.sin(2*np.pi*2*f*t)+.045*np.sin(2*np.pi*3*f*t))*env

def kick():
    t=time(.38)
    phase=2*np.pi*(44*t + 34*.035*(1-np.exp(-t/.035)))
    thump=np.sin(phase)*(1-np.exp(-t/.001))*np.exp(-t/.085)
    click=rng.normal(size=len(t))*.04*np.exp(-t/.005)
    return thump+click

def filtered_noise(duration, low, high):
    n=int(SR*duration); noise=rng.normal(size=n)
    spectrum=np.fft.rfft(noise)
    f=np.fft.rfftfreq(n, 1/SR)
    # Soft band edges avoid resonant pitched ringing.
    mask=(1-np.exp(-(f/max(low,1))**4))*np.exp(-(f/high)**6)
    output=np.fft.irfft(spectrum*mask,n=n)
    return output/(np.std(output)+1e-10)

def hat(opened=False):
    length=.17 if opened else .08; t=time(length)
    return filtered_noise(length,6000,13000)*np.exp(-t/(.040 if opened else .016))*(1-np.exp(-t/.0004))

def clap():
    t=time(.22); n=filtered_noise(.22,1000,8000)
    env=np.zeros_like(t)
    for at,level in [(0, .50),(.012,.70),(.027,1.0)]:
        dt=np.maximum(t-at,0); env += level*np.exp(-dt/.030)*(t>=at)
    return n*env*.4

def pad(notes):
    t=time(2.7); sound=np.zeros(len(t))
    for i,n in enumerate(notes):
        f=hz(n)
        phase=2*np.pi*f*t
        sound += (np.sin(phase)+.10*np.sin(3*phase))/len(notes)
    env=(1-np.exp(-t/.16))*np.exp(-t/2.0)*np.minimum(1,np.maximum(0,(2.7-t)/.35))
    return sound*env

# Eight bars, written for the fixed 20-second picture edit.
# The final bar resolves to the opening harmony rather than cutting a loop mid-phrase.
chords = [
    ([60,64,67,71,74],36), ([60,64,67,71,74],36),
    ([57,60,64,67,71],33), ([57,60,64,67,71],33),
    ([53,57,60,64,67],29), ([53,57,60,64,67],29),
    ([55,59,62,64,69],31), ([60,64,67,71,74],36),
]
# Sparse two-bar melodic phrases leave the centre open for narration.
melody = [
    [(0.5,76),(1.5,74),(2.5,71),(3.25,74)],
    [(0.5,79),(1.75,76),(3,74)],
    [(0.5,76),(1.5,72),(2.75,71)],
    [(0.5,74),(1.75,76),(3,72)],
    [(0.5,76),(1.5,72),(2.5,69),(3.25,72)],
    [(0.5,79),(1.75,76),(3,72)],
    [(0.5,74),(1.5,71),(2.5,69),(3.25,71)],
    [(0,76),(1,74),(2,72)],
]
arp_pattern=[0,2,3,1,4,2,3,2]
for bar,(chord,root) in enumerate(chords):
    base=bar*4*BEAT
    add(pad(chord),base,.075,pan=-.15 if bar%2 else .15)
    # Bass and drums taper in the final bar so the final chord has room to settle.
    ending=bar==7
    for beat,dur,scale in [(0,.72,1.0),(.75,.50,.68),(1.75,.55,.72),(2.5,.60,.84),(3.5,.40,.57)]:
        if ending and beat>2: continue
        add(bass(root if beat<3 else root+7,dur*BEAT),base+beat*BEAT,.16*scale)
    for beat in ([0,2] if ending else [0,1.5,2,3.5]):
        add(kick(),base+beat*BEAT,.16 if beat in (0,2) else .09)
    for beat in ([1] if ending else [1,3]):
        add(clap(),base+beat*BEAT,.055,pan=.08)
    for eighth in range(8 if not ending else 5):
        # A small offbeat delay provides an understated human-feeling groove.
        onset=(eighth*.5+(.025 if eighth%2 else 0))*BEAT
        velocity=(.021 if eighth%2 else .028)*(1+rng.uniform(-.08,.08))
        add(hat(eighth==7 and not ending),base+onset,velocity,pan=-.25 if eighth%2 else .25)
    for eighth,index in enumerate(arp_pattern):
        if ending and eighth>4: continue
        note=chord[index]+12
        add(pluck(note),base+eighth*.5*BEAT,.038 if eighth%2 else .046,pan=(-.35 if eighth%2 else .35),delay=True)
    for beat,note in melody[bar]:
        add(pluck(note,1.1,bright=True),base+beat*BEAT,.068,pan=.10,delay=True)
# Extra final tonic is an original cadence, not a stock sting.
add(pad([60,64,67,71]),17.5,.06)
# Gentle saturator catches overlapping drum transients without clipping.
mix=np.tanh(mix[:int(SR*DURATION)]*1.3)/1.3
ramp_in=np.minimum(1,np.arange(len(mix))/(SR*.08))
ramp_out=np.minimum(1,np.maximum(0,(len(mix)-1-np.arange(len(mix)))/(SR*.75)))
mix*=ramp_in[:,None]*ramp_out[:,None]

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--out',default='assets/music/focus-trail-bed.wav')
args=parser.parse_args(); dest=Path(args.out); dest.parent.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='focus-trail-music-') as tmp:
    raw=Path(tmp)/'original-mix.wav'
    pcm=np.clip(mix*32767,-32768,32767).astype('<i2')
    with wave.open(str(raw),'wb') as wav:
        wav.setnchannels(2); wav.setsampwidth(2); wav.setframerate(SR); wav.writeframes(pcm.tobytes())
    # Single-pass source master: at quiet bed level before the separate voice-carve.
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af',
                    'loudnorm=I=-20:TP=-3:LRA=7','-ar',str(SR),'-ac','2','-c:a','pcm_s16le',str(dest)],check=True)
print(json.dumps({'path':str(dest),'duration_seconds':DURATION,'sample_rate':SR,'channels':2,
                  'bpm':BPM,'seed':SEED,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()},indent=2))
