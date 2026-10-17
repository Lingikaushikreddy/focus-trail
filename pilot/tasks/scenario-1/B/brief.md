# Notebook dialog review

Capture 1 is the reviewed reference. Captures 2 and 3 are proposed runs against the same authored keyboard contract. For each proposed run, decide whether to retain the existing baseline or reject the proposed behavior. A descriptive label or build change may be acceptable when the contract still passes.

Expected contract: start on the document, press Tab to reach the opener; Enter opens the dialog and moves focus to Save; Tab reaches Cancel; Shift+Tab returns to Save; Escape closes the dialog and restores focus to the opener. The full key sequence has five keys. Checkpoints and locators are authored in task.capture.spec.mjs.

For any changed behavior, report the first changed checkpoint, expected and observed destinations, and the full reproducible key sequence. Explain each baseline decision. Review evidence offline; the test file documents the intended contract and does not include the application.
