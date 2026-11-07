// Tot Routines: the photo at the top of a child's page, cut out from its background on this phone (the photo
// never leaves it to be cut out), with Google's MediaPipe. Its engine and two models (put in vendor/mediapipe by
// prepare.js) are loaded the first time a photo is cut out, not before. Where it can't run, or finds nobody,
// the photo is kept in a circle. In the app the page is a file://, which can't fetch its own files:
// MainActivity serves them from CUTOUT_APP.
//
// Two models, each doing what it's good at (together about 6.5 MB):
// 1. a person model (the one behind video calls' blurred backgrounds) finds where the child is: roughly, but
//    it knows a person from a teddy bear;
// 2. Magic Touch, the model behind tapping to select something in a photo, is pointed at the child (a stroke
//    down the middle of them, as if a finger had drawn it) and draws their edge, crisply, at 512 pixels;
// then only what both agree on is kept, scraps that aren't joined to the child are dropped, and along the edge
// the old background's color is taken out of each pixel, so no green or grey rim is left.
const CUTOUT_APP = 'https://appassets.androidplatform.net/assets/vendor/mediapipe/';
const CUTOUT_SIDE = 720; // the kept picture's longest side, in pixels
const CUTOUT_WORK = 1280; // the photo's longest side while it's worked on
let cutoutModels = null;
async function cutoutReady() {
  if (cutoutModels) return cutoutModels;
  if (!window.Vision) await loadScripts(['vendor/mediapipe/vision_bundle.js']);
  const base = window.Android ? CUTOUT_APP : new URL('vendor/mediapipe/', location.href).href;
  const fileset = { wasmLoaderPath: base + 'vision_wasm_internal.js', wasmBinaryPath: base + 'vision_wasm_internal.wasm' };
  const [person, edge] = await Promise.all([
    Vision.ImageSegmenter.createFromOptions(fileset, { baseOptions: { modelAssetPath: base + 'selfie_segmenter.tflite', delegate: 'CPU' }, runningMode: 'IMAGE', outputConfidenceMasks: true, outputCategoryMask: false }),
    Vision.InteractiveSegmenterLegacy.createFromOptions(fileset, { baseOptions: { modelAssetPath: base + 'magic_touch.tflite', delegate: 'CPU' }, outputConfidenceMasks: true, outputCategoryMask: false }),
  ]);
  cutoutModels = { person, edge };
  return cutoutModels;
}

// The mask in a result as a plain array (copied: the result's own goes when it's closed), and its size.
function takeMask(r, i = 0) {
  const m = r.confidenceMasks[i], out = { f: Float32Array.from(m.getAsFloat32Array()), w: m.width, h: m.height };
  r.confidenceMasks.forEach(x => x.close());
  return out;
}

// How sure the person model is that each pixel of `canvas` is a person, 0 to 1, at the canvas's size.
function findPerson(model, canvas) {
  const m = takeMask(model.segment(canvas));
  return m.w === canvas.width && m.h === canvas.height ? m.f : resample(m.f, m.w, m.h, canvas.width, canvas.height);
}

// The box around where `p` is over `at`, in a w × h grid, and how many pixels that is.
function maskBox(p, w, h, at = 0.5) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (p[y * w + x] < at) continue;
    n++;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return n ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, n } : null;
}

// A stroke down the middle of the person: at a fifth, half and four fifths of the way down the part the model
// is surest of, the middle of the widest stretch of them on that row. In 0–1 of the w × h grid.
function strokeThrough(p, w, h) {
  const box = maskBox(p, w, h, 0.9) || maskBox(p, w, h, 0.5), pts = [];
  for (const fy of [0.2, 0.5, 0.8]) {
    const y = Math.round(box.y + (box.h - 1) * fy);
    let best = 0, mid = 0, run = 0;
    for (let x = box.x; x <= box.x + box.w; x++) {
      if (x < box.x + box.w && p[y * w + x] > 0.5) { run++; continue; }
      if (run > best) { best = run; mid = x - run / 2; }
      run = 0;
    }
    if (best) pts.push({ x: mid / w, y: (y + 0.5) / h });
  }
  return pts;
}

