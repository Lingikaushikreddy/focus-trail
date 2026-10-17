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
  if (modal.hidden) return;
  if (event.key === 'Escape') { event.preventDefault(); close(); }
  if (event.key === 'Tab' && variant !== 'escape') {
    if (event.shiftKey && document.activeElement === save) { event.preventDefault(); cancel.focus(); }
    else if (!event.shiftKey && document.activeElement === cancel) { event.preventDefault(); save.focus(); }
  }
});
document.addEventListener('focusin', event => {
  const label = event.target === document.body ? 'Document body' : event.target.textContent?.trim() || event.target.tagName;
  document.querySelector('#focus').textContent = label;
});
