// @ts-check

import { shortenDID } from '../utils';

/**
 * @param {{
 *  atClient: import('@atproto/api').BskyAgent,
 *  cursor: string | number | undefined | null
 * }} _
 */
export async function* fetchShortDIDs({ atClient, cursor }) {
  let currentCursor = cursor;
  while (true) {
    const nextList = await
      atClient.com.atproto.sync.listRepos({
        cursor:
          currentCursor == null || currentCursor === '' ? undefined :
          String(currentCursor),
        limit: 997
      });

    if (nextList?.data?.repos?.length) {
      const addDids = nextList.data.repos.map(repo => shortenDID(repo.did));
      yield { shortDIDs: addDids, cursor: nextList?.data?.cursor };
    } else if (nextList?.data?.cursor) {
      yield { cursor: nextList?.data?.cursor };
    }

    if (!nextList.data?.cursor) {
      break;
    }

    currentCursor = nextList.data.cursor;
  }
}