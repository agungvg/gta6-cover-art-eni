// Vice Heat scene painter: everything behind the photos is drawn in code —
// a Vice City sunset sky, a low sun, a lit skyline and palm silhouettes.
// No Rockstar artwork, no borrowed image: every pixel is procedural.

/** Colour grades the app offers. Each grade tints the sky, the sun and the title. */
export const GRADES = {
  sunset: {
    label: 'Sunset',
    skyTop: '#2b0f45', skyMid: '#8b1e5e', skyLow: '#ff5e3a', horizon: '#ffb347',
    sun: '#ffd166', sunGlow: 'rgba(255, 150, 60, 0.55)',
    skyline: '#1c0b33', skylineFar: '#3a1560', windows: '#ffd166',
    palm: '#160a2e', title: ['#fff3b0', '#ffb347', '#ff5e7a', '#ff2e88'],
    tint: 'rgba(255, 94, 58, 0.10)', tintLow: 'rgba(139, 30, 94, 0.22)',
  },
  neon: {
    label: 'Neon Night',
    skyTop: '#070a2e', skyMid: '#3b0f6e', skyLow: '#c724b1', horizon: '#ff5ea8',
    sun: '#7df9ff', sunGlow: 'rgba(0, 229, 255, 0.45)',
    skyline: '#0a0626', skylineFar: '#241055', windows: '#7df9ff',
    palm: '#08041f', title: ['#d8fbff', '#7df9ff', '#c724b1', '#ff2e88'],
    tint: 'rgba(0, 229, 255, 0.08)', tintLow: 'rgba(199, 36, 177, 0.20)',
  },
  dawn: {
    label: 'Teal Dawn',
    skyTop: '#0b2b3a', skyMid: '#0f766e', skyLow: '#f4a261', horizon: '#ffd166',
    sun: '#fff3b0', sunGlow: 'rgba(255, 209, 102, 0.5)',
    skyline: '#0a1f2b', skylineFar: '#14424f', windows: '#ffe8a3',
    palm: '#071a24', title: ['#ffffff', '#ffd166', '#2ec4b6', '#0f766e'],
    tint: 'rgba(46, 196, 182, 0.08)', tintLow: 'rgba(11, 43, 58, 0.20)',
  },
  miami: {
    label: 'Miami Vice',
    skyTop: '#12082e', skyMid: '#5b2a86', skyLow: '#ff7ab8', horizon: '#7df9ff',
    sun: '#ff5ea8', sunGlow: 'rgba(255, 94, 168, 0.5)',
    skyline: '#150a33', skylineFar: '#3a1560', windows: '#7df9ff',
    palm: '#0d0524', title: ['#ffffff', '#7df9ff', '#ff7ab8', '#c724b1'],
    tint: 'rgba(255, 122, 184, 0.08)', tintLow: 'rgba(91, 42, 134, 0.22)',
  },
  gold: {
    label: 'Golden Hour',
    skyTop: '#3a1c07', skyMid: '#b45309', skyLow: '#f59e0b', horizon: '#fde68a',
    sun: '#fff7cc', sunGlow: 'rgba(253, 230, 138, 0.55)',
    skyline: '#2b1503', skylineFar: '#5c2e0a', windows: '#fff7cc',
    palm: '#1c0d02', title: ['#fffbe6', '#fde68a', '#f59e0b', '#b45309'],
    tint: 'rgba(245, 158, 11, 0.08)', tintLow: 'rgba(58, 28, 7, 0.22)',
  },
  violet: {
    label: 'Violet Haze',
    skyTop: '#0d0524', skyMid: '#4c1d95', skyLow: '#a855f7', horizon: '#f0abfc',
    sun: '#e9d5ff', sunGlow: 'rgba(168, 85, 247, 0.5)',
    skyline: '#12082e', skylineFar: '#2e1065', windows: '#f0abfc',
    palm: '#0a0318', title: ['#ffffff', '#f0abfc', '#a855f7', '#6d28d9'],
    tint: 'rgba(168, 85, 247, 0.08)', tintLow: 'rgba(13, 5, 36, 0.22)',
  },
};

