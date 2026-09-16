'use strict';

/* ---------------------------------------------------------------------
 * Chart calibration constants (ported from main.py)
 * ------------------------------------------------------------------- */

const CHART_FILE = 'assets/Carta Nautica 5D_400dpi.png';

const COLOR_LIST = [
  { name: 'red',    hex: '#ff0000' },
  { name: 'green',  hex: '#008000' },
  { name: 'blue',   hex: '#0000ff' },
  { name: 'yellow', hex: '#ffff00' },
  { name: 'orange', hex: '#ffa500' },
  { name: 'purple', hex: '#800080' },
  { name: 'pink',   hex: '#ffc0cb' },
  { name: 'brown',  hex: '#a52a2a' },
  { name: 'black',  hex: '#000000' },
];

function box(xr, yr) {
  return { x0: Math.min(xr[0], xr[1]), x1: Math.max(xr[0], xr[1]),
           y0: Math.min(yr[0], yr[1]), y1: Math.max(yr[0], yr[1]) };
}

const REGIONS = {
  'Giglio e Argentario':     box([8432, 12636], [8264, 5802]),
  'Talamone e Formiche G':   box([8922, 11774], [5756, 3386]),
  'Montecristo e Sc. Africa':box([1040, 4450],  [8264, 6976]),
  'Follonica e Sparviero':   box([6952, 10074], [3108, 548]),
  'Elba':                    box([1550, 5556],  [3388, 956]),
  'Piombino':                box([4220, 6986],  [1798, 0]),
  'Pianosa':                 box([958, 2428],   [5358, 3822]),
  'Marina di Grosseto':      box([8766, 11394], [4392, 2372]),
};

const PIXEL_PER_PRIME_LAT = 212;
const PIXEL_PER_PRIME_LONG = 154.5;
const START_PX = { x: 944, y: 7958 };
const START_COORD = {
  lat: { deg: 42, primes: 20.0 },
  lon: { deg: 10, primes: 0.0 },
};

function coordElemToFloat(ce) {
  return ce.deg + ce.primes / 60;
}

function floatToCoordElem(f) {
  const deg = Math.trunc(f);
  const primes = (f - deg) * 60;
  return { deg, primes };
}

function addCoordElem(a, b) {
  return floatToCoordElem(coordElemToFloat(a) + coordElemToFloat(b));
}

function formatCoordElem(ce) {
  let { deg, primes } = ce;
  primes = Math.round(primes * 10) / 10;
  if (primes >= 60) {
    primes -= 60;
    deg += 1;
  }
  const primesStr = primes.toFixed(1).padStart(4, '0');
  return `${deg}°${primesStr}'`;
}

function pxToCoord(px, py) {
  const lat = addCoordElem(
    START_COORD.lat,
    floatToCoordElem((START_PX.y - py) / 60 / PIXEL_PER_PRIME_LAT)
  );
  const lon = addCoordElem(
    START_COORD.lon,
    floatToCoordElem((px - START_PX.x) / 60 / PIXEL_PER_PRIME_LONG)
  );
  return { lat, lon };
}

function luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/* ---------------------------------------------------------------------
 * Drawing tools (ported from DotPainter / LinePainter / CirclePainter)
 * ------------------------------------------------------------------- */

const DOT_RADIUS = 10;
const CROSS_SIZE = 40;

class DotTool {
  constructor(color) {
    this.type = 'dot';
    this.color = color;
    this.x = 0;
    this.y = 0;
    this.nextAction = 'primary';
  }
  primary(ix, iy) { this.x = ix; this.y = iy; }
  secondary(ix, iy) { this.x = ix; this.y = iy; }
  draw(ctx, scale) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, DOT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
  label() {
    const c = pxToCoord(this.x, this.y);
    return `P: ${formatCoordElem(c.lat)} N, ${formatCoordElem(c.lon)} E`;
  }
}

