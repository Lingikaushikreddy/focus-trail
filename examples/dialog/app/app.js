const variant = new URLSearchParams(location.search).get('variant') ?? 'good';
document.body.dataset.variant = variant;
const fixtures = {
  good: ['Good dialog', 'Closing this dialog returns focus to its opener.'],
  'lost-return': ['Lost return focus', 'Escape closes the dialog, but focus lands on the document body.'],
  escape: ['Focus escapes', 'An extra Tab moves outside the dialog while it is still open.'],
  activation: ['Activation fails', 'Enter leaves focus on the opener without opening the dialog.'],
  delayed: ['Delayed focus', 'Initial focus arrives after a short application transition.'],
  alternate: ['Opener removed', 'When the opener disappears, focus returns to a documented next step.'],
};
const [title, description] = fixtures[variant] ?? fixtures.good;
document.querySelector('#variant-title').textContent = title;
document.querySelector('#variant-description').textContent = description;
document.querySelector('#fixture-tag').textContent = ['lost-return', 'escape', 'activation'].includes(variant) ? 'Deliberate fault' : 'Working fixture';
if (variant === 'escape') {
  document.querySelector('#journey-final-key').textContent = 'Tab';
  document.querySelector('#journey-final-label').textContent = 'Focus leaves the dialog';
  document.querySelector('#journey-exit-hint').hidden = false;
}
for (const link of document.querySelectorAll('nav a')) if (link.getAttribute('href') === '?variant=' + variant) link.setAttribute('aria-current', 'page');
const opener = document.querySelector('#opener');
const modal = document.querySelector('#modal');
const save = document.querySelector('#save');
const cancel = document.querySelector('#cancel');
const outside = [...document.querySelectorAll('[data-outside]')];
let delay;
function close(saved = false) {
  clearTimeout(delay);
  modal.hidden = true;
  for (const node of outside) node.inert = false;
  if (saved) document.querySelector('#saved').textContent = 'Your settings have been saved.';
  // Application behavior is intentionally mutated. The test driver never sets focus.
  if (variant === 'lost-return') { document.body.tabIndex = -1; document.body.focus(); }
  else if (opener.isConnected) opener.focus();
  else document.querySelector('#next').focus();
}
opener.addEventListener('click', () => {
  if (variant === 'activation') return;
  modal.hidden = false;
  if (variant !== 'escape') for (const node of outside) node.inert = true;
  if (variant === 'alternate') opener.remove();
  if (variant === 'delayed') delay = setTimeout(() => save.focus(), 80);
  else save.focus();
});
save.addEventListener('click', () => close(true));
cancel.addEventListener('click', () => close());
document.addEventListener('keydown', event => {
  if (['Tab', 'Enter', 'Escape', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    document.querySelector('#last-key').textContent = event.key === ' ' ? 'Space' : event.key;
    for (const key of document.querySelectorAll('[data-art-key]')) key.classList.toggle('is-active', key.dataset.artKey === event.key);
  }
  if (modal.hidden) return;
  if (event.key === 'Escape') { event.preventDefault(); close(); }
  if (event.key === 'Tab' && variant !== 'escape') {
    if (event.shiftKey && document.activeElement === save) { event.preventDefault(); cancel.focus(); }
    else if (!event.shiftKey && document.activeElement === cancel) { event.preventDefault(); save.focus(); }
  }
});
document.addEventListener('focusin', event => {
  const label = event.target === document.body ? 'Document body'
    : (event.target.getAttribute('aria-label') || event.target.innerText || event.target.textContent || event.target.tagName).replace(/\s+/g, ' ').trim();
  document.querySelector('#focus').textContent = label;
  document.querySelector('#hero-focus-label').textContent = [opener, save, cancel].includes(event.target)
    ? 'Focus → ' + label : event.target === document.body ? 'Focus → Document body' : 'Exploring the page';
  document.querySelector('#focus-detail').textContent = event.target === document.body
    ? 'Focus is on the document, outside any control'
    : event.target === save || event.target === cancel
      ? 'Inside the notification dialog'
      : event.target === opener ? 'The dialog’s starting point' : 'Outside the notification dialog';
  for (const node of document.querySelectorAll('[data-path]')) node.classList.toggle('is-active', node.dataset.path === event.target.id);
});
