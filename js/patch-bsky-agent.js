// @ts-check

/** @param {import('@atproto/api').BskyAgent} atClient */
export function patchBskyAgent(atClient) {
  atClient.com.atproto.sync._service.xrpc.baseClient.lex.assertValidXrpcOutput = function (lexUri, value, ...rest) {
    return true;
  };
}