class LineTool {
  constructor(color) {
    this.type = 'line';
    this.color = color;
    this.x1 = 0; this.y1 = 0;
    this.x2 = 1; this.y2 = 1;
    this.p1set = false;
    this.p2set = false;
    this.nextAction = 'primary';
  }
  primary(ix, iy) { this.p1set = true; this.x1 = ix; this.y1 = iy; }
  secondary(ix, iy) { this.p2set = true; this.x2 = ix; this.y2 = iy; }
  draw(ctx, scale, bounds) {
    if (!(this.p1set && this.p2set)) return;
    const dx = this.x2 - this.x1;
    const dy = this.y2 - this.y1;
    let xs, ys;
    if (dx === 0) {
      xs = [this.x1, this.x1];
      ys = [bounds.y0, bounds.y1];
    } else {
      const slope = dy / dx;
      xs = [bounds.x0, bounds.x1];
      ys = [this.y1 + slope * (bounds.x0 - this.x1), this.y1 + slope * (bounds.x1 - this.x1)];
    }
    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    ctx.lineTo(xs[1], ys[1]);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2 / scale;
    ctx.stroke();
  }
  label() {
    if (!(this.p1set && this.p2set)) return 'Nuova linea';
    let angle1 = Math.round((Math.atan2(this.y2 - this.y1, this.x2 - this.x1) * 180 / Math.PI) - 90);
    angle1 = ((angle1 % 360) + 360) % 360;
    const angle2 = (angle1 + 180) % 360;
    return `L: ${Math.min(angle1, angle2)}°, ${Math.max(angle1, angle2)}°`;
  }
}

class CircleTool {
  constructor(color) {
    this.type = 'circle';
    this.color = color;
    this.x = 0; this.y = 0;
    this.radius = 1;
    this.nextAction = 'primary';
  }
  primary(ix, iy) { this.x = ix; this.y = iy; }
  secondary(ix, iy) {
    const r = Math.hypot(iy - this.y, ix - this.x);
    if (r === 0) return;
    this.radius = r;
  }
  draw(ctx, scale) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5 / scale;
    ctx.stroke();

    const s = CROSS_SIZE;
    ctx.beginPath();
    ctx.moveTo(this.x - s, this.y); ctx.lineTo(this.x + s, this.y);
    ctx.moveTo(this.x, this.y - s); ctx.lineTo(this.x, this.y + s);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5 / scale;
    ctx.stroke();
  }
  label() {
    return `C: ${(Math.round((this.radius / PIXEL_PER_PRIME_LAT) * 10) / 10).toFixed(1)}`;
  }
}

const TOOL_META = {
  dot:    { newLabel: 'Nuovo punto' },
  line:   { newLabel: 'Nuova linea', modeLabels: ['Punto 1', 'Punto 2'] },
  circle: { newLabel: 'Nuovo cerchio', modeLabels: ['Centro', 'Raggio'] },
};

/* ---------------------------------------------------------------------
 * App state
 * ------------------------------------------------------------------- */

const canvas = document.getElementById('chart-canvas');
const ctx = canvas.getContext('2d');
const canvasWrap = document.getElementById('canvas-wrap');
const loadingEl = document.getElementById('loading');
const elementListEl = document.getElementById('element-list');
const modeToggleEl = document.getElementById('mode-toggle');
const regionSelect = document.getElementById('region-select');

const img = new Image();
let imageBounds = null; // {x0,y0,x1,y1} full-image extent
let view = null;        // currently displayed {x0,y0,x1,y1} in image space
let panMode = false;
let zoomMode = false;
let zoomDrag = null; // { pointerId, x0, y0, x1, y1 } in canvas device-pixel space, while dragging a zoom rectangle

let currentColorIndex = 0;
let currentTool = null;
let currentItem = null;
const items = [];

/* ---------------------------------------------------------------------
 * View transform helpers
 * ------------------------------------------------------------------- */

function computeTransform() {
  const cw = canvas.width, ch = canvas.height;
  const vw = view.x1 - view.x0, vh = view.y1 - view.y0;
  const scale = Math.min(cw / vw, ch / vh);
  const drawW = vw * scale, drawH = vh * scale;
  const offX = (cw - drawW) / 2, offY = (ch - drawH) / 2;
  return { scale, offX, offY };
}

function canvasPxToImage(cx, cy) {
  const t = computeTransform();
  return { x: view.x0 + (cx - t.offX) / t.scale, y: view.y0 + (cy - t.offY) / t.scale };
}

function dpr() {
  return window.devicePixelRatio || 1;
}

function clientToCanvasPx(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const d = dpr();
  return { x: (clientX - rect.left) * d, y: (clientY - rect.top) * d };
}

function clampView() {
  if (!view || !imageBounds) return;
  const minSpan = 40;
  if (view.x1 - view.x0 < minSpan) {
    const c = (view.x0 + view.x1) / 2;
    view.x0 = c - minSpan / 2; view.x1 = c + minSpan / 2;
  }
  if (view.y1 - view.y0 < minSpan) {
    const c = (view.y0 + view.y1) / 2;
    view.y0 = c - minSpan / 2; view.y1 = c + minSpan / 2;
  }
  const maxSpanX = (imageBounds.x1 - imageBounds.x0) * 3;
  const maxSpanY = (imageBounds.y1 - imageBounds.y0) * 3;
  if (view.x1 - view.x0 > maxSpanX) {
    const c = (view.x0 + view.x1) / 2;
    view.x0 = c - maxSpanX / 2; view.x1 = c + maxSpanX / 2;
  }
  if (view.y1 - view.y0 > maxSpanY) {
    const c = (view.y0 + view.y1) / 2;
    view.y0 = c - maxSpanY / 2; view.y1 = c + maxSpanY / 2;
  }
}

