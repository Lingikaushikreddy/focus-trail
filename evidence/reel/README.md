# Narrated Reel verification

The [20-second Reel](../../social/reel/focus-trail-instagram-reel.mp4) shows actual Focus Trail UI captures, real browser keyboard events, a deliberate lost-return fault, and the existing saved checkpoint report. English AI narration uses the stock Kokoro `af_heart` voice.

| Check | Result | Primary record |
| --- | --- | --- |
| Delivery encode | 1080 × 1920, 30 fps, 600 frames, H.264/AAC, 20.000s | [FFprobe](ffprobe.json) |
| Decode | No errors | [Decode log](decode-errors.log) |
| Final composition | Strict check passed: 8 layout samples, 31/31 contrast checks, no runtime/layout findings | [Final check](check.json) |
| Narrative script | 39-word story; no spoken key list or inserted silent pauses | [Narrative review](narrative-review.json) |
| Frozen narration | 25 checks passed: hashes, durations, slot fit, format, peak bounds | [Voice verification](narration-verification.json) |
| Encoded voice inclusion | All five voice segments match the independently reconstructed source mix; minimum correlation > 0.9998 | [Audio match](audio-match.json) |
| Final mix | Measured loudness and peak | [Loudness](mix-loudness.log), [peak analysis](audio-analysis.log) |
| Real key sequence | Tab → Enter → Tab → Escape; working fixture returns to opener, controlled fault ends on BODY | [Claim review](claim-review.json), [capture provenance](../../social/reel/source/assets/capture-provenance.json) |
| Visual export | Decoded final stills reviewed; outcome and report caveat visible | [Visual review](visual-review.json), [contact sheet](encoded-contact-sheet.png) |
| Relocated editable source | Strict runtime/layout/contrast checks passed after copying the project into the repository | [Relocation check](relocated-source-check.json) |
| Publication review | Independent artifact, link, voice, ZIP and scope audit passed | [Review](publication-review.json) |
| Artifact integrity | MP4/source hashes and checks | [Verification](verification.json), [publication manifest](publication-manifest.json) |

The narration tells a short developer story instead of reading the controls. The lost-place phrase follows Escape in the controlled fault. Token boundaries are native model estimates, not independent ASR measurements. Source clips, frozen voice WAVs, script, cue timing, pinned regeneration dependencies, fonts and editable HyperFrames compositions are in the [editable project](../../social/reel/source/). Normal video rendering uses the frozen WAVs and needs no AI account or model.

The saved report and the new browser footage are distinct runs of the same controlled fault. The report identifies human Step 8, `return-opener`, and the 500ms timeout; it retains a historical sample and marks the fresh endpoint sample unavailable. Fresh browser capture independently verifies BODY focus. This is engineering demonstration evidence and does not count toward the five-maintainer pilot or three independent installations.

The motion assertion audit is disabled in this CLI; the final runtime/layout/contrast checks and decoded still review are reported with their actual scope. Instagram overlay/compression and subjective listening are not certified by these receipts.

Text copies of local receipts normalize machine path prefixes to `<workspace>`, `<installed-skills>` and `<user-home>`. Captures, voice WAVs and final media retain their original bytes. Earlier transition sampling is preserved in [transition-check.json](transition-check.json); [check.json](check.json) is the final narrated-composition check.
