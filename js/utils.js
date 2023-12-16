// @ts-check

export const isWeb =
  typeof window !== 'undefined' && typeof window?.document?.createElement === 'function' &&
  /http|file/i.test(window.location?.protocol);

export function packDidsJson(dids, lead = '[\n', tail = '\n]\n') {
  const DIDS_SINGLE_LINE = 6;
  const didsLines = [];
  for (let i = 0; i < dids.length; i += DIDS_SINGLE_LINE) {
    const chunk = dids.slice(i, i + DIDS_SINGLE_LINE);
    const line = chunk.map(shortDID => '"' + shortDID + '"').join(',');
    didsLines.push(line);
  }

  return lead + didsLines.join(',\n') + tail;
}

var wordStartRegExp = /[A-Z]*[a-z]*/g;
/** @param {string} str @param {string[]} wordStarts */
export function getWordStartsLowerCase(str, wordStarts = []) {
  if (!wordStarts) wordStarts = [];
  str.replace(wordStartRegExp, function (match) {
    const wordStart = match?.slice(0, 3).toLowerCase();
    if (wordStart?.length === 3 && wordStarts.indexOf(wordStart) < 0)
      wordStarts.push(wordStart);
    return match;
  });
  return wordStarts;
}

/** @param {string | Date | number} date */
export function formatSince(date) {
  date = new Date(date);
  const now = Date.now();
  const dateTime = date.getTime();
  if (dateTime > now || date.getTime() < now - 1000 * 60 * 60 * 24 * 30) {
    return date.toLocaleDateString();
  }
  else {
    // TODO: localize
    const timeAgo = now - dateTime;
    if (timeAgo > 1000 * 60 * 60 * 48) {
      return Math.round(timeAgo / (1000 * 60 * 60 * 24)) + 'd ago';
    } else if (timeAgo > 1000 * 60 * 60 * 2) {
      return Math.round(timeAgo / (1000 * 60 * 60)) + 'h ago';
    } else if (timeAgo > 1000 * 60 * 2) {
      return Math.round(timeAgo / (1000 * 60)) + 'm ago';
    } else if (timeAgo > 1000 * 2) {
      return Math.round(timeAgo / 1000) + 's ago';
    } else {
      return 'now';
    }
  }
}

export function getKeyPath(bucketKey) {
  if (bucketKey === 'web') return 'dids/web.json';
  else return 'dids/' + bucketKey[0] + '/' + bucketKey + '.json';
}

/** @param {string} shortDID */
export function getKeyShortDID(shortDID) {
  if (shortDID.indexOf(':') >= 0) return 'web';
  return shortDID.slice(0, 2);
}


export function getProfileBlobUrl(did, cid) {
  if (!did || !cid) return undefined;
  return `https://cdn.bsky.app/img/avatar/plain/${unwrapShortDID(did)}/${cid}@jpeg`;
}

export function getFeedBlobUrl(did, cid) {
  if (!did || !cid) return undefined;
  return `https://cdn.bsky.app/img/feed_thumbnail/plain/${unwrapShortDID(did)}/${cid}@jpeg`;
}

/** @param {string} text */
export function likelyDID(text) {
  return text && (
    !text.trim().indexOf('did:') ||
    text.trim().length === 24 && !/[^\sa-z0-9]/i.test(text)
  );
}

/** @param {string | null | undefined} did */
export function shortenDID(did) {
  return typeof did === 'string' ? did.replace(/^did\:plc\:/, '') : did;
}

export function unwrapShortDID(shortDID) {
  return !shortDID ? shortDID : shortDID.indexOf(':') < 0 ? 'did:plc:' + shortDID : shortDID;
}

export function unwrapShortHandle(shortHandle) {
  return !shortHandle ? shortHandle : shortHandle.indexOf('.') < 0 ? shortHandle + '.bsky.social' : shortHandle;
}

/** @param {string} handle */
export function shortenHandle(handle) {
  return handle && handle.replace(_shortenHandle_Regex, '');
}
const _shortenHandle_Regex = /\.bsky\.social$/;

/**
 * @param {any} x
 * @returns {x is Promise<any>}
 */
export function isPromise(x) {
  if (!x || typeof x !== 'object') return false;
  else return typeof x.then === 'function';
}