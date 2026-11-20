// Vice Heat — the editor: state, the three-step wizard, photo slots,
// pickers, gestures on the preview, per-panel controls, Look sliders,
// undo/redo and PNG export. The poster itself is drawn by poster.js.
import { LAYOUTS, GRADES, SIZES, CAST, PRESETS, defaultWords } from './data.js';
import { drawPoster, renderPosterAt } from './poster.js';

const $ = (id) => document.getElementById(id);

/** A photo slot: which sample it shows and how it is cropped. */
function freshSlot(sample) {
  return { sample, zoom: 1, ox: 0, oy: 0, flip: false, tag: '', img: null };
}

export function freshState() {
  return {
    words: defaultWords(),
    layout: 'sunset-mosaic',
    grade: 'sunset',
    size: '1920x1080',
    fillAll: false,
    look: { paint: 0.5, gradeAmt: 0.6, halftone: 0.3, grain: 0.3, glow: 0.6 },
    photos: [freshSlot(0), freshSlot(1), freshSlot(2), freshSlot(3)],
    selectedPanel: 0,
  };
}

/** A serializable snapshot of the state (images reload on undo). */
function snapshot(state) {
  return JSON.stringify({
    words: state.words, layout: state.layout, grade: state.grade,
    size: state.size, fillAll: state.fillAll, look: state.look,
    photos: state.photos.map(({ sample, zoom, ox, oy, flip, tag }) => ({ sample, zoom, ox, oy, flip, tag })),
    selectedPanel: state.selectedPanel,
  });
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
      document.fonts.load('20px "Bebas Neue"'),
    ]);
    await document.fonts.ready;
  } catch { /* system fonts fall back; the poster still draws */ }
}

/** Which panel (if any) sits under a point of the preview, in fractions. */
function panelAt(state, fx, fy) {
  const layout = LAYOUTS[state.layout];
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const p = layout.panels[i];
    const left = p.x + p.slant * (1 - (fy - p.y) / p.h);
    if (fx >= left && fx <= left + p.w && fy >= p.y && fy <= p.y + p.h) return i;
  }
  return -1;
}

