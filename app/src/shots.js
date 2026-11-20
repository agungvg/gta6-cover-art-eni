// Vice Heat — screenshot scenes: a ?shot= query sets up one fixed scene
// so the entry's screenshots are reproducible. `cover` dresses the poster
// from the query (layout, grade, size, title, script, tagline, volume,
// photo) and hides the editor chrome; `editor` leaves the default editor
// state alone. Either way the page title becomes shot-ready once the
// scene has drawn, which is what the screenshot script waits for.
import { LAYOUTS, GRADES, SIZES, CAST } from './data.js';
import { loadImage } from './editor.js';

export async function runShot(shot, query, editor) {
  const { state } = editor;
  // A cover scene dresses the poster from the query; an editor scene
  // leaves the default editor state alone.
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const layout = query.get('layout');
    if (layout && LAYOUTS[layout]) state.layout = layout;
    const grade = query.get('grade');
    if (grade && GRADES[grade]) state.grade = grade;
    const size = query.get('size');
    if (size && SIZES[size]) state.size = size;
    if (query.get('title')) state.words.title = query.get('title');
    if (query.get('script')) state.words.script = query.get('script');
    if (query.get('tagline')) state.words.tagline = query.get('tagline');
    if (query.get('volume')) state.words.volume = query.get('volume');
    const photo = query.get('photo');
    if (photo) {
      const idx = CAST.findIndex((c) => c.file === `${photo}.jpg`);
      if (idx >= 0) {
        state.photos[0].sample = idx;
        state.photos[0].img = await loadImage(`samples/${CAST[idx].file}`);
        state.photos[0].zoom = 1; state.photos[0].ox = 0; state.photos[0].oy = 0;
      }
    }
    editor.syncAll();
    editor.applySize();
  }
  editor.redraw();
  // Two frames so the canvas paint lands before the screenshot is taken.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  document.title = 'shot-ready';
  return true;
}