// The mean of each pixel's (2r+1) × (2r+1) neighborhood, fewer at the edges.
function boxMean(src, w, h, r) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let s = 0;
    for (let x = 0; x <= Math.min(r, w - 1); x++) s += src[row + x];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = s / (Math.min(w - 1, x + r) - Math.max(0, x - r) + 1);
      if (x + r + 1 < w) s += src[row + x + r + 1];
      if (x - r >= 0) s -= src[row + x - r];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = 0; y <= Math.min(r, h - 1); y++) s += tmp[y * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / (Math.min(h - 1, y + r) - Math.max(0, y - r) + 1);
      if (y + r + 1 < h) s += tmp[(y + r + 1) * w + x];
      if (y - r >= 0) s -= tmp[(y - r) * w + x];
    }
  }
  return out;
}

// A w × h grid made W × H, each value from its four nearest.
function resample(src, w, h, W, H) {
  const out = new Float32Array(W * H), sx = w / W, sy = h / H;
  for (let Y = 0; Y < H; Y++) {
    const fy = Math.min(h - 1, Math.max(0, (Y + 0.5) * sy - 0.5)), y0 = Math.floor(fy), y1 = Math.min(h - 1, y0 + 1), ty = fy - y0;
    for (let X = 0; X < W; X++) {
      const fx = Math.min(w - 1, Math.max(0, (X + 0.5) * sx - 0.5)), x0 = Math.floor(fx), x1 = Math.min(w - 1, x0 + 1), tx = fx - x0;
      const a = src[y0 * w + x0] + (src[y0 * w + x1] - src[y0 * w + x0]) * tx, b = src[y1 * w + x0] + (src[y1 * w + x1] - src[y1 * w + x0]) * tx;
      out[Y * W + X] = a + (b - a) * ty;
    }
  }
  return out;
}

// Drops what isn't joined to the child: of the parts where a is over a half, only the biggest is kept, and any
// at least a fifth its size (another child). What's dropped goes with its soft edge.
function keepJoined(a, w, h) {
  const label = new Int32Array(w * h), sizes = [0], stack = [];
  for (let i = 0; i < w * h; i++) {
    if (label[i] || a[i] < 0.5) continue;
    const id = sizes.length;
    let n = 0;
    label[i] = id;
    stack.push(i);
    while (stack.length) {
      const j = stack.pop(), x = j % w;
      n++;
      for (const k of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, j - w, j + w]) {
        if (k >= 0 && k < w * h && !label[k] && a[k] >= 0.5) { label[k] = id; stack.push(k); }
      }
    }
    sizes.push(n);
  }
  const big = Math.max(...sizes), kept = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) kept[i] = label[i] && sizes[label[i]] >= big * 0.2 ? 1 : 0;
  const reach = boxMean(kept, w, h, Math.max(2, Math.round(Math.max(w, h) / 150)));
  for (let i = 0; i < w * h; i++) if (!reach[i]) a[i] = 0;
}

const pngOrWebp = c => new Promise((ok, bad) => c.toBlob(b => b && b.type === 'image/webp' ? ok(b)
  : c.toBlob(p => p ? ok(p) : bad(new Error("The picture couldn't be made.")), 'image/png'), 'image/webp', 0.88));

// The child alone, as {canvas, a}: the photo cropped to around them, and how much of each of its pixels is
// them (0 to 1). null if nobody's found, or the models can't run.
async function cutChild(src) {
  const W = src.width, H = src.height, { person, edge } = await cutoutReady();
  const p = findPerson(person, src), found = maskBox(p, W, H);
  // A person in under 2% of the photo is a speck, or a mistake.
  if (!found || found.n < W * H * 0.02) return null;
  // Close up: a square around them with room to spare, which is what Magic Touch sees.
  const pad = Math.round(Math.max(found.w, found.h) * 0.12), side = Math.max(found.w, found.h) + 2 * pad;
  const x0 = Math.max(0, Math.round(found.x + found.w / 2 - side / 2)), y0 = Math.max(0, Math.round(found.y + found.h / 2 - side / 2));
  const cw = Math.min(W, x0 + side) - x0, ch = Math.min(H, y0 + side) - y0;
  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  c.getContext('2d').drawImage(src, x0, y0, cw, ch, 0, 0, cw, ch);
  const pc = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) pc.set(p.subarray((y0 + y) * W + x0, (y0 + y) * W + x0 + cw), y * cw);
  const stroke = strokeThrough(pc, cw, ch);
  const m = takeMask(edge.segment(c, stroke.length > 1 ? { scribble: stroke } : { keypoint: stroke[0] }));
  const a = m.w === cw && m.h === ch ? m.f : resample(m.f, m.w, m.h, cw, ch);
  // Only what's near where the person model sees a person: Magic Touch, pointed at a child holding a teddy, may
  // take the teddy too, or the shadow at their feet.
  const near = boxMean(pc.map(v => v > 0.5 ? 1 : 0), cw, ch, Math.max(2, Math.round(Math.max(cw, ch) * 0.03)));
  let both = 0, either = 0;
  for (let i = 0; i < a.length; i++) {
    const inA = a[i] > 0.5, inP = pc[i] > 0.5;
    both += inA && inP; either += inA || inP;
    a[i] = Math.min(1, Math.max(0, a[i])) * Math.min(1, near[i] * 4);
  }
  // Where the two disagree on what the child is, Magic Touch took something else: the person model's own edge.
  if (both < either * 0.6) for (let i = 0; i < a.length; i++) { const t = Math.min(1, Math.max(0, (pc[i] - 0.25) / 0.5)); a[i] = t * t * (3 - 2 * t); }
  keepJoined(a, cw, ch);
  return { canvas: c, a };
}