function setView(b) {
  view = { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 };
  clampView();
  redraw();
}

function goHome() {
  regionSelect.value = 'Generale';
  setView(imageBounds);
}

function zoomBy(factor, atCanvasX, atCanvasY) {
  const before = canvasPxToImage(atCanvasX, atCanvasY);
  const vw = (view.x1 - view.x0) / factor;
  const vh = (view.y1 - view.y0) / factor;
  const relX = (before.x - view.x0) / (view.x1 - view.x0);
  const relY = (before.y - view.y0) / (view.y1 - view.y0);
  view = {
    x0: before.x - relX * vw,
    x1: before.x + (1 - relX) * vw,
    y0: before.y - relY * vh,
    y1: before.y + (1 - relY) * vh,
  };
  clampView();
}

function panByScreenDelta(dxClient, dyClient) {
  const t = computeTransform();
  const d = dpr();
  view.x0 -= (dxClient * d) / t.scale;
  view.x1 -= (dxClient * d) / t.scale;
  view.y0 -= (dyClient * d) / t.scale;
  view.y1 -= (dyClient * d) / t.scale;
}

/* ---------------------------------------------------------------------
 * Rendering
 * ------------------------------------------------------------------- */

function redraw() {
  if (!imageBounds || !view) return;
  const t = computeTransform();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(t.scale, 0, 0, t.scale, t.offX - t.scale * view.x0, t.offY - t.scale * view.y0);
  ctx.drawImage(img, 0, 0);
  for (const item of items) {
    item.tool.draw(ctx, t.scale, imageBounds);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  if (zoomDrag) {
    const d = dpr();
    const x = Math.min(zoomDrag.x0, zoomDrag.x1);
    const y = Math.min(zoomDrag.y0, zoomDrag.y1);
    const w = Math.abs(zoomDrag.x1 - zoomDrag.x0);
    const h = Math.abs(zoomDrag.y1 - zoomDrag.y0);
    ctx.save();
    ctx.fillStyle = 'rgba(43, 108, 176, 0.15)';
    ctx.strokeStyle = '#2b6cb0';
    ctx.lineWidth = 1.5 * d;
    ctx.setLineDash([6 * d, 4 * d]);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }
}

function resizeCanvas() {
  const d = dpr();
  const rect = canvasWrap.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * d));
  canvas.height = Math.max(1, Math.round(rect.height * d));
  redraw();
}

/* ---------------------------------------------------------------------
 * Sidebar list
 * ------------------------------------------------------------------- */

function nextColor() {
  const c = COLOR_LIST[currentColorIndex % COLOR_LIST.length];
  currentColorIndex++;
  return c;
}

function setFocusStyle(item, focused) {
  item.row.classList.toggle('focused', focused);
  item.row.style.border = focused ? `3px ridge ${item.color.hex}` : '3px ridge transparent';
  item.delBtn.disabled = focused;
}

function updateLabelText(item) {
  item.labelEl.textContent = item.tool.label();
}

function createListRow(labelText, color, tool) {
  const row = document.createElement('div');
  row.className = 'item-row';

  const labelEl = document.createElement('span');
  labelEl.className = 'item-label';
  labelEl.textContent = labelText;
  if (luminance(color.hex) > 0.5) {
    labelEl.style.background = '#696969';
    labelEl.style.color = color.hex;
  } else {
    labelEl.style.color = color.hex;
  }
  row.appendChild(labelEl);

  const editBtn = document.createElement('button');
  editBtn.textContent = 'Edit';
  row.appendChild(editBtn);

  const delBtn = document.createElement('button');
  delBtn.textContent = 'Del';
  row.appendChild(delBtn);

  const item = { row, labelEl, editBtn, delBtn, tool, color };

  editBtn.addEventListener('click', () => selectItem(item));
  delBtn.addEventListener('click', () => removeItem(item));

  return item;
}

function selectItem(item) {
  if (currentItem) setFocusStyle(currentItem, false);
  currentTool = item.tool;
  currentItem = item;
  setFocusStyle(item, true);
  updateModeControls();
}

