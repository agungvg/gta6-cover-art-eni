// Vice Heat cover renderer: slanted multi-panel poster, chrome title, cast tags,
// seal and billing block — all drawn on one canvas, offline, no network.
import { GRADES, paintSky, drawPalmPair, finishCover } from './scene.js';

/** Export sizes the app offers. */
export const SIZES = {
  '1920x1080': { w: 1920, h: 1080, label: '1920 × 1080 · wide' },
  '1080x1080': { w: 1080, h: 1080, label: '1080 × 1080 · square' },
  '1080x1350': { w: 1080, h: 1350, label: '1080 × 1350 · portrait' },
};

/**
 * Panel plans. Each panel is a fraction of the canvas: x, y, w, h and a slant
 * (how far the top edge shifts right, in fractions of the width). `photo` is
 * the photo slot it shows. Title placement rides with the layout.
 */
export const LAYOUTS = {
  'vice-grid': {
    label: 'Vice Grid',
    panels: [
      { x: 0.03, y: 0.035, w: 0.55, h: 0.63, slant: 0.025, photo: 0 },
      { x: 0.615, y: 0.035, w: 0.355, h: 0.30, slant: -0.02, photo: 1 },
      { x: 0.615, y: 0.365, w: 0.355, h: 0.30, slant: -0.02, photo: 2 },
    ],
    title: { x: 0.5, y: 0.715, size: 0.115, align: 'center', rotate: -0.035 },
  },
  'hero-pop': {
    label: 'Hero Pop',
    fullBleed: 0,
    panels: [
      { x: 0.60, y: 0.05, w: 0.37, h: 0.30, slant: -0.03, photo: 1 },
      { x: 0.60, y: 0.40, w: 0.37, h: 0.24, slant: -0.03, photo: 2 },
    ],
    title: { x: 0.04, y: 0.60, size: 0.125, align: 'left', rotate: -0.03, maxW: 0.58 },
  },
  'triple-stripe': {
    label: 'Triple Stripe',
    panels: [
      { x: 0.03, y: 0.04, w: 0.30, h: 0.64, slant: 0.03, photo: 0 },
      { x: 0.355, y: 0.04, w: 0.30, h: 0.64, slant: -0.02, photo: 1 },
      { x: 0.68, y: 0.04, w: 0.30, h: 0.64, slant: 0.03, photo: 2 },
    ],
    title: { x: 0.5, y: 0.72, size: 0.115, align: 'center', rotate: -0.035 },
  },
  'duo-split': {
    label: 'Duo Split',
    panels: [
      { x: 0.02, y: 0.04, w: 0.47, h: 0.64, slant: 0.045, photo: 0 },
      { x: 0.51, y: 0.04, w: 0.47, h: 0.64, slant: -0.045, photo: 1 },
    ],
    title: { x: 0.5, y: 0.72, size: 0.115, align: 'center', rotate: -0.035 },
  },
  'solo-frame': {
    label: 'Solo Frame',
    fullBleed: 0,
    panels: [],
    title: { x: 0.5, y: 0.76, size: 0.12, align: 'center', rotate: -0.035 },
  },
  quad: {
    label: 'Quad',
    panels: [
      { x: 0.03, y: 0.035, w: 0.455, h: 0.30, slant: 0.02, photo: 0 },
      { x: 0.515, y: 0.035, w: 0.455, h: 0.30, slant: -0.02, photo: 1 },
      { x: 0.03, y: 0.365, w: 0.455, h: 0.30, slant: -0.02, photo: 2 },
      { x: 0.515, y: 0.365, w: 0.455, h: 0.30, slant: 0.02, photo: 0 },
    ],
    title: { x: 0.5, y: 0.72, size: 0.115, align: 'center', rotate: -0.035 },
  },
  'sunset-strip': {
    label: 'Sunset Strip',
    panels: [
      { x: 0.03, y: 0.035, w: 0.94, h: 0.20, slant: 0.015, photo: 0 },
      { x: 0.03, y: 0.26, w: 0.94, h: 0.20, slant: -0.015, photo: 1 },
      { x: 0.03, y: 0.485, w: 0.94, h: 0.20, slant: 0.015, photo: 2 },
    ],
    title: { x: 0.5, y: 0.735, size: 0.11, align: 'center', rotate: -0.035 },
  },
};

