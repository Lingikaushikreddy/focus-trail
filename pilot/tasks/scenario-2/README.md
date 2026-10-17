# Calendar review packet

Open only the A or B directory assigned by the operator. Both contain exactly the same ordinary evidence: brief.md, task.capture.spec.mjs, and assertion logs plus Playwright trace.zip for captures 1–3. B also contains self-contained Focus Trail HTML comparisons and JSON. Open B/focus-trail/capture-2.html and capture-3.html directly in a browser; no server or installation is needed for those reports.

Read the brief, then make one baseline decision for each proposed capture. Capture 1 is the reviewed reference. Do not assume that every visible label or build change changes the keyboard contract.

Traces are ZIP files readable by the existing Playwright 1.64.1 trace viewer:

```sh
npx playwright show-trace /absolute/path/to/scenario-2/A/capture-2/trace.zip
```

Substitute the assigned directory and capture number. Run from an existing project with Playwright 1.64.1 installed. Logs, briefs, and HTML reports work fully offline. The local trace viewer requires the existing peer runtime; it does not require a new installation.

Traces are authentic unedited Playwright ZIPs. Recording begins after page loading and before the first key, so application script response bodies are outside the recorded interval. Traces retain keyboard actions, API assertion calls, screenshots, and DOM snapshots. Complete test-runner pass/fail outcomes remain in assertions.log. Source capture is disabled, and the application is not bundled. The ordinary test source documents the authored contract. No proposed behavior is accepted automatically.
