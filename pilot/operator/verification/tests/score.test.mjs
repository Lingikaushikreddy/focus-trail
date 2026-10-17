// Engineering fixtures only. No human outcomes are generated or stored in receipts/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scorer = fileURLToPath(new URL('../../score.mjs', import.meta.url));
const candidate = '79bac5b64c1f96e7cb684e4bb746cc37af4bda902f719590bacc3984fb8e67e4';
const allocation = {
  p01: ['AB', 'X', 'Y'], p02: ['BA', 'Y', 'X'], p03: ['AB', 'Y', 'X'],
  p04: ['BA', 'X', 'Y'], p05: ['AB', 'X', 'Y'],
};
function receipt(id = 'p01') {
  const [order, a, b] = allocation[id];
  const outcome = taskVariant => ({taskVariant, diagnosisCorrect: true, elapsedSeconds: 120,
    timedOut: false, wrongBaselineApprovals: 0, baselineDecisionOpportunities: 2, benignBaselineDecisionCorrect: true, answerDisclosed: false, assistance: 'none', submittedAnswers: 'sanitized answer reviewed against sealed key'});
  return {
    schemaVersion: 1,
    participant: {id, kind: 'human', maintainerConfirmed: true, ownMaintainedRepositoryConfirmed: true,
      repositoryAlias: `repo-${id}`, environmentAlias: `env-${id}`},
    evidence: {participantConfirmation: true, evidenceReviewedBy: 'operator-a', sanitizedEvidenceRefs: [`evidence/${id}.md`]},
    installation: {candidateSha256: candidate, nodeVersion: '24.10.0', playwrightVersion: '1.64.1',
      browserChannel: 'chromium', chromiumVersion: '156.0.8078.4', setupSeconds: 400, assistance: 'none',
      failureNotes: 'none', relativeTestPath: 'tests/dialog.spec.ts', commandOutcomes: [{phase: 'install', exitCode: 0}, {phase: 'runner', exitCode: 0}], installCommand: 'npm install ../candidate.tgz', installExitCode: 0,
      runnerExitCode: 0, reportGenerated: true, reportOpened: true, currentStatus: 'passed',
      testStatus: 'passed', reviewStatus: 'review-pending', baselineApprovalCompleted: false,
      firstUsefulResultSeconds: 400, reportReviewSeconds: 120},
    assessment: {completed: true, within48Hours: true, recognizesRecentIssue: true,
      willingToIntegrate: true, artifactPreference: 'focus-trail', preferenceReason: 'clear checkpoint'},
    day14: {workingIntegrationConfirmed: false, completedByDay14: null, repositoryAlias: null,
      environmentAlias: null, sanitizedEvidenceRefs: null},
    diagnostic: {order, A: outcome(a), B: {...outcome(b), elapsedSeconds: 90}},
  };
}
async function run(receipts, keyboard, raw) {
  const root = await mkdtemp(join(tmpdir(), 'focus-trail-synthetic-'));
  const directory = join(root, 'receipts');
  await mkdir(directory);
  await writeFile(join(directory, 'template.json'), '{ invalid template intentionally ignored');
  for (let i = 0; i < receipts.length; i++) await writeFile(join(directory, `${i}.json`), JSON.stringify(receipts[i]));
  if (raw) await writeFile(join(directory, 'bad.json'), raw);
  const args = [scorer, directory];
  if (keyboard) {const file = join(root, 'keyboard.json'); await writeFile(file, JSON.stringify(keyboard)); args.push(file);}
  const execution = spawnSync(process.execPath, args, {encoding: 'utf8'});
  await rm(root, {recursive: true});
  return {code: execution.status, stderr: execution.stderr, result: execution.stdout ? JSON.parse(execution.stdout) : null};
}
const integrate = r => {r.day14 = {workingIntegrationConfirmed: true, completedByDay14: true,
  repositoryAlias: r.participant.repositoryAlias, environmentAlias: r.participant.environmentAlias,
  sanitizedEvidenceRefs: [`evidence/${r.participant.id}-day14.md`]}; return r;};