/** Cover-fits an image into a rectangle, honouring its zoom and pan. */
function drawPhotoInto(ctx, img, x, y, w, h, zoom, ox, oy) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const base = Math.max(w / iw, h / ih);
  const dw = iw * base * zoom, dh = ih * base * zoom;
  const maxOx = Math.max(0, (dw - w) / 2), maxOy = Math.max(0, (dh - h) / 2);
  const dx = x + (w - dw) / 2 + Math.max(-maxOx, Math.min(maxOx, ox * w));
  const dy = y + (h - dh) / 2 + Math.max(-maxOy, Math.min(maxOy, oy * h));
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** The slanted panel polygon for a panel plan. */
function panelPath(ctx, p, w, h) {
  const x = p.x * w, y = p.y * h, pw = p.w * w, ph = p.h * h, s = p.slant * w;
  ctx.beginPath();
  ctx.moveTo(x + s, y);
  ctx.lineTo(x + pw + s, y);
  ctx.lineTo(x + pw, y + ph);
  ctx.lineTo(x, y + ph);
  ctx.closePath();
}

/** A photo clipped to one slanted panel, with a white gutter border. */
function drawPanel(ctx, panel, w, h, slot) {
  if (!slot || !slot.img) return;
  const x = panel.x * w, y = panel.y * h, pw = panel.w * w, ph = panel.h * h;
  ctx.save();
  ctx.shadowColor = 'rgba(10, 4, 24, 0.45)';
  ctx.shadowBlur = w * 0.012;
  ctx.shadowOffsetY = h * 0.006;
  panelPath(ctx, panel, w, h);
  ctx.fillStyle = '#160a2e';
  ctx.fill();
  ctx.restore();
  ctx.save();
  panelPath(ctx, panel, w, h);
  ctx.clip();
  drawPhotoInto(ctx, slot.img, x, y, pw, ph, slot.zoom, slot.ox, slot.oy);
  // A faint warm wash so every panel shares the poster's grade.
  const wash = ctx.createLinearGradient(0, y, 0, y + ph);
  wash.addColorStop(0, 'rgba(255, 94, 58, 0.05)');
  wash.addColorStop(1, 'rgba(139, 30, 94, 0.16)');
  ctx.fillStyle = wash;
  ctx.fillRect(x, y, pw, ph);
  ctx.restore();
  ctx.save();
  panelPath(ctx, panel, w, h);
  ctx.strokeStyle = '#fff8f0';
  ctx.lineWidth = Math.max(3, w * 0.005);
  ctx.stroke();
  ctx.restore();
}

