/* たんていミミと ひみつの たからもの — 1話「おうちと にわ」試作 */
(() => {
'use strict';
const T = 40, COLS = 16, ROWS = 10, PI = Math.PI;
const SAVE_KEY = 'tantei-save-v1';
const $ = id => document.getElementById(id);
const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
const pick = a => a[Math.floor(Math.random() * a.length)];

const COLORS = {
  red:    { name: 'あか',   hex: '#FF7E8A' },
  yellow: { name: 'きいろ', hex: '#FFD25E' },
  blue:   { name: 'あお',   hex: '#6FA8F5' },
};
const ANIMALS = [
  { id: 'rabbit', name: 'うさぎ' },
  { id: 'cat',    name: 'ねこ' },
  { id: 'bear',   name: 'くま' },
];
const LANE_ROWS = [6, 7, 8];      // おおきな はなと ふみいしの れつ
const FLOWER_X = 1;               // おおきな はなの ばしょ
const STARS = [{ id: 1, x: 13, y: 3 }, { id: 2, x: 11, y: 4 }, { id: 3, x: 6, y: 3 }];
const START = { x: 4, y: 3 };

/* ---------- セーブ ---------- */
function loadAll() {
  try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); if (d && Array.isArray(d.slots)) return d; } catch (e) {}
  return { slots: [null, null, null], sound: true };
}
function saveAll() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(store)); } catch (e) {} }
const store = loadAll();

function newSeed() {
  const keys = Object.keys(COLORS);
  const c = pick(keys);
  const other = pick(keys.filter(k => k !== c));
  const lanes = keys.slice().sort(() => Math.random() - 0.5);
  return { n: 3 + Math.floor(Math.random() * 3), c, other, lanes };
}
function newStage(old) {
  return { seed: newSeed(), s1: false, s2: false, letter: false, cleared: false, treasures: old ? old.treasures : [] };
}

/* ---------- おと ---------- */
let stepAlt = false, actx = null, musicGain = null, music = null, wantTrack = null;
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
function audio() {
  actx = actx || new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function note(freq, dur, t0, type, vol, dest) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(dest); o.start(t0); o.stop(t0 + dur + 0.05);
}
function tone(freq, dur, delay = 0, type = 'sine', vol = 0.12) {
  if (!store.sound) return;
  try { audio(); note(freq, dur, actx.currentTime + delay, type, vol, actx.destination); } catch (e) {}
}
// ざらざらした おと(つちを ほる おとに つかう)
let noiseBuf = null;
function scrape(delay, dur, f0, f1, vol) {
  if (!store.sound) return;
  try {
    audio();
    if (!noiseBuf) { noiseBuf = actx.createBuffer(1, actx.sampleRate * .5, actx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t0 = actx.currentTime + delay, src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    src.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = .9;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .015); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(actx.destination); src.start(t0); src.stop(t0 + dur + .05);
  } catch (e) {}
}
const sfx = {
  ok()   { tone(660, .15); tone(880, .25, .12); },
  ng()   { tone(220, .2, 0, 'triangle'); },
  open() { tone(520, .12); },
  dig()  { for (const d of [0, .2]) { tone(95, .1, d, 'sine', .2); scrape(d, .17, 1400, 350, .5); scrape(d + .1, .1, 2600, 1200, .16); } },
  step() { stepAlt = !stepAlt; tone(stepAlt ? 330 : 392, .08, 0, 'triangle', .11); },
  found() { [523, 659, 784].forEach((f, i) => tone(f, .25, i * .12)); tone(1047, .6, .36); },
  fanfare() {
    [523, 523, 523, 659, 784].forEach((f, i) => tone(f, .22, [0, .16, .32, .48, .72][i], 'triangle', .14));
    [1047, 1319, 1568].forEach(f => tone(f, 1.3, .98, 'triangle', .09));
    [1568, 2093].forEach((f, i) => tone(f, .5, 1.5 + i * .16, 'sine', .07));
  },
};

/* BGM: [おとの たかさ(MIDI), ながさ(はく)]。0 は やすみ。mel と bass の ながさは おなじに する */
const TRACKS = {
  field: { beat: .4,
    mel: [[72,1],[76,1],[79,1],[76,1], [81,1],[79,1],[76,2], [77,1],[81,1],[79,1],[76,1], [74,1],[76,1],[74,2],
          [72,1],[76,1],[79,1],[84,1], [83,1],[81,1],[79,2], [81,1],[79,1],[77,1],[74,1], [72,2],[0,2]],
    bass: [[48,2],[55,2], [45,2],[52,2], [53,2],[48,2], [55,2],[43,2], [48,2],[52,2], [55,2],[52,2], [53,2],[55,2], [48,2],[48,2]] },
  clear: { beat: .3,
    mel: [[72,.5],[76,.5],[79,.5],[84,1.5],[79,.5],[84,.5], [88,2],[86,1],[84,1],
          [81,.5],[84,.5],[81,.5],[77,1.5],[81,.5],[84,.5], [79,2],[83,1],[86,1]],
    bass: [[48,2],[48,2], [48,2],[55,2], [53,2],[53,2], [55,2],[55,2]] },
};
function stopMusic() {
  if (!music) return;
  clearInterval(music.timer);
  try { music.gain.gain.setTargetAtTime(0, actx.currentTime, .05); const g = music.gain; setTimeout(() => g.disconnect(), 400); } catch (e) {}
  music = null;
}
function playMusic(name, delay = 0) {
  wantTrack = name; stopMusic();
  if (!name || !store.sound || document.hidden) return;
  try {
    audio();
    const gain = actx.createGain(); gain.connect(actx.destination);
    const t = actx.currentTime + .1 + delay;
    music = { name, gain, tm: t, tb: t, i: 0, j: 0, timer: setInterval(musicTick, 100) };
    musicTick();
  } catch (e) { music = null; }
}
function musicTick() {
  if (!music) return;
  const tr = TRACKS[music.name], now = actx.currentTime, until = now + .5;
  if (music.tm < now - .2) { music.tm = music.tb = now + .05; music.i = music.j = 0; }
  while (music.tm < until) { const [n, d] = tr.mel[music.i]; if (n) note(midi(n), d * tr.beat * .95, music.tm, 'triangle', .055, music.gain); music.tm += d * tr.beat; music.i = (music.i + 1) % tr.mel.length; }
  while (music.tb < until) { const [n, d] = tr.bass[music.j]; if (n) note(midi(n), d * tr.beat * .9, music.tb, 'sine', .06, music.gain); music.tb += d * tr.beat; music.j = (music.j + 1) % tr.bass.length; }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) stopMusic(); else if (wantTrack && !music) playMusic(wantTrack); });

