// Vice Heat — the data layer: every number and word the poster draws.
//
// The renderer (poster.js) reads only this file for layout, colour and
// copy, and the editor (editor.js) only ever mutates this state shape.
// All copy is invented for this entry — no Rockstar names, logos or art.

/** The three export sizes and the labels the editor shows for them. */
export const SIZES = {
  '1920x1080': { w: 1920, h: 1080, label: 'Landscape · 1920 × 1080' },
  '1080x1080': { w: 1080, h: 1080, label: 'Square · 1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait · 1080 × 1350' },
};

/**
 * The cast: the four bundled sample photos. `focus` is the face position
 * in photo fractions — the renderer keeps that point inside every panel,
 * so a face is never cropped out of a wide panel. `role` is the slanted
 * tag printed on the panel that shows the photo.
 */
export const CAST = [
  { file: 'hero.jpg', label: 'Palms Motel · Sunset', role: 'THE DRIVER', focus: { x: 0.42, y: 0.4 } },
  { file: 'street.jpg', label: 'Neon Street · Dusk', role: 'THE FIXER', focus: { x: 0.36, y: 0.24 } },
  { file: 'pier.jpg', label: 'Pier · Midday', role: 'THE ANGLER', focus: { x: 0.38, y: 0.2 } },
  { file: 'boulevard.jpg', label: 'Boulevard · Golden Hour', role: 'THE INSIDER', focus: { x: 0.42, y: 0.16 } },
];

/**
 * Layouts: seven ways to split the poster into panels. Each panel is a
 * fraction of the poster (x, y, w, h); `slant` leans the top edge sideways
 * so the panel borders read like a comic-book page; `slot` is the photo
 * slot (0..3) the panel shows by default.
 */
export const LAYOUTS = {
  'sunset-mosaic': {
    label: 'Sunset Mosaic',
    panels: [
      { x: 0.02, y: 0.08, w: 0.56, h: 0.72, slant: 0.03, slot: 0 },
      { x: 0.6, y: 0.08, w: 0.38, h: 0.35, slant: -0.02, slot: 1 },
      { x: 0.6, y: 0.45, w: 0.38, h: 0.35, slant: -0.02, slot: 2 },
    ],
  },
  'triple-slant': {
    label: 'Triple Slant',
    panels: [
      { x: 0.02, y: 0.08, w: 0.3, h: 0.72, slant: 0.04, slot: 0 },
      { x: 0.34, y: 0.08, w: 0.3, h: 0.72, slant: 0.04, slot: 1 },
      { x: 0.66, y: 0.08, w: 0.3, h: 0.72, slant: 0.04, slot: 3 },
    ],
  },
  'hero-pop': {
    label: 'Hero Pop',
    panels: [
      { x: 0.22, y: 0.08, w: 0.56, h: 0.46, slant: 0.02, slot: 0 },
      { x: 0.02, y: 0.56, w: 0.46, h: 0.24, slant: -0.02, slot: 1 },
      { x: 0.52, y: 0.56, w: 0.46, h: 0.24, slant: -0.02, slot: 2 },
    ],
  },
  'four-grid': {
    label: 'Four Grid',
    panels: [
      { x: 0.02, y: 0.08, w: 0.47, h: 0.35, slant: 0.02, slot: 0 },
      { x: 0.51, y: 0.08, w: 0.47, h: 0.35, slant: -0.02, slot: 1 },
      { x: 0.02, y: 0.45, w: 0.47, h: 0.35, slant: -0.02, slot: 2 },
      { x: 0.51, y: 0.45, w: 0.47, h: 0.35, slant: 0.02, slot: 3 },
    ],
  },
  'diagonal-duo': {
    label: 'Diagonal Duo',
    panels: [
      { x: 0.02, y: 0.08, w: 0.47, h: 0.72, slant: 0.06, slot: 0 },
      { x: 0.51, y: 0.08, w: 0.47, h: 0.72, slant: -0.06, slot: 3 },
    ],
  },
  'six-rack': {
    label: 'Six Rack',
    panels: [
      { x: 0.02, y: 0.08, w: 0.31, h: 0.35, slant: 0.02, slot: 0 },
      { x: 0.345, y: 0.08, w: 0.31, h: 0.35, slant: 0.02, slot: 1 },
      { x: 0.67, y: 0.08, w: 0.31, h: 0.35, slant: 0.02, slot: 2 },
      { x: 0.02, y: 0.45, w: 0.31, h: 0.35, slant: -0.02, slot: 3 },
      { x: 0.345, y: 0.45, w: 0.31, h: 0.35, slant: -0.02, slot: 0 },
      { x: 0.67, y: 0.45, w: 0.31, h: 0.35, slant: -0.02, slot: 1 },
    ],
  },
  'full-bleed': {
    label: 'Full Bleed',
    panels: [
      { x: 0.02, y: 0.08, w: 0.96, h: 0.72, slant: 0, slot: 0 },
    ],
  },
};