/** Renders the chrome title to its own canvas: extrusion, gradient, gloss stripes. */
function renderChromeTitle(text, fontPx, grade, maxW) {
  const g = GRADES[grade] ?? GRADES.sunset;
  let px = fontPx;
  const measure = document.createElement('canvas').getContext('2d');
  const setFont = () => { measure.font = `${px}px Anton, 'Arial Black', sans-serif`; };
  setFont();
  while (measure.measureText(text).width > maxW && px > 24) {
    px -= 4;
    setFont();
  }
  const textW = measure.measureText(text).width;
  const pad = px * 0.35, ext = px * 0.10;
  const cw = Math.ceil(textW + pad * 2 + ext), ch = Math.ceil(px * 1.5 + ext);
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d');
  ctx.translate(pad + ext * 0.4, px * 1.08);
  ctx.transform(1, 0, -0.14, 1, 0, 0); // lean, poster style
  ctx.font = `${px}px Anton, 'Arial Black', sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // 3D extrusion, stacked dark copies down-right.
  ctx.fillStyle = '#1a0b2e';
  for (let i = 7; i >= 1; i--) ctx.fillText(text, i * ext * 0.14, i * ext * 0.14);
  // Gradient fill.
  const grad = ctx.createLinearGradient(0, -px, 0, px * 0.15);
  const stops = g.title;
  grad.addColorStop(0, stops[0]);
  grad.addColorStop(0.45, stops[1]);
  grad.addColorStop(0.75, stops[2]);
  grad.addColorStop(1, stops[3]);
  ctx.fillStyle = grad;
  ctx.fillText(text, 0, 0);
  // Diagonal gloss stripes, clipped to the letters.
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  for (let sx = -textW; sx < textW; sx += px * 0.55) {
    ctx.beginPath();
    ctx.moveTo(sx, -px);
    ctx.lineTo(sx + px * 0.16, -px);
    ctx.lineTo(sx + px * 0.16 - px * 0.5, px * 0.15);
    ctx.lineTo(sx - px * 0.5, px * 0.15);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  // Crisp white outline.
  ctx.strokeStyle = 'rgba(255,248,240,0.95)';
  ctx.lineWidth = Math.max(2, px * 0.02);
  ctx.strokeText(text, 0, 0);
  return { canvas: c, width: cw, height: ch, fontPx: px };
}

/** Circular stamp seal, bottom-right of the poster. */
function drawSeal(ctx, w, h, grade) {
  const cx = w * 0.905, cy = h * 0.885, r = Math.min(w, h) * 0.062;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.18);
  ctx.strokeStyle = '#fff3b0';
  ctx.fillStyle = 'rgba(26, 11, 46, 0.72)';
  ctx.lineWidth = Math.max(2, r * 0.05);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2); ctx.stroke();
  // Arc text around the ring.
  const label = 'VICE HEAT ★ EST 2026 ★ ';
  ctx.fillStyle = '#fff3b0';
  ctx.font = `${r * 0.21}px 'Bebas Neue', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const step = (Math.PI * 2) / label.length;
  for (let i = 0; i < label.length; i++) {
    const a = -Math.PI / 2 + i * step;
    ctx.save();
    ctx.rotate(a);
    ctx.translate(0, -r * 0.89);
    ctx.fillText(label[i], 0, 0);
    ctx.restore();
  }
  // Palm star in the middle.
  ctx.font = `${r * 0.62}px sans-serif`;
  ctx.fillText('★', 0, r * 0.03);
  ctx.restore();
}

/** Small pill tag with a role line, e.g. LUCIA — THE DRIVER. */
function drawTag(ctx, text, cx, y, h) {
  if (!text.trim()) return 0;
  const px = Math.max(14, h * 0.016);
  ctx.font = `${px}px 'Bebas Neue', sans-serif`;
  const tw = ctx.measureText(text.toUpperCase()).width;
  const padX = px * 0.9, padY = px * 0.42;
  const bw = tw + padX * 2, bh = px + padY * 2;
  ctx.save();
  ctx.fillStyle = 'rgba(12, 4, 26, 0.82)';
  ctx.beginPath();
  ctx.roundRect(cx - bw / 2, y - bh / 2, bw, bh, bh / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 243, 176, 0.9)';
  ctx.lineWidth = Math.max(1.5, px * 0.06);
  ctx.stroke();
  ctx.fillStyle = '#fff3b0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.toUpperCase(), cx, y + px * 0.06);
  ctx.restore();
  return bw;
}