/** Small deterministic PRNG so the skyline and grain look the same on every run. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Paints the full-bleed sky: vertical gradient, striped sun, soft clouds, skyline, palms. */
export function paintSky(ctx, w, h, grade) {
  const g = GRADES[grade] ?? GRADES.sunset;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, g.skyTop);
  sky.addColorStop(0.45, g.skyMid);
  sky.addColorStop(0.72, g.skyLow);
  sky.addColorStop(1, g.horizon);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Low sun with horizontal slats, retro-poster style.
  const sunX = w * 0.68, sunY = h * 0.52, sunR = Math.min(w, h) * 0.17;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 2.4);
  glow.addColorStop(0, g.sunGlow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - sunR * 2.4, sunY - sunR * 2.4, sunR * 4.8, sunR * 4.8);
  ctx.save();
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = g.sun;
  ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
  ctx.fillStyle = g.skyLow;
  let stripeY = sunY + sunR * 0.05;
  let stripeH = sunR * 0.045;
  while (stripeY < sunY + sunR) {
    ctx.fillRect(sunX - sunR, stripeY, sunR * 2, stripeH);
    stripeY += stripeH * 2.4;
    stripeH *= 1.35;
  }
  ctx.restore();

  // Soft clouds: flat blurred ellipses drifting across the sky.
  const rand = mulberry32(20261120);
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 9; i++) {
    const cx = rand() * w, cy = h * (0.08 + rand() * 0.35), cw = w * (0.10 + rand() * 0.16);
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, cw * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  drawSkyline(ctx, w, h, g, 0.62, g.skylineFar, false);
  drawSkyline(ctx, w, h, g, 0.70, g.skyline, true);
}

/** A row of flat towers with lit windows along the horizon. */
export function drawSkyline(ctx, w, h, grade, baseY, color, lit) {
  const rand = mulberry32(Math.floor(baseY * 1000) + 7);
  const base = h * baseY;
  let x = -w * 0.02;
  ctx.fillStyle = color;
  while (x < w * 1.02) {
    const bw = w * (0.04 + rand() * 0.07);
    const bh = h * (0.05 + rand() * 0.13);
    ctx.fillRect(x, base - bh, bw, bh + h * 0.02);
    if (rand() > 0.6) { // antenna on some towers
      ctx.fillRect(x + bw * 0.45, base - bh - h * 0.05, bw * 0.08, h * 0.05);
    }
    if (lit) {
      ctx.fillStyle = grade.windows;
      const cols = Math.max(2, Math.floor(bw / (w * 0.012)));
      const rows = Math.max(2, Math.floor(bh / (h * 0.02)));
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (rand() > 0.55) {
            ctx.fillRect(x + bw * 0.12 + c * (bw * 0.76 / cols), base - bh + h * 0.015 + r * (bh * 0.85 / rows), w * 0.005, h * 0.008);
          }
        }
      }
      ctx.fillStyle = color;
    }
    x += bw + w * (0.005 + rand() * 0.02);
  }
  // Sea / street band under the towers.
  ctx.fillStyle = color;
  ctx.fillRect(0, base, w, h - base);
}

/** One palm silhouette: a leaning trunk and seven arcing fronds. */
export function drawPalm(ctx, x, y, s, lean, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  // Trunk: a tapering curve.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(s * 0.06, -s * 0.5, s * 0.02, -s * 0.95);
  ctx.lineWidth = s * 0.045;
  ctx.stroke();
  // Fronds fan out from the crown.
  const crownX = s * 0.02, crownY = -s * 0.95;
  for (let i = 0; i < 7; i++) {
    const a = (-Math.PI * 0.92) + (i * Math.PI * 0.30);
    const len = s * (0.42 + (i % 2) * 0.08);
    const tipX = crownX + Math.cos(a) * len;
    const tipY = crownY + Math.sin(a) * len * 0.55 + s * 0.22;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(
      crownX + Math.cos(a) * len * 0.55, crownY + Math.sin(a) * len * 0.28,
      tipX, tipY,
    );
    ctx.lineWidth = s * 0.035;
    ctx.stroke();
  }
  // Coconuts.
  ctx.beginPath(); ctx.arc(crownX - s * 0.03, crownY + s * 0.04, s * 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(crownX + s * 0.04, crownY + s * 0.05, s * 0.03, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** A pair of palms framing a corner of the poster. */
export function drawPalmPair(ctx, w, h, grade) {
  drawPalm(ctx, w * 0.015, h * 0.99, h * 0.30, 0.10, grade.palm);
  drawPalm(ctx, w * 0.985, h * 0.99, h * 0.26, -0.12, grade.palm);
}

/** Warm grade wash + vignette + a whisper of film grain over the finished cover. */
export function finishCover(ctx, w, h, grade) {
  const g = GRADES[grade] ?? GRADES.sunset;
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, g.tint);
  wash.addColorStop(1, g.tintLow);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(10, 4, 24, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  const rand = mulberry32(99);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  const dots = Math.floor((w * h) / 9000);
  for (let i = 0; i < dots; i++) {
    ctx.fillRect(rand() * w, rand() * h, 1.5, 1.5);
  }
  ctx.restore();
}
