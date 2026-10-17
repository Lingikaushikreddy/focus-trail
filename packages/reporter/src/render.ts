import type { Comparison, JourneyResult, Step } from '../../core/src/types.js';

function escape(value: string | number | undefined | null): string {
  return String(value ?? 'Not recorded').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

const styles = `
:root{color-scheme:light;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#15243a;background:#fff;font-size:16px;line-height:1.55}
[hidden]{display:none!important}
*{box-sizing:border-box}body{margin:0}button{font:inherit}h1,h2,h3,p,dl{margin:0}h1{font-size:clamp(1.6rem,3vw,2.4rem);line-height:1.2;font-weight:650;letter-spacing:-.035em;overflow-wrap:anywhere}h2{font-size:1.35rem;line-height:1.3}h3{font-size:1.05rem}p{max-width:74ch}header{background:#193a63;color:#fff;padding:2rem max(1.25rem,calc((100vw - 90rem)/2))}header .brand{font-size:1rem;margin-bottom:.75rem}header .status{display:inline-block;margin-top:1rem;padding:.2rem .65rem;border:1px solid #a7c8ec;border-radius:.25rem;font-weight:650}header .subtitle{margin-top:.5rem;color:#dce9f7}
main{max-width:90rem;margin:auto;padding:1.5rem 1.25rem 3rem}.summary{border-left:.3rem solid #125db8;background:#edf3fb;padding:1rem 1.25rem;margin-bottom:1.5rem}.summary>p{margin-top:.5rem}.summary dl{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:.35rem 1rem;margin-top:.8rem}.summary dt{font-weight:650}.summary dd{margin:0;overflow-wrap:anywhere}.workspace{display:grid;grid-template-columns:16rem minmax(0,1fr);gap:2rem;align-items:start}nav{min-width:0}nav>p{color:#4b5e76;font-size:.9rem;margin-top:.25rem}ol{padding:0;list-style:none;margin:1rem 0}li+li{margin-top:.4rem}.step-button{width:100%;text-align:left;border:1px solid #d1dce8;background:#fff;color:#15243a;padding:.75rem;cursor:pointer;border-radius:.25rem;display:grid;grid-template-columns:1.5rem minmax(0,1fr);gap:.5rem}.step-button:hover{border-color:#125db8;background:#f4f8fd}.step-button[aria-current="step"]{border-color:#125db8;background:#e8f1fc;box-shadow:inset .25rem 0 #125db8}.step-button .number{font-variant-numeric:tabular-nums;color:#4b5e76}.step-button .name{font-weight:650;overflow-wrap:anywhere}.step-button .hint{display:block;font-size:.85rem;overflow-wrap:anywhere;color:#4b5e76}.difference-marker{display:block;font-size:.85rem;color:#125db8;font-weight:650}button:focus-visible{outline:3px solid #125db8;outline-offset:3px;box-shadow:0 0 0 5px #fff}.detail{min-width:0}.detail-header{margin-bottom:1rem}.detail-header p{margin-top:.35rem;color:#4b5e76;overflow-wrap:anywhere}.panes{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:1rem}.evidence{min-width:0;border:1px solid #d1dce8;border-top:3px solid #193a63;padding:1.25rem}.evidence.current{border-top-color:#125db8}.evidence .outcome{margin:.5rem 0 1rem;font-weight:650}.evidence dl{display:grid;grid-template-columns:minmax(0,1fr);gap:.1rem}.evidence dt{font-size:.85rem;font-weight:650;color:#4b5e76}.evidence dd{margin:0 0 .65rem;overflow-wrap:anywhere}.error{color:#9b252f;white-space:pre-wrap;overflow-wrap:anywhere;border-left:3px solid #9b252f;padding-left:.75rem;margin-top:1rem}.screenshot{margin:1rem 0 0;border-top:1px solid #d1dce8;padding-top:.8rem}.screenshot img{display:block;max-width:100%;height:auto;margin-top:.5rem}.screenshot p,.screenshot figcaption{font-size:.9rem;color:#4b5e76}.metadata{border-top:1px solid #d1dce8;margin-top:1.5rem;padding-top:1rem;display:flex;flex-wrap:wrap;gap:.5rem 1.5rem;color:#4b5e76;font-size:.9rem}.metadata span{overflow-wrap:anywhere}kbd,code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.9em}kbd{border:1px solid #bacde3;background:#fff;color:#15243a;padding:.1em .35em;border-radius:.2em}footer{max-width:90rem;margin:auto;padding:1rem 1.25rem;border-top:1px solid #d1dce8;font-size:.85rem;color:#4b5e76}noscript{display:block;padding:1rem;border:1px solid #d1dce8;margin-bottom:1rem}
@media(max-width:900px){.workspace{grid-template-columns:minmax(0,1fr);gap:1.25rem}nav ol{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem}li+li{margin-top:0}.panes{grid-template-columns:minmax(0,1fr)}}@media(max-width:500px){nav ol{grid-template-columns:minmax(0,1fr)}.summary dl{grid-template-columns:minmax(0,1fr)}.summary dd{margin-bottom:.5rem}header{padding:1.5rem 1rem}main{padding:1rem}.evidence{padding:1rem}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
`;

function keyAt(run: JourneyResult | undefined, index: number): string {
  if (!run) return 'Not recorded';
  for (let position = Math.min(index, run.steps.length - 1); position >= 0; position--) {
    if (run.steps[position].action) return run.steps[position].action!;
  }
  return 'No key recorded';
}

function target(step: Step | undefined): string {
  if (!step) return 'No recorded target';
  const description = [step.observed.name === null ? 'No accessible name' : `“${step.observed.name}”`, step.observed.role ?? step.observed.tag ?? 'No role', step.observed.testId ? `test id: ${step.observed.testId}` : undefined].filter(Boolean).join(' · ');
  if (step.observed.unavailable) {
    return step.observed.tag && step.observed.tag !== 'body'
      ? `Retained observation: ${description}. ${step.observed.unavailable}`
      : `Focus unavailable: ${step.observed.unavailable}`;
  }
  return description;
}

function screenshot(step: Step | undefined): string {
  const data = step?.screenshot;
  // Optional evidence formats beyond PNG/JPEG (including WebP) use text fallback.
  const safe = data && data.length <= 10 * 1024 * 1024 && /^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(data);
  return safe
    ? `<figure class="screenshot"><figcaption>Optional screenshot. Text evidence is available above.</figcaption><img src="${escape(data)}" alt="Optional focus checkpoint screenshot"><p class="image-fallback" hidden>Screenshot unavailable. Text evidence is available above.</p></figure>`
    : '<div class="screenshot"><p>No screenshot captured. Text evidence remains available.</p></div>';
}

function evidence(run: JourneyResult | undefined, step: Step | undefined, index: number, current: boolean, outcome: boolean): string {
  const title = current ? 'After · current run' : 'Before · reviewed baseline';
  const id = current ? 'current-evidence' : 'baseline-evidence';
  let body: string;
  if (!run) body = '<p class="outcome">No reviewed baseline</p><p>Review this captured run before adding a passing baseline.</p>';
  else if (outcome) body = `<p class="outcome">Run ${escape(run.status)}</p>${run.error ? `<p class="error">${escape(run.error)}</p>` : '<p>No additional run error recorded.</p>'}`;
  else if (!step) body = '<p class="outcome">No recorded step</p><p>This run has no step at this position.</p>';
  else body = `<p class="outcome">Step ${escape(step.status)}</p><dl><dt>${step.action ? 'Key' : 'Key before checkpoint'}</dt><dd><kbd>${escape(keyAt(run, index))}</kbd></dd><dt>Expected target key</dt><dd>${step.expectedTargetKey ? `<code>${escape(step.expectedTargetKey)}</code>` : 'No checkpoint assertion'}</dd><dt>Observed target</dt><dd>${escape(target(step))}</dd><dt>Accessible name</dt><dd>${escape(step.observed.name)}</dd><dt>Role</dt><dd>${escape(step.observed.role)}</dd><dt>Element</dt><dd>${escape(step.observed.tag)}</dd><dt>Test id</dt><dd>${escape(step.observed.testId)}</dd><dt>Elapsed time</dt><dd>${escape(step.elapsedMs)} ms</dd></dl>${step.error ? `<p class="error">${escape(step.error)}</p>` : ''}${screenshot(step)}`;
  return `<section class="evidence${current ? ' current' : ''}" data-testid="${id}"><h3>${title}</h3>${body}</section>`;
}

function document(current: JourneyResult, comparison?: Comparison): string {
  const base = comparison?.base;
  const difference = comparison?.firstDifference;
  const status = comparison ? { unchanged: 'Unchanged', regressed: 'Regressed', incomparable: 'Incomparable' }[comparison.status] : 'Review pending';
  const length = Math.max(current.steps.length, base?.steps.length ?? 0);
  const outcomeDifference = difference?.kind === 'run-failure' && difference.index >= length;
  const hasOutcome = outcomeDifference || (current.status === 'failed' && current.steps.every(step => step.status === 'passed'));
  const selected = outcomeDifference ? length : Math.min(difference?.index ?? current.steps.findIndex(step => step.status === 'failed'), Math.max(0, length - 1));
  const initial = hasOutcome && !difference ? length : Math.max(0, selected);
  const details: string[] = [];
  const buttons: string[] = [];
  for (let index = 0; index < length + Number(hasOutcome); index++) {
    const outcome = hasOutcome && index === length;
    const step = current.steps[index] ?? base?.steps[index];
    const name = outcome ? 'Run outcome' : step?.action ?? 'Checkpoint';
    const checkpoint = outcome ? current.error ?? 'Journey finalization' : step?.checkpointId ?? target(step);
    const differing = difference && index === (outcomeDifference ? length : difference.index);
    buttons.push(`<li><button class="step-button" type="button" data-step="${index}" aria-controls="step-detail" aria-current="${index === initial ? 'step' : 'false'}"><span class="number">${index + 1}</span><span><span class="name">${outcome ? 'Run outcome' : `Step ${index + 1}: ${escape(name)}`}</span><span class="hint">${escape(checkpoint)}</span>${differing ? '<span class="difference-marker">First difference</span>' : ''}</span></button></li>`);
    details.push(`<div class="detail-header"><h2>${outcome ? 'Run outcome' : `Step ${index + 1}: ${escape(name)}`}</h2><p>${outcome ? 'Captured after the test finished.' : step?.checkpointId ? `Checkpoint: ${escape(step.checkpointId)}` : 'Recorded keyboard action'}</p></div><div class="panes">${evidence(base, base?.steps[index], index, false, outcome)}${evidence(current, current.steps[index], index, true, outcome)}</div>`);
  }
  const summary = difference
    ? `<h2>First difference</h2><p>${escape(difference.reason)}</p><dl><dt>Position</dt><dd>${outcomeDifference ? 'Run outcome after recorded steps' : `Step ${difference.index + 1}${difference.checkpointId ? ` · checkpoint ${escape(difference.checkpointId)}` : ''}`}</dd>${outcomeDifference ? '' : `<dt>Expected key</dt><dd><kbd>${escape(keyAt(base, difference.index))}</kbd></dd><dt>Observed key</dt><dd><kbd>${escape(keyAt(current, difference.index))}</kbd></dd><dt>Expected target</dt><dd>${escape(base?.steps[difference.index]?.expectedTargetKey ?? current.steps[difference.index]?.expectedTargetKey)} · ${escape(target(base?.steps[difference.index]))}</dd><dt>Observed target</dt><dd>${escape(target(current.steps[difference.index]))}</dd>`}</dl>`
    : comparison ? `<h2>${comparison.status === 'unchanged' ? 'Expected journey passed' : status}</h2><p>${escape(comparison.reason ?? (comparison.status === 'unchanged' ? 'Recorded keyboard actions and focus checkpoints match the reviewed baseline.' : 'These runs cannot be compared.'))}</p>` : '<h2>Review pending</h2><p>No reviewed baseline is available. This report shows the captured run and its assertions; it does not establish that focus behavior is unchanged.</p>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; connect-src 'none'"><title>Focus Trail · ${escape(current.journeyId)}</title><style>${styles}</style></head><body><header><p class="brand">Focus Trail</p><h1>${escape(current.journeyId)}</h1><p class="subtitle">${comparison ? 'Compared with reviewed baseline' : 'Captured keyboard journey'} · Current run ${escape(current.status)}</p><span class="status">${status}</span></header><main><section class="summary" aria-label="Comparison summary">${summary}</section><noscript>The selected step is shown below. Enable JavaScript to select other steps.</noscript><div class="workspace"><nav aria-label="Journey steps"><h2>Journey steps</h2><p>Choose a step to inspect its focus evidence.</p><ol>${buttons.join('')}</ol></nav><section id="step-detail" class="detail" data-testid="step-detail" aria-label="Selected step" aria-live="polite" aria-atomic="true">${details[initial] ?? '<h2>No steps recorded</h2><p>This captured run contains no keyboard steps.</p>'}</section></div><div class="metadata"><span>Browser: ${escape(current.browserVersion)}</span><span>Viewport: ${escape(current.viewport.width)} × ${escape(current.viewport.height)}</span><span>Locale: ${escape(current.locale)}</span><span>Fixture: ${escape(current.fixtureVersion)}</span>${current.appBuild ? `<span>Build: ${escape(current.appBuild)}</span>` : ''}</div>${current.error && !hasOutcome ? `<p class="error">Run error: ${escape(current.error)}</p>` : ''}${details.map((detail, index) => `<template id="detail-${index}">${detail}</template>`).join('')}</main><footer>Local report. Focus evidence covers recorded checkpoints in the main document.</footer><script>
(() => {
  const buttons = Array.from(document.querySelectorAll('[data-step]'));
  const detail = document.getElementById('step-detail');
  function imageFallbacks() {
    detail.querySelectorAll('img').forEach(image => {
      function fallback() { image.hidden = true; image.nextElementSibling.hidden = false; }
      image.addEventListener('error', fallback, { once: true });
      if (image.complete && image.naturalWidth === 0) fallback();
    });
  }
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => {
      buttons.forEach(other => other.setAttribute('aria-current', other === button ? 'step' : 'false'));
      detail.replaceChildren(document.getElementById('detail-' + index).content.cloneNode(true));
      imageFallbacks();
    });
    button.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = Math.min(index + 1, buttons.length - 1);
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = Math.max(index - 1, 0);
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (next !== undefined) { event.preventDefault(); buttons[next].focus(); }
    });
  });
  imageFallbacks();
})();
</script></body></html>`;
}

/** Render a comparison as a portable, offline report. */
export function render(comparison: Comparison): string { return document(comparison.current, comparison); }

/** Show captured assertions truthfully while baseline review remains pending. */
export function renderRun(current: JourneyResult): string { return document(current); }
