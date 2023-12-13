
var clientDescription;
export function getClientDescriptionWeb() {
  if (clientDescription) return clientDescription;
  var platform = navigator.platform ?
    'web/' + (navigator.platform.replace(/win32/i, 'win')) :
    'web';
  var browser = !navigator.userAgent ? '' :
    ' ' +
    (/mobile/i.test(navigator.userAgent) ? 'mobile ' : '') +
    navigator.userAgent.trim().split(/\s+/g).slice(-1)[0];
  return clientDescription = platform + browser;
}