function removeItem(item) {
  const idx = items.indexOf(item);
  if (idx >= 0) items.splice(idx, 1);
  item.row.remove();
  if (currentItem === item) {
    currentTool = null;
    currentItem = null;
    updateModeControls();
  }
  redraw();
}

function addObject(kind) {
  if (currentItem) setFocusStyle(currentItem, false);
  const color = nextColor();
  let tool;
  if (kind === 'dot') tool = new DotTool(color.hex);
  else if (kind === 'line') tool = new LineTool(color.hex);
  else tool = new CircleTool(color.hex);

  const item = createListRow(TOOL_META[kind].newLabel, color, tool);
  items.push(item);
  elementListEl.appendChild(item.row);

  currentTool = tool;
  currentItem = item;
  setFocusStyle(item, true);
  updateModeControls();
  redraw();
}

/* ---------------------------------------------------------------------
 * Mode toggle (primary/secondary click equivalent, for touch input)
 * ------------------------------------------------------------------- */

const modeButtons = Array.from(modeToggleEl.querySelectorAll('.mode-btn'));
const touchInterfaceCheckbox = document.getElementById('touch-interface-checkbox');
let touchInterfaceEnabled = false;

const TOUCH_INTERFACE_STORAGE_KEY = 'pycarteggio-touch-interface';

function loadTouchInterfacePreference() {
  try {
    touchInterfaceEnabled = localStorage.getItem(TOUCH_INTERFACE_STORAGE_KEY) === '1';
  } catch (_) { /* localStorage unavailable (private mode, etc.) -- default to off */ }
  touchInterfaceCheckbox.checked = touchInterfaceEnabled;
}

touchInterfaceCheckbox.addEventListener('change', () => {
  touchInterfaceEnabled = touchInterfaceCheckbox.checked;
  try { localStorage.setItem(TOUCH_INTERFACE_STORAGE_KEY, touchInterfaceEnabled ? '1' : '0'); } catch (_) { /* ignore */ }
  updateModeControls();
});

function updateModeControls() {
  if (!touchInterfaceEnabled || !currentTool || !TOOL_META[currentTool.type].modeLabels) {
    modeToggleEl.hidden = true;
    return;
  }
  modeToggleEl.hidden = false;
  const labels = TOOL_META[currentTool.type].modeLabels;
  modeButtons[0].textContent = `① ${labels[0]}`;
  modeButtons[1].textContent = `② ${labels[1]}`;
  modeButtons[0].classList.toggle('active', currentTool.nextAction === 'primary');
  modeButtons[1].classList.toggle('active', currentTool.nextAction === 'secondary');
}

modeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!currentTool) return;
    currentTool.nextAction = btn.dataset.action;
    updateModeControls();
  });
});

/* ---------------------------------------------------------------------
 * Applying a click/tap to the current tool
 * ------------------------------------------------------------------- */

function performAction(ix, iy, explicitAction) {
  if (!currentTool) return;
  const action = explicitAction || currentTool.nextAction;
  currentTool[action](ix, iy);
  currentTool.nextAction = action === 'primary' ? 'secondary' : 'primary';
  if (currentItem) updateLabelText(currentItem);
  updateModeControls();
  redraw();
}

/* ---------------------------------------------------------------------
 * Pointer / touch input: pan, pinch-zoom, wheel-zoom, tap-to-place
 * ------------------------------------------------------------------- */

const pointers = new Map();
let pinch = null; // { distPrev, midPrev }

function pointersMidAndDist() {
  const pts = Array.from(pointers.values());
  const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  return { dist, mid };
}

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('pointerdown', (e) => {
  const isMiddle = e.pointerType === 'mouse' && e.button === 1;
  if (isMiddle) e.preventDefault(); // avoid the browser's middle-click autoscroll cursor
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, {
    x: e.clientX, y: e.clientY,
    startX: e.clientX, startY: e.clientY,
    button: e.button, pointerType: e.pointerType,
    forcePan: isMiddle,
    t: performance.now(),
  });
  if (pointers.size === 2) {
    const { dist, mid } = pointersMidAndDist();
    pinch = { distPrev: dist, midPrev: mid };
    zoomDrag = null; // a second finger joining cancels any in-progress zoom rectangle
  } else {
    pinch = null;
    if (zoomMode && pointers.size === 1 && !isMiddle && e.button !== 2) {
      const cpx = clientToCanvasPx(e.clientX, e.clientY);
      zoomDrag = { pointerId: e.pointerId, x0: cpx.x, y0: cpx.y, x1: cpx.x, y1: cpx.y };
    }
  }
});

