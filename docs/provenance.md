# Primary evidence and fixture provenance

The return-focus fixture is an **adapted behavioral reproduction**, not an execution of the upstream application or a copy of its framework implementation.

Microsoft PyRIT [issue 2701](https://github.com/microsoft/PyRIT/issues/2701) records Remove-dialog dismissal leaving Chromium focus on `BODY`. It supplies a reproducible commit and original procedure. [PR 2717](https://github.com/microsoft/PyRIT/pull/2717) fixes restoration, including a fallback when the opener disappears.

| Source | Pinned revision |
| --- | --- |
| Reported buggy source | `6fd719317c09228cb332cacf5d76b6602610b591` |
| Reviewed fixed PR head | `a1a4aade4ddd67885920c0cc052a902b4be916d7` |
| Merged fix | `d507a92835f19fa0f347e03bf401d61925163d25` |

Original source: [buggy ConverterRegistry](https://github.com/microsoft/PyRIT/blob/6fd719317c09228cb332cacf5d76b6602610b591/frontend/src/components/Registry/ConverterRegistry.tsx), [fixed ConverterRegistry](https://github.com/microsoft/PyRIT/blob/a1a4aade4ddd67885920c0cc052a902b4be916d7/frontend/src/components/Registry/ConverterRegistry.tsx).

The issue's relevant procedure opens Registry → Converters, creates a synthetic converter, opens its Remove dialog, and dismisses with Escape. It reports Playwright 1.63.0 on Windows. No exact Tab count is supplied. Our plain DOM fixture replaces the API, routing, table, and Fluent/React implementation. Its four-key journey and forced body destination are local adaptation choices. The upstream application has not been independently rerun here.

## Source-derived framework reproduction

`evidence/upstream/` retains a separately runnable extracted fixture and receipts. It uses the upstream React/ReactDOM 19.2.8 and Fluent 9.74.7 versions, with matching focus-related transitive dependencies from the upstream lock. It preserves the controlled Remove dialog and the fixed restore-hook/opener-ref/post-commit-effect mechanism, while removing routing, API calls, and unrelated UI.

In this extracted layout, the verified sequence is `Tab → Tab → Enter → Tab → Escape`. Ordinary browser assertions independently observe body focus before the fix and opener focus after it. All five keydowns are trusted. The installed Focus Trail core agrees and identifies `return-opener` as the first failed checkpoint. The fixture does not force body focus in the broken variant.

These results use Playwright 1.64.1 / Chromium 156.0.8078.4 on macOS, rather than the issue's Playwright 1.63.0 on Windows. The complete upstream application remains unexecuted. Adaptations, dependency comparisons, source digests, runtime, and the exact tested package hash are recorded in `evidence/upstream/result.json`.

The separate escaping-focus and activation fixtures are synthetic single-fault controls. Independent ordinary Playwright assertions verify their actual states. The correct fixture follows [APG modal keyboard guidance](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), including wrapping and an authored fallback destination. Screen-reader behavior is outside these claims.
