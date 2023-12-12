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

    initDisplayReadme();

    async function initDisplayReadme() {
      await importScript((/http/i.test(location.protocol) ? '' : 'http:') + '//unpkg.com/marked');
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

    function importScript(src) {
      return new Promise((resolve, reject) => {
        const scr = document.createElement('script');
        scr.src = src;
        scr.onload = () => {
          setTimeout(resolve, 100);
        };
        document.body.appendChild(scr);
      });
    }

    async function loadJsonp(src, callbackName) {
      return new Promise((resolve, reject) => {
        const ifr = document.createElement('iframe');
        ifr.src = 'about:blank';
        ifr.style.cssText = 'position:fixed;top:-1000px;left:-1000px; width: 200px; height: 200px; opacity: 0.001;';
        ifr.onload = function () {
          ifr.contentWindow.module = { exports: {} };
          ifr.contentWindow[callbackName] = function (data) {
            resolve(data);
            setTimeout(() => {
              ifr.remove();
            }, 10);
          };

          const scr = document.createElement('script');
          scr.src = src;
          scr.onload = () => {
            setTimeout(
              () => {
                if (!ifr.parentElement) return;
                if (ifr.contentWindow.module.exports && Object.keys(ifr.contentWindow.module.exports).length === 0) {
                  reject(new Error(
                    'Script loaded without JSONP invocation: ' + src));
                } else {
                  resolve(ifr.contentWindow.module.exports);
                }

                setTimeout(() => {
                  ifr.remove();
                }, 10);
              },
              100);
          };
          ifr.contentDocument.body.appendChild(scr);
        };
        document.body.appendChild(ifr);
      });
    }
  }

} blueskyStatic();