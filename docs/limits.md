# Scope and limits

Focus Trail checks authored keyboard journeys in a single page's main document with pinned Playwright Chromium. Use a fixed positive viewport and explicit locale; the result records the actual browser version and `navigator.language`.

- At most 50 keyboard actions and 50 checkpoints per journey, within 30 seconds from creation.
- Each checkpoint has a positive wait of at most 5 seconds. It checks eventual focus within that window; focus movement between checkpoints is outside recorded coverage.
- A checkpoint target must resolve to one element belonging to the same page's main document. Other pages, frames and shadow content are unsupported and fail explicitly when encountered.
- Native browser chrome, other browsers and screen reader behavior are outside this MVP. Passing checkpoints make no accessibility or regulatory compliance claim.
- Application activation, modal visibility, data changes and other behavior need ordinary Playwright assertions. The supplied fixture preserves those failures in the journey.

Default evidence includes the focused element's tag, accessible role/name, optional test ID, action/checkpoint identity, status, elapsed time and a bounded error. Capture queries the focused node and does not persist a DOM snapshot, a full accessibility tree, form values or cookies. Literal masks redact specified text; accessible names can still contain sensitive information, so review outputs before sharing.

If a late capture is unavailable, a checkpoint can retain its most recent real coherent sample. The `unavailable` field explicitly labels that sample with its observation time; it is historical evidence, not a new observation at timeout. A detected focus change clears retained evidence. A proven focus assertion can pass while descriptive accessibility metadata remains unavailable.

Screenshots are optional input evidence. The journey does not capture them by default. The JSON validator accepts bounded canonical base64 PNG/JPEG/WebP raster data URLs with matching signatures and rejects remote URLs, file paths, SVG and HTML images. Signature checks do not constitute a full image decode or a privacy check. Missing or unusable image evidence still has a textual report path.

The renderer displays optional PNG/JPEG data images. Accepted WebP evidence remains in JSON and uses the text fallback in this version.

Schema version 1 inputs are limited to 100 steps, 10 MiB JSON, 65,536 characters per ordinary text field, 60,000ms recorded timing, and 4 MiB decoded bytes per screenshot. These validation tolerances cover bounded failure/finalization overhead; they do not raise the live journey's 30-second budget. Malformed JSON, unsupported schema versions, invalid fields and failed baselines are tool errors.

Comparison outcomes:

| Outcome | Meaning | CLI exit |
| --- | --- | --- |
| Unchanged | A passed current run follows the same reviewed contract and passed checkpoints. | `0` |
| Regressed | A checkpoint/action/run failed, or the authored journey contract changed. | `1` |
| Tool error | Invalid input, failed baseline, unsupported schema, or read/write failure. | `2` |
| Incomparable | Journey ID, browser version, viewport, actual locale or fixture version differs. | `3` |

A metadata mismatch takes precedence over current outcomes because comparison needs a compatible environment. Otherwise a failed current run cannot be unchanged. The first meaningful differing step is reported by zero-based index. An external failure after all recorded steps is a separate run-failure item, rather than a passed checkpoint highlight.

Observed descriptive fields, timings, screenshots and application build labels are excluded from equality. Checkpoint IDs and expected target keys come from the test author, rather than inferred accessible labels. Review source changes and baseline updates together.

Reports are local, self-contained HTML and JSON artifacts. The package, reporter, CI workflow and manual candidate workflow have no upload or publishing step. Human pilot work remains pending until recorded in the [pilot gate](pilot.md).