/* ---------- えを かく どうぐ ---------- */
function rr(c, x, y, w, h, r, fill, stroke, lw) { c.beginPath(); c.roundRect(x, y, w, h, r); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); } }
function ci(c, x, y, r, fill, stroke, lw) { c.beginPath(); c.arc(x, y, r, 0, PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); } }
function el(c, x, y, rx, ry, fill, stroke, lw) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); } }
function poly(c, pts, fill, stroke, lw) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); } }
function ln(c, x1, y1, x2, y2, col, lw) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = col; c.lineWidth = lw || 2; c.lineCap = 'round'; c.stroke(); }
function starShape(c, x, y, R, fill, stroke) {
  c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? R * .5 : R, a = -PI / 2 + i * PI / 5; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath();
  c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.lineJoin = 'round'; c.stroke(); }
}
function num(c, t, x, y, size, col) { c.font = '400 ' + size + 'px "Mochiy Pop One","Zen Maru Gothic",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(t, x, y); }

function drawGirl(c, cx, by, s, dir = 'down', bob = 0) {
  c.save(); c.translate(cx, by); c.scale(dir === 'left' ? -s : s, s);
  const hair = '#7A4B3A', skin = '#FFE2CF', ink = '#3A2D58';
  el(c, 0, 0, 10, 3, 'rgba(40,20,70,.18)');
  c.translate(0, -bob);
  const legs = () => { rr(c, -5, -5, 4, 5, 1, '#6B4A3A'); rr(c, 1, -5, 4, 5, 1, '#6B4A3A'); };
  const coat = w => { poly(c, [[-w * .63, -15], [w * .63, -15], [w, -4], [-w, -4]], '#B79CED'); poly(c, [[-w * .93, -6.5], [w * .93, -6.5], [w, -4], [-w, -4]], '#D7C6F8'); };
  const lens = (hx, gx) => { ln(c, hx, -10, gx - 2.5, -13, '#C98A3C', 2); ci(c, gx, -16, 4.5, 'rgba(215,244,255,.9)', '#F2B63C', 1.8); };
  const hat = dx => { el(c, dx, -28, 11.5, 3.4, '#E2AD5E'); c.beginPath(); c.arc(0, -28, 8, PI, 0); c.closePath(); c.fillStyle = '#F0C583'; c.fill(); rr(c, -8, -30.6, 16, 2.6, 1, '#FF7EB6'); ci(c, 0, -36, 1.8, '#E2AD5E'); };
  if (dir === 'up') {            // うしろすがた
    lens(8, 15.5);
    ci(c, -11, -19, 5, hair); ci(c, 11, -19, 5, hair);
    legs(); coat(9.5);
    ci(c, 0, -22, 9.4, hair);
    ci(c, -9.5, -21, 1.6, '#FF7EB6'); ci(c, 9.5, -21, 1.6, '#FF7EB6');
    hat(0);
    poly(c, [[0, -29.3], [-4, -31.5], [-4, -27]], '#FF5FA2'); poly(c, [[0, -29.3], [4, -31.5], [4, -27]], '#FF5FA2');
  } else if (dir === 'down') {   // しょうめん
    ci(c, -11, -19, 5, hair); ci(c, 11, -19, 5, hair);
    legs(); coat(9.5); lens(8, 15.5);
    ci(c, 0, -22, 9, skin);
    c.beginPath(); c.arc(0, -23, 9.6, PI, 0); c.closePath(); c.fillStyle = hair; c.fill();
    ci(c, -3.5, -19.5, 1.3, ink); ci(c, 3.5, -19.5, 1.3, ink);
    ci(c, -6, -17, 1.8, 'rgba(255,120,160,.45)'); ci(c, 6, -17, 1.8, 'rgba(255,120,160,.45)');
    c.beginPath(); c.arc(0, -17.6, 2, 0.15 * PI, 0.85 * PI); c.strokeStyle = '#B5566B'; c.lineWidth = 1; c.stroke();
    poly(c, [[0, -13.5], [-4, -15.5], [-4, -11.5]], '#FF7EB6'); poly(c, [[0, -13.5], [4, -15.5], [4, -11.5]], '#FF7EB6');
    hat(0);
  } else {                       // よこむき(みぎむきで かいて、ひだりは はんてん)
    ci(c, -10, -18, 5.4, hair);
    rr(c, -4, -5, 4, 5, 1, '#5A3D30'); rr(c, 0, -5, 5, 5, 1, '#6B4A3A');
    coat(7.5); lens(5, 14.5);
    ci(c, -1, -22, 9.4, hair);
    ci(c, 1.5, -21.5, 8.2, skin);
    c.beginPath(); c.arc(0, -23, 9.6, PI, 0); c.closePath(); c.fillStyle = hair; c.fill();
    ci(c, -8.5, -20.5, 1.6, '#FF7EB6');
    ci(c, 5, -19.5, 1.4, ink);
    ci(c, 6.5, -16.8, 1.8, 'rgba(255,120,160,.45)');
    c.beginPath(); c.arc(7, -16.6, 1.5, 0.2 * PI, 0.9 * PI); c.strokeStyle = '#B5566B'; c.lineWidth = 1; c.stroke();
    poly(c, [[3, -13.5], [6.5, -15.3], [6.5, -11.7]], '#FF7EB6');
    hat(2);
  }
  c.restore();
}
function drawEnvelope(c, x, y, s, flap = 0) {
  c.save(); c.translate(x, y); c.scale(s, s);
  if (flap) for (const d of [-1, 1]) { c.save(); c.translate(d * 12, -3); c.rotate(d * (-.5 + Math.sin(flap) * .5)); el(c, d * 7, 0, 8, 4, '#FFFFFF', '#CFC4E2', 1); c.restore(); }
  rr(c, -14, -9, 28, 18, 3, '#FFF8E1', '#3A2D58', 1.6);
  c.beginPath(); c.moveTo(-13, -8); c.lineTo(0, 2); c.lineTo(13, -8); c.strokeStyle = '#3A2D58'; c.lineWidth = 1.4; c.lineJoin = 'round'; c.stroke();
  ci(c, -2, 3, 2.4, '#FF7EB6'); ci(c, 2, 3, 2.4, '#FF7EB6'); poly(c, [[-4.2, 4], [4.2, 4], [0, 8.4]], '#FF7EB6');
  c.restore();
}
function drawCat(c, cx, by, s, face = 1, bob = 0, back = false) {
  c.save(); c.translate(cx, by); c.scale(s * face, s);
  const w = '#FFFDF7', o = '#CFC4E2';
  el(c, 0, 0, 8, 2.5, 'rgba(40,20,70,.18)');
  c.translate(0, -bob);
  c.beginPath(); c.moveTo(6, -4); c.quadraticCurveTo(14, -5, 12, -14); c.strokeStyle = o; c.lineWidth = 4.4; c.lineCap = 'round'; c.stroke();
  c.strokeStyle = w; c.lineWidth = 3; c.stroke();
  el(c, 0, -6, 7, 6, w, o, .9);
  poly(c, [[-6.5, -17], [-5, -25], [-1, -20.5]], w, o, .9); poly(c, [[6.5, -17], [5, -25], [1, -20.5]], w, o, .9);
  poly(c, [[-5.3, -19], [-4.7, -22.8], [-2.6, -20.3]], '#FFB7CF'); poly(c, [[5.3, -19], [4.7, -22.8], [2.6, -20.3]], '#FFB7CF');
  ci(c, 0, -15, 7, w, o, .9);
  if (!back) {
    ci(c, -2.7, -15.5, 1.2, '#3A2D58'); ci(c, 2.7, -15.5, 1.2, '#3A2D58');
    ci(c, 0, -13.2, .9, '#FF8FB3');
    poly(c, [[0, -8.6], [-3.5, -10.4], [-3.5, -6.8]], '#4CC3A6'); poly(c, [[0, -8.6], [3.5, -10.4], [3.5, -6.8]], '#4CC3A6');
  } else rr(c, -4, -9.6, 8, 2, 1, '#4CC3A6');
  c.restore();
}
function drawAnimal(c, kind, cx, cy, s) {
  c.save(); c.translate(cx, cy); c.scale(s, s);
  if (kind === 'rabbit') { el(c, -5, -13, 3.2, 9, '#FFFFFF', '#D9CFE8', 1); el(c, 5, -13, 3.2, 9, '#FFFFFF', '#D9CFE8', 1); el(c, -5, -13, 1.4, 6, '#FFB7CF'); el(c, 5, -13, 1.4, 6, '#FFB7CF'); ci(c, 0, 0, 10, '#FFFFFF', '#D9CFE8', 1); }
  else if (kind === 'bear') { ci(c, -8, -7, 4.5, '#B98058'); ci(c, 8, -7, 4.5, '#B98058'); ci(c, -8, -7, 2.2, '#E3B58F'); ci(c, 8, -7, 2.2, '#E3B58F'); ci(c, 0, 0, 10, '#B98058'); el(c, 0, 3.5, 4.5, 3.5, '#E3B58F'); }
  else { poly(c, [[-10, -3], [-9, -14], [-2, -8]], '#FFE2A8', '#E6BF7A', 1); poly(c, [[10, -3], [9, -14], [2, -8]], '#FFE2A8', '#E6BF7A', 1); ci(c, 0, 0, 10, '#FFE2A8', '#E6BF7A', 1); }
  ci(c, -3.5, -1, 1.3, '#3A2D58'); ci(c, 3.5, -1, 1.3, '#3A2D58'); ci(c, 0, 2.6, 1.3, '#FF8FB3');
  ci(c, -6.5, 2.5, 2, 'rgba(255,120,160,.4)'); ci(c, 6.5, 2.5, 2, 'rgba(255,120,160,.4)');
  c.restore();
}
function drawFlower(c, x, y, col, s = 1) {
  ln(c, x, y + 12 * s, x, y, '#58B37A', 2.5 * s);
  for (let i = 0; i < 5; i++) { const a = i * PI * 2 / 5 - PI / 2; ci(c, x + Math.cos(a) * 5 * s, y - 3 * s + Math.sin(a) * 5 * s, 4 * s, col); }
  ci(c, x, y - 3 * s, 3 * s, '#FFF4B8');
}
function drawBigFlower(c, x, b, col) {
  el(c, x, b, 10, 3, 'rgba(40,20,70,.15)');
  ln(c, x, b, x, b - 22, '#58B37A', 4);
  el(c, x - 6, b - 8, 6, 3, '#6CC08B'); el(c, x + 6, b - 12, 6, 3, '#6CC08B');
  for (let i = 0; i < 6; i++) { const a = i * PI / 3; ci(c, x + Math.cos(a) * 9, b - 30 + Math.sin(a) * 9, 7, col, 'rgba(58,45,88,.25)', 1); }
  ci(c, x, b - 30, 6, '#FFF4B8', 'rgba(58,45,88,.25)', 1);
}
function drawDuck(c, x, y, col = '#FFFFFF', s = 1) {
  el(c, x, y, 9 * s, 6 * s, col, '#C9D8E4', 1); ci(c, x + 7 * s, y - 6 * s, 5 * s, col, '#C9D8E4', 1);
  poly(c, [[x + 11 * s, y - 7 * s], [x + 16 * s, y - 5.5 * s], [x + 11 * s, y - 4 * s]], '#FFA63D'); ci(c, x + 8 * s, y - 7 * s, 1 * s, '#3A2D58');
}
function drawPond(c, x, y, w, h) {
  el(c, x + w / 2, y + h / 2, w / 2, h / 2, '#9FD9F0', '#E4F6FC', 5);
  c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 2; c.lineCap = 'round';
  for (let i = 0; i < 4; i++) { const px = x + w * (.2 + .18 * i), py = y + h * (.25 + .5 * hash(i, 4)); c.beginPath(); c.moveTo(px, py); c.lineTo(px + 12, py); c.stroke(); }
}
function drawChest(c, x, y, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  ci(c, 20, 20, 24, 'rgba(255,220,110,.35)'); rr(c, 3, 16, 34, 20, 3, '#B8733F', '#7A4B2A', 2);
  rr(c, 3, 6, 34, 14, [12, 12, 0, 0], '#D08C4F', '#7A4B2A', 2); rr(c, 3, 17, 34, 4, 0, '#F2C14E'); rr(c, 8, 6, 4, 30, 0, '#F2C14E'); rr(c, 28, 6, 4, 30, 0, '#F2C14E');
  rr(c, 16, 16, 8, 10, 2, '#FFE38A', '#B58A1F', 1.5); starShape(c, 36, 4, 5, '#FFFFFF'); starShape(c, 2, 12, 3.5, '#FFFFFF');
  c.restore();
}
function drawBrooch(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  ci(c, 0, 0, 34, 'rgba(255,220,110,.35)');
  for (let i = 0; i < 6; i++) { const a = i * PI / 3 - PI / 2; ci(c, Math.cos(a) * 14, Math.sin(a) * 14, 10, '#FF9DC4', '#D9478A', 1.5); }
  ci(c, 0, 0, 10, '#FFD25E', '#B58A1F', 1.5); ci(c, -3, -3, 3, '#FFF4B8');
  starShape(c, 26, -22, 6, '#FFFFFF'); starShape(c, -28, 16, 4, '#FFFFFF');
  c.restore();
}
function drawKey(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  ci(c, 0, 0, 22, 'rgba(255,220,110,.35)');
  ci(c, -6, -6, 8, null, '#B58A1F', 7); ci(c, -6, -6, 8, null, '#FFC83D', 4);
  ln(c, 0, 0, 14, 14, '#B58A1F', 7); ln(c, 0, 0, 14, 14, '#FFC83D', 4); ln(c, 9, 9, 14, 4, '#B58A1F', 6); ln(c, 9, 9, 14, 4, '#FFC83D', 3);
  c.restore();
}

/* ---------- マップ ---------- */
const blockedSet = new Set();
const bk = (x, y) => x + ',' + y;
function buildBlocked() {
  blockedSet.clear();
  const add = (x0, y0, x1, y1) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) blockedSet.add(bk(x, y)); };
  add(1, 0, 5, 2);        // いえ
  add(11, 0, 14, 2);      // いけ
  add(6, 2, 6, 2);        // ポスト
  add(9, 5, 14, 5);       // かだん
  add(0, 9, 15, 9);       // さく
  LANE_ROWS.forEach(r => add(FLOWER_X, r, FLOWER_X, r));
  [[8, 0], [0, 4], [15, 7], [10, 7], [12, 7]].forEach(p => add(p[0], p[1], p[0], p[1]));
}
buildBlocked();
const blocked = (x, y) => x < 0 || y < 0 || x >= COLS || y >= ROWS || blockedSet.has(bk(x, y));
const isPath = (x, y) => y === 3 && x >= 3 && x <= 13;
const isStone = (x, y) => LANE_ROWS.includes(y) && x >= 2 && x <= 7;

