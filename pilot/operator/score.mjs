#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANDIDATE = '79bac5b64c1f96e7cb684e4bb746cc37af4bda902f719590bacc3984fb8e67e4';
const ALLOCATION = {
  p01: ['AB', 'X', 'Y'], p02: ['BA', 'Y', 'X'], p03: ['AB', 'Y', 'X'],
  p04: ['BA', 'X', 'Y'], p05: ['AB', 'X', 'Y'],
};
const TASK = {taskVariant: 'string', diagnosisCorrect: 'boolean', elapsedSeconds: 'number', timedOut: 'boolean',
  wrongBaselineApprovals: 'integer', baselineDecisionOpportunities: 'integer', benignBaselineDecisionCorrect: 'boolean',
  answerDisclosed: 'boolean', assistance: 'string', submittedAnswers: 'string'};
const RECEIPT = {
  schemaVersion: 'integer',
  participant: {id: 'string', kind: 'string', maintainerConfirmed: 'boolean', ownMaintainedRepositoryConfirmed: 'boolean',
    repositoryAlias: 'string', environmentAlias: 'string'},
  evidence: {participantConfirmation: 'boolean', evidenceReviewedBy: 'string', sanitizedEvidenceRefs: 'refs'},
  installation: {candidateSha256: 'string', nodeVersion: 'string', playwrightVersion: 'string', browserChannel: 'string',
    chromiumVersion: 'string', relativeTestPath: 'string', installCommand: 'string', installExitCode: 'integer', runnerExitCode: 'integer',
    reportGenerated: 'boolean', reportOpened: 'boolean', currentStatus: 'string', testStatus: 'string', reviewStatus: 'string',
    baselineApprovalCompleted: 'boolean', firstUsefulResultSeconds: 'number', reportReviewSeconds: 'number',
    setupSeconds: 'number', assistance: 'string', failureNotes: 'string', commandOutcomes: 'commands'},
  assessment: {completed: 'boolean', within48Hours: 'boolean', recognizesRecentIssue: 'boolean', willingToIntegrate: 'boolean',
    artifactPreference: 'string', preferenceReason: 'string'},
  day14: {workingIntegrationConfirmed: 'boolean', completedByDay14: 'boolean', repositoryAlias: 'string',
    environmentAlias: 'string', sanitizedEvidenceRefs: 'refs'},
  diagnostic: {order: 'string', A: TASK, B: TASK},
};
const KEYBOARD = {schemaVersion: 'integer', assessorAlias: 'string', realHumanConfirmed: 'boolean', keyboardUserConfirmed: 'boolean',
  participantConfirmation: 'boolean', evidenceReviewedBy: 'string', reportAssessmentCompleted: 'boolean', sanitizedEvidenceRefs: 'refs'};
const text = value => typeof value === 'string' && value.trim().length > 0;
const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const alias = value => text(value) ? value.trim().toLowerCase() : null;
const refs = value => Array.isArray(value) && value.length > 0 && value.every(text);
const bool = value => typeof value === 'boolean';
const median = values => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

