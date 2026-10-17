# Reviewed participant receipts

From the pilot directory, run:

```sh
node operator/score.mjs receipts/
node operator/score.mjs receipts/ operator/keyboard-assessment.json
```

The scorer reads direct `.json` files in `receipts/`, ignores `template.json`, prints status JSON, and never publishes or writes evidence. Exit **0** includes honest pending or unsuccessful outcomes; exit **2** means malformed JSON, unknown fields, wrong types, unsupported participant IDs, or invalid decision counts. Missing or `null` leaves remain pending. Every template leaf starts `null`.

Keep one current `p01.json` through `p05.json`. Retain superseded attempts under `operator/history/`, outside the scanned directory; preserve their sanitized logs in referenced evidence. All receipts for a duplicated participant ID are excluded. Repository and environment aliases are compared after trimming and lowercasing. Installation and integration credit uses the largest qualifying subset with every repository and environment distinct. The scorer examines all subsets of the five eligible participants; ties choose the earliest participant-ID sequence. Overlapping receipts never inflate the count or hide a larger independent group. Do not assign new aliases to disguise shared repositories or environments.

Set `schemaVersion` to `1` only for an actual record. A participant needs `kind: "human"`, both maintainer/repository confirmations, their assigned ID, and stable sanitized repository/environment aliases. Engineering smoke tests never count. `evidence.participantConfirmation: true`, a nonempty `evidenceReviewedBy` alias, and nonempty `sanitizedEvidenceRefs` are required for credit. The operator must inspect the referenced evidence and obtain confirmation from the participant. **The scorer cannot authenticate any of these claims or inspect the references.** Never copy synthetic test fixtures into `receipts/`.

## Installation fields

Record the actual candidate hash, full Node version, Playwright version, browser channel/version, `relativeTestPath` for the participant's existing journey, sanitized `installCommand`, command exit codes, report generation/opening, and reporter statuses. Successful installation requires:

- SHA-256 `79bac5b64c1f96e7cb684e4bb746cc37af4bda902f719590bacc3984fb8e67e4`; Node `24.x.x`; Playwright `1.64.1`; channel `chromium`; Chromium `156.0.8078.4`.
- Installation and runner exit **0**, `reportGenerated` and `reportOpened` true, `currentStatus`/`testStatus` both `passed`, and `reviewStatus` `review-pending` or `unchanged`.
- Nonempty relative test path, setup and first useful result times, and recorded assistance/failure notes. Use `"none"` when actually observed; leave unknown values null.

`commandOutcomes` is an ordered array of `{ "phase": "install", "exitCode": 0 }` or equivalent sanitized phase/exit-code pairs. Preserve troubleshooting failures; the final `install` and `runner` entries must agree with their summary exit codes. Record `setupSeconds` including troubleshooting, `firstUsefulResultSeconds` separately, and `reportReviewSeconds` separately when available. Record failures and unfinished attempts too. `baselineApprovalCompleted` is separate from installation credit: review-pending can count as installation, while baseline approval requires the participant's explicit review and action.

## Assessment and paired tasks

`assessment.completed` is a reviewed claim that the session finished. Counted sessions require recorded setup attempts and command outcomes, all assessment decisions (including `within48Hours`, recent-issue recognition, integration willingness, preference, and reason), and complete A/B task records. Use preference `focus-trail`, `plain-trace`, `neither`, or `no-preference`. The operator verifies the 48-hour timing against dated session evidence; the scorer evaluates the recorded claim.

Allocation is frozen:

| Participant | Order | A variant | B variant |
| --- | --- | --- | --- |
| p01 | AB | X | Y |
| p02 | BA | Y | X |
| p03 | AB | Y | X |
| p04 | BA | X | Y |
| p05 | AB | X | Y |

For each A/B task, record the variant, correctness, elapsed seconds, timeout, assistance, `answerDisclosed`, and `submittedAnswers` as sanitized text or an evidence reference. Preserve incorrect attempts in those answers. Compare against the independently established private key before setting `diagnosisCorrect`. Unknown or missing answers remain null. A correct-time observation requires correctness true, timeout false, answer disclosure false, and elapsed time at most **480 seconds**. Navigation help may be recorded without disclosing an answer. Excluded attempts remain visible in individual outcomes.

Each condition has exactly **two** `baselineDecisionOpportunities`: one regression and one benign descriptive change. `wrongBaselineApprovals` is **0 or 1**, counting only an unsafe approval of the failed regression. A reviewed passing benign baseline may be approved even though replacement is unnecessary; that approval is not an unsafe approval. Record `benignBaselineDecisionCorrect` separately for whether the participant correctly identifies replacement as unnecessary.

Diagnostic qualification requires all five complete sessions, at least three participants correct on both conditions and strictly faster with B, no participant with more unsafe approvals under B than A, and no aggregate increase. Correct-time medians and AB/BA summaries are descriptive, with no statistical claim.

## Later evidence and output

`day14.workingIntegrationConfirmed` means an actual working integration, with `completedByDay14`, the same repository/environment aliases, and separate sanitized evidence references. The operator verifies dated day-14 evidence. Willingness does not count as integration. The original gates remain five assessments within 48 hours with at least three recent-issue recognitions and two willing maintainers, then two independent working integrations by day 14 and at least one artifact preference.

`independentInstallationGate` has required count **3**. `pilotDecisionGates` separately reports five assessments, original 48-hour/day-14 criteria, and the diagnostic criterion. The scorer remains `pending` until these predefined gates have evidence; when they do, it says `human-release-review-pending`. `publicationNotPerformed` is always true. A human still decides whether to release.

A keyboard user's assessment of the report is separate, inclusive qualitative evidence. The optional `operator/keyboard-assessment.json` has the following initially empty leaves; it is reported separately without inventing a numerical gate:

```json
{
  "schemaVersion": null,
  "assessorAlias": null,
  "realHumanConfirmed": null,
  "keyboardUserConfirmed": null,
  "participantConfirmation": null,
  "evidenceReviewedBy": null,
  "reportAssessmentCompleted": null,
  "sanitizedEvidenceRefs": null
}
```

Use schema version 1, the true confirmations, an assessor/reviewer alias, and nonempty references only after a real assessment has been reviewed. Preserve the findings, barriers, assistance, and uncertainty in those sanitized references. The keyboard record does not change the proven installer count.