const keyboard = {schemaVersion: 1, assessorAlias: 'keyboard-user-a', realHumanConfirmed: true,
  keyboardUserConfirmed: true, participantConfirmation: true, evidenceReviewedBy: 'operator-a',
  reportAssessmentCompleted: true, sanitizedEvidenceRefs: ['evidence/keyboard.md']};

test('blank records and ignored template never count as installations or release evidence', async () => {
  const {code, result} = await run([{}]);
  assert.equal(code, 0);
  assert.equal(result.publicReleaseStatus, 'pending');
  assert.equal(result.installations.count, 0);
  assert.equal(result.assessments.count, 0);
  assert.equal(result.filesRead, 1);
});

test('participant-confirmed actual maintained repository installation counts with reporter review-pending', async () => {
  const {code, result} = await run([receipt()]);
  assert.equal(code, 0);
  assert.equal(result.installations.count, 1);
  assert.equal(result.installations.baselinesApproved, 0);
  assert.equal(result.publicReleaseStatus, 'pending');
});

test('wrong candidate, absent confirmation and engineering smoke evidence do not count', async () => {
  const wrong = receipt('p01'); wrong.installation.candidateSha256 = '0'.repeat(64);
  const unconfirmed = receipt('p02'); unconfirmed.evidence.participantConfirmation = null;
  const smoke = receipt('p03'); smoke.participant.kind = 'engineering';
  const {result} = await run([wrong, unconfirmed, smoke, receipt('p04')]);
  assert.equal(result.installations.count, 1);
});

test('duplicate participant receipts are all flagged and excluded', async () => {
  const {result} = await run([receipt('p01'), receipt('p01'), receipt('p02')]);
  assert.equal(result.installations.count, 1);
  assert.equal(result.assessments.count, 1);
  assert.equal(result.duplicates.participants.length, 1);
});

test('shared repository or environment cannot inflate independent installations', async () => {
  const a = receipt('p01'), b = receipt('p02'), c = receipt('p03');
  b.participant.repositoryAlias = ' REPO-P01 ';
  c.participant.environmentAlias = 'ENV-P01';
  const {result} = await run([a,b,c]);
  assert.equal(result.installations.count, 2);
  assert.deepEqual(result.installations.participants, ['p02', 'p03']);
  assert.equal(result.assessments.count, 3);
});

test('a conflicting early receipt cannot hide three independent installations', async () => {
  const a=receipt('p01'), b=receipt('p02'), c=receipt('p03'), d=receipt('p04');
  a.participant.repositoryAlias='repo-a'; a.participant.environmentAlias='env-a';
  b.participant.repositoryAlias='repo-a'; b.participant.environmentAlias='env-b';
  c.participant.repositoryAlias='repo-b'; c.participant.environmentAlias='env-a';
  d.participant.repositoryAlias='repo-c'; d.participant.environmentAlias='env-c';
  const {result}=await run([a,b,c,d].map(integrate));
  assert.equal(result.installations.count, 3);
  assert.deepEqual(result.installations.participants, ['p02', 'p03', 'p04']);
  assert.equal(result.independentInstallationGate.met, true);
  assert.equal(result.day14.integrations, 3);
  assert.deepEqual(result.day14.participants, ['p02', 'p03', 'p04']);
});

test('incorrect or timed-out diagnoses are excluded from correct-time comparisons', async () => {
  const a = receipt('p01'), b = receipt('p02');
  a.diagnostic.B.diagnosisCorrect = false; a.diagnostic.B.elapsedSeconds = 1;
  b.diagnostic.B.timedOut = true; b.diagnostic.B.elapsedSeconds = 1;
  const {result} = await run([a,b,receipt('p03')]);
  assert.equal(result.diagnostic.correctAndFasterCount, 1);
  assert.equal(result.diagnostic.medianCorrectSeconds.B, 90);
  assert.equal(result.diagnostic.passed, false);
});