// Missing/null leaves are pending. Unknown fields and wrong types are input errors.
function validate(value, shape, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path}: expected an object`);
  for (const [key, item] of Object.entries(value)) {
    const expected = shape[key], here = `${path}.${key}`;
    if (!Object.hasOwn(shape, key)) throw new Error(`${here}: unknown field`);
    if (item === null) continue;
    if (typeof expected === 'object') {validate(item, expected, here); continue;}
    if (expected === 'refs') {
      if (!Array.isArray(item) || !item.every(text)) throw new Error(`${here}: expected sanitized reference strings`);
    } else if (expected === 'commands') {
      if (!Array.isArray(item)) throw new Error(`${here}: expected phase/exitCode pairs`);
      item.forEach((command, index) => validate(command, {phase: 'string', exitCode: 'integer'}, `${here}[${index}]`));
    } else if (expected === 'number' || expected === 'integer') {
      if (!number(item) || (expected === 'integer' && !Number.isInteger(item))) throw new Error(`${here}: expected a nonnegative ${expected}`);
    } else if (typeof item !== expected) throw new Error(`${here}: expected ${expected}`);
  }
  if (value.schemaVersion != null && value.schemaVersion !== 1) throw new Error(`${path}.schemaVersion: expected 1`);
  if (value.baselineDecisionOpportunities != null && value.baselineDecisionOpportunities !== 2)
    throw new Error(`${path}.baselineDecisionOpportunities: exactly two preassigned decisions`);
  if (value.wrongBaselineApprovals != null && value.wrongBaselineApprovals > 1)
    throw new Error(`${path}.wrongBaselineApprovals: exceeds one unsafe regression approval opportunity`);
  if (shape === RECEIPT && value.participant?.id != null && !Object.hasOwn(ALLOCATION, value.participant.id))
    throw new Error(`${path}.participant.id: expected p01 through p05`);
}
function humanProof(r) {
  const p = r.participant ?? {}, e = r.evidence ?? {};
  return r.schemaVersion === 1 && p.kind === 'human' && p.maintainerConfirmed === true &&
    p.ownMaintainedRepositoryConfirmed === true && text(p.repositoryAlias) && text(p.environmentAlias) &&
    e.participantConfirmation === true && text(e.evidenceReviewedBy) && refs(e.sanitizedEvidenceRefs);
}
function commandEvidence(i) {
  if (!Array.isArray(i.commandOutcomes) || !i.commandOutcomes.length ||
      !i.commandOutcomes.every(c => text(c.phase) && number(c.exitCode))) return false;
  const last = phase => i.commandOutcomes.filter(c => alias(c.phase) === phase).at(-1)?.exitCode;
  return last('install') === i.installExitCode && (i.runnerExitCode == null || last('runner') === i.runnerExitCode);
}
function installationProof(r) {
  const i = r.installation ?? {};
  return i.candidateSha256 === CANDIDATE && /^v?24\.\d+\.\d+(?:[-+].*)?$/.test(i.nodeVersion ?? '') &&
    i.playwrightVersion === '1.64.1' && i.browserChannel === 'chromium' && i.chromiumVersion === '156.0.8078.4' &&
    text(i.relativeTestPath) && number(i.firstUsefulResultSeconds) && text(i.installCommand) &&
    i.installExitCode === 0 && i.runnerExitCode === 0 && commandEvidence(i) &&
    i.reportGenerated === true && i.reportOpened === true && i.currentStatus === 'passed' && i.testStatus === 'passed' &&
    ['review-pending', 'unchanged'].includes(i.reviewStatus) && number(i.setupSeconds) && text(i.assistance) && text(i.failureNotes);
}
function pairedComplete(r) {
  const d = r.diagnostic ?? {}, expected = Object.hasOwn(ALLOCATION, r.participant?.id) ? ALLOCATION[r.participant.id] : null;
  return !!expected && d.order === expected[0] && d.A?.taskVariant === expected[1] && d.B?.taskVariant === expected[2] &&
    [d.A, d.B].every(t => bool(t.diagnosisCorrect) && bool(t.timedOut) && number(t.elapsedSeconds) &&
      Number.isInteger(t.wrongBaselineApprovals) && t.wrongBaselineApprovals >= 0 && t.wrongBaselineApprovals <= 1 &&
      t.baselineDecisionOpportunities === 2 && bool(t.benignBaselineDecisionCorrect) && bool(t.answerDisclosed) &&
      text(t.assistance) && text(t.submittedAnswers));
}
function assessmentComplete(r) {
  const a = r.assessment ?? {}, i = r.installation ?? {};
  return a.completed === true && bool(a.within48Hours) && bool(a.recognizesRecentIssue) && bool(a.willingToIntegrate) &&
    ['focus-trail', 'plain-trace', 'neither', 'no-preference'].includes(a.artifactPreference) && text(a.preferenceReason) &&
    number(i.setupSeconds) && text(i.assistance) && text(i.failureNotes) && text(i.installCommand) &&
    number(i.installExitCode) && commandEvidence(i) && pairedComplete(r);
}
function integrationProof(r) {
  const d = r.day14 ?? {}, p = r.participant ?? {};
  return d.workingIntegrationConfirmed === true && d.completedByDay14 === true && refs(d.sanitizedEvidenceRefs) &&
    alias(d.repositoryAlias) === alias(p.repositoryAlias) && alias(d.environmentAlias) === alias(p.environmentAlias);
}
function distinct(records) {
  let credited = [], chosenIds = '';
  // There are at most five eligible participants: examine all 32 subsets.
  for (let mask = 1; mask < (1 << records.length); mask++) {
    const subset = records.filter((_, index) => mask & (1 << index));
    const repos = new Set(subset.map(r => alias(r.participant.repositoryAlias)));
    const environments = new Set(subset.map(r => alias(r.participant.environmentAlias)));
    if (repos.size !== subset.length || environments.size !== subset.length) continue;
    const ids = subset.map(r => r.participant.id).join(',');
    if (subset.length > credited.length || (subset.length === credited.length && ids < chosenIds)) {
      credited = subset; chosenIds = ids;
    }
  }
  return credited;
}
function collisions(records, key) {
  const groups = new Map();
  for (const r of records) {
    const value = alias(r.participant?.[key]);
    if (value) groups.set(value, [...(groups.get(value) ?? []), r.participant?.id ?? null]);
  }
  return [...groups].filter(([, ids]) => ids.length > 1).map(([value, ids]) => ({alias: value, participants: ids}));
}
function evaluate(records, keyboard, filesRead) {
  const participantCounts = new Map();
  for (const r of records) {const id = r.participant?.id; if (id) participantCounts.set(id, (participantCounts.get(id) ?? 0) + 1);}
  const duplicateIds = [...participantCounts].filter(([, count]) => count > 1).map(([id]) => id).sort();
  const eligible = records.filter(r => Object.hasOwn(ALLOCATION, r.participant?.id) && !duplicateIds.includes(r.participant.id) && humanProof(r))
    .sort((a, b) => a.participant.id.localeCompare(b.participant.id));
  const installed = distinct(eligible.filter(installationProof)), assessed = eligible.filter(assessmentComplete);
  const integrated = distinct(eligible.filter(r => installationProof(r) && integrationProof(r)));
  const isCorrect = t => t.diagnosisCorrect === true && t.timedOut === false && t.answerDisclosed === false && t.elapsedSeconds <= 480;
  const faster = assessed.filter(r => isCorrect(r.diagnostic.A) && isCorrect(r.diagnostic.B) &&
    r.diagnostic.B.elapsedSeconds < r.diagnostic.A.elapsedSeconds);
  const wrong = condition => assessed.reduce((sum, r) => sum + r.diagnostic[condition].wrongBaselineApprovals, 0);
  const wrongA = wrong('A'), wrongB = wrong('B');
  const fiveAssessed = assessed.length === 5;
  const noAdditionalWrong = fiveAssessed && wrongB <= wrongA &&
    assessed.every(r => r.diagnostic.B.wrongBaselineApprovals <= r.diagnostic.A.wrongBaselineApprovals);
  const conditionMedian = (condition, list = assessed) => median(list.filter(r => isCorrect(r.diagnostic[condition]))
    .map(r => r.diagnostic[condition].elapsedSeconds));
  const issueCount = assessed.filter(r => r.assessment.recognizesRecentIssue).length;
  const willingnessCount = assessed.filter(r => r.assessment.willingToIntegrate).length;
  const preferenceCount = assessed.filter(r => r.assessment.artifactPreference === 'focus-trail').length;
  const within48 = assessed.filter(r => r.assessment.within48Hours);
  const keyboardDocumented = !!keyboard && keyboard.schemaVersion === 1 && text(keyboard.assessorAlias) &&
    keyboard.realHumanConfirmed === true && keyboard.keyboardUserConfirmed === true && keyboard.participantConfirmation === true &&
    text(keyboard.evidenceReviewedBy) && keyboard.reportAssessmentCompleted === true && refs(keyboard.sanitizedEvidenceRefs);
  const gates = {fiveAssessed, original48Hour: within48.length === 5 &&
    within48.filter(r => r.assessment.recognizesRecentIssue).length >= 3 && within48.filter(r => r.assessment.willingToIntegrate).length >= 2,
    originalDay14: integrated.length >= 2 && preferenceCount >= 1, diagnostic: fiveAssessed && faster.length >= 3 && noAdditionalWrong};
  return {
    status: 'evaluated', publicReleaseStatus: installed.length >= 3 && Object.values(gates).every(Boolean)
      ? 'human-release-review-pending' : 'pending', publicationNotPerformed: true,
    trustBoundary: 'Counts rely on operator-reviewed, sanitized participant-confirmed claims. This tool cannot authenticate people, repositories, environments, execution, answers, or referenced evidence.',
    candidateSha256: CANDIDATE, filesRead,
    independentInstallationGate: {count: installed.length, required: 3, met: installed.length >= 3},
    pilotDecisionGates: gates,
    keyboardAssessment: {documented: keyboardDocumented, status: keyboardDocumented ? 'reviewed-evidence-recorded' : 'pending'},
    installations: {count: installed.length, participants: installed.map(r => r.participant.id),
      baselinesApproved: installed.filter(r => r.installation.baselineApprovalCompleted === true).length,
      medianSetupSeconds: median(eligible.map(r => r.installation?.setupSeconds).filter(number)),
      medianFirstUsefulResultSeconds: median(eligible.map(r => r.installation?.firstUsefulResultSeconds).filter(number)),
      medianReportReviewSeconds: median(eligible.map(r => r.installation?.reportReviewSeconds).filter(number))},
    assessments: {count: assessed.length, recentIssueRecognized: issueCount, willingToIntegrate: willingnessCount, within48Hours: within48.length},
    day14: {integrations: integrated.length, participants: integrated.map(r => r.participant.id), artifactPreferenceCount: preferenceCount},
    diagnostic: {passed: gates.diagnostic, correctAndFasterCount: faster.length, participants: faster.map(r => r.participant.id),
      noAdditionalWrongApprovals: noAdditionalWrong, wrongBaselineApprovals: {A: wrongA, B: wrongB},
      benignBaselineDecisionCorrect: {A: assessed.filter(r => r.diagnostic.A.benignBaselineDecisionCorrect).length,
        B: assessed.filter(r => r.diagnostic.B.benignBaselineDecisionCorrect).length},
      baselineDecisionOpportunities: {A: assessed.length * 2, B: assessed.length * 2},
      medianCorrectSeconds: {A: conditionMedian('A'), B: conditionMedian('B')},
      orderEffects: ['AB', 'BA'].map(order => {const rs = assessed.filter(r => r.diagnostic.order === order); return {
        order, count: rs.length, medianCorrectSeconds: {A: conditionMedian('A', rs), B: conditionMedian('B', rs)}};}),
      interpretation: 'Descriptive product decision threshold for five sessions; no statistical inference. Incorrect, timed-out, disclosed, and over-480-second outcomes are reported but excluded from correct-time comparisons. Wrong approvals count only unsafe regression approvals; benign replacements are reported separately.'},
    duplicates: {participants: duplicateIds, repositories: collisions(records, 'repositoryAlias'), environments: collisions(records, 'environmentAlias')},
    individualOutcomes: records.map(r => ({participant: r.participant?.id ?? null,
      evidenceEligible: eligible.includes(r), duplicateParticipant: duplicateIds.includes(r.participant?.id),
      installationDocumented: eligible.includes(r) && installationProof(r), installationCredited: installed.includes(r),
      assessmentComplete: assessed.includes(r), integrationCredited: integrated.includes(r),
      setupSeconds: r.installation?.setupSeconds ?? null, installationFailureNotes: r.installation?.failureNotes ?? null,
      installationAssistance: r.installation?.assistance ?? null, diagnostic: r.diagnostic ?? null,
      artifactPreference: r.assessment?.artifactPreference ?? null, preferenceReason: r.assessment?.preferenceReason ?? null})),
  };
}

try {
  if (process.argv.length < 3 || process.argv.length > 4) throw new Error('Usage: node operator/score.mjs receipts/ [operator/keyboard-assessment.json]');
  const directory = resolve(process.argv[2]);
  const files = (await readdir(directory)).filter(file => file.endsWith('.json') && file !== 'template.json').sort();
  const records = [];
  for (const file of files) {const r = JSON.parse(await readFile(join(directory, file), 'utf8')); validate(r, RECEIPT, file); records.push(r);}
  const keyboardPath = process.argv[3] ? resolve(process.argv[3]) : join(dirname(fileURLToPath(import.meta.url)), 'keyboard-assessment.json');
  let keyboard = null;
  try {keyboard = JSON.parse(await readFile(keyboardPath, 'utf8')); validate(keyboard, KEYBOARD, 'keyboard-assessment');}
  catch (error) {if (error.code !== 'ENOENT' || process.argv[3]) throw error;}
  console.log(JSON.stringify(evaluate(records, keyboard, files.length), null, 2));
} catch (error) {
  console.log(JSON.stringify({status: 'malformed-input', publicReleaseStatus: 'pending', publicationNotPerformed: true, error: error.message}, null, 2));
  process.exitCode = 2;
}
