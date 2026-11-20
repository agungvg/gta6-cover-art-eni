// Vice Heat — boot: start the editor, then run a screenshot scene when
// the page carries ?shot= (the entry's screenshots are taken this way).
import { bootEditor } from './editor.js';
import { runShot } from './shots.js';

const editor = bootEditor(document.getElementById('poster'));
await editor.boot();

const query = new URLSearchParams(location.search);
if (query.get('shot')) {
  await runShot(query.get('shot'), query, editor);
}
