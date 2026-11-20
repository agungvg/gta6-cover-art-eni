// Fixed scenes for screenshots: ?shot=editor shows the app with photos loaded;
// ?shot=cover shows one exported cover alone, at the size the query names.
// `layout`, `grade`, `size`, `title`, `subtitle` and `photo` pick the scene.
// window.__shotReady is set once the scene has painted.
export async function runShot(shot, query, hooks) {
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    await hooks.cover({
      size: query.get('size') ?? '1920x1080',
      layout: query.get('layout') ?? 'vice-grid',
      grade: query.get('grade') ?? 'sunset',
      title: query.get('title') ?? undefined,
      subtitle: query.get('subtitle') ?? undefined,
      photo: query.get('photo') ?? 'hero',
    });
  }
  // Two frames so the canvas paint lands before the screenshot is taken.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
