# Focus Trail — original Reel music bed

`focus-trail-bed.wav` is an original, procedurally composed instrumental made for the Focus Trail Reel. It is not a commercial song or a stock recording. No third-party recordings, instrument samples, melody files, music model weights or source tracks were used.

## Arrangement

- 20.000 seconds; eight 4/4 bars at 96 BPM; 48,000 Hz stereo PCM16.
- Bright, restrained electronic pop: original mallet/pluck phrases, quiet stereo arpeggios, warm synthesized bass, soft kick, noise-synthesized clap and closed hats.
- Harmony: Cmaj9 → Am7 → Fmaj7 → G6, with a tonic resolution in the final bar.
- Subtle offbeat timing, velocity variation and alternating panning avoid a flat click-track feel. The phrase resolves before a 750 ms tail fade.
- The voiceover mix applies its own volume and speech carve; this file is the uncarved source bed.

## Source and reproduction

The complete composition and synthesizer are in `scripts/generate-music.py`, relative to the project root. The deterministic random seed is `4162026`. The code generates all oscillators and noise directly, then uses FFmpeg for a quiet source master. Dependencies: Python 3, NumPy and FFmpeg on PATH.

Run from the project root:

```sh
python scripts/generate-music.py
```

For this frozen render, FFmpeg measured **−20.12 LUFS integrated**, **−5.29 dBTP** and **1.40 LU loudness range**. These are measurements, not a listening review. `evidence/music/` contains the generation record, FFprobe output and the complete loudness log.

SHA-256: `2291e7d87ef6f2b4fb4722bf5211bebf4f624c4935a5a7b5f3190173d7171e3f`.

## License

The original composition, rendered WAV and generator code are provided under the MIT license below. No third-party sample rights are required by this asset's creation process. An Instagram account's platform and publication rules remain separate from the source license.

MIT License

Copyright (c) 2026 Focus Trail contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), including this original composition and rendered audio, to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Final Reel mix

The source is mixed at a linear gain of 1.4. HyperFrames core 0.8.167 analyzes the continuous narration and generates spectral EQ and level-ducking envelopes at strength 0.65. The generated level release is authored to reach 0 dB by 18.95s, after the full narration ends at 18.275s. The source music fades from 19.25–20s. Final encoded levels and voice/music signal checks are in `evidence/audio-match.json` and `evidence/final-mix-loudness.json`; the exact automation and mix decision are in `evidence/music/carve.json`.
