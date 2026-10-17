# Continuous story + music Reel verification

The [20-second Reel](../../social/reel/focus-trail-instagram-reel.mp4) combines actual Focus Trail UI and keyboard footage with one continuous AI story and an original upbeat instrumental.

| Check | Evidence |
| --- | --- |
| 1080 × 1920, 30 fps, 600 frames, H.264/AAC, 20 seconds; full decode | [Delivery verification](verification.json), [FFprobe](ffprobe.json), [decode log](decode-errors.log) |
| Browser runtime, layout, contrast and strict lint | [Final composition check](check.json) |
| One 49-word paragraph, one synthesis result, one 18.125-second WAV | [Narrative review](narrative-review.json), [voice checks](narration-verification.json) |
| Actual encoded voice timing and source correlation, music presence and voice dominance | [Encoded audio verification](audio-match.json) |
| Final AAC loudness and true peak | [Measured mix](final-mix-loudness.json), [raw log](final-mix-loudness.log) |
| Original 96 BPM music, synthesized without third-party samples | [Music measurements](music/generation.json), [credits and reproduction](../../social/reel/source/assets/music/MUSIC.md) |
| Speech-aware EQ and gain automation | [Canonical carve](music/carve.json), [analysis log](music/carve.log) |
| Real Tab → Enter → Tab → Escape and asserted active elements | [Claim review](claim-review.json), [capture provenance](../../social/reel/source/assets/capture-provenance.json) |
| Encoded images and visible saved-report limitation | [Visual review](visual-review.json), [contact sheet](encoded-contact-sheet.png) |
| Portable editable project and distribution integrity | [Relocated check](relocated-source-check.json), [publication audit](publication-review.json), [manifest](publication-manifest.json) |

The voice is stock Kokoro `af_bella`, generated as one complete paragraph. There are no inserted scene pauses, spliced takes or post-synthesis time stretching. Native token timestamps produce the narration captions; these are estimates, not an independently recognized transcript. The original music is carved around the speech and continues into the final hold. Normal rendering uses frozen local media and needs no AI account or model.

The saved report and the new browser footage are separate runs of the same controlled fault. The report identifies Step 8, `return-opener`, and a 500 ms timeout; it retains a historical sample and marks the fresh endpoint sample unavailable. Fresh browser capture independently verifies BODY focus. This demonstration does not count toward the five-maintainer pilot or three independent installations.

Audio signal checks support source inclusion, timing and measurable balance. They do not certify subjective naturalness, energy, intelligibility or transcription accuracy. The motion assertion audit is disabled in this CLI. Instagram overlays and platform recompression have not been tested in the Instagram app.

Copied text receipts normalize machine-specific path prefixes. Media bytes are preserved. Earlier transition sampling remains in [transition-check.json](transition-check.json); `check.json` is the final current composition check.