function findPath(sx, sy, gx, gy) {
  const prev = new Map(), q = [[sx, sy]]; prev.set(bk(sx, sy), null);
  let best = [sx, sy], bestD = Math.abs(sx - gx) + Math.abs(sy - gy);
  while (q.length) {
    const [x, y] = q.shift();
    const d = Math.abs(x - gx) + Math.abs(y - gy);
    if (d < bestD) { bestD = d; best = [x, y]; }
    if (d === 0) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = bk(nx, ny);
      if (blocked(nx, ny) || prev.has(k)) continue;
      prev.set(k, [x, y]); q.push([nx, ny]);
    }
  }
  const out = []; let cur = best;
  while (cur && !(cur[0] === sx && cur[1] === sy)) { out.unshift(cur); cur = prev.get(bk(cur[0], cur[1])); }
  return out;
}

/* ---------- ゲームの じょうたい ---------- */
const cv = $('cv'), ctx = cv.getContext('2d');
let slotIx = -1, data = null, running = false, busy = false;
let intro = null;
let m, cat, path = [], held = null, dest = null, holes = [], chest = null, digMiss = 0, tNow = 0;

const target = () => ({ x: FLOWER_X + data.seed.n, y: LANE_ROWS[data.seed.lanes.indexOf(data.seed.c)] });
const keysGot = () => (data.s1 ? 1 : 0) + (data.s2 ? 1 : 0) + (data.letter ? 1 : 0);
function persist() { store.slots[slotIx] = data; saveAll(); }
function say(t) { $('say').textContent = t; }

