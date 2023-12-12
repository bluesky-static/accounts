/// <reference types="marked" />

function blueskyStatic() {
  if (typeof window !== 'undefined' && window && /http|file/i.test(window.location?.protocol)) {
    runInBrowser();
  } else {
    runInNode();
  }

  function runInNode() {
    const { updateFromLatest } = require('./js/update-dids');
    updateFromLatest();
  }

  async function runInBrowser() {

    const atprotoPromise = importModule('@atproto/api');
    await initDisplayReadme();

    await tryEnableDynamicWebUpdate();

    async function initDisplayReadme() {
      await importModule('marked');

      const readme = await loadJsonp('./README.md', 'jsonp');
      const html = marked.parse(
        readme
          .replace(/\s*--\>\s*/g, '')
          .replace(/\s*\<!--\s*/g, ''));

      const markdownContainer = document.createElement('div');
      markdownContainer.innerHTML = html;
      document.body.appendChild(markdownContainer);
      const accountNumberElem = document.querySelector('.accountnumber');
      if (accountNumberElem) {
        const num = Number(accountNumberElem.textContent || '');
        if (Number.isFinite(num)) {
          accountNumberElem.textContent = num.toLocaleString();
        }
      }

      const timestampElem = document.querySelector('.timestamp');
      if (timestampElem) {
        const ts = new Date(timestampElem.textContent || '');
        if (ts instanceof Date && Number.isFinite(ts.getTime())) {
          timestampElem.textContent = ts.toLocaleString();
        }
      }
    }

    async function tryEnableDynamicWebUpdate() {

      const webLoader = document.createElement('div');
      webLoader.style.cssText = 'font-style: italic;';
      webLoader.textContent = '(dynamic)';
      document.body.appendChild(webLoader);

      let atproto;
      try {
        const atproto = await atprotoPromise;
        await octokit;

        console.log('loaded ', { atproto, octokit });
      } catch (errorLoadingLibraries) {
        console.log(errorLoadingLibraries);
        webLoader.textContent = '(dynamic web update disabled: ' + errorLoadingLibraries.message + ')';
        return;
      }

      webLoader.textContent = '(dynamic web update)';

      let cursorsJSON;
      try {
        const oct = new octokit.Octokit();
        const cursorsReq = await oct.request('GET /repos/bluesky-static/accounts/contents/cursors.json');
        const content = cursorsReq.data.content;
        cursorsJSON = JSON.parse(atob(content));
      } catch (error) {
        console.log(error);
        webLoader.textContent = '(dynamic web update not available: ' + error.message + ')';
        return;
      }

      // TODO: verify read/only public GitHub access before showing the section below

      webLoader.style.fontStyle = null;
      webLoader.innerHTML = `
    <h3>Dynamic web update access</h3>
    <pre>${JSON.stringify(cursorsJSON, null, 2)}</pre>
    <p>
      To run dynamic update from this web page, GitHub token is required:
      <input id=tokenINPUT name=tokenINPUT autocomplete=on>
      <br>
      <button id=startUpdateBUTTON>Start update</button>
    </p>
    `;

      const tokenINPUT = document.getElementById('tokenINPUT');
      const startUpdateBUTTON = document.getElementById('startUpdateBUTTON');

      startUpdateBUTTON.onclick = async () => {
      };

    }


  }

} blueskyStatic();