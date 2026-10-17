# AI narration

The narrated Reel uses the stock **Kokoro `af_heart`** synthetic US English voice. It is not a voice clone. The five frozen WAV files in `assets/voice/` render offline; no TTS model or service is needed to play or render the finished edit.

- Script, scene placement, measured durations, file hashes and native estimated token boundaries: [narration-cues.json](narration-cues.json).
- Human-readable script: [narration-script.txt](narration-script.txt).
- Engine: Kokoro 0.9.4; model `hexgrad/Kokoro-82M`, pinned revision `f3ff3571791e39611d31c381e3a41a3af07b4987`.
- [Model and weights](https://huggingface.co/hexgrad/Kokoro-82M/tree/f3ff3571791e39611d31c381e3a41a3af07b4987) and [engine](https://github.com/hexgrad/kokoro) are Apache-2.0. Model weights and runtime dependencies are not distributed in this project.
- Key outcome sentences follow the recorded Escape events. Two silent sentence pauses make room for the actual keyboard sequence; spoken audio is not stretched.
- FFmpeg normalizes the voice toward −17 LUFS with a −2 dBTP ceiling. Final mixed Reel measurements are recorded separately in the verification evidence.

## Optional regeneration

Requires Python 3.11, [uv](https://docs.astral.sh/uv/) and FFmpeg on PATH. This downloads the pinned public model (about 313 MB) into the explicitly selected scratch directory on first run. Inference runs locally without an account or API key.

From the project directory:

```sh
uv venv --python 3.11 ../../work/focus-trail-voice-env
uv pip install --python ../../work/focus-trail-voice-env/bin/python -r scripts/voice-requirements.txt
../../work/focus-trail-voice-env/bin/python scripts/generate-voice.py --cache-dir ../../work/focus-trail-voice-cache
```

The script uses CPU inference, seed 42 and a pinned model revision. Platform and dependency differences can change output bytes; the frozen WAV hashes in the cue file identify the delivered files. The English lexicon covers this narration, so the optional eSpeak fallback is disabled to avoid a macOS wheel data-path issue. `UI` is spelled `U I` only in synthesis input so the letters are spoken clearly.