function refreshHud() {
  const k = keysGot(); let h = '';
  const shape = cls => '<g class="' + cls + '"><circle cx="11" cy="11" r="5.5"/><path d="M15 15l11 11M21 21l4-4"/></g>';
  for (let i = 0; i < 3; i++) h += '<svg class="' + (i < k ? 'got' : '') + '" viewBox="0 0 32 32">' + shape('o') + shape('i') + '</svg>';
  if ($('keys').dataset.k !== String(k)) { $('keys').innerHTML = h; $('keys').dataset.k = String(k); }
  $('keys').setAttribute('aria-label', 'カギ ' + k + 'こ');
  $('btnDig').hidden = !(data.letter && !data.cleared);
  $('btnSound').setAttribute('aria-label', store.sound ? 'おとを けす' : 'おとを だす');
  $('btnSound').setAttribute('aria-pressed', String(store.sound));
}

function startGame(ix) {
  slotIx = ix;
  data = store.slots[ix];
  if (!data || data.cleared) { data = newStage(data); persist(); }
  m = { x: START.x, y: START.y, fx: START.x, fy: START.y, p: 1, face: 1, dir: 'down', fresh: false };
  cat = { x: START.x - 1, y: START.y, fx: START.x - 1, fy: START.y, face: 1, back: false };
  path = []; held = null; dest = null; holes = []; chest = null; digMiss = 0;
  $('title').hidden = true; $('game').hidden = false;
  const wc = $('who').getContext('2d'); wc.clearRect(0, 0, 72, 72); drawAnimal(wc, ANIMALS[ix].id, 36, 42, 2.5);
  $('who').setAttribute('aria-label', ANIMALS[ix].name + 'の データ');
  refreshHud(); fit();
  running = true; playMusic('field');
  intro = null;
  if (keysGot() === 0) { intro = { t: 0, ding: false }; busy = true; say('あれ? なにか とんできたよ!'); }
  else say(data.letter ? 'ばしょが わかったら「ほる」を おそう!' : data.s1 && data.s2 ? 'ポストの ほしが ひかったよ! いってみよう' : 'つづきから はじめるよ。ほしを しらべよう!');
}
function goTitle() {
  running = false; intro = null; closeModal(); playMusic(null);
  $('game').hidden = true; $('title').hidden = false; buildSlots();
}

/* ---------- いどう ---------- */
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function startStep(nx, ny) {
  cat.fx = cat.x; cat.fy = cat.y;
  if (m.x !== cat.x) cat.face = m.x > cat.x ? 1 : -1;
  cat.x = m.x; cat.y = m.y;
  m.fx = m.x; m.fy = m.y;
  if (nx !== m.x) m.face = nx > m.x ? 1 : -1;
  m.dir = nx > m.x ? 'right' : nx < m.x ? 'left' : ny > m.y ? 'down' : 'up';
  cat.back = m.y < cat.y;
  m.x = nx; m.y = ny; m.p = 0; sfx.step();
}
function update(dt) {
  if (m.p < 1) {
    m.p = Math.min(1, m.p + dt * 5.5);
    if (m.p >= 1) { m.fresh = true; if (!path.length) dest = null; }
    return;
  }
  if (busy) return;
  if (path.length) { const [nx, ny] = path.shift(); startStep(nx, ny); return; }
  if (held) { const [dx, dy] = DIRS[held]; if (!blocked(m.x + dx, m.y + dy)) { startStep(m.x + dx, m.y + dy); return; } m.dir = held; }
  // とちゅうで とおりすぎた ほしは はんのう しない。とまった ときだけ しらべる
  if (m.fresh) { m.fresh = false; const st = STARS.find(s => s.x === m.x && s.y === m.y); if (st && !chest) touchStar(st); }
}
function touchStar(st) {
  if (st.id === 1 && !data.s1) { halt(); puzzleDucks(); }
  else if (st.id === 2 && !data.s2) { halt(); puzzlePattern(); }
  else if (st.id === 3 && !data.letter) {
    if (data.s1 && data.s2) { halt(); showLetter(); }
    else say('ポストには カギが かかっているよ。さきに ほかの ほしを しらべよう');
  }
}
function halt() { path = []; held = null; dest = null; document.querySelectorAll('.pad button.on').forEach(b => b.classList.remove('on')); }

/* ---------- ほる ---------- */
function dig() {
  if (busy || m.p < 1 || chest || !data.letter || data.cleared) return;
  halt();
  const t = target();
  if (m.x === t.x && m.y === t.y) {
    busy = true; stopMusic(); sfx.dig(); setTimeout(sfx.found, 420);
    chest = { x: t.x, y: t.y, t: 0 };
    startStep(t.x + 1, t.y);
    say('たからばこが でてきた!');
    setTimeout(showChest, 1300);
    return;
  }
  sfx.dig(); digMiss++;
  if (!holes.some(h => h.x === m.x && h.y === m.y)) holes.push({ x: m.x, y: m.y });
  const col = COLORS[data.seed.c].name;
  if (digMiss >= 4) say('ひかっている いしを ほってみよう!');
  else if (digMiss >= 2) say(col + 'の おおきな はなの となりの いしから、1、2、3と かぞえてみよう');
  else say('ここには なにも ないみたい。てちょうを みてみよう');
}

/* ---------- えがく ---------- */
function drawGround(c) {
  for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) {
    const x = q * T, y = r * T;
    if (isPath(q, r)) {
      c.fillStyle = '#F7E6BC'; c.fillRect(x, y, T, T);
      for (let i = 0; i < 2; i++) ci(c, x + 6 + hash(q + i, r) * 28, y + 6 + hash(q, r + i + 7) * 28, 1.6, '#E8CF98');
      continue;
    }
    c.fillStyle = (q + r) % 2 ? '#B3E0A3' : '#BDE7AE'; c.fillRect(x, y, T, T);
    if (isStone(q, r)) el(c, x + 20, y + 22, 14, 10, '#EEE9F5', '#CFC4E2', 2);
    else if (hash(q, r) > .62) { const tx = x + 8 + hash(r, q) * 22, ty = y + 10 + hash(q + 3, r) * 22; ln(c, tx, ty, tx - 3, ty - 6, '#93CC86', 2); ln(c, tx, ty, tx + 3, ty - 6, '#93CC86', 2); }
  }
}
function drawTree(c, tx, ty, fruit) {
  const x = tx * T + 20, b = ty * T + 36; el(c, x, b, 12, 3.5, 'rgba(40,20,70,.15)'); rr(c, x - 4, b - 16, 8, 16, 2, '#A9744F');
  ci(c, x, b - 30, 18, '#6CC08B'); ci(c, x - 6, b - 35, 8, '#8FD6A6');
  if (fruit) { ci(c, x + 7, b - 27, 3, '#FF7E8A'); ci(c, x - 9, b - 24, 3, '#FF7E8A'); ci(c, x + 1, b - 38, 3, '#FF7E8A'); }
}
function drawHouse(c) {
  const x = T, y = 0, w = 5 * T, h = 3 * T;
  rr(c, x + 6, y + h * .42, w - 12, h * .58 - 2, 6, '#FFF6E3', '#E8D5B5', 2);
  poly(c, [[x + 18, y + 4], [x + w - 18, y + 4], [x + w, y + h * .46], [x, y + h * .46]], '#FF9DB5');
  c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 2;
  for (let i = 1; i < 4; i++) { const yy = y + 4 + (h * .46 - 4) * i / 4; c.beginPath(); c.moveTo(x + 18 - 18 * i / 4 + 4, yy); c.lineTo(x + w - 18 + 18 * i / 4 - 4, yy); c.stroke(); }
  rr(c, x + w / 2 - 11, y + h - 34, 22, 32, [11, 11, 0, 0], '#C98A5E', '#A56D45', 2); ci(c, x + w / 2 + 5, y + h - 16, 2, '#FFD25E');
  for (const wx of [x + w * .22, x + w * .78]) { rr(c, wx - 11, y + h * .56, 22, 20, 4, '#BFE9F7', '#FFFFFF', 3); ln(c, wx, y + h * .56, wx, y + h * .56 + 20, '#FFFFFF', 2); }
}
function drawFence(c) {
  const y = 9 * T + 8; rr(c, 0, y + 8, COLS * T, 4, 2, '#FFFFFF'); rr(c, 0, y + 18, COLS * T, 4, 2, '#FFFFFF');
  for (let i = 0; i < COLS * 2; i++) rr(c, 4 + i * 20, y, 8, 28, [4, 4, 1, 1], '#FFFFFF', '#E2DAF0', 1);
}
const DUCK_POS = [[11.9, 1.5], [13.1, 1.0], [14.1, 1.6], [12.6, 2.2], [13.7, 2.3]];

