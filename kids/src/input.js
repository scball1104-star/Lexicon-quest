// Keyboard + touch input, read as actions. Floating joystick on the left, big buttons on the right.

export const input = {
  x: 0, y: 0,                  // move vector, -1..1
  held: { attack: false, jump: false, special: false, swap: false, pause: false, w1: false, w2: false, w3: false, w4: false, w5: false },
  pressed: {},                 // edge-triggered this frame
  touch: false,
};

const KEYS = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down',
  j: 'attack', J: 'attack', ' ': 'attack', z: 'attack', Z: 'attack', Enter: 'attack',
  k: 'jump', K: 'jump', x: 'jump', X: 'jump', Shift: 'jump',
  l: 'special', L: 'special', c: 'special', C: 'special',
  q: 'swap', Q: 'swap', Tab: 'swap',
  1: 'w1', 2: 'w2', 3: 'w3', 4: 'w4', 5: 'w5',
  Escape: 'pause', p: 'pause', P: 'pause',
};
const keyDown = new Set();
const queued = new Set();

function press(action) { if (!input.held[action]) queued.add(action); input.held[action] = true; }
function release(action) { input.held[action] = false; }

window.addEventListener('keydown', (e) => {
  const a = KEYS[e.key];
  if (!a) return;
  if (['up', 'down', 'left', 'right'].includes(a)) keyDown.add(a);
  else press(a);
  if (e.key === ' ' || e.key.startsWith('Arrow') || e.key === 'Tab') e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  const a = KEYS[e.key];
  if (!a) return;
  if (['up', 'down', 'left', 'right'].includes(a)) keyDown.delete(a);
  else release(a);
});
window.addEventListener('blur', () => { keyDown.clear(); for (const k in input.held) input.held[k] = false; });

// ---- touch joystick ----
let stick = null; // {id, ox, oy, x, y}
const RADIUS = 46;
let base, knob, zone;

/** Queue an action from UI code (weapon bar taps). */
export function tap(action) { queued.add(action); }

export function setupTouch(root) {
  zone = root.querySelector('#stickZone');
  base = root.querySelector('#stickBase');
  knob = root.querySelector('#stickKnob');
  zone.addEventListener('pointerdown', (e) => {
    // a new thumb always takes over, so a lost touch can never leave the stick stuck
    input.touch = true;
    e.preventDefault();
    zone.setPointerCapture(e.pointerId);
    stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
    placeStick();
  });
  zone.addEventListener('pointermove', (e) => {
    if (!stick || e.pointerId !== stick.id) return;
    stick.x = e.clientX; stick.y = e.clientY;
    // drag the base along if the thumb wanders far, so the stick never "runs out"
    const dx = stick.x - stick.ox, dy = stick.y - stick.oy, d = Math.hypot(dx, dy);
    if (d > RADIUS * 1.6) { stick.ox = stick.x - dx / d * RADIUS * 1.6; stick.oy = stick.y - dy / d * RADIUS * 1.6; }
    placeStick();
  });
  const end = (e) => { if (stick && e.pointerId === stick.id) { stick = null; placeStick(); } };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);
  zone.addEventListener('lostpointercapture', end);

  root.querySelectorAll('[data-btn]').forEach((el) => {
    const a = el.dataset.btn;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); input.touch = true; el.setPointerCapture(e.pointerId); press(a); el.classList.add('down'); });
    const up = () => { release(a); el.classList.remove('down'); };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  });
}

function placeStick() {
  if (!base) return;
  if (!stick) { base.style.opacity = '0'; knob.style.opacity = '0'; return; }
  base.style.opacity = '1'; knob.style.opacity = '1';
  base.style.transform = `translate(${stick.ox - 60}px, ${stick.oy - 60}px)`;
  let dx = stick.x - stick.ox, dy = stick.y - stick.oy;
  const d = Math.hypot(dx, dy);
  if (d > RADIUS) { dx = dx / d * RADIUS; dy = dy / d * RADIUS; }
  knob.style.transform = `translate(${stick.ox + dx - 28}px, ${stick.oy + dy - 28}px)`;
}

export function pollInput() {
  let x = 0, y = 0;
  if (keyDown.has('left')) x -= 1;
  if (keyDown.has('right')) x += 1;
  if (keyDown.has('up')) y -= 1;
  if (keyDown.has('down')) y += 1;
  if (stick) {
    let dx = (stick.x - stick.ox) / RADIUS, dy = (stick.y - stick.oy) / RADIUS;
    const d = Math.hypot(dx, dy);
    if (d < 0.18) { dx = 0; dy = 0; } else if (d > 1) { dx /= d; dy /= d; }
    x = dx; y = dy;
  } else {
    const d = Math.hypot(x, y); if (d > 1) { x /= d; y /= d; }
  }
  input.x = x; input.y = y;
  input.pressed = {};
  for (const a of queued) input.pressed[a] = true;
  queued.clear();
}

export function clearInput() {
  queued.clear(); input.pressed = {};
  for (const k in input.held) input.held[k] = false;
}