canvas.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  const prevX = p.x, prevY = p.y;
  p.x = e.clientX; p.y = e.clientY;

  if (pointers.size === 2 && pinch) {
    const { dist, mid } = pointersMidAndDist();
    if (pinch.distPrev > 0 && isFinite(dist) && dist > 0) {
      const factor = dist / pinch.distPrev;
      const anchor = clientToCanvasPx(pinch.midPrev.x, pinch.midPrev.y);
      zoomBy(factor, anchor.x, anchor.y);
    }
    panByScreenDelta(mid.x - pinch.midPrev.x, mid.y - pinch.midPrev.y);
    pinch = { distPrev: dist, midPrev: mid };
    redraw();
  } else if (zoomDrag && zoomDrag.pointerId === e.pointerId && pointers.size === 1) {
    const cpx = clientToCanvasPx(e.clientX, e.clientY);
    zoomDrag.x1 = cpx.x;
    zoomDrag.y1 = cpx.y;
    redraw();
  } else if (pointers.size === 1 && (panMode || p.forcePan)) {
    panByScreenDelta(e.clientX - prevX, e.clientY - prevY);
    redraw();
  }
});

function onPointerEnd(e) {
  const p = pointers.get(e.pointerId);
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (!p) return;
  try { canvas.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }

  if (zoomDrag && zoomDrag.pointerId === e.pointerId) {
    const rect = zoomDrag;
    zoomDrag = null;
    const moved = Math.hypot(rect.x1 - rect.x0, rect.y1 - rect.y0);
    if (moved >= 10) {
      const c0 = canvasPxToImage(rect.x0, rect.y0);
      const c1 = canvasPxToImage(rect.x1, rect.y1);
      setView(box([c0.x, c1.x], [c0.y, c1.y]));
    } else {
      redraw(); // just clear the (negligible) selection overlay
    }
    return;
  }

  if (pointers.size === 0) {
    const moved = Math.hypot(e.clientX - p.startX, e.clientY - p.startY);
    const duration = performance.now() - p.t;
    if (!panMode && !zoomMode && !p.forcePan && moved < 8 && duration < 600) {
      const cpx = clientToCanvasPx(e.clientX, e.clientY);
      const ipt = canvasPxToImage(cpx.x, cpx.y);
      if (p.pointerType === 'mouse') {
        performAction(ipt.x, ipt.y, p.button === 2 ? 'secondary' : 'primary');
      } else {
        performAction(ipt.x, ipt.y, null);
      }
    }
  }
}

canvas.addEventListener('pointerup', onPointerEnd);
canvas.addEventListener('pointercancel', onPointerEnd);

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const cpx = clientToCanvasPx(e.clientX, e.clientY);
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  zoomBy(factor, cpx.x, cpx.y);
  redraw();
}, { passive: false });

/* ---------------------------------------------------------------------
 * Toolbar / sidebar wiring
 * ------------------------------------------------------------------- */

document.getElementById('btn-home').addEventListener('click', goHome);

const panBtn = document.getElementById('btn-pan');
const zoomBtn = document.getElementById('btn-zoom');

panBtn.addEventListener('click', () => {
  panMode = !panMode;
  panBtn.classList.toggle('active', panMode);
  if (panMode && zoomMode) {
    zoomMode = false;
    zoomDrag = null;
    zoomBtn.classList.remove('active');
    canvas.classList.remove('zoom-cursor');
  }
});

zoomBtn.addEventListener('click', () => {
  zoomMode = !zoomMode;
  zoomBtn.classList.toggle('active', zoomMode);
  canvas.classList.toggle('zoom-cursor', zoomMode);
  if (zoomMode && panMode) {
    panMode = false;
    panBtn.classList.remove('active');
  }
  if (!zoomMode) {
    zoomDrag = null;
    redraw();
  }
});

document.getElementById('btn-add-point').addEventListener('click', () => addObject('dot'));
document.getElementById('btn-add-line').addEventListener('click', () => addObject('line'));
document.getElementById('btn-add-circle').addEventListener('click', () => addObject('circle'));

regionSelect.addEventListener('change', () => {
  const name = regionSelect.value;
  setView(name === 'Generale' ? imageBounds : REGIONS[name]);
});

function populateRegions() {
  const generalOpt = document.createElement('option');
  generalOpt.value = 'Generale';
  generalOpt.textContent = 'Generale';
  regionSelect.appendChild(generalOpt);
  for (const name of Object.keys(REGIONS)) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    regionSelect.appendChild(opt);
  }
}