// Along the edge, the old background's color (the mean of what's around, counting only the background) taken
// out of each pixel, so what's left is the child's own; and the picture's alpha set from `a`.
function clearEdge(canvas, a) {
  const w = canvas.width, h = canvas.height, g = canvas.getContext('2d'), img = g.getImageData(0, 0, w, h), px = img.data;
  const r = Math.max(3, Math.round(Math.max(w, h) / 50)), bgW = new Float32Array(w * h), bg = [0, 1, 2].map(() => new Float32Array(w * h));
  for (let i = 0; i < w * h; i++) {
    const t = a[i] < 0.05 ? 1 : 0; // only what's surely background
    bgW[i] = t;
    for (let c = 0; c < 3; c++) bg[c][i] = px[i * 4 + c] * t;
  }
  const mW = boxMean(bgW, w, h, r), mean = bg.map(ch => boxMean(ch, w, h, r));
  for (let i = 0; i < w * h; i++) {
    let al = a[i];
    // Nearly all one or the other is all of it: no faint haze, no see-through spots.
    al = Math.min(1, Math.max(0, (al - 0.06) / 0.88));
    if (al > 0 && al < 0.98 && mW[i] > 0.01) {
      const k = Math.max(al, 0.3);
      for (let c = 0; c < 3; c++) px[i * 4 + c] = Math.min(255, Math.max(0, (px[i * 4 + c] - (1 - al) * mean[c][i] / mW[i]) / k));
    }
    px[i * 4 + 3] = Math.round(al * 255);
  }
  g.putImageData(img, 0, 0);
}

// A photo taken or picked, made into the child's picture: {blob, w, h, cut} where cut says it's the child
// alone on a clear background (a WebP with transparency); otherwise it's the photo, square, for a circle.
async function cutoutPhoto(file) {
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { throw new Error("That photo couldn't be opened."); }
  const src = fitCanvas(bmp.width, bmp.height, CUTOUT_WORK);
  src.getContext('2d').drawImage(bmp, 0, 0, src.width, src.height);
  bmp.close();
  const cut = await cutChild(src).catch(e => { console.warn(`the photo cutout couldn't run: ${e.message}`); return null; });
  if (!cut) {
    const side = Math.min(src.width, src.height), out = fitCanvas(side, side, CUTOUT_SIDE);
    out.getContext('2d').drawImage(src, (src.width - side) / 2, (src.height - side) / 2, side, side, 0, 0, out.width, out.height);
    return { blob: await canvasBlob(out, 0.85), w: out.width, h: out.height, cut: false };
  }
  const { canvas, a } = cut;
  clearEdge(canvas, a);
  // Cropped to the child, with a little room around them.
  const box = maskBox(a, canvas.width, canvas.height, 0.1), pad = Math.round(Math.max(box.w, box.h) * 0.03);
  const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
  const cw = Math.min(canvas.width, box.x + box.w + pad) - x, ch = Math.min(canvas.height, box.y + box.h + pad) - y;
  const out = fitCanvas(cw, ch, CUTOUT_SIDE);
  out.getContext('2d').drawImage(canvas, x, y, cw, ch, 0, 0, out.width, out.height);
  return { blob: await pngOrWebp(out), w: out.width, h: out.height, cut: true };
}
