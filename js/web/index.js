import { loadAndRenderReadme } from './load-and-render-readme';
import { tryEnableDynamicWebUpdate } from './try-enable-dynamic-web-update';

export async function runWeb() {
  const readme = await loadAndRenderReadme();
  await tryEnableDynamicWebUpdate();
}
