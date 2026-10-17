#!/usr/bin/env python3
"""Optional local neural narration regeneration; rendering only needs frozen WAVs.

Requires ffmpeg on PATH. Downloads the pinned public model into --cache-dir
(~313 MB) on first use. No login, API key, account, or remote inference is used.
"""
import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--project', type=Path, default=Path(__file__).resolve().parents[1])
parser.add_argument('--cache-dir', type=Path, required=True)
args = parser.parse_args()
args.cache_dir = args.cache_dir.resolve()
os.environ['HF_HOME'] = str(args.cache_dir)
os.environ['HF_HUB_DISABLE_XET'] = '1'

import numpy as np
import soundfile as sf
import torch
from huggingface_hub import hf_hub_download
from kokoro import KModel, KPipeline
import kokoro.pipeline as kp

# All words here are covered by Misaki's English lexicon. The eSpeak fallback
# is unnecessary; disabling it also avoids a macOS wheel's compiled data path.
kp.espeak.EspeakFallback = lambda british: None
REPO = 'hexgrad/Kokoro-82M'
REVISION = 'f3ff3571791e39611d31c381e3a41a3af07b4987'
VOICE = 'af_heart'
SEED = 42
SAMPLE_RATE = 24000
OUT_RATE = 48000
lines = [
    dict(id='intro', text='Looks ready to ship, right?', start=0.15, slotEnd=2.9, speed=1.02),
    dict(id='good', text='A quick setting change. Back to what you were doing.', start=3.2, slotEnd=7.9, speed=1.03),
    dict(id='bad', text='Then one tiny change… and suddenly, you’ve lost your place.', start=8.9, slotEnd=12.9, speed=0.98),
    dict(id='report', text='Focus Trail shows you where the journey breaks.', start=13.15, slotEnd=17.4, speed=1.03),
    dict(id='close', text='Catch it before your users do.', start=17.5, slotEnd=19.9, speed=1.04),
]

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def fetch(name):
    return hf_hub_download(repo_id=REPO, filename=name, revision=REVISION)

model_path = fetch('kokoro-v1_0.pth')
config_path = fetch('config.json')
voice_path = fetch(f'voices/{VOICE}.pt')
model = KModel(repo_id=REPO, model=model_path, config=config_path).to('cpu').eval()
pipeline = KPipeline(lang_code='a', repo_id=REPO, model=model)
torch.set_num_threads(4)
torch.manual_seed(SEED)
np.random.seed(SEED)
project = args.project.resolve()
out = project / 'assets' / 'voice'
out.mkdir(parents=True, exist_ok=True)
cues = []
with tempfile.TemporaryDirectory(prefix='focus-trail-narration-') as scratch:
    for spec in lines:
        chunks, words, offset = [], [], 0
        for result in pipeline(spec.get('synthesisText', spec['text']), voice=voice_path, speed=spec['speed']):
            for token in result.tokens or []:
                if token.start_ts is not None and token.end_ts is not None:
                    words.append(dict(text=token.text, start=round(offset + token.start_ts, 6), end=round(offset + token.end_ts, 6)))
            audio = result.audio.cpu().numpy()
            chunks.append(audio)
            offset += len(audio) / SAMPLE_RATE
        audio = np.concatenate(chunks)
        raw = Path(scratch) / f"{spec['id']}-raw.wav"
        sf.write(raw, audio, SAMPLE_RATE, subtype='PCM_16')
        dest = out / f"{spec['id']}.wav"
        # Normalization changes level only. It leaves all timing untouched.
        proc = subprocess.run(['ffmpeg', '-y', '-hide_banner', '-i', str(raw), '-af', f'apad=pad_dur=2,loudnorm=I=-17:TP=-2:LRA=7:print_format=json,atrim=end={len(audio)/SAMPLE_RATE}', '-ar', str(OUT_RATE), '-ac', '1', '-c:a', 'pcm_s16le', str(dest)], capture_output=True, text=True, check=True)
        normalization = json.loads(re.findall(r'\{\s*"input_i"[\s\S]*?\}', proc.stderr)[-1])
        info = sf.info(dest)
        duration = info.frames / info.samplerate
        if spec['start'] + duration > spec['slotEnd'] + .001:
            raise RuntimeError(f"{spec['id']} does not fit slot: {duration}")
        data, _ = sf.read(dest)
        cue = {**spec, 'path': str(dest.relative_to(project)), 'duration': round(duration, 6), 'end': round(spec['start'] + duration, 6), 'sha256': sha(dest), 'words': words, 'peakDbfs': round(20 * np.log10(max(np.max(np.abs(data)), 1e-12)), 3), 'normalization': normalization}
        cues.append(cue)
        print(f"{spec['id']}: {duration:.3f}s, ends {cue['end']:.3f}s, peak {cue['peakDbfs']:.2f} dBFS", flush=True)
metadata = {
    'provider': 'local Kokoro', 'model': REPO, 'modelRevision': REVISION,
    'modelSha256': sha(model_path), 'voice': VOICE, 'voiceSha256': sha(voice_path),
    'sampleRate': OUT_RATE, 'channels': 1, 'format': 'PCM signed 16-bit WAV',
    'seed': SEED, 'device': 'CPU', 'fallbackPhonemizer': 'Disabled; English lexicon only',
    'normalization': {'method': 'FFmpeg loudnorm', 'targetIntegratedLufs': -17, 'truePeakLimitDbtp': -2, 'targetLra': 7},
    'delivery': 'Story-led narration using natural model punctuation; no inserted silence and no speech time stretching.',
    'wordTimingMethod': 'Kokoro predicted phoneme durations joined into tokens; estimates, not ASR measurements',
    'versions': {name: importlib.metadata.version(name) for name in ['kokoro', 'torch', 'misaki', 'soundfile', 'numpy', 'transformers', 'en-core-web-sm']},
    'license': {'model': 'Apache-2.0', 'engine': 'Apache-2.0', 'modelSource': f'https://huggingface.co/{REPO}/tree/{REVISION}', 'engineSource': 'https://github.com/hexgrad/kokoro', 'note': 'This is a stock synthetic voice, not a voice clone. Model weights and runtime dependencies are excluded from the distribution.'},
    'cues': cues,
}
(project / 'narration-cues.json').write_text(json.dumps(metadata, indent=2) + '\n')
(project / 'narration-script.txt').write_text('Focus Trail — AI narration\nStock synthetic US English voice: Kokoro af_heart\n\n' + '\n\n'.join(f"{s['start']:05.2f}–{s['end']:05.2f}  {s['id']}\n{s['text']}" for s in cues) + '\n')
