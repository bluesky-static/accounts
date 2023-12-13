const { runNode } = require('./node');
const { runWeb } = require('./web');

function bluesky_static() {
  if (typeof window !== 'undefined' && window && /http|file/i.test(window.location?.protocol)) {
    runWeb();
  } else {
    runNode();
  }

} bluesky_static();