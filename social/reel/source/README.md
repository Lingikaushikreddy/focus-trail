# Focus Trail · Instagram Reel

A 20-second portrait Reel showing the new UI, a working keyboard journey, a deliberate lost-return-focus bug, and its saved report.

- **Video:** `renders/focus-trail-instagram-reel.mp4`
- **Cover:** `poster.png`
- **Post copy:** `caption.txt`
- **On-screen text equivalent:** `captions.srt`
- **AI voice captions:** `narration.srt`
- **Voice script and timing:** `narration-script.txt`, `narration-cues.json`
- **Editable source:** `index.html` and `compositions/frames/`
- **Verification:** `evidence/verification.json`, `evidence/check.json`, `evidence/transition-check.json`, `evidence/claim-review.json`
- **Capture provenance:** `assets/capture-provenance.json`

## Reopen and render

Use Node.js 22 or newer and FFmpeg. From this directory:

```sh
npm run dev
npm run check
npm run render -- --quality delivery --fps 30 --output renders/focus-trail-instagram-reel.mp4 --workers 2
```

HyperFrames is pinned to 0.8.167. Open the exact Studio project URL printed by the preview command; its port and project name depend on where you unpack the source.

## What the footage proves

Both clips contain actual browser keyboard events. Tab, Enter, Tab, Escape move through the working dialog and return to `button#opener`; the deliberate lost-return variant ends at `BODY`. The event timing and resulting active elements were independently asserted during capture.

The report shown is the existing saved fixture report. It identifies checkpoint `return-opener` at step 8 and the 500ms timeout. It explicitly retains the last coherent sample and marks the fresh endpoint sample unavailable. The new browser recording independently verifies the body outcome; the saved report is not presented as a fresh body measurement.

This is a controlled demo. It does not count as an independent maintainer installation or establish public npm release readiness.

## Media

Product and report images are actual local browser captures. UI source: [Focus Trail](https://github.com/Lingikaushikreddy/focus-trail).

Manrope is included with its SIL Open Font License in `assets/fonts/OFL-Manrope.txt`. GSAP 3.14.2 retains its upstream license header in `vendor/gsap.min.js`. The eight quiet keyboard sound effects come from the locally bundled media-use keypress asset; source and license credits are in `assets/SFX-CREDITS.md` and the `.media/` ledger. English AI narration uses the local Kokoro model and af_heart voice. See `assets/voice/` for measured WAV files and provenance. No music or remote runtime assets.

No video has been posted to Instagram.

The normal render uses frozen local voice WAVs and needs no voice model or account. Optional voice regeneration instructions and dependencies are included in `scripts/`.
