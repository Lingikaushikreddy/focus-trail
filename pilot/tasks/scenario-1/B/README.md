# Notebook review

Start with [brief.md](brief.md). Capture 1 is the approved reference; review captures 2 and 3 and make a baseline decision for each. The authored contract is in [task.capture.spec.mjs](task.capture.spec.mjs). Assertion logs and traces are in the three capture directories.

Open a trace using the Playwright 1.64.1 installation already present in your project:

```sh
npx playwright show-trace /absolute/path/to/this-packet/capture-2/trace.zip
```

Use a different capture number as needed. Do not install another runtime for this task. If this packet includes a focus-trail directory, open its capture-2.html and capture-3.html directly in a browser. The HTML, JSON, logs and brief work offline.

The application and its executable source are not included. Trace recording starts after application loading and before the first key. ZIPs are unedited and retain keyboard actions, API assertion calls, screenshots and DOM snapshots; the assertion logs preserve the complete test-runner outcome. Source capture is disabled.
