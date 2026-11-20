// Vice Heat editor wiring: photo slots, crop controls, layout / grade / size
// pickers, live preview with drag-to-pan and wheel-to-zoom, PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, renderCoverAt, LAYOUTS, SIZES } from './cover.js';
import { GRADES } from './scene.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const status = $('status');

/** The poster's live state: three photo slots, words, layout, grade and size. */
const state = {
  title: 'VICE HEAT',
  subtitle: 'Welcome to Vice City',
  tag1: 'Lucia — The Driver',
  tag2: 'Jason — The Fixer',
  tag3: 'Vice City — Est. 2026',
  layout: 'vice-grid',
  grade: 'sunset',
  size: '1920x1080',
  fillAll: false,
  photos: [
    { img: null, zoom: 1, ox: 0, oy: 0 },
    { img: null, zoom: 1, ox: 0, oy: 0 },
    { img: null, zoom: 1, ox: 0, oy: 0 },
  ],
};

/** The sample photos shipped with the app (image-model made or kit samples). */
const SAMPLES = ['hero.jpg', 'street.jpg', 'pier.jpg', 'boulevard.jpg'];
const SAMPLE_LABELS = { 'hero.jpg': 'Hero · Palms Motel', 'street.jpg': 'Street · Neon Night', 'pier.jpg': 'Pier · Sunset', 'boulevard.jpg': 'Boulevard · Dusk' };

/**
 * Default crop per sample, so a face never lands outside a wide panel:
 * pier.jpg is square with the fisherman's face near the top, so a wide
 * (2:1) panel's centred cover-fit would cut his hat and eyes off — pan
 * the frame down (oy > 0 shows the top of the photo) until the face sits
 * inside. Tall panels cannot shift vertically (the photo already fills
 * their height), so this changes nothing there.
 */
const SAMPLE_CROPS = { 'pier.jpg': { zoom: 1, ox: 0, oy: 0.5 } };
const defaultCrop = (sample) => ({ zoom: 1, ox: 0, oy: 0, ...(SAMPLE_CROPS[sample] ?? {}) });

/** Applies a sample's default crop to a slot and mirrors it in its sliders. */
function applyCrop(slotIndex, crop) {
  const slot = state.photos[slotIndex];
  slot.zoom = crop.zoom; slot.ox = crop.ox; slot.oy = crop.oy;
  const card = document.querySelectorAll('#slots .slot')[slotIndex];
  if (!card) return;
  card.querySelector('.zoom').value = String(crop.zoom);
  card.querySelector('.panx').value = String(crop.ox);
  card.querySelector('.pany').value = String(crop.oy);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Waits until the bundled display fonts are usable on the canvas. */
async function fontsReady() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px "Bebas Neue"'),
    ]);
    await document.fonts.ready;
  } catch { /* fall back to system fonts; the poster still draws */ }
}

function redraw() {
  drawCover(canvas, state);
}

/** Sizes the preview canvas to the chosen export size, then redraws. */
function applySize() {
  const size = SIZES[state.size];
  canvas.width = size.w;
  canvas.height = size.h;
  canvas.style.aspectRatio = `${size.w} / ${size.h}`;
  redraw();
}