function drawStar(c, st, t) {
  const lit = st.id !== 3 || (data.s1 && data.s2);
  const x = st.x * T + 20, y = st.y * T + 17 + (lit ? Math.sin(t * 3 + st.id) * 3 : 0);
  if (!lit) { starShape(c, x, y, 15, '#D8D2E6', '#FFFFFF'); num(c, st.id, x, y + 1.5, 13, '#9A90B8'); return; }
  const pulse = (Math.sin(t * 4 + st.id) + 1) / 2;
  // ひかりの わ
  const R = 34 + pulse * 8, gr = c.createRadialGradient(x, y, 6, x, y, R);
  gr.addColorStop(0, 'rgba(255,244,170,.95)'); gr.addColorStop(.55, 'rgba(255,214,90,.5)'); gr.addColorStop(1, 'rgba(255,214,90,0)');
  ci(c, x, y, R, gr);
  // まわる ひかりの すじ
  c.save(); c.translate(x, y); c.rotate(t * .8 + st.id);
  for (let i = 0; i < 8; i++) { c.rotate(PI / 4); ln(c, 0, -27, 0, -33 - pulse * 5, 'rgba(255,255,255,.95)', 3); }
  c.restore();
  starShape(c, x, y, 21 + pulse * 2, '#FFC83D', '#FFFFFF');
  num(c, st.id, x, y + 2, 17, '#3A2D58');
  // きらきら
  for (let i = 0; i < 3; i++) { const a = t * 1.5 + i * 2.1 + st.id, k = (Math.sin(t * 5 + i * 2) + 1) / 2; starShape(c, x + Math.cos(a) * 30, y + Math.sin(a) * 24, 2 + k * 4, '#FFFFFF'); }
}

function render(t) {
  const c = ctx, s = cv.width / (COLS * T);
  c.setTransform(s, 0, 0, s, 0, 0);
  drawGround(c);
  // ひらたい もの
  drawPond(c, 11 * T, 0.3 * T, 4 * T, 2.6 * T);
  el(c, 12.3 * T, 2.45 * T, 8, 5, '#7CCB8E'); ci(c, 12.3 * T + 2, 2.45 * T - 1, 2.5, '#FF9CC2');
  for (let i = 0; i < data.seed.n; i++) drawDuck(c, DUCK_POS[i][0] * T, DUCK_POS[i][1] * T + Math.sin(t * 2 + i * 1.7) * 1.5, i === 1 ? '#FFE38A' : '#FFFFFF');
  rr(c, 9 * T + 2, 5 * T + 6, 6 * T - 4, T - 8, 10, '#C99B77', '#B4835F', 2);
  for (const h of holes) el(c, h.x * T + 20, h.y * T + 24, 11, 6, '#A9825F', '#8C6A4C', 2);
  if (data.letter && !chest && digMiss >= 4) { const g = target(); ci(c, g.x * T + 20, g.y * T + 22, 16 + Math.sin(t * 5) * 3, 'rgba(255,214,90,.55)'); starShape(c, g.x * T + 20, g.y * T + 20, 7, '#FFFFFF'); }
  if (dest) ci(c, dest.x * T + 20, dest.y * T + 22, 9 + Math.sin(t * 6) * 2, null, 'rgba(217,71,138,.7)', 3);

  // たっている もの(うしろから まえへ)
  const items = [];
  items.push({ y: 3, f: () => drawHouse(c) });
  items.push({ y: 1, f: () => drawTree(c, 8, 0, true) }, { y: 5, f: () => drawTree(c, 0, 4) }, { y: 8, f: () => drawTree(c, 15, 7) }, { y: 8, f: () => drawTree(c, 10, 7) });
  items.push({ y: 3, f: () => { const x = 6 * T + 20, b = 2 * T + 36; rr(c, x - 2, b - 18, 4, 18, 1, '#A9744F'); rr(c, x - 10, b - 30, 20, 14, [7, 7, 2, 2], '#FF6F7D'); rr(c, x - 6, b - 24, 12, 2.5, 1, '#FFFFFF'); } });
  items.push({ y: 8, f: () => { const x = 12 * T, y = 7 * T; rr(c, x + 5, y + 16, 30, 22, 3, '#FFE9C7', '#E8D5B5', 2); poly(c, [[x + 20, y], [x + 40, y + 18], [x, y + 18]], '#7FB6F0'); c.beginPath(); c.arc(x + 20, y + 30, 7, PI, 0); c.lineTo(x + 27, y + 38); c.lineTo(x + 13, y + 38); c.closePath(); c.fillStyle = '#6B4A3A'; c.fill(); } });
  items.push({ y: 6, f: () => {
    for (let i = 0; i < 5; i++) drawFlower(c, (9 + i) * T + 20, 5 * T + 20, COLORS[i % 2 ? data.seed.c : data.seed.other].hex);
    const qx = 14 * T + 20, qy = 5 * T + 18;
    if (data.s2) drawFlower(c, qx, 5 * T + 20, COLORS[data.seed.c].hex);
    else { ci(c, qx, qy, 11, '#FFFFFF', '#CFC4E2', 2); num(c, '?', qx, qy + 1, 15, '#D9478A'); }
  } });
  LANE_ROWS.forEach((r, i) => items.push({ y: r + 1, f: () => drawBigFlower(c, FLOWER_X * T + 20, r * T + 36, COLORS[data.seed.lanes[i]].hex) }));
  if (chest) items.push({ y: chest.y + .9, f: () => { const k = Math.min(1, chest.t * 2.5), sc = k * (1 + .25 * Math.sin(k * PI)); drawChest(c, chest.x * T + 20 - 20 * sc, chest.y * T + 38 - 38 * sc, sc); } });

  const e = m.p, mx = m.fx + (m.x - m.fx) * e, my = m.fy + (m.y - m.fy) * e;
  const cx = cat.fx + (cat.x - cat.fx) * e, cy = cat.fy + (cat.y - cat.fy) * e;
  const walking = m.p < 1, bob = walking ? Math.abs(Math.sin(e * PI)) * 3 : Math.sin(t * 2.4) * .6 + .6;
  items.push({ y: my + .95, f: () => drawGirl(c, mx * T + 20, my * T + 37, 1.6, m.dir, bob) });
  items.push({ y: cy + .94, f: () => drawCat(c, cx * T + 20, cy * T + 37, 1.35, cat.face, walking ? Math.abs(Math.sin(e * PI + 1)) * 2 : 0, cat.back && walking) });
  items.sort((a, b) => a.y - b.y).forEach(o => o.f());
  drawFence(c);

  for (const st of STARS) {
    if ((st.id === 1 && data.s1) || (st.id === 2 && data.s2) || (st.id === 3 && data.letter)) continue;
    drawStar(c, st, t);
  }
  if (intro) {   // はねの ついた てがみが ミミの ところへ とんでくる
    const p = Math.min(1, intro.t / 1.5), k = 1 - Math.pow(1 - p, 2);
    const ex = m.x * T + 20, ey = m.y * T - 42, sx = COLS * T + 40, sy = -30;
    const x = sx + (ex - sx) * k, y = sy + (ey - sy) * k - Math.sin(p * PI) * 46 + (p >= 1 ? Math.sin(t * 5) * 2 : 0);
    for (let i = 1; i <= 3; i++) { const q = Math.max(0, k - i * .05); if (p < 1) starShape(c, sx + (ex - sx) * q + 18, sy + (ey - sy) * q - Math.sin(Math.max(0, p - i * .05) * PI) * 46, 4 - i, '#FFFFFF'); }
    drawEnvelope(c, x, y, 1.5, t * 18);
    if (p >= 1) { const b = Math.min(1, (intro.t - 1.5) * 5); ci(c, ex + 34, ey - 6, 12 * b, '#FFFFFF', '#3A2D58', 2); num(c, '!', ex + 34, ey - 5, 16 * b, '#D9478A'); }
  }
}

