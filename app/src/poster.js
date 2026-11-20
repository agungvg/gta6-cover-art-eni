// Vice Heat — the poster renderer: one draw function feeds the live
// preview and the PNG export, so what you see is exactly what you save.
//
// A poster is: a procedural backdrop (sky, sun, skyline), slanted photo
// panels with focus-aware crops, one huge striped-chrome title with a
// script subtitle, and the full poster furniture — press quote, volume
// badge, tagline strip, COMING SOON, billing block, barcode, starburst
// seal and a role tag on every panel.
import { LAYOUTS, GRADES, SIZES, CAST } from './data.js';

/** Deterministic random, so preview and export grain match pixel for pixel. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Cover-fit source window for a photo in a panel, keeping the face
 * (focus, in photo fractions) inside the frame. `zoom` magnifies around
 * the focus; `ox`/`oy` pan the window in fractions of the panel.
 */
export function coverWindow(img, panelW, panelH, focus, zoom, ox, oy) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const panelAspect = panelW / panelH;
  const photoAspect = iw / ih;
  let sw; let sh;
  if (photoAspect > panelAspect) { sh = ih; sw = ih * panelAspect; }
  else { sw = iw; sh = iw / panelAspect; }
  sw /= Math.max(1, zoom); sh /= Math.max(1, zoom);
  // Centre the window on the focus where the photo allows it.
  let sx = focus.x * iw - sw / 2;
  let sy = focus.y * ih - sh / 2;
  sx = Math.max(0, Math.min(iw - sw, sx));
  sy = Math.max(0, Math.min(ih - sh, sy));
  // The user's pan slides the window, clamped to the photo.
  sx = Math.max(0, Math.min(iw - sw, sx - ox * sw));
  sy = Math.max(0, Math.min(ih - sh, sy - oy * sh));
  return { sx, sy, sw, sh };
}

/** The four corners of a slanted panel, in poster pixels. */
function panelCorners(p, w, h) {
  const x = p.x * w; const y = p.y * h; const pw = p.w * w; const ph = p.h * h;
  const s = p.slant * w;
  return [
    [x + s, y], [x + pw + s, y],
    [x + pw, y + ph], [x, y + ph],
  ];
}

function tracePath(ctx, corners) {
  ctx.beginPath();
  ctx.moveTo(corners[0][0], corners[0][1]);
  for (let i = 1; i < corners.length; i++) ctx.lineTo(corners[i][0], corners[i][1]);
  ctx.closePath();
}