/** Rebuilds one photo slot's card (file input, sample picker, crop sliders). */
function buildSlotCard(slot, index) {
  const card = document.createElement('div');
  card.className = 'slot';
  card.innerHTML = `
    <div class="slot-head"><strong>Photo ${index + 1}</strong><span class="slot-name"></span></div>
    <label class="file-label">Upload a photo <input type="file" accept="image/*"></label>
    <label>Sample <select class="sample"></select></label>
    <div class="sliders">
      <label>Zoom <input type="range" class="zoom" min="1" max="3" step="0.05" value="1"></label>
      <label>Pan X <input type="range" class="panx" min="-0.5" max="0.5" step="0.02" value="0"></label>
      <label>Pan Y <input type="range" class="pany" min="-0.5" max="0.5" step="0.02" value="0"></label>
    </div>
    <button type="button" class="fill-all">Use this photo in every panel</button>`;
  const name = card.querySelector('.slot-name');
  const setName = (label) => { name.textContent = label; };
  card.querySelector('input[type=file]').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    state.photos[index].img = await loadImage(URL.createObjectURL(file));
    setName(file.name.length > 22 ? file.name.slice(0, 21) + '…' : file.name);
    redraw();
  });
  const select = card.querySelector('.sample');
  SAMPLES.forEach((sample) => {
    const option = document.createElement('option');
    option.value = sample;
    option.textContent = SAMPLE_LABELS[sample];
    select.appendChild(option);
  });
  select.value = SAMPLES[index % SAMPLES.length];
  select.addEventListener('change', async () => {
    state.photos[index].img = await loadImage(`samples/${select.value}`);
    setName(SAMPLE_LABELS[select.value]);
    applyCrop(index, defaultCrop(select.value));
    redraw();
  });
  const bindSlider = (cls, key) => {
    card.querySelector(cls).addEventListener('input', (e) => {
      state.photos[index][key] = Number(e.target.value);
      redraw();
    });
  };
  bindSlider('.zoom', 'zoom');
  bindSlider('.panx', 'ox');
  bindSlider('.pany', 'oy');
  card.querySelector('.fill-all').addEventListener('click', () => {
    state.fillAll = true;
    document.querySelectorAll('.fill-all').forEach((b) => b.classList.remove('active'));
    card.querySelector('.fill-all').classList.add('active');
    status.textContent = `Every panel now shows Photo ${index + 1}, cropped differently per panel.`;
    redraw();
  });
  return card;
}

/** A row of toggle buttons bound to one state key. */
function buildPicker(containerId, options, key, onPick) {
  const container = $(containerId);
  Object.entries(options).forEach(([value, option]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pick';
    button.textContent = option.label ?? option;
    button.dataset.value = value;
    if (state[key] === value) button.classList.add('active');
    button.addEventListener('click', () => {
      state[key] = value;
      container.querySelectorAll('.pick').forEach((b) => b.classList.toggle('active', b === button));
      onPick(value);
    });
    container.appendChild(button);
  });
}

/** Which panel (if any) sits under a point of the preview canvas, in fractions. */
function panelAt(fx, fy) {
  const layout = LAYOUTS[state.layout];
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const p = layout.panels[i];
    const top = p.x + p.slant * (1 - (fy - p.y) / p.h);
    if (fx >= top && fx <= top + p.w && fy >= p.y && fy <= p.y + p.h) return i;
  }
  return -1;
}

/** Drag pans the photo under the cursor; the wheel zooms it. */
function bindCanvasGestures() {
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    const panelIndex = panelAt(fx, fy);
    if (panelIndex < 0) return;
    const layout = LAYOUTS[state.layout];
    let slotIndex = layout.panels[panelIndex].photo;
    if (state.fillAll) slotIndex = 0;
    drag = { slotIndex, startX: e.clientX, startY: e.clientY, ox: state.photos[slotIndex].ox, oy: state.photos[slotIndex].oy };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const slot = state.photos[drag.slotIndex];
    slot.ox = drag.ox + (e.clientX - drag.startX) / rect.width;
    slot.oy = drag.oy + (e.clientY - drag.startY) / rect.height;
    redraw();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', (e) => {
    const rect = canvas.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    const panelIndex = panelAt(fx, fy);
    if (panelIndex < 0) return;
    e.preventDefault();
    const layout = LAYOUTS[state.layout];
    let slotIndex = layout.panels[panelIndex].photo;
    if (state.fillAll) slotIndex = 0;
    const slot = state.photos[slotIndex];
    slot.zoom = Math.max(1, Math.min(3, slot.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
    redraw();
  }, { passive: false });
}

