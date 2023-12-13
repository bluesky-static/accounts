// @ts-check

import { marked } from 'marked';

export async function loadAndRenderReadme() {
  const readmeContent = await loadReadme();
  const html = await marked.parse(readmeContent);
  const markdownContainer = document.createElement('div');
  markdownContainer.innerHTML = html;

  const result = {
    markdown: readmeContent,
    html,
    container: markdownContainer,
    /** @type {number | undefined} */
    accountnumber: undefined,
    /** @type {Date | undefined} */
    timestamp: undefined
  };

  const accountNumberElem = markdownContainer.querySelector('.accountnumber');
  if (accountNumberElem) {
    const num = Number(accountNumberElem.textContent || '');
    if (Number.isFinite(num)) {
      result.accountnumber = num;
      accountNumberElem.textContent = num.toLocaleString();
    }
  }

  const timestampElem = markdownContainer.querySelector('.timestamp');
  if (timestampElem) {
    const ts = new Date(timestampElem.textContent || '');
    if (ts instanceof Date && Number.isFinite(ts.getTime())) {
      result.timestamp = ts;
      timestampElem.textContent = ts.toLocaleString();
    }
  }

  document.body.appendChild(markdownContainer);

  return result;
}

function loadReadme() {
  return new Promise(resolve => {
    window['jsonp'] = jsonp;
    const scr = document.createElement('script');
    scr.src = './README.md';
    document.body.appendChild(scr);
    function jsonp(readme) {
      const stripComments = readme
        .replace(/\s*--\>\s*/g, '')
        .replace(/\s*\<!--\s*/g, '');
      resolve(stripComments);
    }
  });
}