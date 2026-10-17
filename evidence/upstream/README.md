# Pinned PyRIT Remove-dialog source-mechanism reproduction

This is an **extracted and adapted source reproduction** of the Remove-dialog focus mechanism in Microsoft PyRIT, using its pinned React and Fluent dependencies. The complete upstream application, API, authentication, routing, and backend were **not executed**.

The keyboard-only extraction independently reproduces the reported framework behavior without a forced `BODY` focus destination. The harness never calls `focus()` or `blur()`, never clicks to open the dialog, and never dispatches synthetic DOM keyboard events. The fixed application component calls `focus()` as the upstream fix does.

| Variant | Ordinary `toBeFocused()` return assertion | Independent `document.activeElement` after Escape | Installed Focus Trail return checkpoint |
| --- | --- | --- | --- |
| Before | Fails | `BODY` | Fails |
| After | Passes | Remove opener `BUTTON` | Passes |

The same authored journey is `Tab → Tab → Enter → Tab → Escape`: New Converter → row Remove opener → dialog Cancel → dialog Remove → dismissal. Every observed keydown was trusted. These five keys are specific to this extracted layout; the upstream issue does not provide an exact Tab count. All opening and dialog checkpoints are independently checked with ordinary Playwright assertions before dismissal.

The comparison uses the passing fixed journey as its baseline and the buggy journey as the current run. Focus Trail reports `regressed` at checkpoint `return-opener`, step index 9. The before result is an expected failing focus contract, while the verification harness exits successfully only when both the before and after observations match these independently verified expectations.

## Sources and adaptation

Primary evidence is [PyRIT issue 2701](https://github.com/microsoft/PyRIT/issues/2701) and [PR 2717](https://github.com/microsoft/PyRIT/pull/2717). Source snapshots and SHA-256 hashes are retained in `source/upstream/` and `result.json`.

- Before: [`ConverterRegistry.tsx` at `6fd719317c09228cb332cacf5d76b6602610b591`](https://github.com/microsoft/PyRIT/blob/6fd719317c09228cb332cacf5d76b6602610b591/frontend/src/components/Registry/ConverterRegistry.tsx). The Remove opener selects a converter. A controlled Fluent Dialog opens when that selection is non-null. Escape clears the selection; no restore hook or explicit restore mechanism exists.
- After: [`ConverterRegistry.tsx` at PR head `a1a4aade4ddd67885920c0cc052a902b4be916d7`](https://github.com/microsoft/PyRIT/blob/a1a4aade4ddd67885920c0cc052a902b4be916d7/frontend/src/components/Registry/ConverterRegistry.tsx). The extraction preserves `useRestoreFocusTarget`, the captured Remove opener ref, an open-dialog guard, and the effect that restores after React commits, with New Converter as the fallback for a disconnected opener.
- The fixture retains real `Dialog`, `DialogSurface`, `DialogBody`, `DialogTitle`, `DialogContent`, `DialogActions`, `Button`, and a minimal table row. It retains `React.StrictMode` and a `FluentProvider` with `webLightTheme`, following the pinned upstream provider structure.
- Static one-row converter data replaces API setup and converter creation. Refresh, unrelated columns, icons, styling, auth, routing, and theme preferences are omitted. `removing` stays false. The confirmation handler only dismisses and is not activated by this test. Only Escape dismissal with a still-mounted opener is qualified; deleted-row fallback and async create/delete scenarios are outside this result.

## Runtime and pins

The upstream package and lock snapshots pin React and ReactDOM `19.2.8`, Fluent components `9.74.7`, Fluent dialog `9.18.4`, Fluent Tabster adapter `9.26.17`, and Tabster `8.8.0`. The extraction's lock file pins shared dependencies to the original upstream lock versions. Vite `8.2.2` and its React plugin `6.1.1` are isolated build tooling, also matching the upstream lock.

This verification ran on Node `24.22.0`, macOS arm64, Playwright `1.64.1`, and **full Chromium channel** `156.0.8078.4`, revision `1248`, at 1280×800 / `en-US`. The original report used Playwright `1.63.0` on Windows. These environments differ; this evidence qualifies the extracted mechanism in the runtime recorded here, not an exact rerun of the original complete application/environment.

The Focus Trail core was installed from this repository's `focus-trail-0.1.0.tgz`; the exact tested bytes are preserved as `focus-trail-tested-0.1.0.tgz`. Its tarball SHA-256 and import path are recorded in `result.json`. Playwright was imported from the repository's pinned `node_modules` by absolute path. The fixture server used an OS-assigned ephemeral port and closed after verification.

## Rerun

From the Focus Trail repository, with its normal dependencies installed and the evidence tarball present:

```sh
cd evidence/upstream/source
npm ci --no-audit --no-fund
npm install --no-save --package-lock=false --legacy-peer-deps --no-audit --no-fund ../focus-trail-tested-0.1.0.tgz
node verify.mjs
```

Use Node 24 and install the repository's pinned full Chromium first if it is missing. The second install deliberately omits another Playwright peer install: the installed Focus Trail package resolves the repository's Playwright, avoiding two Playwright test-runtime instances. Neither command alters the MVP's dependency manifest or lock.

`FOCUS_TRAIL_REPO`, `FOCUS_TRAIL_CORE`, and `FOCUS_TRAIL_RECEIPTS` can override the repository, installed core, and receipt destinations. Defaults target this repository and evidence folder. `verify.mjs` launches and closes its own ephemeral Vite server and browser. A failure is saved as `not-reproduced-or-verification-failed`; the runner does not force the focus state to satisfy its expectations.

## Receipts

- `result.json`: runtime, source hashes, adaptations, all four independent/core scenarios, trusted keys, and final observations.
- `focus-trail-before.json`, `focus-trail-after.json`: the same authored journey through the installed package.
- `comparison.json`: the passing fixed baseline compared with the buggy current run.
- `before-ordinary-after.png`, `after-ordinary-after.png`, and core counterparts: screenshots after dismissal. Screenshots alone do not establish focus; the independent DOM and assertion receipts do.
- `source/`: runnable adapted fixture, exact fixture dependency lock, verifier, and pinned upstream source snapshots.

Upstream source retains its MIT license in `source/upstream/LICENSE`.