async function boot() {
  await fontsReady();

  // Words.
  $('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('tag1').addEventListener('input', (e) => { state.tag1 = e.target.value; redraw(); });
  $('tag2').addEventListener('input', (e) => { state.tag2 = e.target.value; redraw(); });
  $('tag3').addEventListener('input', (e) => { state.tag3 = e.target.value; redraw(); });

  // One-tap looks: a preset sets layout + grade + size together.
  const applyPreset = (layout, grade, size) => {
    state.layout = layout in LAYOUTS ? layout : state.layout;
    state.grade = grade in GRADES ? grade : state.grade;
    state.size = size in SIZES ? size : state.size;
    document.querySelectorAll('#layout-picker .pick').forEach((b) => b.classList.toggle('active', b.dataset.value === state.layout));
    document.querySelectorAll('#grade-picker .pick').forEach((b) => b.classList.toggle('active', b.dataset.value === state.grade));
    document.querySelectorAll('#size-picker .pick').forEach((b) => b.classList.toggle('active', b.dataset.value === state.size));
    applySize();
    status.textContent = `Preset applied: ${LAYOUTS[state.layout].label} · ${GRADES[state.grade].label} · ${SIZES[state.size].label}.`;
  };
  $('preset-sunset').addEventListener('click', () => applyPreset('vice-grid', 'sunset', '1920x1080'));
  $('preset-neon').addEventListener('click', () => applyPreset('hero-pop', 'neon', '1080x1350'));
  $('preset-gold').addEventListener('click', () => applyPreset('triple-stripe', 'gold', '1080x1080'));
  $('shuffle').addEventListener('click', () => {
    const layouts = Object.keys(LAYOUTS), grades = Object.keys(GRADES);
    const layout = layouts[Math.floor(Math.random() * layouts.length)];
    const grade = grades[Math.floor(Math.random() * grades.length)];
    applyPreset(layout, grade, state.size);
    status.textContent = `Surprise: ${LAYOUTS[layout].label} · ${GRADES[grade].label}. Hit it again for another look.`;
  });

  // Pickers.
  buildPicker('layout-picker', LAYOUTS, 'layout', () => redraw());
  buildPicker('grade-picker', GRADES, 'grade', () => redraw());
  buildPicker('size-picker', SIZES, 'size', () => applySize());

  // Photo slots.
  const slots = $('slots');
  state.photos.forEach((slot, i) => slots.appendChild(buildSlotCard(slot, i)));

  // One-photo toggle off.
  $('fill-off').addEventListener('click', () => {
    state.fillAll = false;
    document.querySelectorAll('.fill-all').forEach((b) => b.classList.remove('active'));
    status.textContent = 'Each panel shows its own photo again.';
    redraw();
  });

  // Export the poster at the chosen size.
  $('export').addEventListener('click', () => {
    const size = SIZES[state.size];
    const out = renderCoverAt(state, state.size);
    out.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `vice-heat-${size.w}x${size.h}.png`;
      a.click();
      status.textContent = `Saved vice-heat-${size.w}x${size.h}.png — ${size.label}.`;
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, 'image/png');
  });

  bindCanvasGestures();
  applySize();

  // Default photos: the two image-model samples plus a kit sample.
  const defaults = ['hero.jpg', 'street.jpg', 'pier.jpg'];
  await Promise.all(defaults.map(async (sample, i) => {
    state.photos[i].img = await loadImage(`samples/${sample}`);
    document.querySelectorAll('.slot-name')[i].textContent = SAMPLE_LABELS[sample];
    applyCrop(i, defaultCrop(sample));
  }));
  redraw();

  // Screenshot scenes (?shot=cover / ?shot=editor) for the entry's screenshots.
  const query = new URLSearchParams(location.search);
  if (query.get('shot')) {
    const syncPickers = () => {
      document.querySelectorAll('#layout-picker .pick').forEach((b) => b.classList.toggle('active', b.dataset.value === state.layout));
      document.querySelectorAll('#grade-picker .pick').forEach((b) => b.classList.toggle('active', b.dataset.value === state.grade));
      document.querySelectorAll('#size-picker .pick').forEach((b) => b.classList.toggle('active', b.dataset.value === state.size));
    };
    await runShot(query.get('shot'), query, {
      cover: async (opts) => {
        state.layout = opts.layout in LAYOUTS ? opts.layout : state.layout;
        state.grade = opts.grade in GRADES ? opts.grade : state.grade;
        state.size = opts.size in SIZES ? opts.size : state.size;
        if (opts.title) { state.title = opts.title; $('title').value = opts.title; }
        if (opts.subtitle) { state.subtitle = opts.subtitle; $('subtitle').value = opts.subtitle; }
        syncPickers();
        applySize();
        state.photos[0].img = await loadImage(`samples/${opts.photo}.jpg`);
        redraw();
      },
    });
  }
}

boot();
