# Continuous AI narration

The Reel uses the stock **Kokoro `af_bella`** synthetic US English voice. The whole story is generated in **one paragraph and one synthesis result**, then placed as one uninterrupted audio clip. Natural punctuation gives the hook, twist and payoff their cadence. No pauses are added at scene boundaries, no takes are spliced together, and the speech is not time-stretched.

The frozen `assets/voice/narration.wav` renders offline. A TTS service or model is not needed to play or render the finished edit. The voice is synthetic and is not a voice clone.

- Script, placement, measured duration, file hash and native estimated token boundaries: [narration-cues.json](narration-cues.json).
- Human-readable story: [narration-script.txt](narration-script.txt).
- Independent format, continuity, loudness and duration checks: [narration-verification.json](narration-verification.json).
- Engine: Kokoro 0.9.4; model `hexgrad/Kokoro-82M`, pinned revision `f3ff3571791e39611d31c381e3a41a3af07b4987`; stock voice `af_bella`; seed 42; synthesis speed 0.94.
- [Model and weights](https://huggingface.co/hexgrad/Kokoro-82M/tree/f3ff3571791e39611d31c381e3a41a3af07b4987) and [engine](https://github.com/hexgrad/kokoro) use Apache-2.0. Model weights and runtime dependencies are not distributed in this project.
- FFmpeg applies two-pass loudness normalization toward −17 LUFS with a −2 dBTP ceiling and resamples the native 24 kHz output to 48 kHz mono PCM16. To preserve the complete native ending, the generator adds 0.2 seconds after the source tail before normalization and trims the result to the exact native duration. It does not alter internal timing or word boundaries. Measurements of the final voice/music mix are recorded separately.

## Optional regeneration

Requires Python 3.11, [uv](https://docs.astral.sh/uv/) and FFmpeg on PATH. This downloads the pinned public model (about 313 MB) into the selected scratch directory on first run. Inference runs locally without an account or API key.

From the project directory:

```sh
uv venv --python 3.11 ../../work/focus-trail-voice-env
uv pip install --python ../../work/focus-trail-voice-env/bin/python -r scripts/voice-requirements.txt
../../work/focus-trail-voice-env/bin/python scripts/generate-voice.py --cache-dir ../../work/focus-trail-voice-cache
```

The generator asserts that the paragraph produces one synthesis result and fits the 20-second edit. Platform and dependency differences can change output bytes; the frozen WAV hash in the cue file identifies the delivered performance. The script's English words are covered by the lexicon, so optional eSpeak fallback is disabled to avoid a macOS wheel data-path issue.
