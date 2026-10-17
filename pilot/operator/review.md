# Independent pilot kit review

Reviewed 2026-10-16, with no human participant results collected. The fresh reviewer found two material issues; both were corrected and rechecked.

1. Greedy participant-order selection could undercount a valid group of three when repository/environment overlaps crossed. The scorer now examines all eligible subsets (at most 32), selects maximum cardinality, and uses deterministic ID tie-breaking. A fresh reproduction credits P02/P03/P04 where the previous code credited only two. The same rule applies to day-14 independent integrations.
2. Removing every other Playwright project could break an authentication/setup dependency. Onboarding now retains required setup projects and their dependency references while selecting one Chromium journey project.

The reviewer confirmed candidate hash, separation of participant/operator materials, authenticity of all six ordinary trace archives, A/B ordinary-evidence parity, preservation of pass/failure status by the extraction helper, and a zero-installation blank status. Source review confirmed that disclosed answers, timeouts and invalid correct-time outcomes cannot inflate diagnostic credit, and benign passing baseline replacements are separate from unsafe approvals.

Root then ran all 37 shipped helper/accounting checks on Node 24.22.0 against the consumer-installed frozen package, copied and hash-checked the sealed primary evidence, reran the task verifier, rebuilt the participant archive after the onboarding edit, and checked every archive member against its final source file.

Two errors in the relocated verification tests (a workspace-specific temporary path and its missing `tmpdir` import) were caught and fixed during this final pass. Their failed logs are retained under `verification/test-portability-before-fix.log` and `verification/test-portability-import-before-fix.log`; the final combined run is green. These were verification harness errors; the frozen package did not change.

No remaining material findings in the reviewed source and final archives. This establishes kit behavior, not human pilot outcomes. Installation timing, participant judgments, practical preference and sustained integrations remain unmeasured. No external contacts, recording, enrollment or publication was performed.