export function bootEditor(canvas) {
  const state = freshState();
  const status = $('status');
  const say = (msg) => { status.textContent = msg; };

  // ---- undo / redo -------------------------------------------------------
  const undoStack = [];
  const redoStack = [];
  const commit = () => {
    undoStack.push(snapshot(state));
    if (undoStack.length > 50) undoStack.shift();
    redoStack.length = 0;
    $('undo').disabled = false;
    $('redo').disabled = true;
  };
  async function restore(json) {
    const data = JSON.parse(json);
    Object.assign(state, {
      words: data.words, layout: data.layout, grade: data.grade,
      size: data.size, fillAll: data.fillAll, look: data.look,
      selectedPanel: data.selectedPanel,
    });
    state.photos = data.photos.map((p) => ({ ...p, img: null }));
    await loadSlots();
    syncAll();
    redraw();
  }
  $('undo').addEventListener('click', async () => {
    if (!undoStack.length) return;
    redoStack.push(snapshot(state));
    await restore(undoStack.pop());
    $('undo').disabled = !undoStack.length;
    $('redo').disabled = false;
    say('Undone.');
  });
  $('redo').addEventListener('click', async () => {
    if (!redoStack.length) return;
    undoStack.push(snapshot(state));
    await restore(redoStack.pop());
    $('redo').disabled = !redoStack.length;
    $('undo').disabled = false;
    say('Redone.');
  });

  // ---- render ------------------------------------------------------------
  function redraw() {
    drawPoster(canvas, state);
  }
  function applySize() {
    const size = SIZES[state.size];
    canvas.width = size.w;
    canvas.height = size.h;
    canvas.style.aspectRatio = `${size.w} / ${size.h}`;
    redraw();
  }

  async function loadSlots() {
    await Promise.all(state.photos.map(async (slot) => {
      if (!slot.img) slot.img = await loadImage(`samples/${CAST[slot.sample].file}`);
    }));
  }

  // ---- wizard steps ------------------------------------------------------
  const steps = [$('step-1'), $('step-2'), $('step-3')];
  steps.forEach((el, i) => el.addEventListener('click', () => {
    steps.forEach((s, j) => s.classList.toggle('active', j === i));
    const targets = ['photo-strip', 'caption-fields', 'export-rows'];
    document.getElementById(targets[i]).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }));

  // ---- photo strip -------------------------------------------------------
  const strip = $('photo-strip');
  CAST.forEach((cast, i) => {
    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    thumb.draggable = true;
    thumb.innerHTML = `<img src="samples/${cast.file}" alt="${cast.label}"><span>${cast.role}</span>`;
    thumb.title = `${cast.label} — drag onto a panel to place it`;
    thumb.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', String(i));
    });
    thumb.addEventListener('click', async () => {
      commit();
      const slot = state.photos[state.selectedPanel] ?? state.photos[0];
      slot.sample = i; slot.img = await loadImage(`samples/${cast.file}`);
      slot.zoom = 1; slot.ox = 0; slot.oy = 0;
      syncPanelControls();
      redraw();
      say(`${cast.label} placed in the selected panel.`);
    });
    strip.appendChild(thumb);
  });
  // Upload a photo of your own into the selected slot.
  $('upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    commit();
    const slot = state.photos[state.selectedPanel] ?? state.photos[0];
    slot.img = await loadImage(URL.createObjectURL(file));
    slot.sample = -1; // a custom photo has no cast role; the tag stays editable
    slot.zoom = 1; slot.ox = 0; slot.oy = 0;
    say(`Loaded ${file.name} into the selected panel.`);
    redraw();
  });

  // ---- one-tap looks -----------------------------------------------------
  $('auto-layout').addEventListener('click', () => {
    commit();
    // Step to the next layout in the list.
    const keys = Object.keys(LAYOUTS);
    state.layout = keys[(keys.indexOf(state.layout) + 1) % keys.length];
    syncPickers();
    redraw();
    say(`Auto layout: ${LAYOUTS[state.layout].label}.`);
  });
  $('surprise').addEventListener('click', () => {
    commit();
    const layouts = Object.keys(LAYOUTS);
    const grades = Object.keys(GRADES);
    state.layout = layouts[Math.floor(Math.random() * layouts.length)];
    state.grade = grades[Math.floor(Math.random() * grades.length)];
    syncPickers();
    redraw();
    say(`Surprise: ${LAYOUTS[state.layout].label} · ${GRADES[state.grade].label}.`);
  });
  PRESETS.forEach((preset) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preset';
    button.textContent = preset.label;
    button.addEventListener('click', () => {
      commit();
      state.layout = preset.layout; state.grade = preset.grade; state.size = preset.size;
      syncAll();
      applySize();
      say(`Preset: ${preset.label}.`);
    });
    $('preset-row').appendChild(button);
  });

  // ---- layout thumbnails, grade chips, size tabs -------------------------
  const layoutBox = $('layout-thumbs');
  Object.entries(LAYOUTS).forEach(([key, layout]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'layout-thumb';
    button.dataset.value = key;
    button.title = layout.label;
    button.innerHTML = `<span class="mini">${layout.panels.map(() => '▦').join('')}</span><span>${layout.label}</span>`;
    if (key === state.layout) button.classList.add('active');
    button.addEventListener('click', () => {
      commit();
      state.layout = key;
      state.selectedPanel = 0;
      syncPickers();
      syncPanelControls();
      redraw();
    });
    layoutBox.appendChild(button);
  });
  const gradeBox = $('grade-chips');
  Object.entries(GRADES).forEach(([key, grade]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'grade-chip';
    button.dataset.value = key;
    button.textContent = grade.label;
    button.style.setProperty('--chip', grade.accent);
    if (key === state.grade) button.classList.add('active');
    button.addEventListener('click', () => {
      commit();
      state.grade = key;
      syncPickers();
      redraw();
    });
    gradeBox.appendChild(button);
  });
  const sizeBox = $('size-tabs');
  Object.entries(SIZES).forEach(([key, size]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'size-tab';
    button.dataset.value = key;
    button.textContent = size.label;
    if (key === state.size) button.classList.add('active');
    button.addEventListener('click', () => {
      commit();
      state.size = key;
      syncPickers();
      applySize();
    });
    sizeBox.appendChild(button);
  });

  function syncPickers() {
    document.querySelectorAll('#layout-thumbs .layout-thumb').forEach((b) => b.classList.toggle('active', b.dataset.value === state.layout));
    document.querySelectorAll('#grade-chips .grade-chip').forEach((b) => b.classList.toggle('active', b.dataset.value === state.grade));
    document.querySelectorAll('#size-tabs .size-tab').forEach((b) => b.classList.toggle('active', b.dataset.value === state.size));
  }

  // ---- caption fields ----------------------------------------------------
  const bindWord = (id, key) => {
    const input = $(id);
    input.value = state.words[key];
    input.addEventListener('input', () => { state.words[key] = input.value; redraw(); });
    input.addEventListener('change', () => commit());
  };
  bindWord('cap-title', 'title');
  bindWord('cap-script', 'script');
  bindWord('cap-tagline', 'tagline');
  bindWord('cap-volume', 'volume');

  // ---- per-panel controls ------------------------------------------------
  function selectedSlot() {
    const layout = LAYOUTS[state.layout];
    const panel = layout.panels[state.selectedPanel] ?? layout.panels[0];
    return state.photos[state.fillAll ? 0 : panel.slot];
  }
  function syncPanelControls() {
    const layout = LAYOUTS[state.layout];
    const total = layout.panels.length;
    $('panel-title').textContent = `Panel ${state.selectedPanel + 1} of ${total}`;
    const slot = selectedSlot();
    $('panel-zoom').value = String(slot.zoom);
    $('panel-tag').value = slot.tag;
  }
  $('panel-zoom').addEventListener('input', (e) => {
    selectedSlot().zoom = Number(e.target.value);
    redraw();
  });
  $('panel-zoom').addEventListener('change', () => commit());
  $('panel-photo-prev').addEventListener('click', () => cyclePhoto(-1));
  $('panel-photo-next').addEventListener('click', () => cyclePhoto(1));
  async function cyclePhoto(step) {
    commit();
    const slot = selectedSlot();
    slot.sample = ((slot.sample + step) % CAST.length + CAST.length) % CAST.length;
    slot.img = await loadImage(`samples/${CAST[slot.sample].file}`);
    slot.zoom = 1; slot.ox = 0; slot.oy = 0; slot.tag = '';
    syncPanelControls();
    redraw();
    say(`Panel now shows ${CAST[slot.sample].label}.`);
  }
  $('panel-reset').addEventListener('click', () => {
    commit();
    const slot = selectedSlot();
    Object.assign(slot, { zoom: 1, ox: 0, oy: 0, flip: false });
    syncPanelControls();
    redraw();
    say('Panel crop reset.');
  });
  $('panel-flip').addEventListener('click', () => {
    commit();
    selectedSlot().flip = !selectedSlot().flip;
    redraw();
    say(selectedSlot().flip ? 'Panel flipped.' : 'Flip off.');
  });
  $('panel-swap').addEventListener('click', () => {
    commit();
    const layout = LAYOUTS[state.layout];
    const next = (state.selectedPanel + 1) % layout.panels.length;
    const a = layout.panels[state.selectedPanel].slot;
    const b = layout.panels[next].slot;
    layout.panels[state.selectedPanel].slot = b;
    layout.panels[next].slot = a;
    state.selectedPanel = next;
    syncPanelControls();
    redraw();
    say('Swapped with the next panel.');
  });
  $('panel-face').addEventListener('click', () => {
    // Face: re-centre the crop on the photo's face (its focus point).
    commit();
    const slot = selectedSlot();
    Object.assign(slot, { zoom: 1, ox: 0, oy: 0 });
    syncPanelControls();
    redraw();
    say('Crop re-centred on the face.');
  });
  $('panel-tag').addEventListener('input', (e) => {
    selectedSlot().tag = e.target.value.toUpperCase();
    redraw();
  });
  $('panel-tag').addEventListener('change', () => commit());

  // ---- Look sliders ------------------------------------------------------
  const lookDefs = [
    ['look-paint', 'paint'],
    ['look-grade', 'gradeAmt'],
    ['look-halftone', 'halftone'],
    ['look-grain', 'grain'],
    ['look-glow', 'glow'],
  ];
  lookDefs.forEach(([id, key]) => {
    const input = $(id);
    input.value = String(state.look[key]);
    input.addEventListener('input', () => {
      state.look[key] = Number(input.value);
      redraw();
    });
    input.addEventListener('change', () => commit());
  });

  // ---- export ------------------------------------------------------------
  function download(canvasEl, name) {
    canvasEl.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, 'image/png');
  }
  const exportBox = $('export-rows');
  Object.entries(SIZES).forEach(([key, size]) => {
    const row = document.createElement('div');
    row.className = 'export-row';
    row.innerHTML = `<span>${size.label}</span>`;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Export PNG';
    button.addEventListener('click', () => {
      download(renderPosterAt(state, key), `vice-heat-${size.w}x${size.h}.png`);
      say(`Saved vice-heat-${size.w}x${size.h}.png.`);
    });
    row.appendChild(button);
    exportBox.appendChild(row);
  });
  $('export-all').addEventListener('click', () => {
    Object.keys(SIZES).forEach((key, i) => {
      setTimeout(() => {
        const size = SIZES[key];
        download(renderPosterAt(state, key), `vice-heat-${size.w}x${size.h}.png`);
      }, i * 400);
    });
    say('Exporting all three sizes.');
  });

  // ---- canvas gestures ---------------------------------------------------
  const badge = $('panel-badge');
  function fractions(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      fx: (e.clientX - rect.left) / rect.width,
      fy: (e.clientY - rect.top) / rect.height,
      rect,
    };
  }
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const { fx, fy } = fractions(e);
    const panelIndex = panelAt(state, fx, fy);
    if (panelIndex < 0) return;
    state.selectedPanel = panelIndex;
    syncPanelControls();
    if (e.shiftKey) {
      drag = { swapFrom: panelIndex };
      return;
    }
    const layout = LAYOUTS[state.layout];
    const slotIndex = state.fillAll ? 0 : layout.panels[panelIndex].slot;
    const slot = state.photos[slotIndex];
    drag = { slotIndex, startX: e.clientX, startY: e.clientY, ox: slot.ox, oy: slot.oy };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const { fx, fy, rect } = fractions(e);
    const panelIndex = panelAt(state, fx, fy);
    if (panelIndex >= 0 && !drag) {
      const layout = LAYOUTS[state.layout];
      const p = layout.panels[panelIndex];
      badge.style.display = 'block';
      badge.style.left = `${rect.left + (p.x + p.w / 2) * rect.width}px`;
      badge.style.top = `${rect.top + (p.y + p.h / 2) * rect.height}px`;
      badge.textContent = String(panelIndex + 1);
    } else if (!drag) {
      badge.style.display = 'none';
    }
    if (!drag || drag.swapFrom !== undefined) return;
    const slot = state.photos[drag.slotIndex];
    slot.ox = drag.ox + (e.clientX - drag.startX) / rect.width;
    slot.oy = drag.oy + (e.clientY - drag.startY) / rect.height;
    redraw();
  });
  canvas.addEventListener('pointerup', (e) => {
    if (drag && drag.swapFrom !== undefined) {
      const { fx, fy } = fractions(e);
      const target = panelAt(state, fx, fy);
      if (target >= 0 && target !== drag.swapFrom) {
        commit();
        const layout = LAYOUTS[state.layout];
        const a = layout.panels[drag.swapFrom].slot;
        layout.panels[drag.swapFrom].slot = layout.panels[target].slot;
        layout.panels[target].slot = a;
        say(`Swapped panels ${drag.swapFrom + 1} and ${target + 1}.`);
        redraw();
      }
    } else if (drag) {
      commit();
    }
    drag = null;
  });
  canvas.addEventListener('wheel', (e) => {
    const { fx, fy } = fractions(e);
    const panelIndex = panelAt(state, fx, fy);
    if (panelIndex < 0) return;
    e.preventDefault();
    const layout = LAYOUTS[state.layout];
    const slot = state.photos[state.fillAll ? 0 : layout.panels[panelIndex].slot];
    slot.zoom = Math.max(1, Math.min(3, slot.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
    syncPanelControls();
    redraw();
  }, { passive: false });
  canvas.addEventListener('dblclick', (e) => {
    const { fx, fy } = fractions(e);
    const panelIndex = panelAt(state, fx, fy);
    if (panelIndex < 0) return;
    commit();
    const layout = LAYOUTS[state.layout];
    const slot = state.photos[state.fillAll ? 0 : layout.panels[panelIndex].slot];
    Object.assign(slot, { zoom: 1, ox: 0, oy: 0 });
    syncPanelControls();
    redraw();
    say('Crop reset for that panel.');
  });
  canvas.addEventListener('dragover', (e) => e.preventDefault());
  canvas.addEventListener('drop', async (e) => {
    e.preventDefault();
    const sample = Number(e.dataTransfer.getData('text/plain'));
    if (!Number.isInteger(sample) || sample < 0 || sample >= CAST.length) return;
    const { fx, fy } = fractions(e);
    const panelIndex = panelAt(state, fx, fy);
    if (panelIndex < 0) return;
    commit();
    const layout = LAYOUTS[state.layout];
    const slot = state.photos[layout.panels[panelIndex].slot];
    slot.sample = sample;
    slot.img = await loadImage(`samples/${CAST[sample].file}`);
    slot.zoom = 1; slot.ox = 0; slot.oy = 0; slot.tag = '';
    syncPanelControls();
    redraw();
    say(`${CAST[sample].label} dropped into panel ${panelIndex + 1}.`);
  });

  function syncAll() {
    syncPickers();
    syncPanelControls();
    $('cap-title').value = state.words.title;
    $('cap-script').value = state.words.script;
    $('cap-tagline').value = state.words.tagline;
    $('cap-volume').value = state.words.volume;
  }

  return {
    state, redraw, applySize, loadSlots, fontsReady, syncAll, syncPanelControls,
    async boot() {
      await fontsReady();
      await loadSlots();
      syncAll();
      applySize();
      say('Ready — drag a panel to pan, scroll to zoom, double-click to reset its crop.');
    },
  };
}
