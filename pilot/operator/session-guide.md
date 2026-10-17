# Operator session guide — keep private

The participant kit contains no allocation or task answer key. Send it after eligibility is confirmed. Send diagnostic packets one at a time during the session. This is an operational version of the existing five-maintainer plan, not a new experiment or product feature.

## Recruit and book

Forward `participant-kit/INVITATION.txt` yourself. A public community post should use its usual recruitment channel and norms. Respondents reply to you; this package does not collect or send contact information. Enroll five maintainers who use Playwright and can exercise a short keyboard dialog journey in an existing application. At least three must have distinct maintained repositories and separate environments. Private repositories are eligible.

Screen for an eligible main-document dialog, Node 24 availability, ability to isolate Playwright 1.64.1 on a worktree/clone, and a 40-minute time window. If prerequisites are missing, record the blocker; do not promise a ten-minute setup. Record recruitment source and any shared organization/group in your private notes so selection effects are visible. Do not replace a failed setup with a successful participant while deleting the failure.

Assign P01–P05 in enrollment order. Record contact and confirmed timezone/slot privately in `roster.json`. Avoid putting personal contacts in public evidence. Confirm a session with the participant through your own channel. No calendar invitations, messages, compensation commitments or recordings have been made by this chat.

The participant archive is an attachment, not an external download link. Send the real archive through the agreed channel. The candidate hash must match on both sides. The installation materials can be provided at the session start; if sent early, record that exposure and measure active setup time honestly. Do not label a precompleted setup as a timed first use.

## 40-minute run sheet

| Minutes | Action and evidence |
| --- | --- |
| 0–3 | Confirm voluntary participation, repository/environment aliases, whether a recent real issue matches this problem, and permission for the summary receipt. Recording requires a separate explicit yes; otherwise take summary notes. |
| 3–18 | Participant installs and authors one real journey in their own application. Start the setup clock when candidate and instructions become available. Record all attempts, help and prerequisite time. Target first useful result <10 minutes; after 15 minutes retain incomplete outcome. Participant executes all commands. |
| 18–26 | Reveal only assigned task 1; start clock when its evidence is opened. Collect submitted diagnosis and two baseline decisions, including incomplete/incorrect attempts. Cap at 8 minutes. |
| 26–27 | Close task 1. Give no correctness feedback. Switch to the other unseen scenario/condition. |
| 27–35 | Reveal task 2; use identical timing, submission and baseline questions. Cap at 8 minutes. |
| 35–40 | Ask preference and reason, willingness to integrate, remaining friction and assistance. Review the sanitized receipt with participant; record confirmation. |

Extend to 45 minutes only to finish consent/receipt or explain a blocker, and record that extra time. Never complete installation on their behalf and call it independent. Baseline approval/rerun can be completed later; first successful passing `review-pending` report can satisfy installation.

## Fixed allocation

| Participant | First | Second | Order |
| --- | --- | --- | --- |
| P01 | A–X | B–Y | AB |
| P02 | B–X | A–Y | BA |
| P03 | A–Y | B–X | AB |
| P04 | B–Y | A–X | BA |
| P05 | A–X | B–Y | AB |

X maps to neutral `scenario-1`, Y to `scenario-2`. Use the corresponding condition folder under `tasks/`. A contains ordinary Playwright assertions and traces. B contains those exact ordinary artifacts plus Focus Trail comparisons. Participants see each failure once. Their own installation task is separate from these curated tasks.

Send the assigned attachment when its clock begins: [A–X](../tasks/scenario-1-A.zip), [B–X](../tasks/scenario-1-B.zip), [A–Y](../tasks/scenario-2-A.zip), [B–Y](../tasks/scenario-2-B.zip). Each ZIP contains only that condition's packet, with no operator answer key.

Keep the mapping, mutation source and `task-key.json` with the operator. Do not send the complete task library in advance. Do not use the existing demo's descriptive fault filenames during this pilot. Ordinary authored expectations and assertion failures are legitimate evidence; the mutation implementation and curator answers are not.

## Ask the same questions in each condition

1. Identify the first changed checkpoint in the regression capture (a semantic description is sufficient; a zero-based index is optional).
2. State the expected and observed focus destinations there.
3. Give the complete reproducible key sequence from the task's starting state.
4. Decide whether to approve the regression capture as a replacement baseline, and why.
5. Decide whether the separately passing descriptive change requires replacing the baseline, and why.

Ask for answers in writing or repeat back a spoken answer and timestamp it. Store a sanitized submitted answer/reference and the grader's decision. No coaching or correctness feedback until both tasks finish. Record every incorrect earlier answer and any assistance. If help discloses an answer, flag that task as assisted; preserve it and report the limitation.

## Ground truth and scoring

