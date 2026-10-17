# Focus Trail pilot implementation plan

> **For agentic workers:** Use subagent-driven-development or executing-plans to complete these bounded companion-kit tasks. The user has authorized execution; no product feature or publication is part of this plan.

**Goal:** Make the existing five-maintainer pilot runnable and collect auditable evidence for three independent installations.

**Architecture:** Preserve the frozen package. Ship a separate private participant kit and neutral paired task packets; keep assignment, scoring key, and synthetic verification with the operator. Human receipts remain empty until participant-confirmed evidence arrives.

**Tech stack:** Node 24 standard library, installed Focus Trail 0.1.0, Playwright 1.64.1, Chromium channel, ZIP attachments, JSON receipts.

**Spec:** `../../docs/pilot.md`; current user request to run the pilot with five maintainers and three independent installations.

## Global constraints

- Five maintainers; three distinct maintainers in distinct maintained repositories/environments for the independent-install gate.
- Candidate SHA-256: `79bac5b64c1f96e7cb684e4bb746cc37af4bda902f719590bacc3984fb8e67e4`. Do not repack or change it.
- Three AB sessions and two BA sessions. Each sees each equivalent failure once.
- No public release, external contact, participant recording, or private source upload without the corresponding human instruction/consent.
- No generated installation or sample task run counts as an independent installation.

## Review focus

- Missing or repeated manifest records must fail extraction rather than select the wrong baseline.
- Failed captures or ambiguous evidence must never qualify a passing baseline or installation.
- Duplicate participant/repository/environment receipts must not inflate the installation count.
- Task labels, filenames and bundled source must not disclose the mutation or sealed key.
- Missing human confirmations and unresolved/incorrect diagnoses must remain pending or failed, never synthetic success.

### Task 1: Neutral diagnostic packet generation

Files: `tasks/`, `operator/task-key.json`, `operator/task-verification.json`; generator in `work/focus-trail-pilot/`.

- [x] Generate two matched dialog return failures and passing descriptive-change controls using ordinary Playwright assertions/traces.
- [x] Independently establish expected/observed focus and complete keys before consulting Focus Trail comparisons.
- [x] Produce A packets with ordinary evidence and B packets with that evidence plus Focus Trail; use neutral filenames.
- [x] Check package hash, paired artifact parity, first changed checkpoint, benign unchanged classification, and trace availability. Preserve raw engineering evidence, not participant outcomes.

### Task 2: Installation kit and safe extraction

Files: `participant-kit/START-HERE.md`, invitation, frozen candidate and manifest, `helpers/extract.mjs`; focused helper tests in `work/`.

- [x] Write and run failing behavior checks: missing/ambiguous captures, traversal paths, mismatched journey ID, existing output refusal, genuine passing extraction.
- [x] Implement only the helper required for manifest-based extraction, resolving the installed package from the participant's current repository.
- [x] Verify it against real generated reports; document exclusive manual baseline approval and own-application integration.
- [x] Archive only participant-safe files and verify the candidate checksum after extraction.

### Task 3: Session protocol and evidence accounting

Files: `operator/session-guide.md`, allocation and private answer key, `receipts/template.json`, `operator/score.mjs`, recruitment/invitation and status notes.

- [x] Freeze installation and scoring definitions before collecting data.
- [x] Write and run failing checks for blank receipts, wrong hash, unconfirmed execution, duplicated identities/repositories/environments, incorrect/time-out diagnosis, and conservative public-release status.
- [x] Implement a small JSON receipt evaluator; reject malformed data and report gate components without publishing.
- [x] Verify blank human status remains 0/3 and synthetic check receipts are clearly excluded from `receipts/`.

### Task 4: Independent review and delivery

- [x] Review onboarding commands, task leakage, evidence definitions, archive contents and conservative gate status with a fresh agent.
- [x] Fix findings, rerun affected verification, verify all artifact hashes and links.
- [x] Deliver invitation/ZIP/operator guide and state the human action needed to recruit and obtain evidence. Do not claim the five sessions or three installs happened.