test('willingness cannot substitute for actual day-14 integration', async () => {
  const {result} = await run(['p01','p02','p03','p04','p05'].map(id => receipt(id)));
  assert.equal(result.pilotDecisionGates.original48Hour, true);
  assert.equal(result.day14.integrations, 0);
  assert.equal(result.pilotDecisionGates.originalDay14, false);
  assert.equal(result.publicReleaseStatus, 'pending');
});

test('only complete assessments contribute to recent issue and willingness thresholds', async () => {
  const a = receipt(); a.assessment.completed = false;
  const b = receipt('p02'); b.diagnostic.B.wrongBaselineApprovals = null;
  const {result} = await run([a,b,receipt('p03')]);
  assert.equal(result.assessments.count, 1);
  assert.equal(result.assessments.recentIssueRecognized, 1);
  assert.equal(result.assessments.willingToIntegrate, 1);
});

test('allocation mismatch excludes a paired diagnostic comparison', async () => {
  const a = receipt(); a.diagnostic.order = 'BA';
  const {result} = await run([a,receipt('p02')]);
  assert.equal(result.diagnostic.correctAndFasterCount, 1);
  assert.equal(result.assessments.count, 1);
});

test('additional wrong approval for one participant fails even when aggregate does not increase', async () => {
  const rs = ['p01','p02','p03','p04','p05'].map(id => receipt(id));
  rs[0].diagnostic.B.wrongBaselineApprovals = 1;
  rs[1].diagnostic.A.wrongBaselineApprovals = 1;
  const {result} = await run(rs);
  assert.equal(result.diagnostic.wrongBaselineApprovals.A, 1);
  assert.equal(result.diagnostic.wrongBaselineApprovals.B, 1);
  assert.equal(result.diagnostic.noAdditionalWrongApprovals, false);
  assert.equal(result.pilotDecisionGates.diagnostic, false);
});

test('predefined gates permit human review while keyboard assessment is separately recorded', async () => {
  const rs = ['p01','p02','p03','p04','p05'].map(id => receipt(id));
  integrate(rs[0]); integrate(rs[1]);
  const pending = await run(rs);
  assert.equal(pending.result.publicReleaseStatus, 'human-release-review-pending');
  assert.equal(pending.result.keyboardAssessment.documented, false);
  const {result} = await run(rs, keyboard);
  assert.equal(result.publicReleaseStatus, 'human-release-review-pending');
  assert.equal(result.publicationNotPerformed, true);
  assert.equal(result.independentInstallationGate.required, 3);
  assert.equal(result.keyboardAssessment.documented, true);
});

test('malformed JSON fails with exit two', async () => {
  const {code, result} = await run([], null, '{');
  assert.equal(code, 2);
  assert.equal(result.status, 'malformed-input');
});

test('wrong field types fail with exit two', async () => {
  const r = receipt(); r.installation.runnerExitCode = '0';
  const {code, result} = await run([r]);
  assert.equal(code, 2);
  assert.equal(result.status, 'malformed-input');
});


test('missing runtime, submitted answer or command evidence remains pending', async () => {
  const a=receipt('p01'), b=receipt('p02'), c=receipt('p03');
  a.installation.chromiumVersion = null;
  b.diagnostic.B.submittedAnswers = null;
  c.installation.commandOutcomes = null;
  const {result} = await run([a,b,c,receipt('p04')]);
  assert.equal(result.installations.count, 2);
  assert.equal(result.assessments.count, 2);
  assert.equal(result.diagnostic.correctAndFasterCount, 2);
});

test('a faster equal-time tie does not qualify as strictly faster', async () => {
  const a = receipt('p01'); a.diagnostic.B.elapsedSeconds = 120;
  const {result} = await run([a,receipt('p02')]);
  assert.equal(result.diagnostic.correctAndFasterCount, 1);
});

test('day14 proof must concern the same maintained repository and environment', async () => {
  const a = integrate(receipt('p01')); a.day14.environmentAlias='other-environment';
  const {result} = await run([a,integrate(receipt('p02'))]);
  assert.equal(result.day14.integrations, 1);
});