/**
 * Grades: six moods. A grade re-colours everything at once — the sky
 * behind the panels, the photo tint, the title stripes, the frame and
 * the accent — so the whole poster changes mood instead of just getting
 * a filter on the photos. `quote` is the invented press quote printed
 * across the top of every cover in that grade.
 */
export const GRADES = {
  sunset: {
    label: 'Sunset',
    sky: ['#2b1055', '#ff7e5f', '#feb47b'],
    sun: '#ffd66e',
    silhouette: '#1a0b2e',
    stripes: ['#fff3b0', '#ffb347', '#ff7e5f', '#c94b7c'],
    accent: '#ff9e5e',
    tint: '#ff8c42',
    tintAlpha: 0.1,
    backdrop: 'skyline',
    quote: { text: 'PURE GOLDEN-HOUR MAYHEM', outlet: 'THE PALM POST' },
  },
  neon: {
    label: 'Neon Night',
    sky: ['#0b0620', '#3b0f66', '#0ea5b7'],
    sun: '#ff2e88',
    silhouette: '#05030f',
    stripes: ['#7df9ff', '#00c2ff', '#ff2e88', '#b967ff'],
    accent: '#2de2ff',
    tint: '#7b2fff',
    tintAlpha: 0.14,
    backdrop: 'grid',
    quote: { text: 'THE CITY HAS NEVER LOOKED THIS ALIVE', outlet: 'NEON WEEKLY' },
  },
  gold: {
    label: 'Golden Hour',
    sky: ['#3d2200', '#c97b1e', '#ffd66e'],
    sun: '#fff3b0',
    silhouette: '#241300',
    stripes: ['#fffbe6', '#ffd66e', '#e8a020', '#8a5a00'],
    accent: '#ffc93c',
    tint: '#e8a020',
    tintAlpha: 0.1,
    backdrop: 'dunes',
    quote: { text: 'A SUNSET YOU CAN FRAME', outlet: 'THE COAST GAZETTE' },
  },
  teal: {
    label: 'Tropic Teal',
    sky: ['#02222b', '#0e7c86', '#7fe3c0'],
    sun: '#e8ffb0',
    silhouette: '#01161c',
    stripes: ['#d8fff1', '#5fe8c0', '#0e9aa7', '#ff9e5e'],
    accent: '#4de8c2',
    tint: '#0e9aa7',
    tintAlpha: 0.12,
    backdrop: 'waves',
    quote: { text: 'TROPIC HEAT, BOTTLED', outlet: 'ISLAND REVIEW' },
  },
  heat: {
    label: 'Heatwave',
    sky: ['#2b0202', '#a4133c', '#ff6b35'],
    sun: '#ffe66d',
    silhouette: '#1c0101',
    stripes: ['#fff3b0', '#ff6b35', '#c1121f', '#7f1d1d'],
    accent: '#ff5d3a',
    tint: '#c1121f',
    tintAlpha: 0.12,
    backdrop: 'skyline',
    quote: { text: 'TURN THE HEAT ALL THE WAY UP', outlet: 'THE BREEZE' },
  },
  ultra: {
    label: 'Ultraviolet',
    sky: ['#0d0221', '#5a189a', '#c77dff'],
    sun: '#f0a6ff',
    silhouette: '#080114',
    stripes: ['#f3e8ff', '#c77dff', '#7b2cbf', '#ff70a6'],
    accent: '#c77dff',
    tint: '#7b2cbf',
    tintAlpha: 0.14,
    backdrop: 'grid',
    quote: { text: 'AFTER DARK, EVERYTHING GLOWS', outlet: 'MIDNIGHT HERALD' },
  },
};

/** One-tap looks: a layout, grade and size that go well together. */
export const PRESETS = [
  { label: 'Sunset Poster', layout: 'sunset-mosaic', grade: 'sunset', size: '1920x1080' },
  { label: 'Neon Night', layout: 'hero-pop', grade: 'neon', size: '1080x1350' },
  { label: 'Golden Hour', layout: 'triple-slant', grade: 'gold', size: '1080x1080' },
];

/** The poster's words, editable in the Caption step of the wizard. */
export function defaultWords() {
  return {
    title: 'VICE HEAT',
    script: 'one last summer',
    tagline: 'FOUR FRIENDS · ONE COAST · NO WAY BACK',
    volume: 'VOL. 1',
  };
}
