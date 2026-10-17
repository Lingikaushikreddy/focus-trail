# Example report findings

These are controlled engineering fixtures captured with Playwright 1.64.1, full Chromium 156.0.8078.4, a 1280 × 800 viewport and `en-US`. They do not represent independent maintainer installations.

## Working journey

The `return-focus` journey passes its authored checkpoints and compares unchanged against its reviewed baseline. Tab reaches the opener, Enter opens the dialog, Tab moves between controls, and Escape closes it with focus restored to the opener.

[HTML](../evidence/demo/good.html) · [Raw capture](../evidence/demo/good.json)

## Lost return focus

The `return-focus` journey fails at zero-based index 7, shown as **Step 8**, checkpoint `return-opener`, after Escape. The intended target is the opener button, “Open settings.” It did not receive focus within the 500 ms checkpoint bound. The reporter preserves its last coherent sample with an explicit qualification that no later verified sample was available at the checkpoint's end.

![First changed checkpoint in the lost-return report.](images/report-first-difference.png)

[HTML](../evidence/demo/lost-return.html) · [Report JSON](../evidence/demo/lost-return.json)

## Focus escapes the modal

The `modal-containment` journey fails at zero-based index 7, shown as **Step 8**, checkpoint `save-wrap`. The authored Tab action should wrap focus from Cancel to Save while the modal remains open. The faulty fixture violates that expected target.

[HTML](../evidence/demo/escape.html) · [Report JSON](../evidence/demo/escape.json)

## Activation assertion fails

The `activation` test fails its ordinary assertion that Enter opens the dialog. Its recorded focus steps pass, but the complete run remains failed. The comparison reports a run failure at zero-based index 3 (after the recorded steps), preserving the application assertion rather than presenting a green focus-only result.

[HTML](../evidence/demo/activation.html) · [Report JSON](../evidence/demo/activation.json)

## Inspect the evidence

Download a self-contained HTML file and open it in a browser; GitHub's file view displays its source. Alternatively run `npm run build` and `npm run demo` from the repository and follow its report links. Each report offers keyboard navigation and before/after evidence.

[Demo verification receipt](../evidence/demo/verification.json) · [Comparison rules and limits](limits.md) · [Back to README](../README.md)