/* ---------------------------------------------------------------------
 * Scratchpad (notes + calculator)
 * ------------------------------------------------------------------- */

const scratchpad = document.getElementById('scratchpad');
const notesArea = document.getElementById('notes-area');
const exprInput = document.getElementById('expr-input');
const resultDisplay = document.getElementById('result-display');
const calcError = document.getElementById('calc-error');
let enterPressed = false;

function sanitizeInput(expr) {
  return expr.replace(/[^0-9+\-*/.\s]/g, '');
}

// Small recursive-descent evaluator for +,-,*,/ with unary +/- on plain
// numbers (mirrors the restricted grammar allowed by sanitizeInput / the
// input mask -- no parentheses, same as the original tool).
function evaluateArithmetic(expr) {
  const tokens = expr.match(/(\d+\.?\d*|\.\d+|[+\-*/])/g);
  if (!tokens || tokens.length === 0) throw new Error('Espressione non valida');
  let pos = 0;
  const peek = () => tokens[pos];
  const isNumber = (t) => t !== undefined && /^[0-9.]/.test(t);

  function parseUnary() {
    if (peek() === '+' || peek() === '-') {
      const op = tokens[pos++];
      const val = parseUnary();
      return op === '-' ? -val : val;
    }
    if (!isNumber(peek())) throw new Error('Espressione non valida');
    const n = parseFloat(tokens[pos++]);
    if (Number.isNaN(n)) throw new Error('Espressione non valida');
    return n;
  }

  function parseTerm() {
    let val = parseUnary();
    while (peek() === '*' || peek() === '/') {
      const op = tokens[pos++];
      const rhs = parseUnary();
      val = op === '*' ? val * rhs : val / rhs;
    }
    return val;
  }

  function parseExpr() {
    let val = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = tokens[pos++];
      const rhs = parseTerm();
      val = op === '+' ? val + rhs : val - rhs;
    }
    return val;
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new Error('Espressione non valida');
  return result;
}

function showCalcError(msg) {
  calcError.textContent = msg;
  calcError.hidden = false;
}

function hideCalcError() {
  calcError.hidden = true;
}

function evaluateExpression() {
  if (enterPressed) {
    exprInput.value = resultDisplay.value;
    exprInput.setSelectionRange(exprInput.value.length, exprInput.value.length);
    return;
  }
  const sanitized = sanitizeInput(exprInput.value);
  if (sanitized.trim() === '') {
    showCalcError('Espressione non valida');
    return;
  }
  try {
    const result = evaluateArithmetic(sanitized);
    hideCalcError();
    resultDisplay.value = (Math.round(result * 10) / 10).toFixed(1);
    enterPressed = true;
  } catch (err) {
    showCalcError(err.message || 'Espressione non valida');
  }
}

exprInput.addEventListener('input', () => { enterPressed = false; hideCalcError(); });
exprInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') evaluateExpression();
});

document.getElementById('btn-note').addEventListener('click', () => {
  scratchpad.hidden = false;
});
document.getElementById('btn-scratchpad-close').addEventListener('click', () => {
  scratchpad.hidden = true;
});

/* ---------------------------------------------------------------------
 * Instructions modal
 * ------------------------------------------------------------------- */

const instructionsBackdrop = document.getElementById('instructions-backdrop');

function openInstructions() {
  instructionsBackdrop.hidden = false;
}

function closeInstructions() {
  instructionsBackdrop.hidden = true;
}

document.getElementById('btn-instructions').addEventListener('click', openInstructions);
document.getElementById('btn-instructions-close').addEventListener('click', closeInstructions);
instructionsBackdrop.addEventListener('click', (e) => {
  if (e.target === instructionsBackdrop) closeInstructions(); // click on the dimmed backdrop, not the modal itself
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !instructionsBackdrop.hidden) closeInstructions();
});

/* Dragging the note panel around the window */
const scratchpadHeader = scratchpad.querySelector('.scratchpad-header');
let scratchDrag = null; // { pointerId, offsetX, offsetY }

function clampScratchpadPosition() {
  if (scratchpad.style.left === '') return; // not yet dragged, keep CSS default position
  const maxLeft = Math.max(0, window.innerWidth - scratchpad.offsetWidth);
  const maxTop = Math.max(0, window.innerHeight - scratchpad.offsetHeight);
  const left = Math.min(Math.max(0, parseFloat(scratchpad.style.left) || 0), maxLeft);
  const top = Math.min(Math.max(0, parseFloat(scratchpad.style.top) || 0), maxTop);
  scratchpad.style.left = `${left}px`;
  scratchpad.style.top = `${top}px`;
}