let last = 0;
function frame(ts) {
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; tNow = ts / 1000;
  if (running && data) {
    if (chest) chest.t += dt;
    if (intro) {
      intro.t += dt;
      if (intro.t > 1.5 && !intro.ding) { intro.ding = true; sfx.ok(); }
      if (intro.t > 2.6) { intro = null; showIntro(); }
    }
    update(dt); render(tNow); drawClouds(tNow);
  }
  requestAnimationFrame(frame);
}

/* マップの まわりの あきに、そらと おかと のはらを えがく。hz は ちへいせんの たかさ */
/* くもは べつの レイヤーで ゆっくり ながす(1びょうに 3〜5ピクセル) */
let sceneryBox = null;
const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function drawClouds(t) {
  if (!sceneryBox) return;
  const { W, hz, dpr } = sceneryBox, cl = $('clouds'), c = cl.getContext('2d');
  const top = hz - Math.min(70, hz * .55);          // おかの てっぺんより うえだけに かく
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, cl.height / dpr);
  if (hz <= 70) return;
  const n = Math.max(2, Math.floor(W / 150)), span = W + 140;
  c.save(); c.beginPath(); c.rect(0, 0, W, top + 6); c.clip();
  for (let i = 0; i < n; i++) {
    const s = .8 + hash(i, 5) * .6, speed = 3 + hash(i, 8) * 2;
    const x = ((i + hash(i, 9) * .5) * span / n + (calm ? 0 : t * speed)) % span - 70, y = 14 + (top - 34) * hash(i, 3);
    for (const [dx, dy, r] of [[-16, 4, 11], [0, 0, 15], [16, 4, 11], [-4, 8, 12], [8, 8, 11]]) ci(c, x + dx * s, y + dy * s, r * s, 'rgba(255,255,255,.92)');
  }
  c.restore();
}
function drawScenery(W, H, hz) {
  const bg = $('bg'), dpr = Math.min(2, window.devicePixelRatio || 1);
  bg.width = Math.round(W * dpr); bg.height = Math.round(H * dpr);
  const cl = $('clouds'); cl.width = bg.width; cl.height = bg.height; sceneryBox = { W, hz, dpr }; drawClouds(tNow);
  const c = bg.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = c.createLinearGradient(0, 0, 0, Math.max(1, hz));
  sky.addColorStop(0, '#AEDCF7'); sky.addColorStop(1, '#EAF7FD');
  c.fillStyle = sky; c.fillRect(0, 0, W, hz);
  if (hz > 70) {                                   // おひさま
    ci(c, W - 46, Math.min(44, hz * .3), 30, 'rgba(255,236,150,.5)'); ci(c, W - 46, Math.min(44, hz * .3), 19, '#FFE38A');
  }
  const hr = Math.min(70, hz * .55);               // とおくの おか
  el(c, W * .22, hz, W * .42, hr, '#BFE3D2'); el(c, W * .8, hz, W * .38, hr * .8, '#CDEBD9'); el(c, W * .52, hz, W * .3, hr * .55, '#B3DEC4');
  for (let x = -10, i = 0; x < W + 20; x += 34 + hash(i, 2) * 18, i++) {   // きの ならび
    const r = 15 + hash(i, 7) * 9;
    ci(c, x, hz - r * .55, r, i % 3 ? '#7CCB96' : '#6CC08B'); ci(c, x - r * .3, hz - r * .8, r * .45, '#9ADCAE');
  }
  c.fillStyle = '#A9DB9A'; c.fillRect(0, hz, W, H - hz);                     // のはら
  for (let i = 0; i < Math.floor(W * (H - hz) / 2600); i++) {
    const x = hash(i, 11) * W, y = hz + 8 + hash(i, 13) * (H - hz - 12);
    if (i % 4 === 0) { for (let k = 0; k < 5; k++) { const a = k * PI * 2 / 5; ci(c, x + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4, 2.6, i % 8 ? '#FFFFFF' : '#FFD25E'); } ci(c, x, y, 2, '#FFE38A'); }
    else { ln(c, x, y, x - 3, y - 6, '#8CCB7E', 2); ln(c, x, y, x + 3, y - 6, '#8CCB7E', 2); }
  }
}
function fit() {
  const f = $('field'); if (!f.clientWidth) return;
  const w = Math.max(160, Math.min(f.clientWidth - 6, (f.clientHeight - 24) * 1.6)), h = w / 1.6;
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const fr = f.getBoundingClientRect(), cr = cv.getBoundingClientRect(), k = $('keys');
  k.style.left = (cr.left - fr.left + 14) + 'px'; k.style.top = (cr.top - fr.top - 15) + 'px';
  drawScenery(f.clientWidth, f.clientHeight, cr.top - fr.top + 12);
  const bw = Math.round(Math.min(1600, Math.max(640, w * (window.devicePixelRatio || 1))));
  if (cv.width !== bw) { cv.width = bw; cv.height = Math.round(bw / 1.6); }
}

