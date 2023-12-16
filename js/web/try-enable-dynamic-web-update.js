// @ts-check

import { BskyAgent } from '@atproto/api';
import { Octokit } from '@octokit/rest';

import { patchBskyAgent } from '../patch-bsky-agent';
import { updateDIDs } from '../update-dids';
import { manageUI } from './update-layout';

export async function tryEnableDynamicWebUpdate() {

  const oldXrpc = 'https://bsky.social/xrpc';
  const newXrpc = 'https://bsky.network/xrpc';

  const atClient = new BskyAgent({ service: newXrpc });
  patchBskyAgent(atClient);

  let githubConnected = undefined;

  const ui = manageUI();
  ui.onUpdateClick = startUpdating;
  ui.onCommitClick = startCommitting;

  async function startUpdating(token) {
    let cursorsJSON;
    const oct = new Octokit({ auth: token });
    const cursorsReq = await oct.request('GET /repos/bluesky-static/accounts/contents/cursors.json');
    const content = cursorsReq.data.content;
    const commitSHA = cursorsReq.data.sha;
    /** @type {import('../../cursors.json')} */
    cursorsJSON = JSON.parse(atob(content));

    githubConnected = {
      token,
      oct,
      commitSHA,
      cursorsContent: content,
      cursorData: cursorsJSON.listRepos,
      /** @type {*} */
      chunk: undefined
    };

    const ongoingUpdate = updateDIDs({ atClient, cursor: githubConnected.cursorData.cursor });
    for await (const chunk of ongoingUpdate) {
      githubConnected.chunk = chunk;
      ui.updateAccountsPanel(
        'Pulling accounts from BlueSky:' +
        ' SHA:' + commitSHA +
        '/cursor:' + githubConnected.cursorData.cursor + '>' + chunk.cursor +
        ' ' + chunk.totalStats.received +
        ' via ' + chunk.totalStats.callCount + ' calls,' +
        ' ' + chunk.totalStats.callTime + 'ms...'
      );
    }
  }

  async function startCommitting() {
    if (!githubConnected.chunk) return;

    alert('No this is not implemented, keep tight!');
  }
}

function octConnect() {
  // const oct = new octokit.Octokit({ auth: githubAuthToken });
  // const { data: refData } = await oct.rest.git.getRef({
  //   owner: 'bluesky-static',
  //   repo: 'accounts',
  //   ref: 'heads/main'
  // });
  // const commitSha = refData.object.sha
  // const { data: commitData } = await oct.rest.git.getCommit({
  //   owner: 'bluesky-static',
  //   repo: 'accounts',
  //   commit_sha: commitSha
  // });

}