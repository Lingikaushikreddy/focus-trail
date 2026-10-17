const slide = new URLSearchParams(location.search).get('slide') === 'product' ? 'product' : 'cover';
document.body.dataset.slide = slide;
document.querySelector('#' + slide).hidden = false;
const response = await fetch('index.html');
if (!response.ok) throw new Error('Could not load the source artwork');
const source = new DOMParser().parseFromString(await response.text(), 'text/html');
if (slide === 'cover') {
  document.querySelector('#social-art').append(source.querySelector('.key-art').cloneNode(true));
} else {
  const report = source.querySelector('.report-preview').cloneNode(true);
  report.removeAttribute('href');
  report.removeAttribute('aria-label');
  document.querySelector('#social-report').append(report);
}
document.body.dataset.ready = 'true';