Read `task-key.json` before facilitating. Its answers come from intended fixture behavior and ordinary browser assertions, checked independently of Focus Trail's comparison. `task-verification.json` records actual candidate/browser runs. If the task artifacts disagree with the key, mark the task invalid and regenerate/review before resuming; do not grade the participant against a defective task.

A correct diagnosis includes **all three** diagnostic answers above. Accept equivalent descriptions of the same intended destination/key sequence. Use elapsed time of the first complete correct answer. Earlier wrong answers remain recorded. A timeout/incomplete/incorrect diagnosis has no correct-diagnosis time and cannot make B count as faster. Count B faster only when both A and B are correct within their eight-minute caps, neither timed out or received disclosed answers, and B time is strictly less than A time. Record `answerDisclosed` separately from navigation help. Report assisted outcomes and order effects separately.

There are exactly two baseline decision opportunities per condition. Approving a failed regression capture is a wrong approval (one possible unsafe approval per condition). For the documented passing descriptive label/build change with the same authored contract and compatible metadata, the existing baseline remains valid and replacement is unnecessary. Record whether the participant recognizes that as `benignBaselineDecisionCorrect`. A deliberately reviewed replacement with another passing capture is permissible; it is not an unsafe approval. Approving an unexplained contract change or incompatible record is also wrong, though those are not extra scored opportunities in these two tasks. Participants state decisions; only the operator manages the curated task baselines.

Freeze the conservative wrong-approval rule: B must have no greater unsafe-approval count than A for any participant, and no greater total count across the five. A missing decision is pending, not zero. Keep the answer text as well as the count. Benign replacement recognition is reported separately from unsafe approvals and does not silently add a new release threshold.

## Independent installation definition

Count a distinct human maintainer only when they:

- Execute the exact frozen candidate installation in their own environment and an isolated copy of an existing repository they maintain.
- Author/adapt a real eligible application journey and run it through their actual application/test setup.
- Produce and open a useful passing report: install and runner exits 0, test/capture passed, report generated and opened, initial `review-pending` or reviewed `unchanged`.
- Confirm a sanitized receipt that a named reviewer has checked, with versions, hash, relative test path, command outcomes, timing and assistance.

Each counted receipt must have a distinct participant, repository alias and environment alias. Two people reusing one repo/environment do not supply two independent installations. A canned demo, prewired diagnostic fixture, automated package consumer or facilitator-operated run is engineering evidence only. Troubleshooting guidance is allowed and recorded; the participant performs the integration.

A failing application journey still counts as an assessment and a valuable attempt. Resolve it, rerun and submit confirmed passing evidence before counting it as a successful installation. Baseline approval and a sustained working integration are separate facts.

## Evidence and decision gates

Use `receipts/template.json` and `receipt-format.md`. Keep the name/contact mapping private. Record only sanitized relative evidence references or a witnessed-run note, not private source/URLs/DOM/reports. Confirm what may be retained or shared. Recording consent is separate from participation and receipt confirmation.

Existing thresholds:

- 48-hour discovery gate: five assessments, at least three recognizing a recent issue and at least two willing to integrate. Start the documented 48-hour window at the first confirmed invitation/assessment activity; preserve dates and do not silently change the window after outcomes.
- Day-14 gate: two independent actual working integrations and at least one maintainer preferring the artifact to a plain trace. A promise is not completion. Record a genuine follow-up confirmation by day 14 from the documented pilot start.
- Public-installation gate: three independent successful installations of the final frozen candidate.
- Diagnostic threshold: at least three of five correctly diagnose faster with B and B introduces no additional wrong baseline decisions under the frozen count rule.

The scorer reports these separately. Five people do not support a statistical superiority claim. Describe individual results, medians of valid correct times, timeouts, failures, help and AB/BA effects. If setup/review value is weak or mistaken approvals increase, preserve the upstream-or-stop option rather than claim release success.

The keyboard-user assessment of the report is separate; use `keyboard-assessment.json` only for confirmed real human evidence. Arrange consent and any compensation before substantial participation; no amount or commitment has been authorized here.

## After each session and later confirmations

Save one current participant-confirmed sanitized receipt under `receipts/p01.json` etc. Retain failed/incomplete attempts and corrections under `operator/history/`, outside the scanned receipt directory. Multiple current files for one participant are flagged as duplicates and do not count. Validate with `node operator/score.mjs receipts/`. Only save a recomputed `status.json` after reading the output. Keep synthetic tests outside `receipts/`.

For an incomplete install, ask the participant through your channel to report their next run; use the same hash. For an actual day-14 integration, confirm it still runs in the maintained repository and record the date and reviewed evidence. These follow-up templates are available in `follow-ups.txt`; they have not been sent or scheduled.

When the gates have evidence, review the release decision and candidate integrity. Publication is a separate explicit action. This scorer never publishes.
