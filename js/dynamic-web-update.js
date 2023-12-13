// @ts-check

/**
 * @param {{
 *  atproto: typeof import('@atproto/api'),
 *  cursor: string,
 * }} _
 */
export async function* dynamicWebUpdate({ atproto, cursor }) {
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

  const oldXrpc = 'https://bsky.social/xrpc';
  const newXrpc = 'https://bsky.network/xrpc';

  const atClient = new atproto.BskyAgent({ service: newXrpc });

}
