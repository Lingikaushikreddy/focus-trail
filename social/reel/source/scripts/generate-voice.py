#!/usr/bin/env python3
"""Regenerate one continuous local neural narration; rendering uses frozen WAV.

Requires FFmpeg on PATH. Downloads the pinned public model into --cache-dir
(about 313 MB) on first use. No login, API key, account or remote inference.
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
os.environ['HF_HOME'] = str(args.cache_dir.resolve())
os.environ['HF_HUB_DISABLE_XET'] = '1'

import numpy as np
import soundfile as sf
import torch
from huggingface_hub import hf_hub_download
from kokoro import KModel, KPipeline
import kokoro.pipeline as kp

# This script's words are covered by Misaki's English lexicon. No eSpeak fallback
# is needed; disabling it avoids a macOS wheel's compiled data-path issue.
kp.espeak.EspeakFallback = lambda british: None
REPO = 'hexgrad/Kokoro-82M'
REVISION = 'f3ff3571791e39611d31c381e3a41a3af07b4987'
VOICE = 'af_bella'
SEED = 42
SAMPLE_RATE = 24000
OUT_RATE = 48000
TEXT = ('Looks ready to ship, right? You change a setting, close the dialog, '
        'and jump straight back to work. Until one tiny bug makes your next '
        'move a guessing game. Focus Trail follows your keyboard journey, '
        'spots where it breaks, and helps you catch the problem before your users do.')
SPEC = dict(id='narration', text=TEXT, start=0.15, slotEnd=19.8, speed=0.94)

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def fetch(name):
    return hf_hub_download(repo_id=REPO, filename=name, revision=REVISION)

def run(arguments):
    return subprocess.run(arguments, capture_output=True, text=True, check=True)

def loudness_json(log):
    return json.loads(re.findall(r'\{\s*"input_i"[\s\S]*?\}', log)[-1])

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
chunks, words, offset = [], [], 0
# The WHOLE paragraph is passed once. Do not turn sentences or scenes into
# separate takes; that removes the paragraph-level delivery and inserts gaps.
for result in pipeline(TEXT, voice=voice_path, speed=SPEC['speed']):
    for token in result.tokens or []:
        if token.start_ts is not None and token.end_ts is not None:
            words.append(dict(text=token.text, start=round(offset + token.start_ts, 6), end=round(offset + token.end_ts, 6)))
    audio = result.audio.cpu().numpy()
    chunks.append(audio)
    offset += len(audio) / SAMPLE_RATE
if len(chunks) != 1:
    raise RuntimeError(f'Expected one synthesis result; received {len(chunks)}')
audio = chunks[0]
with tempfile.TemporaryDirectory(prefix='focus-trail-continuous-narration-') as scratch:
    raw = Path(scratch) / 'continuous-raw.wav'
    sf.write(raw, audio, SAMPLE_RATE, subtype='PCM_16')
    measure = run(['ffmpeg', '-hide_banner', '-i', str(raw), '-af', 'apad=pad_dur=0.2,loudnorm=I=-17:TP=-2:LRA=7:print_format=json', '-f', 'null', '-'])
    measured = loudness_json(measure.stderr)
    filters = (f"apad=pad_dur=0.2,loudnorm=I=-17:TP=-2:LRA=7:measured_I={measured['input_i']}:"
               f"measured_TP={measured['input_tp']}:measured_LRA={measured['input_lra']}:"
               f"measured_thresh={measured['input_thresh']}:offset={measured['target_offset']}:"
               f"linear=true:print_format=json,aresample={OUT_RATE},apad=whole_len={round(len(audio)*OUT_RATE/SAMPLE_RATE)},atrim=end_sample={round(len(audio)*OUT_RATE/SAMPLE_RATE)}")
    dest = out / 'narration.wav'
    proc = run(['ffmpeg', '-y', '-hide_banner', '-i', str(raw), '-af', filters, '-ar', str(OUT_RATE), '-ac', '1', '-c:a', 'pcm_s16le', str(dest)])
    normalization = loudness_json(proc.stderr)
info = sf.info(dest)
duration = info.frames / info.samplerate
if SPEC['start'] + duration > SPEC['slotEnd'] + .001:
    raise RuntimeError(f'Continuous narration exceeds Reel slot: {duration}')
data, _ = sf.read(dest)
cue = {**SPEC, 'path': str(dest.relative_to(project)), 'duration': round(duration, 6),
       'end': round(SPEC['start'] + duration, 6), 'sha256': sha(dest), 'words': words,
       'peakDbfs': round(20 * np.log10(max(np.max(np.abs(data)), 1e-12)), 3),
       'normalization': normalization}
metadata = {
    'provider': 'local Kokoro', 'model': REPO, 'modelRevision': REVISION,
    'modelSha256': sha(model_path), 'voice': VOICE, 'voiceSha256': sha(voice_path),
    'sampleRate': OUT_RATE, 'channels': 1, 'format': 'PCM signed 16-bit WAV',
    'seed': SEED, 'device': 'CPU', 'fallbackPhonemizer': 'Disabled; English lexicon only',
    'normalization': {'method': 'FFmpeg two-pass loudnorm', 'targetIntegratedLufs': -17, 'truePeakLimitDbtp': -2, 'targetLra': 7},
    'delivery': 'One complete paragraph, one synthesis result, one uninterrupted WAV. No inserted pauses, scene stitching or speech time stretching.',
    'synthesis': {'calls': 1, 'resultChunks': len(chunks), 'nativeSampleRate': SAMPLE_RATE, 'nativeDuration': len(audio)/SAMPLE_RATE, 'resamplingOnly': True, 'tailPreservation': 'Append 0.2 s after native ending before loudnorm; resample to output rate; preserve the exact native duration using sample-count trim with trailing padding only. No internal samples or word timings are removed.'},
    'wordTimingMethod': 'Kokoro predicted phoneme durations joined into tokens; estimates, not ASR measurements',
    'versions': {name: importlib.metadata.version(name) for name in ['kokoro', 'torch', 'misaki', 'soundfile', 'numpy', 'transformers', 'en-core-web-sm']},
    'license': {'model': 'Apache-2.0', 'engine': 'Apache-2.0', 'modelSource': f'https://huggingface.co/{REPO}/tree/{REVISION}', 'engineSource': 'https://github.com/hexgrad/kokoro', 'note': 'This is a stock synthetic voice, not a voice clone. Model weights and runtime dependencies are excluded from the distribution.'},
    'cues': [cue],
}
(project / 'narration-cues.json').write_text(json.dumps(metadata, indent=2) + '\n')
(project / 'narration-script.txt').write_text('Focus Trail — continuous AI narration\nStock synthetic US English voice: Kokoro af_bella\n\n' + f"{cue['start']:05.2f}–{cue['end']:05.2f}  narration\n{TEXT}\n")
print(f"narration: {duration:.3f}s, ends {cue['end']:.3f}s, peak {cue['peakDbfs']:.2f} dBFS; one synthesis result", flush=True)