/* ---------- モーダル ---------- */
function openModal(html) { busy = true; halt(); $('panel').innerHTML = html; $('modal').hidden = false; $('panel').scrollTop = 0; const b = $('panel').querySelector('[data-focus]'); if (b) b.focus({ preventScroll: true }); return $('panel'); }
function closeModal() { $('modal').hidden = true; $('panel').innerHTML = ''; busy = false; }
function mk(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d')); return c; }

function showIntro() {
  sfx.open();
  const p = openModal('<h2>ミミに てがみが とどいたよ!</h2><div id="pic"></div><button class="btn" data-focus type="button">あける</button>');
  const e = mk(280, 200, x => drawEnvelope(x, 140, 104, 7.4)); e.className = 'prize wig'; p.querySelector('#pic').appendChild(e);
  p.querySelector('.btn').onclick = () => {
    sfx.ok();
    const q = openModal('<div id="pic"></div><div class="letter">たんていミミへ。<br>にわの どこかに たからものを かくしたよ。<br>カギを 3つ あつめて、みつけてね。</div><p class="small">いきたい ところを タッチすると あるくよ</p><button class="btn" data-focus type="button">はじめる</button>');
    const s = mk(140, 100, x => drawEnvelope(x, 70, 52, 3.6)); s.className = 'prize sm'; q.querySelector('#pic').appendChild(s);
    q.querySelector('.btn').onclick = () => { sfx.open(); closeModal(); say('ひかっている ほしを しらべてみよう!'); };
  };
}

function reward(n, after) {
  sfx.ok();
  const p = openModal('<h2>せいかい!</h2><div id="rw"></div><p>カギを てに いれた!<br>こたえは てちょうに かいておいたよ</p><button class="btn" data-focus type="button">つぎへ</button>');
  const c = mk(200, 160, x => drawKey(x, 96, 76, 2.6)); c.className = 'prize'; p.querySelector('#rw').appendChild(c);
  p.querySelector('.btn').onclick = () => { closeModal(); refreshHud(); after(); };
}
const afterClue = () => say(data.s1 && data.s2 ? 'ポストの ほしが ひかったよ! いってみよう' : 'もう ひとつの ほしも しらべてみよう!');

function puzzleDucks() {
  sfx.open(); let miss = 0;
  const p = openModal('<span class="tag">なぞ 1</span><h2>いけの あひるは なんわ?</h2><div id="pic"></div><div class="row" id="ch"></div><p class="fb" id="fb"></p>');
  const paint = hint => {
    const c = mk(560, 300, x => {
      x.fillStyle = '#BDE7AE'; x.fillRect(0, 0, 560, 300);
      drawPond(x, 30, 24, 500, 252);
      for (let i = 0; i < data.seed.n; i++) {
        const dx = 280 + (DUCK_POS[i][0] - 13) * 170, dy = 150 + (DUCK_POS[i][1] - 1.6) * 150;
        drawDuck(x, dx, dy, i === 1 ? '#FFE38A' : '#FFFFFF', 2.6);
        if (hint) { ci(x, dx - 6, dy - 44, 15, '#FFC83D', '#FFFFFF', 3); num(x, i + 1, dx - 6, dy - 43, 17, '#3A2D58'); }
      }
    });
    c.className = 'pic'; p.querySelector('#pic').replaceChildren(c);
  };
  paint(false);
  for (let v = 2; v <= 6; v++) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'choice'; b.textContent = v;
    b.onclick = () => {
      if (v === data.seed.n) { data.s1 = true; persist(); reward(1, afterClue); return; }
      sfx.ng(); miss++; b.classList.remove('no'); void b.offsetWidth; b.classList.add('no');
      if (miss >= 2) { paint(true); p.querySelector('#fb').textContent = 'ばんごうを つけたよ。ゆびで さしながら かぞえてみよう'; }
      else p.querySelector('#fb').textContent = 'もういちど よく みてみよう';
    };
    p.querySelector('#ch').appendChild(b);
  }
}

function puzzlePattern() {
  sfx.open(); let miss = 0;
  const A = COLORS[data.seed.other], B = COLORS[data.seed.c];
  const p = openModal('<span class="tag">なぞ 2</span><h2>つぎに さく はなは なにいろ?</h2><div id="pic"></div><div class="row" id="ch"></div><p class="fb" id="fb"></p>');
  const c = mk(560, 170, x => {
    x.fillStyle = '#BDE7AE'; x.fillRect(0, 0, 560, 170);
    rr(x, 16, 86, 528, 60, 18, '#C99B77', '#B4835F', 3);
    for (let i = 0; i < 5; i++) drawFlower(x, 60 + i * 88, 84, (i % 2 ? B : A).hex, 3.2);
    ci(x, 500, 76, 30, '#FFFFFF', '#CFC4E2', 3); num(x, '?', 500, 78, 38, '#D9478A');
  });
  c.className = 'pic'; p.querySelector('#pic').appendChild(c);
  Object.keys(COLORS).forEach(k => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'choice';
    b.appendChild(mk(104, 104, x => drawFlower(x, 52, 58, COLORS[k].hex, 3.4)));
    const s = document.createElement('small'); s.textContent = COLORS[k].name; b.appendChild(s);
    b.onclick = () => {
      if (k === data.seed.c) { data.s2 = true; persist(); reward(2, afterClue); return; }
      sfx.ng(); miss++; b.classList.remove('no'); void b.offsetWidth; b.classList.add('no');
      p.querySelector('#fb').textContent = miss >= 2 ? '「' + A.name + '、' + B.name + '、' + A.name + '、' + B.name + '…」と こえに だして よんでみよう' : 'ならびかたの きまりを さがしてみよう';
    };
    p.querySelector('#ch').appendChild(b);
  });
}

const REF = n => '<span class="ref">てちょう<span class="badge">' + n + '</span></span>';
const LETTER = REF(2) + ' の いろの おおきな はなを さがそう。<br>そこから みぎへ、' + REF(1) + ' と おなじ かずだけ いしを かぞえて、ほろう!';
function showLetter() {
  sfx.ok();
  const first = !data.letter;
  if (first) { data.letter = true; persist(); }
  const p = openModal('<span class="tag">なぞ 3</span><h2>ポストに てがみと カギが あった!</h2><div id="pic"></div><div class="letter">' + LETTER + '</div><p class="small">なぞ 1 と なぞ 2 の こたえは てちょうに かいてあるよ</p><div class="row"><button class="btn sub" id="toNote" type="button">てちょうを みる</button><button class="btn" data-focus id="ok" type="button">わかった!</button></div>');
  const ev = mk(140, 100, x => drawEnvelope(x, 70, 52, 3.6)); ev.className = 'prize sm'; p.querySelector('#pic').appendChild(ev);
  const done = () => { refreshHud(); say('ばしょが わかったら「ほる」を おそう!'); };
  p.querySelector('#ok').onclick = () => { closeModal(); done(); };
  p.querySelector('#toNote').onclick = () => { done(); showNote(); };
}

function showNote() {
  if (!data) return;
  sfx.open();
  const p = openModal('<h2>たんていてちょう</h2><ul class="note">' +
    '<li><span class="badge">1</span><span class="q">いけの あひるの かず</span><span class="a" id="a1"></span></li>' +
    '<li><span class="badge">2</span><span class="q">つぎに さく はなの いろ</span><span class="a" id="a2"></span></li>' +
    '<li><span class="badge">3</span><span class="q">ポストの てがみ</span><span class="a txt" id="a3"></span></li></ul>' +
    '<button class="btn" data-focus type="button">とじる</button>');
  p.querySelector('#a1').textContent = data.s1 ? data.seed.n + ' わ' : '?';
  const a2 = p.querySelector('#a2');
  if (data.s2) { a2.appendChild(mk(80, 80, x => drawFlower(x, 40, 44, COLORS[data.seed.c].hex, 2.6))); a2.append(COLORS[data.seed.c].name); } else a2.textContent = '?';
  const a3 = p.querySelector('#a3');
  if (data.letter) a3.innerHTML = LETTER; else a3.textContent = '?';
  p.querySelector('.btn').onclick = closeModal;
}

function showChest() {
  m.dir = 'left';
  const p = openModal('<h2>たからばこを みつけた!</h2><div id="pic"></div><p>3つの カギで あけてみよう</p><button class="btn" data-focus type="button">あける</button>');
  const c = mk(240, 200, x => drawChest(x, 20, 10, 5)); c.className = 'prize'; p.querySelector('#pic').appendChild(c);
  p.querySelector('.btn').onclick = () => {
    data.cleared = true;
    if (!data.treasures.includes('brooch')) data.treasures.push('brooch');
    persist(); refreshHud();
    openChestScene();
  };
}