/** Sky gradient + sun + the grade's silhouette (skyline, grid or palms). */
function drawBackdrop(ctx, w, h, grade, look) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const sunR = w * 0.09;
  const sunX = w * 0.72; const sunY = h * 0.3;
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 3);
  glow.addColorStop(0, grade.sun);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.35 + look.glow * 0.4;
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - sunR * 3, sunY - sunR * 3, sunR * 6, sunR * 6);
  ctx.globalAlpha = 1;
  ctx.fillStyle = grade.sun;
  ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = grade.silhouette;
  if (grade.backdrop === 'skyline') {
    // A jagged city skyline along the bottom third.
    const rand = rng(7);
    let x = 0;
    ctx.beginPath(); ctx.moveTo(0, h);
    while (x < w) {
      const bw = w * (0.05 + rand() * 0.07);
      const bh = h * (0.12 + rand() * 0.22);
      ctx.lineTo(x, h - bh); ctx.lineTo(x + bw, h - bh); ctx.lineTo(x + bw, h);
      x += bw;
    }
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
  } else if (grade.backdrop === 'grid') {
    // A retro perspective grid floor.
    ctx.strokeStyle = grade.accent; ctx.globalAlpha = 0.25; ctx.lineWidth = Math.max(1, w * 0.001);
    const horizon = h * 0.62;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(w / 2, horizon); ctx.lineTo((i / 10) * w * 2 - w / 2, h); ctx.stroke();
    }
    for (let i = 0; i < 6; i++) {
      const y = horizon + (h - horizon) * (i / 6) ** 2;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (grade.backdrop === 'dunes') {
    // Rolling dune silhouettes along the bottom.
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.9);
    ctx.quadraticCurveTo(w * 0.3, h * 0.78, w * 0.55, h * 0.88);
    ctx.quadraticCurveTo(w * 0.8, h * 0.97, w, h * 0.86);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.95);
    ctx.quadraticCurveTo(w * 0.35, h * 0.86, w * 0.7, h * 0.94);
    ctx.quadraticCurveTo(w * 0.9, h * 0.98, w, h * 0.93);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    // Wave lines across the bottom third.
    ctx.strokeStyle = grade.accent;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(1, w * 0.002);
    for (let i = 0; i < 3; i++) {
      const y = h * (0.82 + i * 0.05);
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += w / 16) {
        ctx.lineTo(x, y + Math.sin((x / w) * Math.PI * 4 + i) * h * 0.012);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

/** One photo panel: clipped photo, grade tint, border, slanted role tag. */
function drawPanel(ctx, w, h, panel, photo, grade, look) {
  const corners = panelCorners(panel, w, h);
  const px = panel.x * w; const py = panel.y * h; const pw = panel.w * w; const ph = panel.h * h;
  ctx.save();
  tracePath(ctx, corners);
  ctx.clip();
  if (photo.img) {
    const cast = CAST[photo.sample] ?? CAST[0];
    const win = coverWindow(photo.img, pw, ph, cast.focus, photo.zoom, photo.ox, photo.oy);
    const cx = px + pw / 2; const cy = py + ph / 2;
    ctx.save();
    ctx.translate(cx, cy);
    if (photo.flip) ctx.scale(-1, 1);
    ctx.filter = `saturate(${0.7 + look.paint * 0.9}) contrast(${0.95 + look.paint * 0.15})`;
    ctx.drawImage(photo.img, win.sx, win.sy, win.sw, win.sh, -pw / 2, -ph / 2, pw, ph);
    ctx.restore();
    ctx.filter = 'none';
    // Grade tint over the photo.
    ctx.globalAlpha = grade.tintAlpha * (0.4 + look.gradeAmt * 0.6);
    ctx.fillStyle = grade.tint;
    ctx.fillRect(px - pw * 0.1, py - ph * 0.1, pw * 1.2, ph * 1.2);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = '#241a2e';
    ctx.fillRect(px, py, pw, ph);
  }
  // Inner shade so the panel reads as a printed photo.
  const shade = ctx.createLinearGradient(px, py, px, py + ph);
  shade.addColorStop(0, 'rgba(255,255,255,0.10)');
  shade.addColorStop(0.25, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = shade;
  ctx.fillRect(px - pw * 0.1, py - ph * 0.1, pw * 1.2, ph * 1.2);
  ctx.restore();

  // White panel border.
  ctx.save();
  tracePath(ctx, corners);
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(2, w * 0.003);
  ctx.stroke();
  ctx.restore();

  // Slanted role tag on the photo, top-left of the panel. The editor's
  // Name tag field overrides the cast role for this slot.
  const cast = CAST[photo.sample] ?? CAST[0];
  const role = (photo.tag && photo.tag.trim()) || cast.role;
  const tagH = Math.max(18, h * 0.032);
  ctx.save();
  ctx.font = `700 ${tagH * 0.62}px "Bebas Neue", sans-serif`;
  const textW = ctx.measureText(role).width;
  const pad = tagH * 0.55;
  const tx = px + panel.slant * w * 0.4 + w * 0.012;
  const ty = py + h * 0.02;
  ctx.translate(tx, ty);
  ctx.rotate(-0.06);
  ctx.fillStyle = 'rgba(10,5,18,0.88)';
  ctx.fillRect(0, 0, textW + pad * 2, tagH);
  ctx.strokeStyle = grade.accent; ctx.lineWidth = Math.max(1, w * 0.0012);
  ctx.strokeRect(0, 0, textW + pad * 2, tagH);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(role, pad, tagH / 2 + 1);
  ctx.restore();
}

/** The huge chrome title: striped gradient fill, thick outline, shadow. */
function drawTitle(ctx, w, h, words, grade, look) {
  const cx = w / 2;
  const baseY = h * 0.66;
  let size = w * 0.115;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fit = (s) => {
    ctx.font = `${s}px Anton, sans-serif`;
    return ctx.measureText(words.title).width;
  };
  while (size > w * 0.04 && fit(size) > w * 0.96) size *= 0.94;
  ctx.font = `${size}px Anton, sans-serif`;
  const stripes = ctx.createLinearGradient(0, baseY - size * 0.5, 0, baseY + size * 0.5);
  grade.stripes.forEach((c, i) => stripes.addColorStop(i / (grade.stripes.length - 1), c));
  ctx.save();
  ctx.shadowColor = `rgba(0,0,0,${0.45 + look.glow * 0.3})`;
  ctx.shadowBlur = w * 0.02 * (0.5 + look.glow);
  ctx.shadowOffsetY = h * 0.008;
  ctx.lineWidth = Math.max(3, size * 0.07);
  ctx.strokeStyle = '#12081f';
  ctx.lineJoin = 'round';
  ctx.strokeText(words.title, cx, baseY);
  ctx.fillStyle = stripes;
  ctx.fillText(words.title, cx, baseY);
  ctx.restore();

  // Script subtitle overlapping the block title, second typeface.
  const scriptSize = size * 0.34;
  ctx.save();
  ctx.translate(cx, baseY + size * 0.52);
  ctx.rotate(-0.03);
  ctx.font = `${scriptSize}px Pacifico, cursive`;
  ctx.shadowColor = grade.accent;
  ctx.shadowBlur = w * 0.012 * (0.5 + look.glow);
  ctx.fillStyle = '#fff';
  ctx.fillText(words.script, 0, 0);
  ctx.restore();
}

/** Procedural barcode: varying bar widths with digits below. */
function drawBarcode(ctx, x, y, bw, bh, seed) {
  const rand = rng(seed);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 4, y - 4, bw + 8, bh + 22);
  ctx.fillStyle = '#111';
  let cx = x;
  while (cx < x + bw - 3) {
    const wBar = 1 + Math.floor(rand() * 4);
    if (rand() > 0.45) ctx.fillRect(cx, y, wBar, bh);
    cx += wBar + 1 + Math.floor(rand() * 2);
  }
  ctx.font = `${Math.max(9, bh * 0.28)}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('8 901234 567890', x + bw / 2, y + bh + 15);
  ctx.textAlign = 'left';
}

/** Gold starburst seal reading ORIGINAL COVER ART. */
function drawSeal(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  const points = 16;
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.78;
    const px = Math.cos(a) * rad; const py = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#f5b90d';
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = r * 0.2; ctx.shadowOffsetY = r * 0.06;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = '#8a5a00'; ctx.lineWidth = Math.max(1, r * 0.04); ctx.stroke();
  ctx.fillStyle = '#3d2200';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${r * 0.26}px "Bebas Neue", sans-serif`;
  ctx.fillText('★ ORIGINAL ★', 0, -r * 0.22);
  ctx.fillText('COVER ART', 0, r * 0.14);
  ctx.font = `${r * 0.2}px "Bebas Neue", sans-serif`;
  ctx.fillText('EST. 2026', 0, r * 0.44);
  ctx.restore();
}

/** Everything that makes the poster read as a real movie poster. */
function drawFurniture(ctx, w, h, grade, words, look) {
  const margin = w * 0.02;
  ctx.textBaseline = 'middle';

  // Press quote with a named outlet, across the top.
  ctx.save();
  ctx.font = `${Math.max(13, h * 0.024)}px "Bebas Neue", sans-serif`;
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 6;
  ctx.textAlign = 'center';
  const quote = `★★★★★  “${grade.quote.text}”  — ${grade.quote.outlet}`;
  ctx.fillText(quote, w / 2, h * 0.038);
  ctx.restore();

  // Volume badge, top right.
  ctx.save();
  ctx.font = `700 ${Math.max(12, h * 0.02)}px "Bebas Neue", sans-serif`;
  const volW = ctx.measureText(words.volume).width + w * 0.02;
  const volH = h * 0.032;
  ctx.fillStyle = 'rgba(10,5,18,0.85)';
  ctx.strokeStyle = grade.accent; ctx.lineWidth = Math.max(1, w * 0.0012);
  const vx = w - margin - volW; const vy = h * 0.062;
  ctx.fillRect(vx, vy, volW, volH);
  ctx.strokeRect(vx, vy, volW, volH);
  ctx.fillStyle = grade.accent;
  ctx.textAlign = 'center';
  ctx.fillText(words.volume, vx + volW / 2, vy + volH / 2 + 1);
  ctx.restore();

  // Tagline strip across the middle, between two small triangles.
  ctx.save();
  const stripY = h * 0.815;
  ctx.font = `${Math.max(13, h * 0.024)}px "Bebas Neue", sans-serif`;
  ctx.textAlign = 'center';
  const tw = ctx.measureText(words.tagline).width;
  ctx.fillStyle = 'rgba(10,5,18,0.72)';
  ctx.fillRect(w / 2 - tw / 2 - w * 0.03, stripY - h * 0.02, tw + w * 0.06, h * 0.04);
  ctx.fillStyle = grade.accent;
  const tri = h * 0.012;
  ctx.beginPath();
  ctx.moveTo(w / 2 - tw / 2 - w * 0.02, stripY); ctx.lineTo(w / 2 - tw / 2 - w * 0.02 - tri, stripY - tri); ctx.lineTo(w / 2 - tw / 2 - w * 0.02 - tri, stripY + tri); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w / 2 + tw / 2 + w * 0.02, stripY); ctx.lineTo(w / 2 + tw / 2 + w * 0.02 + tri, stripY - tri); ctx.lineTo(w / 2 + tw / 2 + w * 0.02 + tri, stripY + tri); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(words.tagline, w / 2, stripY + 1);
  ctx.restore();

  // A dark band behind the bottom furniture so it reads on light grades.
  ctx.save();
  ctx.fillStyle = 'rgba(10,5,18,0.4)';
  ctx.fillRect(0, h * 0.875, w, h * 0.125);
  ctx.restore();

  // COMING SOON, bottom left, in the grade's accent with a soft glow.
  ctx.save();
  ctx.font = `700 ${Math.max(15, h * 0.03)}px "Bebas Neue", sans-serif`;
  ctx.fillStyle = grade.accent;
  ctx.shadowColor = grade.accent;
  ctx.shadowBlur = w * 0.012 * (0.5 + look.glow);
  ctx.textAlign = 'left';
  ctx.fillText('C O M I N G   S O O N', margin, h * 0.925);
  ctx.restore();

  // Billing block, bottom centre, two lines.
  ctx.save();
  ctx.font = `${Math.max(10, h * 0.016)}px "Bebas Neue", sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.textAlign = 'center';
  ctx.fillText('A PALM REEL PICTURES PRODUCTION  ·  STARRING YOU', w / 2, h * 0.915);
  ctx.fillText('SHOT ON YOUR OWN CAMERA  ·  GRADED BY HAND', w / 2, h * 0.94);
  ctx.restore();

  // Barcode, bottom right.
  drawBarcode(ctx, w - margin - w * 0.09, h * 0.885, w * 0.09, h * 0.045, 99);

  // Gold starburst seal over the hero panel's corner.
  drawSeal(ctx, w * 0.9, h * 0.15, Math.max(34, w * 0.045));

  // Frames: a thin bright frame inside a dark outer frame.
  ctx.save();
  ctx.strokeStyle = 'rgba(8,4,14,0.9)';
  ctx.lineWidth = Math.max(6, w * 0.008);
  ctx.strokeRect(0, 0, w, h);
  ctx.strokeStyle = grade.accent;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = Math.max(2, w * 0.002);
  ctx.strokeRect(w * 0.008, h * 0.008, w * 0.984, h * 0.984);
  ctx.restore();
}

/** Halftone dots + grain over the finished poster, from the Look sliders. */
function drawLook(ctx, w, h, look, seed) {
  if (look.halftone > 0.02) {
    const gap = Math.max(5, w * 0.006);
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${0.16 * look.halftone})`;
    for (let y = gap / 2; y < h; y += gap) {
      for (let x = gap / 2; x < w; x += gap) {
        ctx.beginPath(); ctx.arc(x, y, gap * 0.18 * look.halftone + 0.4, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
  if (look.grain > 0.02) {
    const rand = rng(seed);
    const count = Math.floor(look.grain * 2600);
    ctx.save();
    for (let i = 0; i < count; i++) {
      const v = rand();
      ctx.fillStyle = v > 0.5 ? `rgba(255,255,255,${0.12 * look.grain})` : `rgba(0,0,0,${0.14 * look.grain})`;
      ctx.fillRect(rand() * w, rand() * h, 1.4, 1.4);
    }
    ctx.restore();
  }
}

/**
 * Draw the whole poster onto `canvas` from `state`.
 * state: { words, layout, grade, size, photos, fillAll, look }
 * photos[i]: { img, sample, zoom, ox, oy, flip }
 */
export function drawPoster(canvas, state) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS['sunset-mosaic'];
  const ctx = canvas.getContext('2d');
  const w = canvas.width; const h = canvas.height;
  const look = state.look ?? { paint: 0.5, gradeAmt: 0.6, halftone: 0.3, grain: 0.3, glow: 0.6 };

  drawBackdrop(ctx, w, h, grade, look);
  layout.panels.forEach((panel) => {
    const slot = state.fillAll ? 0 : panel.slot;
    drawPanel(ctx, w, h, panel, state.photos[slot], grade, look);
  });
  drawTitle(ctx, w, h, state.words, grade, look);
  drawFurniture(ctx, w, h, grade, state.words, look);
  const seed = [...state.layout, ...state.grade, ...state.size].reduce((a, c) => a + c.charCodeAt(0), 0);
  drawLook(ctx, w, h, look, seed);
}

/** Render the poster at an export size on a fresh offscreen canvas. */
export function renderPosterAt(state, sizeKey) {
  const size = SIZES[sizeKey] ?? SIZES['1920x1080'];
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawPoster(canvas, state);
  return canvas;
}
