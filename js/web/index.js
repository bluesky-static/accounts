import { loadAndRenderReadme } from './load-and-render-readme';

export async function runWeb() {
  const readme = await loadAndRenderReadme();
  await tryEnableDynamicWebUpdate();
}