test('baseline opportunity counts outside the fixed two are malformed', async () => {
  const a=receipt(); a.diagnostic.B.baselineDecisionOpportunities=1;
  const {code} = await run([a]);
  assert.equal(code, 2);
});

test('prototype property names cannot act as participant identities', async () => {
  const a=receipt(); a.participant.id='constructor';
  const {code} = await run([a]);
  assert.equal(code, 2);
});

test('no evidence schema can replace the five fixed human participant slots', async () => {
  const a=receipt(); a.participant.id='p06';
  const {code} = await run([a]);
  assert.equal(code, 2);
});

test('incorrect and timed-out raw outcomes stay visible despite exclusion from times', async () => {
  const a=receipt('p01'); a.diagnostic.B.diagnosisCorrect=false; a.diagnostic.B.timedOut=true;
  const {result} = await run([a]);
  assert.equal(result.individualOutcomes[0].diagnostic.B.diagnosisCorrect, false);
  assert.equal(result.individualOutcomes[0].diagnostic.B.timedOut, true);
  assert.equal(result.diagnostic.medianCorrectSeconds.B, null);
});

test('unreviewed keyboard evidence stays separately pending without inventing a release gate', async () => {
  const rs=['p01','p02','p03','p04','p05'].map(id=>receipt(id)); integrate(rs[0]); integrate(rs[1]);
  const incomplete={...keyboard, participantConfirmation:null};
  const {result} = await run(rs,incomplete);
  assert.equal(result.independentInstallationGate.met, true);
  assert.equal(result.keyboardAssessment.documented, false);
  assert.equal(result.publicReleaseStatus, 'human-release-review-pending');
});


test('raw pending is not a successful reporter review status but unchanged is valid', async () => {
  const a=receipt('p01'), b=receipt('p02'); a.installation.reviewStatus='pending'; b.installation.reviewStatus='unchanged';
  const {result}=await run([a,b]);
  assert.equal(result.installations.count, 1);
  assert.deepEqual(result.installations.participants, ['p02']);
});

test('missing relative test path or first useful result time cannot count as installation', async () => {
  const a=receipt('p01'), b=receipt('p02'); a.installation.relativeTestPath=null; b.installation.firstUsefulResultSeconds=null;
  const {result}=await run([a,b,receipt('p03')]);
  assert.equal(result.installations.count, 1);
});

test('Chromium other than frozen candidate version cannot count', async () => {
  const a=receipt('p01'); a.installation.chromiumVersion='155.0.0.0';
  const {result}=await run([a,receipt('p02')]);
  assert.equal(result.installations.count, 1);
});

test('unsafe approvals cannot exceed the one regression opportunity per condition', async () => {
  const a=receipt(); a.diagnostic.A.wrongBaselineApprovals=2;
  const {code}=await run([a]);
  assert.equal(code, 2);
});

test('unnecessary benign replacement is reported separately from unsafe approval', async () => {
  const rs=['p01','p02','p03','p04','p05'].map(id=>receipt(id));
  rs[0].diagnostic.B.benignBaselineDecisionCorrect=false;
  const {result}=await run(rs);
  assert.equal(result.diagnostic.wrongBaselineApprovals.B, 0);
  assert.equal(result.diagnostic.benignBaselineDecisionCorrect.B, 4);
  assert.equal(result.pilotDecisionGates.diagnostic, true);
});

test('answer disclosure and over-eight-minute answers cannot count as correct time or faster', async () => {
  const a=receipt('p01'), b=receipt('p02'), c=receipt('p03');
  a.diagnostic.B.answerDisclosed=true; a.diagnostic.B.elapsedSeconds=1;
  b.diagnostic.A.elapsedSeconds=600; b.diagnostic.B.elapsedSeconds=500;
  c.diagnostic.B.answerDisclosed=null;
  const {result}=await run([a,b,c,receipt('p04')]);
  assert.equal(result.diagnostic.correctAndFasterCount, 1);
  assert.equal(result.diagnostic.medianCorrectSeconds.B, 90);
  assert.equal(result.assessments.count, 3);
});