/**
 * Draws the whole poster onto `canvas` (sized by the caller) from `state`:
 * photos, title, subtitle, tags, layout, grade.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const grade = GRADES[state.grade] ? state.grade : 'sunset';
  const layout = LAYOUTS[state.layout] ?? LAYOUTS['vice-grid'];

  // Backdrop: procedural sky, or the hero photo full-bleed for pop layouts.
  if (layout.fullBleed !== undefined && state.photos[layout.fullBleed]?.img) {
    const slot = state.photos[layout.fullBleed];
    drawPhotoInto(ctx, slot.img, 0, 0, w, h, slot.zoom, slot.ox, slot.oy);
    const shade = ctx.createLinearGradient(0, h * 0.35, 0, h);
    shade.addColorStop(0, 'rgba(20, 6, 38, 0)');
    shade.addColorStop(1, 'rgba(20, 6, 38, 0.72)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
  } else {
    paintSky(ctx, w, h, grade);
  }

  // Panels (skipping the full-bleed slot when one photo fills every panel).
  const used = new Set();
  layout.panels.forEach((panel, i) => {
    let slotIndex = panel.photo;
    if (state.fillAll) slotIndex = 0;
    const slot = state.photos[slotIndex];
    if (!slot || !slot.img) return;
    const view = { ...slot };
    if (state.fillAll) { // vary the crop per panel so one photo reads as several shots
      view.ox = slot.ox + (i - 1) * 0.18;
      view.oy = slot.oy + (i % 2 === 0 ? -0.08 : 0.10);
      view.zoom = slot.zoom * (1 + i * 0.12);
    }
    used.add(slotIndex);
    drawPanel(ctx, panel, w, h, view);
  });

  // Palms frame the sky in grid layouts.
  if (layout.fullBleed === undefined) drawPalmPair(ctx, w, h, GRADES[grade]);

  // Chrome title.
  const titleText = (state.title || 'VICE HEAT').trim().toUpperCase() || 'VICE HEAT';
  const t = layout.title;
  const maxW = (t.maxW ?? 0.94) * w;
  const title = renderChromeTitle(titleText, t.size * w, grade, maxW);
  const titleX = t.align === 'left' ? t.x * w : t.x * w - title.width / 2;
  const titleY = t.y * h - title.height * 0.42;
  ctx.save();
  ctx.translate(titleX + title.width / 2, titleY + title.height / 2);
  ctx.rotate(t.rotate);
  ctx.drawImage(title.canvas, -title.width / 2, -title.height / 2);
  ctx.restore();

  // Subtitle and cast tags under the title.
  const subY = t.y * h + title.height * 0.52;
  if (state.subtitle?.trim()) {
    ctx.save();
    ctx.font = `${Math.max(16, h * 0.024)}px 'Bebas Neue', sans-serif`;
    ctx.textAlign = t.align === 'left' ? 'left' : 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(10, 4, 24, 0.8)';
    ctx.shadowBlur = h * 0.008;
    const sx = t.align === 'left' ? t.x * w : t.x * w;
    ctx.fillText(state.subtitle.trim().toUpperCase(), sx, subY);
    ctx.restore();
  }
  const tagY = subY + h * 0.038;
  const tags = [state.tag1, state.tag2, state.tag3].filter((s) => s && s.trim());
  if (tags.length) {
    const tagPx = Math.max(14, h * 0.016);
    const widths = tags.map((tag) => {
      ctx.font = `${tagPx}px 'Bebas Neue', sans-serif`;
      return ctx.measureText(tag.toUpperCase()).width + tagPx * 1.8;
    });
    const gap = w * 0.015;
    const total = widths.reduce((a, b) => a + b, 0) + gap * (tags.length - 1);
    // Centres of the tag pills, laid out left to right around the title axis.
    const centres = [];
    let cursor = t.align === 'left' ? t.x * w : t.x * w - total / 2;
    widths.forEach((bw) => {
      centres.push(cursor + bw / 2);
      cursor += bw + gap;
    });
    tags.forEach((tag, i) => drawTag(ctx, tag, centres[i], tagY, h));
  }

  // Seal and billing block.
  drawSeal(ctx, w, h, grade);
  ctx.save();
  ctx.font = `${Math.max(11, h * 0.011)}px 'Bebas Neue', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 248, 240, 0.85)';
  ctx.fillText('A VICE HEAT PRODUCTION  •  STARRING LUCIA & JASON  •  SHOT ON LOCATION IN VICE CITY', w / 2, h * 0.968);
  ctx.restore();

  // Solo-frame white border.
  if (state.layout === 'solo-frame') {
    ctx.save();
    ctx.strokeStyle = '#fff8f0';
    ctx.lineWidth = Math.max(4, w * 0.008);
    ctx.strokeRect(w * 0.022, h * 0.022, w * 0.956, h * 0.93);
    ctx.restore();
  }

  finishCover(ctx, w, h, grade);
}

/** Renders the poster at an export size and returns the canvas. */
export function renderCoverAt(state, sizeKey) {
  const size = SIZES[sizeKey] ?? SIZES['1920x1080'];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, state);
  return canvas;
}