/* たからばこが ひらく えんしゅつ: ゆれる → ふたが あく → ひかりの なかから たからものが でてくる */
function drawChestOpening(c, x, y, s, open) {
  c.save(); c.translate(x, y); c.scale(s, s);
  if (open > 0) {
    rr(c, 5, 10, 30, 10, 2, '#5A3418');
    const gr = c.createLinearGradient(0, 16, 0, -44);
    gr.addColorStop(0, 'rgba(255,236,150,' + (.95 * open) + ')'); gr.addColorStop(1, 'rgba(255,236,150,0)');
    poly(c, [[7, 16], [33, 16], [50, -44], [-10, -44]], gr);
  }
  c.save(); c.translate(3, 20); c.rotate(-open * 1.15); c.translate(-3, -20 - open * 3);   // ふた
  rr(c, 3, 6, 34, 14, [12, 12, 0, 0], '#D08C4F', '#7A4B2A', 2); rr(c, 8, 6, 4, 14, 0, '#F2C14E'); rr(c, 28, 6, 4, 14, 0, '#F2C14E');
  c.restore();
  rr(c, 3, 16, 34, 20, 3, '#B8733F', '#7A4B2A', 2); rr(c, 3, 17, 34, 4, 0, '#F2C14E'); rr(c, 8, 17, 4, 19, 0, '#F2C14E'); rr(c, 28, 17, 4, 19, 0, '#F2C14E');
  rr(c, 16, 16, 8, 10, 2, '#FFE38A', '#B58A1F', 1.5);
  c.restore();
}
function openChestScene() {
  const p = openModal('<h2 id="ttl">カギを さしこむよ…</h2><div id="pic"></div><div id="after" hidden><p>1話 クリア! めいたんていだね</p><p class="small">つづきの おはなしは じゅんびちゅうだよ</p></div><button class="btn" id="fin" type="button" hidden>タイトルへ</button>');
  const cvs = document.createElement('canvas'); cvs.width = 420; cvs.height = 340; cvs.className = 'pic'; p.querySelector('#pic').appendChild(cvs);
  const c = cvs.getContext('2d'), ease = v => 1 - Math.pow(1 - Math.min(1, Math.max(0, v)), 3);
  let t0 = null, opened = false, done = false;
  for (const d of [0, .18, .36]) tone(300, .06, d, 'square', .05);   // カギが カチャカチャ なる
  p.querySelector('#fin').onclick = goTitle;
  const tick = ts => {
    if (!cvs.isConnected) return;
    if (t0 === null) t0 = ts;
    const t = (ts - t0) / 1000;
    c.clearRect(0, 0, 420, 340);
    const open = ease((t - .7) / .5), rise = ease((t - 1.1) / 1.0);
    if (rise > 0) {   // まわる ひかり
      c.save(); c.translate(210, 250 - rise * 140); c.rotate(t * .6);
      for (let i = 0; i < 12; i++) { c.rotate(PI / 6); poly(c, [[-9, 0], [9, 0], [0, -150 * rise]], 'rgba(255,225,120,' + (.38 * rise) + ')'); }
      c.restore();
    }
    const shake = t < .7 ? Math.sin(t * 60) * 5 * (t / .7) : 0;
    drawChestOpening(c, 110 + shake, 150, 5, open);
    if (rise > 0) {
      drawBrooch(c, 210, 250 - rise * 140, .5 + rise * 1.6);
      for (let i = 0; i < 6; i++) { const a = t * 1.4 + i * PI / 3, r = 70 + 26 * Math.sin(t * 3 + i); starShape(c, 210 + Math.cos(a) * r * rise * 1.3, 250 - rise * 140 + Math.sin(a) * r * rise, 3 + 3 * Math.abs(Math.sin(t * 4 + i)), '#FFFFFF', '#FFD25E'); }
    }
    if (!opened && t > .7) { opened = true; sfx.fanfare(); playMusic('clear', 2.2); p.querySelector('#ttl').textContent = 'たからばこが ひらいた!'; }
    if (!done && t > 2.3) { done = true; p.querySelector('#ttl').textContent = 'おはなの ブローチを てに いれた!'; p.querySelector('#after').hidden = false; const f = p.querySelector('#fin'); f.hidden = false; f.focus({ preventScroll: true }); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- タイトル ---------- */
function slotState(d) {
  if (!d) return 'はじめから';
  if (d.cleared) return '1話 クリア・たからもの ' + d.treasures.length + 'こ';
  const k = (d.s1 ? 1 : 0) + (d.s2 ? 1 : 0) + (d.letter ? 1 : 0);
  return '1話・カギ ' + k + 'こ';
}
function buildSlots() {
  const host = $('slots'); host.replaceChildren();
  ANIMALS.forEach((a, i) => {
    const d = store.slots[i];
    const wrap = document.createElement('div'); wrap.className = 'slot';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'slot-main';
    b.appendChild(mk(168, 168, x => drawAnimal(x, a.id, 84, 100, 5.4)));
    b.insertAdjacentHTML('beforeend', '<span class="who">' + a.name + '</span><span class="state">' + slotState(d) + '</span>');
    b.onclick = () => { sfx.open(); startGame(i); };
    wrap.appendChild(b);
    if (d) {
      const del = document.createElement('button'); del.type = 'button'; del.className = 'slot-del';
      del.innerHTML = '<i></i><span>ながおしで けす</span>';
      let timer = null;
      const stop = () => { clearTimeout(timer); timer = null; del.classList.remove('hold'); };
      del.onpointerdown = () => { del.classList.add('hold'); timer = setTimeout(() => { store.slots[i] = null; saveAll(); buildSlots(); }, 1400); };
      del.onpointerup = del.onpointerleave = del.onpointercancel = stop;
      wrap.appendChild(del);
    }
    host.appendChild(wrap);
  });
}

/* ---------- にゅうりょく ---------- */
cv.addEventListener('pointerdown', ev => {
  if (busy || !running || chest) return;
  const r = cv.getBoundingClientRect();
  const tx = Math.floor((ev.clientX - r.left) / r.width * COLS), ty = Math.floor((ev.clientY - r.top) / r.height * ROWS);
  if (tx === m.x && ty === m.y && m.p >= 1) { const st = STARS.find(s => s.x === tx && s.y === ty); if (st) touchStar(st); return; }
  held = null;
  path = findPath(m.x, m.y, tx, ty);
  dest = path.length ? { x: path[path.length - 1][0], y: path[path.length - 1][1] } : null;
});
document.querySelectorAll('.pad button').forEach(b => {
  const d = b.dataset.dir;
  b.addEventListener('pointerdown', ev => { ev.preventDefault(); if (busy || chest) return; path = []; dest = null; held = d; b.classList.add('on'); });
  const up = () => { if (held === d) held = null; b.classList.remove('on'); };
  b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
  b.addEventListener('contextmenu', ev => ev.preventDefault());
});
const KEYMAP = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
window.addEventListener('keydown', ev => {
  if (!running) return;
  if (ev.key === 'Escape' && !$('modal').hidden && $('panel').querySelector('.note')) { closeModal(); return; }
  if (busy || chest) return;
  const d = KEYMAP[ev.key];
  if (d) { ev.preventDefault(); path = []; dest = null; held = d; }
  else if ((ev.key === ' ' || ev.key === 'Enter') && document.activeElement === document.body) { ev.preventDefault(); dig(); }
});
window.addEventListener('keyup', ev => { if (KEYMAP[ev.key] === held) held = null; });
$('btnDig').onclick = dig;
$('btnNote').onclick = () => { if (!busy) showNote(); };
$('btnHome').onclick = () => { if (!chest) goTitle(); };
$('btnSound').onclick = () => { store.sound = !store.sound; saveAll(); refreshHud(); sfx.open(); if (store.sound) playMusic(wantTrack); else stopMusic(); };
window.addEventListener('resize', fit);
if (window.ResizeObserver) new ResizeObserver(fit).observe($('field'));

/* ---------- はじまり ---------- */
function boot() {
  const a = $('titleArt').getContext('2d');
  drawGirl(a, 150, 224, 5.2); drawCat(a, 290, 226, 3.6, -1);
  drawCat($('catface').getContext('2d'), 58, 128, 5.2);
  buildSlots();
  requestAnimationFrame(frame);
}
let booted = false; const go = () => { if (!booted) { booted = true; boot(); } };
if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('400 13px "Mochiy Pop One"', '123?')]).then(go, go);
setTimeout(go, 1500);
})();
