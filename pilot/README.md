# Run the Focus Trail pilot

**Recruitment is ready; human evidence is still pending: 0 of 5 assessments and 0 of 3 independent installations.** This kit preserves the qualified 0.1.0 candidate. It adds no product features and does not publish it.

## Start here

1. Forward [the invitation](participant-kit/INVITATION.txt) to people or communities you already know. Ask respondents to reply directly to you. You chose forwarding; no external messages have been sent from this chat.
2. Screen replies using [the session guide](operator/session-guide.md). Enroll five eligible Playwright maintainers, with at least three testing in distinct repositories they maintain and their own environments. Record names/contact details privately in [the roster](operator/roster.json).
3. Send only `focus-trail-pilot-participant-kit.zip` to confirmed participants. It contains the actual unpublished package, SHA-256, installation instructions and extraction helper. A local path or localhost URL will not work on another person's machine. The archive can be an attachment in your chosen channel; no public hosting is required.
4. Run the 40-minute session. Use the preassigned paired task packets one at a time. Keep the operator folder and answer key private until both tasks finish. Task fixtures are engineering material and do not count as installations.
5. Review each sanitized receipt with its participant, then save it in `receipts/` as `p01.json` through `p05.json`. Keep raw application artifacts local unless their owner explicitly agrees to share them after review.
6. Recompute status from actual evidence:

```sh
node operator/score.mjs receipts/
```

The scorer reports distinct confirmed installations and the existing pilot decision gates. It cannot authenticate a person's statements; the participant confirmation and evidence review are human responsibilities. Blank cells/nulls remain pending. A generated smoke test, sample receipt or facilitator-operated install never counts.

## What's included

- `participant-kit/`: safe to send; frozen candidate, invitation, onboarding and helper.
- `tasks/`: neutral A/B diagnostic packets. Send only the assigned packet when that task begins.
- `operator/`: private allocation, session guide, ground truth, scoring and verification evidence.
- `receipts/template.json`: blank evidence form; create one copy per actual participant.
- `operator/status.json`: the latest computed snapshot; currently no human outcomes.

## Release decision

Three independent successful installations satisfy the public-installation gate. Keep the five-maintainer assessment, recent-issue recognition, willingness, paired diagnostic results and day-14 working integrations separately visible. Use the predeclared decision criteria in the session guide before choosing public release or the upstream-or-stop option. A preference or promise to integrate is not a working integration.

A separate keyboard-user assessment of the report remains pending. It is not interchangeable with maintainer preference. No package publication is part of this kit, and no public release has been performed.

If the candidate changes, retain the old receipts as history and requalify/reconfirm the final package hash. Do not silently count installations of different bytes toward a new release candidate.