scratchpadHeader.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button')) return; // let the close button work normally
  const rect = scratchpad.getBoundingClientRect();
  scratchDrag = { pointerId: e.pointerId, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
  scratchpad.style.left = `${rect.left}px`;
  scratchpad.style.top = `${rect.top}px`;
  scratchpad.style.right = 'auto';
  scratchpadHeader.setPointerCapture(e.pointerId);
});

scratchpadHeader.addEventListener('pointermove', (e) => {
  if (!scratchDrag || scratchDrag.pointerId !== e.pointerId) return;
  const maxLeft = Math.max(0, window.innerWidth - scratchpad.offsetWidth);
  const maxTop = Math.max(0, window.innerHeight - scratchpad.offsetHeight);
  const left = Math.min(Math.max(0, e.clientX - scratchDrag.offsetX), maxLeft);
  const top = Math.min(Math.max(0, e.clientY - scratchDrag.offsetY), maxTop);
  scratchpad.style.left = `${left}px`;
  scratchpad.style.top = `${top}px`;
});

function endScratchDrag(e) {
  if (scratchDrag && scratchDrag.pointerId === e.pointerId) scratchDrag = null;
}
scratchpadHeader.addEventListener('pointerup', endScratchDrag);
scratchpadHeader.addEventListener('pointercancel', endScratchDrag);

window.addEventListener('resize', clampScratchpadPosition);

/* ---------------------------------------------------------------------
 * Workspace save / load (points, lines, circles, notes -> JSON file)
 * ------------------------------------------------------------------- */

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function serializeTool(tool) {
  const base = { type: tool.type, color: tool.color, nextAction: tool.nextAction };
  if (tool.type === 'dot') {
    return { ...base, x: tool.x, y: tool.y };
  }
  if (tool.type === 'line') {
    return { ...base, x1: tool.x1, y1: tool.y1, x2: tool.x2, y2: tool.y2, p1set: tool.p1set, p2set: tool.p2set };
  }
  return { ...base, x: tool.x, y: tool.y, radius: tool.radius };
}

function toolFromData(data) {
  let tool;
  if (data.type === 'dot') tool = new DotTool(data.color);
  else if (data.type === 'line') tool = new LineTool(data.color);
  else tool = new CircleTool(data.color);
  Object.assign(tool, data);
  return tool;
}

function serializeWorkspace() {
  return {
    format: 'pycarteggio-workspace',
    version: 1,
    savedAt: new Date().toISOString(),
    view: view ? { ...view } : null,
    notes: notesArea.value,
    items: items.map((it) => serializeTool(it.tool)),
  };
}

function saveWorkspace() {
  const blob = new Blob([JSON.stringify(serializeWorkspace(), null, 2)], { type: 'application/json' });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  downloadBlob(blob, `pycarteggio-workspace-${stamp}.json`);
}

function applyWorkspace(data) {
  if (!Array.isArray(data.items)) {
    alert('File non valido: non è un workspace di PyCarteggio.');
    return;
  }
  if (items.length > 0 && !window.confirm('Caricare il workspace sostituirà gli elementi attuali. Continuare?')) {
    return;
  }
  for (const it of items.slice()) removeItem(it);
  currentColorIndex = 0;

  notesArea.value = typeof data.notes === 'string' ? data.notes : '';

  for (const itemData of data.items) {
    const tool = toolFromData(itemData);
    const item = createListRow(tool.label(), { hex: tool.color }, tool);
    items.push(item);
    elementListEl.appendChild(item.row);
    currentColorIndex++;
  }

  if (items.length) {
    selectItem(items[items.length - 1]);
  } else {
    currentTool = null;
    currentItem = null;
    updateModeControls();
  }

  if (data.view && imageBounds) setView(data.view);
  else redraw();
}

function loadWorkspaceFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(reader.result);
    } catch (err) {
      alert('Il file selezionato non è un JSON valido.');
      return;
    }
    applyWorkspace(data);
  };
  reader.onerror = () => alert('Impossibile leggere il file selezionato.');
  reader.readAsText(file);
}

document.getElementById('btn-save-workspace').addEventListener('click', saveWorkspace);

const loadWorkspaceInput = document.getElementById('load-workspace-input');
document.getElementById('btn-load-workspace').addEventListener('click', () => {
  loadWorkspaceInput.value = '';
  loadWorkspaceInput.click();
});
loadWorkspaceInput.addEventListener('change', () => {
  const file = loadWorkspaceInput.files[0];
  if (file) loadWorkspaceFile(file);
});

/* ---------------------------------------------------------------------
 * Export current view as PNG / SVG
 * ------------------------------------------------------------------- */

