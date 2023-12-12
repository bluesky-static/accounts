// octokit

function importModule(moduleName) {
  return importScript((/http/i.test(location.protocol) ? '' : 'https:') + '//unpkg.com/' + moduleName);
}

function getIFRAME() {
  return new Promise((resolve, reject) => {
    const ifr = document.createElement('iframe');
    ifr.src = 'about:blank';
    ifr.style.cssText = 'position:fixed;top:-1000px;left:-1000px; width: 200px; height: 200px; opacity: 0.001;';
    ifr.onload = function () {
      ifr.contentWindow.module = { exports: {} };
      resolve(ifr);
    };
    document.body.appendChild(ifr);
  });
}

function importScript(src) {
  return new Promise(async (resolve, reject) => {
    const ifr = await getIFRAME();
    const scr = ifr.contentDocument.createElement('script');
    const keys = Object.keys(ifr.contentWindow);
    scr.src = src;
    scr.onload = () => {
      setTimeout(() => {
        for (const key in ifr.contentWindow) {
          if (keys.indexOf(key) < 0) {
            ifr.contentWindow.module.exports[key] = ifr.contentWindow[key];
            window[key] = ifr.contentWindow[key];
          }
        }
        resolve(ifr.contentWindow.module.exports);
        setTimeout(() => ifr.remove(), 10);
      }, 100);
    };
    ifr.contentDocument.body.appendChild(scr);
  });
}

async function loadJsonp(src, callbackName) {
  return new Promise(async (resolve, reject) => {
    const ifr = await getIFRAME();
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
  });
}