function exportUnavailableMessage(err) {
  console.error(err);
  alert('Esportazione non disponibile. Se hai aperto questa pagina come file locale (file://), avviala invece tramite un server web (es. "python3 -m http.server") e riprova.');
}

function exportPNG() {
  try {
    canvas.toBlob((blob) => {
      if (!blob) { exportUnavailableMessage(new Error('toBlob returned null')); return; }
      downloadBlob(blob, 'pycarteggio-vista.png');
    }, 'image/png');
  } catch (err) {
    exportUnavailableMessage(err);
  }
}

function svgLineExtent(tool, bounds) {
  const dx = tool.x2 - tool.x1;
  const dy = tool.y2 - tool.y1;
  if (dx === 0) return { xs: [tool.x1, tool.x1], ys: [bounds.y0, bounds.y1] };
  const slope = dy / dx;
  return {
    xs: [bounds.x0, bounds.x1],
    ys: [tool.y1 + slope * (bounds.x0 - tool.x1), tool.y1 + slope * (bounds.x1 - tool.x1)],
  };
}

function exportSVG() {
  if (!view || !imageBounds) return;
  try {
    const vw = view.x1 - view.x0;
    const vh = view.y1 - view.y0;
    const off = document.createElement('canvas');
    off.width = Math.max(1, Math.round(vw));
    off.height = Math.max(1, Math.round(vh));
    off.getContext('2d').drawImage(img, view.x0, view.y0, vw, vh, 0, 0, off.width, off.height);
    const bgDataUrl = off.toDataURL('image/png');

    const t = computeTransform();
    const lineStroke = (2 / t.scale).toFixed(2);
    const circleStroke = (1.5 / t.scale).toFixed(2);
    const dx = -view.x0, dy = -view.y0;

    const parts = [];
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${off.width}" height="${off.height}" viewBox="0 0 ${off.width} ${off.height}">`);
    parts.push(`<image href="${bgDataUrl}" xlink:href="${bgDataUrl}" x="0" y="0" width="${off.width}" height="${off.height}"/>`);

    for (const item of items) {
      const tool = item.tool;
      if (tool.type === 'dot') {
        parts.push(`<circle cx="${tool.x + dx}" cy="${tool.y + dy}" r="${DOT_RADIUS}" fill="${tool.color}"/>`);
      } else if (tool.type === 'line') {
        if (!(tool.p1set && tool.p2set)) continue;
        const { xs, ys } = svgLineExtent(tool, imageBounds);
        parts.push(`<line x1="${xs[0] + dx}" y1="${ys[0] + dy}" x2="${xs[1] + dx}" y2="${ys[1] + dy}" stroke="${tool.color}" stroke-width="${lineStroke}"/>`);
      } else if (tool.type === 'circle') {
        const cx = tool.x + dx, cy = tool.y + dy;
        parts.push(`<circle cx="${cx}" cy="${cy}" r="${tool.radius}" fill="none" stroke="${tool.color}" stroke-width="${circleStroke}"/>`);
        parts.push(`<line x1="${cx - CROSS_SIZE}" y1="${cy}" x2="${cx + CROSS_SIZE}" y2="${cy}" stroke="${tool.color}" stroke-width="${circleStroke}"/>`);
        parts.push(`<line x1="${cx}" y1="${cy - CROSS_SIZE}" x2="${cx}" y2="${cy + CROSS_SIZE}" stroke="${tool.color}" stroke-width="${circleStroke}"/>`);
      }
    }
    parts.push('</svg>');

    const blob = new Blob([parts.join('\n')], { type: 'image/svg+xml' });
    downloadBlob(blob, 'pycarteggio-vista.svg');
  } catch (err) {
    exportUnavailableMessage(err);
  }
}

document.getElementById('btn-export-png').addEventListener('click', exportPNG);
document.getElementById('btn-export-svg').addEventListener('click', exportSVG);

/* ---------------------------------------------------------------------
 * Boot
 * ------------------------------------------------------------------- */

window.addEventListener('resize', resizeCanvas);
new ResizeObserver(resizeCanvas).observe(canvasWrap);

loadTouchInterfacePreference();
populateRegions();

img.onload = () => {
  imageBounds = { x0: 0, y0: 0, x1: img.naturalWidth, y1: img.naturalHeight };
  view = { ...imageBounds };
  loadingEl.hidden = true;
  resizeCanvas();
};
img.onerror = () => {
  loadingEl.textContent = 'Impossibile caricare la carta nautica.';
};
img.src = CHART_FILE;
