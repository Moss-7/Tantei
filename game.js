/* たんていミミと ひみつの たからもの — 1話「おうちと にわ」、2話「がっこう」 */
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
// 1話の ばしょ: ポストの よこの スタート、そこから みぎへ ならぶ いし、おおきな はな、こや
const START_MAT = { x: 6, y: 3 }, STONE_X0 = 7, STONE_N = 6;
const BIGF = [[2, 6], [5, 8], [8, 6]];
const HUTS = [[9, 7], [12, 7], [15, 7]];
const ROOFS = { red: { name: 'あか', hex: '#FF7E8A' }, blue: { name: 'あお', hex: '#6FA8F5' } };
/* はなしごとの さだめ。あたらしい はなしは ここに たして、マップ・なぞ・けしきを それぞれ かく */
const STAGE = {
  1: { name: 'おうちと にわ', place: 'にわ', track: 'field', scene: 'garden', start: { x: 4, y: 3 },
       treasure: { id: 'brooch', name: 'おはなの ブローチ', draw: (c, x, y, s) => drawBrooch(c, x, y, s) },
       foundSay: 'こやの なかに カギと たからばこが あった!' },
  2: { name: 'がっこう', place: 'がっこう', track: 'school', scene: 'school', start: { x: 8, y: 6 },
       treasure: { id: 'musicbox', name: 'ほしの オルゴール', draw: (c, x, y, s) => drawMusicBox(c, x, y, s) },
       foundSay: 'ロッカーの なかに カギと たからばこが あった!' },
};
const LAST_STAGE = 2;
let stageNo = 1;
const stg = () => STAGE[stageNo];
const GO_SAY = 'ばしょが わかったら、そこで「さがす」を おそう!';

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
  // こや: やねの いろと いりぐちの かたち。りょうほう あう こやは 1つだけ
  const r = pick(['red', 'blue']), d = pick(['round', 'square']);
  const combos = [[r, d], [r, d === 'round' ? 'square' : 'round'], [r === 'red' ? 'blue' : 'red', d]];
  const order = [0, 1, 2].sort(() => Math.random() - 0.5);
  return { n: 3 + Math.floor(Math.random() * 3), c, other, lanes, r, d, huts: order.map(i => combos[i]), ans: order.indexOf(0) };
}
// 2話: いすの いろの れつ(col)と まえから k ばんめの つくえ、とけいの じかん(h)と おなじ ばんごうの はこ、ロッカーの だん(lr)と れつ(lc)
function newSeed2() {
  const r = n => Math.floor(Math.random() * n);
  return { col: r(3), k: 1 + r(3), h: 2 + r(4), lr: 1 + r(4), lc: 1 + r(5) };
}
function newStage(old, no = 1) {
  return { stage: no, seed: no === 2 ? newSeed2() : newSeed(), s1: false, s2: false, letter: false, cleared: false, treasures: old ? old.treasures : [] };
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
  hit() { [659, 784, 988, 1319, 1568].forEach((f, i) => tone(f, .22, .12 + i * .08, 'triangle', .13)); [2093, 2637, 2093, 3136].forEach((f, i) => tone(f, .12, .62 + i * .09, 'sine', .06)); },   // みつけた!: かけあがる おとと きらきら
  miss() { tone(311, .16, .24, 'triangle', .14); tone(233, .3, .4, 'triangle', .14); },   // さがしたけれど なにも ない: さがる 2つの おと
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
  // タイトル: ぬきあし さしあしの はずむ リズム(イ短調)。みじかく きった おとで かるく
  title: { beat: .27, gate: .5, bassGate: .45, wave: 'square', vol: .028,
    mel: [[69,.5],[0,.5],[72,.5],[0,.5],[76,.5],[0,.5],[75,.5],[76,.5],  [81,1],[0,1],[79,.5],[76,.5],[72,1],
          [74,.5],[0,.5],[77,.5],[0,.5],[81,.5],[0,.5],[80,.5],[81,.5],  [83,1],[0,1],[76,2],
          [84,.5],[83,.5],[81,.5],[79,.5],[81,1],[76,1],  [77,.5],[76,.5],[74,.5],[72,.5],[74,1],[71,1],
          [72,.5],[0,.5],[76,.5],[0,.5],[81,.5],[0,.5],[80,.5],[83,.5],  [81,1.5],[0,.5],[81,.5],[0,1.5]],
    bass: [[45,1],[52,1],[45,1],[52,1], [45,1],[52,1],[45,1],[52,1], [50,1],[57,1],[50,1],[57,1], [52,1],[59,1],[52,1],[56,1],
           [45,1],[52,1],[45,1],[52,1], [50,1],[57,1],[43,1],[50,1], [45,1],[52,1],[45,1],[52,1], [45,1],[52,1],[45,1],[0,1]] },
  field: { beat: .4,
    mel: [[72,1],[76,1],[79,1],[76,1], [81,1],[79,1],[76,2], [77,1],[81,1],[79,1],[76,1], [74,1],[76,1],[74,2],
          [72,1],[76,1],[79,1],[84,1], [83,1],[81,1],[79,2], [81,1],[79,1],[77,1],[74,1], [72,2],[0,2]],
    bass: [[48,2],[55,2], [45,2],[52,2], [53,2],[48,2], [55,2],[43,2], [48,2],[52,2], [55,2],[52,2], [53,2],[55,2], [48,2],[48,2]] },
  // がっこう: あかるく はずむ へ長調
  school: { beat: .36, gate: .8,
    mel: [[77,1],[81,1],[84,1],[81,1], [82,.5],[81,.5],[79,1],[77,2], [79,1],[82,1],[86,1],[82,1], [84,.5],[82,.5],[81,1],[79,2],
          [81,1],[84,1],[89,1],[84,1], [86,.5],[84,.5],[82,1],[81,2], [79,1],[81,.5],[82,.5],[84,1],[76,1], [77,2],[0,2]],
    bass: [[53,2],[60,2], [53,2],[60,2], [46,2],[53,2], [48,2],[55,2], [53,2],[60,2], [46,2],[53,2], [48,2],[48,2], [53,2],[53,2]] },
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
  while (music.tm < until) { const [n, d] = tr.mel[music.i]; if (n) note(midi(n), d * tr.beat * (tr.gate || .95), music.tm, tr.wave || 'triangle', tr.vol || .055, music.gain); music.tm += d * tr.beat; music.i = (music.i + 1) % tr.mel.length; }
  while (music.tb < until) { const [n, d] = tr.bass[music.j]; if (n) note(midi(n), d * tr.beat * (tr.bassGate || .9), music.tb, 'triangle', tr.bassGate ? .09 : .06, music.gain); music.tb += d * tr.beat; music.j = (music.j + 1) % tr.bass.length; }
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

function drawGirl(c, cx, by, s, dir = 'down', bob = 0, blink = false) {
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
    if (blink) { ln(c, -4.8, -19.3, -2.2, -19.3, ink, 1); ln(c, 2.2, -19.3, 4.8, -19.3, ink, 1); }
    else { ci(c, -3.5, -19.5, 1.3, ink); ci(c, 3.5, -19.5, 1.3, ink); }
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
function drawCat(c, cx, by, s, face = 1, bob = 0, back = false, sway = 0, blink = false) {
  c.save(); c.translate(cx, by); c.scale(s * face, s);
  const w = '#FFFDF7', o = '#CFC4E2';
  el(c, 0, 0, 8, 2.5, 'rgba(40,20,70,.18)');
  c.translate(0, -bob);
  c.beginPath(); c.moveTo(6, -4); c.quadraticCurveTo(14 + sway * 2, -5, 12 + sway * 5, -14); c.strokeStyle = o; c.lineWidth = 4.4; c.lineCap = 'round'; c.stroke();
  c.strokeStyle = w; c.lineWidth = 3; c.stroke();
  el(c, 0, -6, 7, 6, w, o, .9);
  poly(c, [[-6.5, -17], [-5, -25], [-1, -20.5]], w, o, .9); poly(c, [[6.5, -17], [5, -25], [1, -20.5]], w, o, .9);
  poly(c, [[-5.3, -19], [-4.7, -22.8], [-2.6, -20.3]], '#FFB7CF'); poly(c, [[5.3, -19], [4.7, -22.8], [2.6, -20.3]], '#FFB7CF');
  ci(c, 0, -15, 7, w, o, .9);
  if (!back) {
    if (blink) { ln(c, -3.8, -15.3, -1.6, -15.3, '#3A2D58', .9); ln(c, 1.6, -15.3, 3.8, -15.3, '#3A2D58', .9); }
    else { ci(c, -2.7, -15.5, 1.2, '#3A2D58'); ci(c, 2.7, -15.5, 1.2, '#3A2D58'); }
    ci(c, 0, -13.2, .9, '#FF8FB3');
    poly(c, [[0, -8.6], [-3.5, -10.4], [-3.5, -6.8]], '#4CC3A6'); poly(c, [[0, -8.6], [3.5, -10.4], [3.5, -6.8]], '#4CC3A6');
  } else rr(c, -4, -9.6, 8, 2, 1, '#4CC3A6');
  c.restore();
}
/* シロを むきに あわせて かく。down=しょうめん、up=うしろ、left/right=よこむき */
function drawCatDir(c, cx, by, s, dir, bob = 0, sway = 0, blink = false) {
  if (dir === 'down') return drawCat(c, cx, by, s, 1, bob, false, sway, blink);
  if (dir === 'up') return drawCat(c, cx, by, s, 1, bob, true, sway, blink);
  c.save(); c.translate(cx, by); c.scale(dir === 'left' ? -s : s, s);
  const w = '#FFFDF7', o = '#CFC4E2', ink = '#3A2D58';
  el(c, 0, 0, 9, 2.5, 'rgba(40,20,70,.18)');
  c.translate(0, -bob);
  c.beginPath(); c.moveTo(-7, -5); c.quadraticCurveTo(-14 - sway * 2, -6, -12 - sway * 4, -16); c.strokeStyle = o; c.lineWidth = 4.4; c.lineCap = 'round'; c.stroke();
  c.strokeStyle = w; c.lineWidth = 3; c.stroke();
  rr(c, -6, -3, 3.2, 3, 1, w, o, .9); rr(c, 2.5, -3, 3.2, 3, 1, w, o, .9);
  el(c, -1, -6.5, 8.5, 5.2, w, o, .9);
  poly(c, [[1.5, -18], [3, -25], [6.5, -20.5]], w, o, .9); poly(c, [[6.5, -19.5], [9.5, -25], [11.5, -18.5]], w, o, .9);
  poly(c, [[7.6, -20], [9.4, -23], [10.5, -19.6]], '#FFB7CF');
  ci(c, 6.5, -14.5, 6.6, w, o, .9);
  if (blink) ln(c, 7.6, -15, 9.8, -15, ink, .9); else ci(c, 8.8, -15.2, 1.2, ink);
  ci(c, 12.6, -13.4, .9, '#FF8FB3');
  poly(c, [[3, -9.2], [.2, -11], [.2, -7.4]], '#4CC3A6'); poly(c, [[3, -9.2], [5.8, -11], [5.8, -7.4]], '#4CC3A6');
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
function drawMusicBox(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  ci(c, 0, 0, 34, 'rgba(255,220,110,.35)');
  poly(c, [[-18, -6], [18, -6], [14, -22], [-14, -22]], '#B79CED', '#3A2D58', 1.5);          // ひらいた ふた
  rr(c, -20, -6, 40, 24, 4, '#F58FB0', '#D9478A', 1.5); rr(c, -20, -6, 40, 5, [4, 4, 0, 0], '#FFC3D6');
  starShape(c, 0, 8, 8, '#FFD25E', '#B58A1F');
  ln(c, 20, 6, 27, 6, '#B58A1F', 2.5); ln(c, 27, 6, 27, 0, '#B58A1F', 2.5); ci(c, 27, -1, 2.6, '#FFD25E', '#B58A1F', 1);   // ハンドル
  for (const [nx, ny] of [[-9, -30], [7, -34]]) { ci(c, nx, ny, 3, '#3A2D58'); ln(c, nx + 2.6, ny, nx + 2.6, ny - 10, '#3A2D58', 1.6); ln(c, nx + 2.6, ny - 10, nx + 7, ny - 8, '#3A2D58', 1.6); }
  starShape(c, 26, -22, 5, '#FFFFFF'); starShape(c, -28, 14, 4, '#FFFFFF');
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
const DESK_X = [2, 4, 6], DESK_Y = [4, 6, 8];
const DESKS = DESK_X.flatMap(x => DESK_Y.map(y => [x, y]));
const CHAIRS = [{ name: 'ピンク', hex: '#FF9DB5' }, { name: 'あお', hex: '#7FB6F0' }, { name: 'きいろ', hex: '#FFD25E' }];   // れつごとの いすの いろ
const BOX_X0 = 9;                                    // ばんごうの はこ 1〜6 は (9〜14, 9)
const BOX_COL = ['#FF9DB5', '#FFC83D', '#8FD6A6', '#7FB6F0', '#B79CED', '#FF9F6B'];
const LOCKER_TILES = [10, 11, 12, 13, 14].map(x => [x, 1]);   // かべの ロッカー。まえの れつ(y=2)から さがす
const blockedSet = new Set();
const bk = (x, y) => x + ',' + y;
function buildBlocked() {
  blockedSet.clear();
  const add = (x0, y0, x1, y1) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) blockedSet.add(bk(x, y)); };
  if (stageNo === 2) {
    add(0, 0, 15, 1);                                   // かべ(こくばん・とけい・ロッカー)
    DESKS.forEach(d => add(d[0], d[1], d[0], d[1]));    // つくえ
    add(0, 9, 1, 9); add(15, 4, 15, 5); add(15, 9, 15, 9);     // ピアノ、たな、うえきばち
    add(BOX_X0, 9, BOX_X0 + 5, 9);                              // ばんごうの はこ
    return;
  }
  add(1, 0, 5, 2);        // いえ
  add(11, 0, 14, 2);      // いけ
  add(6, 2, 6, 2);        // ポスト
  add(9, 5, 14, 5);       // かだん
  add(0, 9, 15, 9);       // さく
  [...BIGF, ...HUTS, [8, 0], [0, 4], [15, 4], [0, 8]].forEach(p => add(p[0], p[1], p[0], p[1]));
}
buildBlocked();
const blocked = (x, y) => x < 0 || y < 0 || x >= COLS || y >= ROWS || blockedSet.has(bk(x, y));
const isPath = (x, y) => y === 3 && x >= 3 && x <= 13;
const isStone = (x, y) => y === START_MAT.y && x >= STONE_X0 && x < STONE_X0 + STONE_N;

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
let lockMiss = 0;
let m, cat, path = [], held = null, dest = null, holes = [], chest = null, digMiss = 0, tNow = 0;

// いま さがす ばしょ。on: その ますの うえで さがす / それいがいは となりの ますから さがす
function targetOf(step) {
  const s = data.seed;
  if (stageNo === 2) return step === 0 ? { x: DESK_X[s.col], y: DESK_Y[s.k - 1] } : step === 1 ? { x: BOX_X0 + s.h - 1, y: 9 } : { x: 12, y: 1, wall: true };
  return step === 0 ? { x: START_MAT.x + s.n, y: START_MAT.y, on: true }
    : step === 1 ? { x: BIGF[s.lanes.indexOf(s.c)][0], y: BIGF[s.lanes.indexOf(s.c)][1] } : { x: HUTS[s.ans][0], y: HUTS[s.ans][1] };
}
// さがせる もの(となりに たつと、ミミが そちらを むく)
const searchables = () => stageNo === 2 ? [...DESKS, ...[0, 1, 2, 3, 4, 5].map(i => [BOX_X0 + i, 9]), ...LOCKER_TILES] : [...BIGF, ...HUTS];
// たすけを だす めやす。すぐには たすけず、じぶんで かんがえる じかんを とる
const HINT_AT = 3;     // この かいすう まちがえたら、シロの ヒントと ばんごうを だす
const STAR_AT = 8;     // この かいすう まちがえたら、ただしい ばしょに ほしを だす
const STAR_SEC = 240;  // まちがえなくても、この びょうすう みつからなければ ほしを だす
let searchMiss = 0, stepTime = 0, helpSaid = false, searchFx = null, foundFx = null;
/* ---------- あんない: てがみを ステップに わけて、1つずつ すすむ ----------
   いまの ステップは シロの ふきだしに いつも でている。え(pic)が いる ステップでは、てがみの えも ふきだしに だす。
   done: たちどまった ときに みたされたら つぎへ / spot: いきさきの やじるし / さいごの ステップは「さがす」(near の ばしょで ボタンが ひかる) */
let guide = -1, sayTimer = null;
const stoodAt = (x0, x1, y0, y1) => m.x >= x0 && m.x <= x1 && m.y >= y0 && m.y <= y1;
const nextTo = list => list.some(p => Math.abs(p[0] - m.x) + Math.abs(p[1] - m.y) === 1);
const BOXES = [0, 1, 2, 3, 4, 5].map(i => [BOX_X0 + i, 9]);
const GUIDE = {
  1: [
    [ { text: () => 'いけの ちかくへ いって、あひるを かぞえよう', spot: { x: 13, y: 3 }, done: () => stoodAt(13, 14, 3, 3) },
      { text: () => 'かぞえたら、ピンクの スタートに たとう', spot: START_MAT, done: () => stoodAt(START_MAT.x, START_MAT.x, START_MAT.y, START_MAT.y) },
      { text: () => 'スタートから みぎへ、あひると おなじ かずだけ いしを すすもう', pic: true, done: () => guide >= 2 && isStone(m.x, m.y) },
      { text: () => 'ここだと おもったら「さがす」を おそう', near: () => isStone(m.x, m.y) } ],
    [ { text: () => 'かだんの はなを みに いこう', spot: { x: 11, y: 4 }, done: () => stoodAt(9, 14, 4, 4) || stoodAt(9, 14, 6, 6) },
      { text: () => '「?」に はいる いろは なにかな? その いろの おおきな はなの となりへ いこう', pic: true, done: () => nextTo(BIGF) },
      { text: () => 'この はなだと おもったら「さがす」を おそう', pic: true, near: () => nextTo(BIGF) } ],
    [ { text: () => 'こやの ちかくへ いこう', spot: { x: 11, y: 6 }, done: () => stoodAt(8, 15, 6, 8) },
      { text: () => 'やねと いりぐちが えと おなじ こやを さがして、となりに たとう', pic: true, done: () => nextTo(HUTS) },
      { text: () => 'この こやだと おもったら「さがす」を おそう', pic: true, near: () => nextTo(HUTS) } ],
  ],
  2: [
    [ { text: () => 'こくばんの まえへ いこう。こくばんの ほうが「まえ」だよ', spot: { x: 3, y: 2 }, done: () => stoodAt(1, 5, 2, 2) },
      { text: () => CHAIRS[data.seed.col].name + 'の いすの れつで、まえから ' + data.seed.k + 'ばんめの つくえの となりに たとう', pic: true, done: () => nextTo(DESKS) },
      { text: () => 'この つくえだと おもったら「さがす」を おそう', pic: true, near: () => nextTo(DESKS) } ],
    [ { text: () => 'とけいを みに いこう', spot: { x: 8, y: 2 }, done: () => stoodAt(7, 9, 2, 2) },
      { text: () => 'とけいは なんじかな? おなじ ばんごうの はこの まえへ いこう', pic: true, done: () => nextTo(BOXES) },
      { text: () => 'この はこだと おもったら「さがす」を おそう', pic: true, near: () => nextTo(BOXES) } ],
    [ { text: () => 'ロッカーの まえへ いこう', spot: { x: 12, y: 2 }, done: () => stoodAt(10, 14, 2, 2) },
      { text: () => '「さがす」を おして、ロッカーを ちかくで みよう', pic: true, near: () => stoodAt(10, 14, 2, 2) } ],
  ],
};
const curSteps = () => (data && !data.cleared && keysGot() < 3 && guide >= 0) ? GUIDE[stageNo][keysGot()] : null;
// シロの ふきだしに、いまの ステップを だす
function showStep() {
  clearTimeout(sayTimer);
  const steps = curSteps(); if (!steps) return;
  const s = steps[guide], box = $('say'), pic = $('sayPic');
  box.replaceChildren();
  const no = document.createElement('span'); no.className = 'stepno'; no.textContent = (guide + 1) + '/' + steps.length;
  box.append(no, s.text());
  pic.replaceChildren();
  if (s.pic) { const cv2 = riddleParts(keysGot()).canvas; cv2.className = 'say-pic'; pic.appendChild(cv2); }
  pic.hidden = !s.pic;
  fit();
}
function startGuide() { guide = 0; showStep(); }
function stopGuide() { guide = -1; clearTimeout(sayTimer); $('btnDig').classList.remove('pulse'); $('sayPic').hidden = true; }
function guideTick() {
  const steps = curSteps();
  // あるいている とちゅうで とおりすぎた だけでは すすめない。たちどまった ときだけ みる
  if (!steps || busy || m.p < 1 || path.length || held) return;
  const last = steps.length - 1, was = guide;
  for (let j = last - 1; j >= guide; j--) if (steps[j].done()) { guide = j + 1; break; }          // さきの ステップを みたして いたら、そこまで すすむ
  if (guide === last && was === last && last > 0 && !steps[last - 1].done()) guide = last - 1;   // 「さがす」の ばしょから はなれたら、ひとつ もどる
  if (guide !== was) { showStep(); if (guide > was) tone(880, .1, 0, 'sine', .07); }
  $('btnDig').classList.toggle('pulse', guide === last && steps[last].near());
}
function drawGuideArrow(c, t) {
  const steps = curSteps(); if (!steps || !steps[guide].spot) return;
  const g = steps[guide].spot, x = g.x * T + 20, y = g.y * T - 16 + Math.sin(t * 5) * 5;
  ci(c, x, g.y * T + 24, 13 + Math.sin(t * 5) * 2, null, 'rgba(217,71,138,.75)', 3);
  poly(c, [[x - 12, y - 14], [x + 12, y - 14], [x + 12, y - 2], [x + 20, y - 2], [x, y + 18], [x - 20, y - 2], [x - 12, y - 2]], '#FF7EB6', '#FFFFFF', 3);
}
const helpOn = () => data && !data.cleared && keysGot() < 3 && (searchMiss >= STAR_AT || stepTime > STAR_SEC);
const keysGot = () => (data.s1 ? 1 : 0) + (data.s2 ? 1 : 0) + (data.letter ? 1 : 0);
function persist() { store.slots[slotIx] = data; saveAll(); }
function say(t) {
  clearTimeout(sayTimer);
  $('say').textContent = t; $('sayPic').hidden = true;
  if (curSteps()) sayTimer = setTimeout(showStep, 4500);
}

function refreshHud() {
  const k = keysGot(); let h = '';
  const shape = cls => '<g class="' + cls + '"><circle cx="11" cy="11" r="5.5"/><path d="M15 15l11 11M21 21l4-4"/></g>';
  for (let i = 0; i < 3; i++) h += '<svg class="' + (i < k ? 'got' : '') + '" viewBox="0 0 32 32">' + shape('o') + shape('i') + '</svg>';
  if ($('keys').dataset.k !== String(k)) { $('keys').innerHTML = h; $('keys').dataset.k = String(k); }
  $('keys').setAttribute('aria-label', 'カギ ' + k + 'こ');
  $('btnDig').hidden = !!data.cleared;
  $('btnSound').setAttribute('aria-label', store.sound ? 'おとを けす' : 'おとを だす');
  $('btnSound').setAttribute('aria-pressed', String(store.sound));
}

function startGame(ix, newStageNo) {
  slotIx = ix;
  data = store.slots[ix];
  if (newStageNo) { data = newStage(data, newStageNo); persist(); }
  else if (!data) { data = newStage(null, 1); persist(); }
  stageNo = STAGE[data.stage] ? data.stage : 1;
  if ((stageNo === 1 && !data.seed.huts) || (stageNo === 2 && !data.seed.lr)) { data = newStage(data, stageNo); persist(); }   // ふるい セーブは つくりなおす
  searchMiss = 0; stepTime = 0; helpSaid = false; searchFx = null; foundFx = null; stopGuide();
  buildBlocked(); closeModal();
  const START = stg().start;
  $('stageName').textContent = stageNo + '話 ' + stg().name;
  m = { x: START.x, y: START.y, fx: START.x, fy: START.y, p: 1, face: 1, dir: 'down', fresh: false };
  cat = { x: START.x - 1, y: START.y, fx: START.x - 1, fy: START.y, face: 1, back: false, dir: 'right' };
  path = []; held = null; dest = null; holes = []; chest = null; digMiss = 0; lockMiss = 0;
  $('title').hidden = true; $('game').hidden = false;
  const wc = $('who').getContext('2d'); wc.clearRect(0, 0, 72, 72); drawAnimal(wc, ANIMALS[ix].id, 36, 42, 2.5);
  $('who').setAttribute('aria-label', ANIMALS[ix].name + 'の データ');
  refreshHud(); fit();
  running = true; playMusic(stg().track);
  intro = null;
  if (keysGot() === 0) { intro = { t: 0, ding: false }; busy = true; say('あれ? なにか とんできたよ!'); }
  else { guide = 0; say('つづきから はじめるよ!'); }
}
function goTitle() {
  running = false; intro = null; closeModal(); stopGuide(); playMusic('title');
  $('game').hidden = true; $('title').hidden = false; buildSlots();
}

/* ---------- いどう ---------- */
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
function startStep(nx, ny) {
  cat.fx = cat.x; cat.fy = cat.y;
  if (m.x !== cat.x) cat.face = m.x > cat.x ? 1 : -1;
  cat.dir = m.x > cat.x ? 'right' : m.x < cat.x ? 'left' : m.y < cat.y ? 'up' : m.y > cat.y ? 'down' : cat.dir;
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
}
function halt() { path = []; held = null; dest = null; document.querySelectorAll('.pad button.on').forEach(b => b.classList.remove('on')); }

/* ---------- さがす(1話) ---------- */
const MISS_HINT = {
  1: ['ピンクの スタートから、いしを 1、2、3と かぞえよう。ばんごうを つけたよ', 'かだんの はなの ならびを みて、つぎの いろを かんがえよう', 'やねの いろと、いりぐちの かたちを りょうほう みてみよう'],
  2: ['こくばんに ちかい ほうが「まえ」だよ。つくえに ばんごうを つけたよ', 'みじかい はりが さす すうじを みよう。ながい はりは 12だよ', 'うえの かべに ならんでいる ロッカーの まえで さがそう'],
};
function search() {
  if (busy || m.p < 1 || data.cleared) return;
  halt();
  const step = keysGot();
  if (step >= 3) { showChest(); return; }
  const tg = targetOf(step), dist = (x, y) => Math.abs(x - m.x) + Math.abs(y - m.y);
  const hit = tg.on ? dist(tg.x, tg.y) === 0 : tg.wall ? LOCKER_TILES.some(p => dist(p[0], p[1]) === 1) : dist(tg.x, tg.y) === 1;
  // となりに ある ものを さがす ときは、そちらを むく(めあての ものが となりなら、それを えらぶ)
  const list = searchables().filter(p => dist(p[0], p[1]) === 1);
  const near = list.find(p => p[0] === tg.x && p[1] === tg.y) || list[0];
  if (near) m.dir = near[0] > m.x ? 'right' : near[0] < m.x ? 'left' : near[1] > m.y ? 'down' : 'up'; else m.dir = 'down';
  searchFx = { x: near ? near[0] : m.x, y: near ? near[1] : m.y, t: 0 };
  tone(740, .07, 0, 'triangle', .1); tone(1100, .1, .07, 'triangle', .08);
  if (hit && tg.wall) { setTimeout(showLockers, 450); busy = true; return; }   // ロッカーは ちかくで みて、どれを あけるか えらぶ
  if (hit) { busy = true; m.lookBack = m.dir; foundFx = { x: searchFx.x, y: searchFx.y, t: 0 }; sfx.hit(); setTimeout(() => foundPlace(step), calm ? 700 : 1700); return; }
  searchMiss++; sfx.miss();
  if (searchMiss >= STAR_AT) return;   // たすけの ほしが でる(frame で あんないする)
  if (searchMiss >= HINT_AT) say(MISS_HINT[stageNo][step]);
  else say(stageNo === 1 && step === 0 && !isStone(m.x, m.y) ? 'いしの うえで さがしてみよう。てちょうで てがみも よめるよ' : 'ここには なにも ないみたい。てちょうで てがみを よんでみよう');
}
function foundPlace(step) {
  foundFx = null; stopGuide();
  if (step === 0) data.s1 = true; else if (step === 1) data.s2 = true; else data.letter = true;
  persist(); refreshHud(); searchMiss = 0; stepTime = 0; helpSaid = false;
  if (step === 2) { stopMusic(); sfx.found(); showChest(); return; }
  sfx.ok();
  const p = openModal('<h2 class="pop">みつけた!</h2><div id="pic"></div><p>カギと つぎの てがみが あったよ</p><button class="btn" data-focus type="button">てがみを よむ</button>');
  // カギと てがみが はずんで とびだす。うしろで ひかりが まわる
  const cvs = document.createElement('canvas'); cvs.width = 440; cvs.height = 230; cvs.className = 'pic'; p.querySelector('#pic').appendChild(cvs);
  const c = cvs.getContext('2d'); let t0 = null;
  const tick = ts => {
    if (!cvs.isConnected) return;
    if (t0 === null) t0 = ts;
    const t = calm ? 2 : (ts - t0) / 1000;
    c.clearRect(0, 0, 440, 230);
    c.save(); c.translate(220, 120); c.rotate(t * .5);
    for (let i = 0; i < 14; i++) { c.rotate(PI / 7); poly(c, [[-13, 0], [13, 0], [0, -210]], 'rgba(255,225,120,' + (i % 2 ? .3 : .16) + ')'); }
    c.restore();
    const kS = bounce(t / .55), eS = bounce((t - .22) / .55);
    if (kS > 0) drawKey(c, 135 + 6, 118 - Math.sin(t * 3) * 4, 3.4 * kS);
    if (eS > 0) drawEnvelope(c, 305, 122 - Math.sin(t * 3 + 1) * 4, 5.2 * eS);
    for (let i = 0; i < 9; i++) { const a = t * .9 + i * PI * 2 / 9, r = 92 + 18 * Math.sin(t * 2 + i); starShape(c, 220 + Math.cos(a) * r * 1.7, 118 + Math.sin(a) * r * .8, 3 + 4 * Math.abs(Math.sin(t * 4 + i)), i % 2 ? '#FFFFFF' : '#FFC83D', '#FFC83D'); }
    if (!calm) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  p.querySelector('.btn').onclick = () => showRiddle(step + 1);
}
/* てがみの なぞ: え(canvas)と ぶん(html) */
function riddleParts(i) {
  const s = data.seed;
  if (stageNo === 2) return riddleParts2(i, s);
  if (i === 0) return {
    html: '<ol class="steps"><li>いけの <b class="hl">あひる</b>を かぞえよう</li><li>ピンクの <b class="hl">スタート</b>に たとう</li><li>あひると おなじ かずだけ、<b class="hl">いし</b>を みぎへ すすもう</li><li>そこで「さがす」を おそう!</li></ol>',
    canvas: mk(520, 124, x => {
      rr(x, 14, 16, 68, 62, 12, '#FF9DB5', '#D9478A', 3); poly(x, [[34, 38], [52, 38], [52, 30], [66, 47], [52, 64], [52, 56], [34, 56]], '#FFFFFF');
      num(x, 'スタート', 48, 102, 19, '#D9478A');
      ln(x, 92, 47, 112, 47, '#B3A8D3', 4); poly(x, [[122, 47], [108, 38], [108, 56]], '#B3A8D3');
      for (let k = 0; k < STONE_N; k++) el(x, 158 + k * 62, 47, 25, 18, '#EEE9F5', '#CFC4E2', 3);
    }) };
  if (i === 1) return {
    html: 'つぎに さく はなと おなじ いろの、<b class="hl">おおきな はな</b>を さがそう!',
    canvas: mk(520, 130, x => {
      rr(x, 10, 62, 500, 52, 16, '#C99B77', '#B4835F', 3);
      for (let k = 0; k < 5; k++) drawFlower(x, 52 + k * 84, 62, COLORS[k % 2 ? s.c : s.other].hex, 2.8);
      ci(x, 470, 54, 27, '#FFFFFF', '#CFC4E2', 3); num(x, '?', 470, 56, 34, '#D9478A');
    }) };
  return {
    html: 'やねが <b class="hl">' + ROOFS[s.r].name + 'くて</b>、いりぐちが <b class="hl">' + (s.d === 'round' ? 'まるい' : 'しかくい') + '</b> こやを さがそう!',
    canvas: mk(520, 130, x => {
      poly(x, [[130, 18], [206, 84], [54, 84]], ROOFS[s.r].hex, '#3A2D58', 3); num(x, 'やね', 130, 108, 19, '#3A2D58');
      rr(x, 316, 14, 150, 74, 8, '#FFF3DC', '#E8D5B5', 3);
      if (s.d === 'round') { x.beginPath(); x.arc(391, 58, 22, PI, 0); x.lineTo(413, 88); x.lineTo(369, 88); x.closePath(); x.fillStyle = '#6B4A3A'; x.fill(); } else rr(x, 369, 40, 44, 48, 2, '#6B4A3A');
      num(x, 'いりぐち', 391, 108, 19, '#3A2D58');
    }) };
}
function riddleParts2(i, s) {
  if (i === 0) return {
    html: '<b class="hl">' + CHAIRS[s.col].name + 'の いす</b>の れつで、まえから <b class="hl">' + s.k + 'ばんめ</b>の つくえを さがそう!',
    canvas: mk(520, 170, x => {
      rr(x, 150, 8, 220, 26, 5, '#5FA98A', '#C98A5E', 4); num(x, 'こくばん', 260, 22, 15, '#FFFFFF');
      num(x, 'まえ', 96, 22, 19, '#D9478A'); num(x, 'うしろ', 96, 150, 19, '#6E6390');
      ln(x, 96, 40, 96, 124, '#B3A8D3', 4); poly(x, [[96, 134], [87, 120], [105, 120]], '#B3A8D3');
      for (let q = 0; q < 3; q++) for (let r = 0; r < 3; r++) { const dx = 176 + q * 70, dy = 46 + r * 40; rr(x, dx + 10, dy + 20, 22, 10, 4, CHAIRS[q].hex); rr(x, dx, dy, 42, 22, 5, '#E8B07E', '#C98A5E', 2.5); }
    }) };
  if (i === 1) return {
    html: 'とけいは なんじ?<br>おなじ ばんごうの <b class="hl">はこ</b>を さがそう!',
    canvas: mk(520, 170, x => {
      drawClock(x, 150, 85, 76, s.h, false);
      ln(x, 250, 85, 300, 85, '#B3A8D3', 5); poly(x, [[314, 85], [298, 74], [298, 96]], '#B3A8D3');
      rr(x, 340, 46, 110, 84, 10, '#FFC83D', '#3A2D58', 3); rr(x, 340, 46, 110, 20, [10, 10, 0, 0], '#FFE38A', '#3A2D58', 3); num(x, '?', 395, 100, 44, '#3A2D58');
    }) };
  return {
    html: '<b class="hl">ロッカー</b>を さがそう。<br>うえから <b class="hl">' + s.lr + 'だんめ</b>、ひだりから <b class="hl">' + s.lc + 'ばんめ</b>を あけよう!',
    canvas: mk(520, 170, x => {
      num(x, 'うえ', 120, 34, 19, '#D9478A'); ln(x, 120, 50, 120, 128, '#B3A8D3', 4); poly(x, [[120, 138], [111, 124], [129, 124]], '#B3A8D3');
      num(x, 'ひだり', 208, 16, 19, '#D9478A'); ln(x, 250, 16, 400, 16, '#B3A8D3', 4); poly(x, [[412, 16], [398, 7], [398, 25]], '#B3A8D3');
      for (let r = 0; r < 4; r++) for (let q = 0; q < 5; q++) { const lx = 160 + q * 54, ly = 32 + r * 33; rr(x, lx, ly, 48, 28, 5, '#B4E8DC', '#3A2D58', 2.5); ci(x, lx + 39, ly + 14, 3, '#3A2D58'); }
    }) };
}
function showRiddle(i) {
  sfx.open();
  const r = riddleParts(i);
  const p = openModal('<span class="tag">てがみ ' + (i + 1) + '</span><div class="letter" id="lt"></div><p class="small">ばしょが わかったら、そこで「さがす」を おそう</p><button class="btn" data-focus type="button">わかった!</button>');
  r.canvas.className = 'pic'; const t = document.createElement('p'); t.innerHTML = r.html;
  p.querySelector('#lt').append(r.canvas, t);
  p.querySelector('.btn').onclick = () => { closeModal(); startGuide(); };
}

/* ---------- えがく ---------- */
function drawGround(c) {
  for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) {
    const x = q * T, y = r * T;
    if (isPath(q, r)) {
      c.fillStyle = '#F7E6BC'; c.fillRect(x, y, T, T);
      for (let i = 0; i < 2; i++) ci(c, x + 6 + hash(q + i, r) * 28, y + 6 + hash(q, r + i + 7) * 28, 1.6, '#E8CF98');
      if (isStone(q, r)) { el(c, x + 20, y + 22, 15, 11, '#EEE9F5', '#CFC4E2', 2); if (!data.s1 && searchMiss >= HINT_AT) num(c, q - START_MAT.x, x + 20, y + 23, 13, '#6E6390'); }
      if (q === START_MAT.x && r === START_MAT.y) {   // スタートの しるし(てがみの えと おなじ ピンクの マット)
        rr(c, x + 3, y + 5, 34, 32, 8, '#FF9DB5', '#D9478A', 2); poly(c, [[x + 11, y + 17], [x + 20, y + 17], [x + 20, y + 12], [x + 30, y + 21], [x + 20, y + 30], [x + 20, y + 25], [x + 11, y + 25]], '#FFFFFF');
      }
      continue;
    }
    c.fillStyle = (q + r) % 2 ? '#B3E0A3' : '#BDE7AE'; c.fillRect(x, y, T, T);
    if (hash(q, r) > .62) { const tx = x + 8 + hash(r, q) * 22, ty = y + 10 + hash(q + 3, r) * 22; ln(c, tx, ty, tx - 3, ty - 6, '#93CC86', 2); ln(c, tx, ty, tx + 3, ty - 6, '#93CC86', 2); }
  }
}
function drawHut(c, x, y, [roof, door]) {
  rr(c, x + 4, y + 15, 32, 23, 3, '#FFF3DC', '#E8D5B5', 2);
  poly(c, [[x + 20, y - 3], [x + 43, y + 17], [x - 3, y + 17]], ROOFS[roof].hex, 'rgba(58,45,88,.35)', 1.5);
  if (door === 'round') { c.beginPath(); c.arc(x + 20, y + 29, 7.5, PI, 0); c.lineTo(x + 27.5, y + 38); c.lineTo(x + 12.5, y + 38); c.closePath(); c.fillStyle = '#6B4A3A'; c.fill(); }
  else rr(c, x + 12.5, y + 22, 15, 16, 1, '#6B4A3A');
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
  const lit = true;
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
  num(c, st.label || st.id, x, y + 2, 17, '#3A2D58');
  // きらきら
  for (let i = 0; i < 3; i++) { const a = t * 1.5 + i * 2.1 + st.id, k = (Math.sin(t * 5 + i * 2) + 1) / 2; starShape(c, x + Math.cos(a) * 30, y + Math.sin(a) * 24, 2 + k * 4, '#FFFFFF'); }
}

/* 1話の マップ */
function flats1(c, t) {
  drawPond(c, 11 * T, 0.3 * T, 4 * T, 2.6 * T);
  el(c, 12.3 * T, 2.45 * T, 8, 5, '#7CCB8E'); ci(c, 12.3 * T + 2, 2.45 * T - 1, 2.5, '#FF9CC2');
  for (let i = 0; i < data.seed.n; i++) drawDuck(c, DUCK_POS[i][0] * T, DUCK_POS[i][1] * T + Math.sin(t * 2 + i * 1.7) * 1.5, i === 1 ? '#FFE38A' : '#FFFFFF');
  rr(c, 9 * T + 2, 5 * T + 6, 6 * T - 4, T - 8, 10, '#C99B77', '#B4835F', 2);
  if (searchFx) { const k = searchFx.t / .55, fx = searchFx.x * T + 20, fy = searchFx.y * T + 20; ci(c, fx, fy, 10 + k * 22, null, 'rgba(255,255,255,' + (1 - k) + ')', 4); ci(c, fx, fy, 6 + k * 14, null, 'rgba(255,200,61,' + (1 - k) + ')', 3); }
}
function items1(c, t, items) {
  items.push({ y: 3, f: () => drawHouse(c) });
  items.push({ y: 1, f: () => drawTree(c, 8, 0, true) }, { y: 5, f: () => drawTree(c, 0, 4) }, { y: 5, f: () => drawTree(c, 15, 4) }, { y: 9, f: () => drawTree(c, 0, 8) });
  items.push({ y: 3, f: () => { const x = 6 * T + 20, b = 2 * T + 36; rr(c, x - 2, b - 18, 4, 18, 1, '#A9744F'); rr(c, x - 10, b - 30, 20, 14, [7, 7, 2, 2], '#FF6F7D'); rr(c, x - 6, b - 24, 12, 2.5, 1, '#FFFFFF'); } });
  items.push({ y: 6, f: () => {
    for (let i = 0; i < 5; i++) drawFlower(c, (9 + i) * T + 20, 5 * T + 20, COLORS[i % 2 ? data.seed.c : data.seed.other].hex);
    const qx = 14 * T + 20, qy = 5 * T + 18;
    if (data.s2) drawFlower(c, qx, 5 * T + 20, COLORS[data.seed.c].hex);
    else { ci(c, qx, qy, 11, '#FFFFFF', '#CFC4E2', 2); num(c, '?', qx, qy + 1, 15, '#D9478A'); }
  } });
  BIGF.forEach(([fx, fy], i) => items.push({ y: fy + 1, f: () => drawBigFlower(c, fx * T + 20, fy * T + 36, COLORS[data.seed.lanes[i]].hex) }));
  HUTS.forEach(([hx, hy], i) => items.push({ y: hy + 1, f: () => drawHut(c, hx * T, hy * T, data.seed.huts[i]) }));
  items.push({ y: 3.1, f: () => { const x = START_MAT.x * T + 33, b = 2 * T + 36; ln(c, x, b, x, b - 34, '#8C6A55', 2.5); poly(c, [[x, b - 34], [x + 15, b - 28], [x, b - 22]], '#FF9DB5', '#D9478A', 1.2); } });   // スタートの はた
}

/* 2話の マップ: きょうしつ */
function drawGround2(c) {
  for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) {
    const x = q * T, y = r * T;
    if (r < 2) { c.fillStyle = '#FBE3EA'; c.fillRect(x, y, T, T); if (r === 1) { c.fillStyle = '#EDA9BF'; c.fillRect(x, y + T - 7, T, 7); } continue; }
    c.fillStyle = '#F6DFB8'; c.fillRect(x, y, T, T);
    c.fillStyle = '#EBCB9A'; c.fillRect(x, y + T - 1.5, T, 1.5); c.fillRect(x + (r % 2 ? 10 : 28), y, 1.5, T);
  }
}
function drawClock(c, x, y, R, h, hint) {
  ci(c, x, y, R, '#FFFFFF', '#FF7EB6', R * .16);
  for (let i = 1; i <= 12; i++) { const a = i * PI / 6 - PI / 2; if (R > 40) num(c, i, x + Math.cos(a) * R * .74, y + Math.sin(a) * R * .74 + 1, R * .2, '#3A2D58'); else ci(c, x + Math.cos(a) * R * .76, y + Math.sin(a) * R * .76, R * .05, '#3A2D58'); }
  ln(c, x, y, x, y - R * .62, '#3A2D58', Math.max(1.6, R * .05));                                   // ながい はり(12)
  const a = h * PI / 6 - PI / 2; ln(c, x, y, x + Math.cos(a) * R * .42, y + Math.sin(a) * R * .42, hint ? '#D9478A' : '#3A2D58', Math.max(2.2, R * (hint ? .1 : .07)));   // みじかい はり
  ci(c, x, y, Math.max(1.6, R * .06), '#3A2D58');
}
function flats2(c, t) {
  rr(c, 10 * T + 3, 5 * T + 3, 4 * T - 6, 2 * T - 6, 10, '#BFE6D8'); rr(c, 10 * T + 9, 5 * T + 9, 4 * T - 18, 2 * T - 18, 6, null, 'rgba(255,255,255,.7)', 2);
  // こくばん
  rr(c, T + 4, 12, 5 * T - 8, 54, 5, '#5FA98A', '#C98A5E', 5); starShape(c, 2 * T, 38, 9, null, '#FFFFFF'); num(c, 'きょうの なぞ', 3.9 * T, 39, 14, '#FFFFFF'); rr(c, 5 * T + 2, 60, 22, 5, 2, '#FFFFFF');
  // とけい(なぞ 2 と おなじ じかん)
  drawClock(c, 8 * T + 20, 36, 20, data.seed.h, false);
  // ロッカー(4だん × 5れつ)
  rr(c, 10 * T + 2, 6, 5 * T - 4, 70, 5, '#7CCDBE', '#3A2D58', 2.5);
  for (let r = 0; r < 4; r++) for (let q = 0; q < 5; q++) { const lx = 10 * T + 7 + q * 37.6, ly = 10 + r * 16; rr(c, lx, ly, 33.6, 13.5, 2.5, data.cleared && r === data.seed.lr - 1 && q === data.seed.lc - 1 ? '#5A4A78' : '#B4E8DC', '#3A2D58', 1.3); ci(c, lx + 28, ly + 6.7, 1.6, '#3A2D58'); }
}
function items2(c, t, items) {
  DESKS.forEach(([dx, dy]) => items.push({ y: dy + .8, f: () => {
    const x = dx * T, y = dy * T, q = DESK_X.indexOf(dx);
    rr(c, x + 9, y + 26, 22, 12, 4, CHAIRS[q].hex, 'rgba(58,45,88,.3)', 1); rr(c, x + 2, y + 5, 36, 22, 4, '#E8B07E', '#C98A5E', 2); rr(c, x + 8, y + 9, 12, 9, 2, '#FFFFFF');
    if (!data.s1 && searchMiss >= HINT_AT && q === data.seed.col) { ci(c, x + 28, y + 15, 8, '#FFC83D', '#FFFFFF', 2); num(c, DESK_Y.indexOf(dy) + 1, x + 28, y + 16, 11, '#3A2D58'); }   // ヒント: まえからの ばんごう
  } }));
  for (let i = 0; i < 6; i++) items.push({ y: 9.95, f: () => {   // ばんごうの はこ
    const x = (BOX_X0 + i) * T, y = 9 * T;
    rr(c, x + 3, y + 4, 34, 32, 5, BOX_COL[i], '#3A2D58', 2); rr(c, x + 3, y + 4, 34, 9, [5, 5, 0, 0], 'rgba(255,255,255,.45)'); ci(c, x + 20, y + 24, 9.5, '#FFFFFF'); num(c, i + 1, x + 20, y + 25, 13, '#3A2D58');
  } });
  items.push({ y: 9.9, f: () => { const x = 0, y = 9 * T; rr(c, x + 2, y - 8, 76, 38, 6, '#3F3458'); rr(c, x + 6, y + 16, 68, 12, 2, '#FFFFFF'); for (let i = 1; i < 9; i++) ln(c, x + 6 + i * 7.5, y + 16, x + 6 + i * 7.5, y + 28, '#B3A8D3', 1); for (let i = 0; i < 8; i++) if (i % 7 !== 2 && i % 7 !== 6) rr(c, x + 11 + i * 7.5, y + 16, 4, 7, 1, '#3F3458'); rr(c, x + 28, y + 32, 24, 6, 3, '#FF9DB5'); } });
  items.push({ y: 5.9, f: () => { const x = 15 * T, y = 4 * T; rr(c, x + 3, y - 6, 34, 82, 4, '#B98058', '#8C5A3C', 2); const cols = ['#FF8FB3', '#7FB6F0', '#FFD25E', '#8FD6A6', '#B79CED']; for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) rr(c, x + 7 + i * 6.6, y - 1 + r * 25, 5.4, 19, 1, cols[(i + r * 2) % 5]); } });
  items.push({ y: 9.9, f: () => { const x = 15 * T, y = 9 * T; ci(c, x + 20, y + 6, 15, '#6CC08B'); ci(c, x + 13, y, 8, '#8FD6A6'); rr(c, x + 9, y + 18, 22, 18, 4, '#E8B07E', '#C98A5E', 2); } });
}

/* みつけた ときの えんしゅつ: ひかりの すじ、とびちる ほし、ひろがる わ、「みつけた!」の もじ */
const bounce = v => { v = Math.min(1, Math.max(0, v)); return 1 - Math.pow(1 - v, 3) * Math.cos(v * PI * 2.5); };
function drawFoundFx(c, fx) {
  const k = fx.t, cx = fx.x * T + 20, cy = fx.y * T + 14, out = 1 - Math.pow(1 - Math.min(1, k / .9), 3);
  if (k < .3 && !calm) { c.fillStyle = 'rgba(255,255,255,' + (.55 * (1 - k / .3)) + ')'; c.fillRect(0, 0, COLS * T, ROWS * T); }   // いっしゅん ひかる
  const glow = c.createRadialGradient(cx, cy, 4, cx, cy, 70); glow.addColorStop(0, 'rgba(255,244,170,.95)'); glow.addColorStop(1, 'rgba(255,214,90,0)');
  ci(c, cx, cy, 70 * bounce(k / .5), glow);
  c.save(); c.translate(cx, cy); c.rotate(k * 1.6);
  for (let i = 0; i < 12; i++) { c.rotate(PI / 6); poly(c, [[-6, 0], [6, 0], [0, -86 * out]], 'rgba(255,230,130,' + (.6 * Math.max(0, 1 - k / 1.7)) + ')'); }
  c.restore();
  for (let i = 0; i < 2; i++) { const r = (k - i * .18) / .8; if (r > 0 && r < 1) ci(c, cx, cy, 14 + r * 70, null, 'rgba(255,255,255,' + (1 - r) + ')', 5); }
  for (let i = 0; i < 18; i++) {   // とびちる ほし
    const a = i * PI * 2 / 18 + hash(i, 31), d = out * (46 + hash(i, 37) * 52), fade = Math.max(0, 1 - k / 1.6);
    starShape(c, cx + Math.cos(a) * d, cy + Math.sin(a) * d + k * k * 18, (3 + hash(i, 41) * 5) * fade + 1, ['#FFC83D', '#FFFFFF', '#FF8FB3'][i % 3], i % 3 === 1 ? '#FFC83D' : null);
  }
  const s = bounce((k - .15) / .5), tx = Math.min(COLS * T - 84, Math.max(84, cx)), ty = Math.max(40, cy - 62);
  if (s > 0) {
    c.save(); c.translate(tx, ty); c.scale(s, s); c.rotate(-.06);
    c.font = '400 30px "Mochiy Pop One","Zen Maru Gothic",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.strokeStyle = '#3A2D58'; c.lineWidth = 11; c.strokeText('みつけた!', 0, 0); c.strokeStyle = '#FFFFFF'; c.lineWidth = 6; c.strokeText('みつけた!', 0, 0);
    c.fillStyle = '#D9478A'; c.fillText('みつけた!', 0, 0);
    c.restore();
  }
}
function render(t) {
  const c = ctx, s = cv.width / (COLS * T);
  c.setTransform(s, 0, 0, s, 0, 0);
  const two = stageNo === 2;
  if (two) { drawGround2(c); flats2(c, t); } else { drawGround(c); flats1(c, t); }
  if (dest) ci(c, dest.x * T + 20, dest.y * T + 22, 9 + Math.sin(t * 6) * 2, null, 'rgba(217,71,138,.7)', 3);


  // たっている もの(うしろから まえへ)
  const items = [];
  if (two) items2(c, t, items); else items1(c, t, items);
  if (chest) items.push({ y: chest.y + .9, f: () => { const k = Math.min(1, chest.t * 2.5), sc = k * (1 + .25 * Math.sin(k * PI)); drawChest(c, chest.x * T + 20 - 20 * sc, chest.y * T + 38 - 38 * sc, sc); } });

  const e = m.p, mx = m.fx + (m.x - m.fx) * e, my = m.fy + (m.y - m.fy) * e;
  const cx = cat.fx + (cat.x - cat.fx) * e, cy = cat.fy + (cat.y - cat.fy) * e;
  const walking = m.p < 1, bob = foundFx && !calm ? Math.abs(Math.sin(foundFx.t * 8)) * 8 : walking ? Math.abs(Math.sin(e * PI)) * 3 : Math.sin(t * 2.4) * .6 + .6;   // みつけたら とびはねる
  items.push({ y: my + .95, f: () => drawGirl(c, mx * T + 20, my * T + 37, 1.6, m.dir, bob) });
  items.push({ y: cy + .94, f: () => drawCatDir(c, cx * T + 20, cy * T + 37, 1.35, cat.dir, walking ? Math.abs(Math.sin(e * PI + 1)) * 2 : 0, walking ? Math.sin(t * 8) * .5 : Math.sin(t * 1.2) * .4) });
  items.sort((a, b) => a.y - b.y).forEach(o => o.f());
  if (!two) drawFence(c);

  drawGuideArrow(c, t);
  if (foundFx) drawFoundFx(c, foundFx);
  if (helpOn()) { const tg = targetOf(keysGot()); drawStar(c, { id: 9, label: '!', x: tg.x, y: tg.wall ? 2 : tg.on ? tg.y : tg.y - 1 }, t); }   // こまった ときの たすけの ほし
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
  if (!running && !$('title').hidden) { if (!calm) drawTitle(tNow); drawClouds(tNow, 'titleClouds'); }
  if (running && data) {
    if (chest) chest.t += dt;
    if (intro) {
      intro.t += dt;
      if (intro.t > 1.5 && !intro.ding) { intro.ding = true; sfx.ok(); }
      if (intro.t > 2.6) { intro = null; showIntro(); }
    }
    if (!busy && !data.cleared) stepTime += dt;
    if (searchFx && (searchFx.t += dt) > .55) searchFx = null;
    if (foundFx) foundFx.t += dt;
    guideTick();
    if (helpOn() && !helpSaid && !busy) { helpSaid = true; say('ひかっている ほしの ところで「さがす」を おそう!'); }
    update(dt); render(tNow); drawClouds(tNow);
  }
  requestAnimationFrame(frame);
}

/* マップの まわりの あきに、そらと おかと のはらを えがく。hz は ちへいせんの たかさ */
/* くもは べつの レイヤーで ゆっくり ながす(1びょうに 3〜5ピクセル) */
const sceneryBoxes = {};
const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function drawClouds(t, id = 'clouds') {
  const box = sceneryBoxes[id]; if (!box) return;
  const { W, hz, dpr } = box, cl = $(id), c = cl.getContext('2d');
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
function drawScenery(W, H, hz, bgId = 'bg', cloudId = 'clouds', scene = 'garden') {
  const bg = $(bgId), dpr = Math.min(2, window.devicePixelRatio || 1);
  bg.width = Math.round(W * dpr); bg.height = Math.round(H * dpr);
  const cl = $(cloudId); cl.width = bg.width; cl.height = bg.height; sceneryBoxes[cloudId] = { W, hz, dpr }; drawClouds(tNow, cloudId);
  const c = bg.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = c.createLinearGradient(0, 0, 0, Math.max(1, hz));
  sky.addColorStop(0, '#AEDCF7'); sky.addColorStop(1, '#EAF7FD');
  c.fillStyle = sky; c.fillRect(0, 0, W, hz);
  if (hz > 70) {                                   // おひさま
    ci(c, W - 46, Math.min(44, hz * .3), 30, 'rgba(255,236,150,.5)'); ci(c, W - 46, Math.min(44, hz * .3), 19, '#FFE38A');
  }
  if (scene === 'school') {                         // こうしゃと こうてい
    const bh = Math.min(70, hz * .55), top = hz - bh;
    rr(c, W * .5 - 34, top - bh * .5, 68, bh * .5 + 4, [8, 8, 0, 0], '#FFF3DC', '#E8C9A0', 2); drawClock(c, W * .5, top - bh * .2, Math.max(6, bh * .17), 3, false);
    poly(c, [[W * .5 - 44, top - bh * .5], [W * .5 + 44, top - bh * .5], [W * .5, top - bh * .86]], '#F08A7A');
    c.fillStyle = '#FFF3DC'; c.fillRect(0, top, W, bh); c.fillStyle = '#F08A7A'; c.fillRect(0, top - 5, W, 9);
    for (let x = 16; x < W - 30; x += 54) { rr(c, x, top + bh * .3, 34, bh * .42, 4, '#BFE9F7', '#FFFFFF', 3); ln(c, x + 17, top + bh * .3, x + 17, top + bh * .72, '#FFFFFF', 2); }
    c.fillStyle = '#EBD9B0'; c.fillRect(0, hz, W, H - hz);
    for (let i = 0; i < Math.floor(W * (H - hz) / 1800); i++) ci(c, hash(i, 21) * W, hz + 6 + hash(i, 23) * (H - hz - 10), 1.8, '#D9C290');
    return;
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
  drawScenery(f.clientWidth, f.clientHeight, cr.top - fr.top + 12, 'bg', 'clouds', stg().scene);
  const bw = Math.round(Math.min(1600, Math.max(640, w * (window.devicePixelRatio || 1))));
  if (cv.width !== bw) { cv.width = bw; cv.height = Math.round(bw / 1.6); }
}

/* ---------- モーダル ---------- */
function openModal(html, cls = '') { busy = true; halt(); $('panel').className = 'panel ' + cls; $('panel').innerHTML = html; $('modal').hidden = false; $('panel').scrollTop = 0; const b = $('panel').querySelector('[data-focus]'); if (b) b.focus({ preventScroll: true }); return $('panel'); }
function closeModal() { $('modal').hidden = true; $('panel').innerHTML = ''; busy = false; }
function mk(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d')); return c; }

function drawEnvelopeOpening(c, x, y, s, k, rise) {   // k: 1=とじている → -1=ひらいた
  c.save(); c.translate(x, y); c.scale(s, s);
  const flap = () => poly(c, [[-14, -9], [14, -9], [0, -9 + 11 * k]], '#FFF1C9', '#3A2D58', 1.5);
  rr(c, -14, -9, 28, 18, 3, '#FBE9B8', '#3A2D58', 1.6);
  if (k <= 0) flap();
  if (rise > 0) {                                         // びんせんが でてくる
    c.save(); c.beginPath(); c.rect(-20, -60, 40, 67); c.clip();
    const py = -4 - rise * 22;
    rr(c, -10, py, 20, 24, 2, '#FFFFFF', '#3A2D58', 1.3);
    for (let i = 0; i < 3; i++) ln(c, -6, py + 6 + i * 5, i === 2 ? 2 : 6, py + 6 + i * 5, '#D9478A', 1.2);
    c.restore();
  }
  poly(c, [[-14, -9], [0, 2], [14, -9], [14, 7.5], [12.5, 9], [-12.5, 9], [-14, 7.5]], '#FFF8E1', '#3A2D58', 1.5);
  if (k > 0) { flap(); c.globalAlpha = k; ci(c, -2, 3, 2.4, '#FF7EB6'); ci(c, 2, 3, 2.4, '#FF7EB6'); poly(c, [[-4.2, 4], [4.2, 4], [0, 8.4]], '#FF7EB6'); c.globalAlpha = 1; }
  c.restore();
}
function showIntro() {
  sfx.open();
  const p = openModal('<h2>ミミに てがみが とどいたよ!</h2><div id="pic"></div><button class="btn" data-focus type="button">あける</button>');
  const e = mk(280, 200, x => drawEnvelope(x, 140, 104, 7.4)); e.className = 'prize wig'; p.querySelector('#pic').appendChild(e);
  p.querySelector('.btn').onclick = () => {
    scrape(0, .22, 2400, 3600, .06); scrape(.45, .5, 1800, 2600, .04);     // かみの おと
    const q = openModal('<h2>なにが かいてあるかな?</h2><div id="pic"></div>');
    const cvs = document.createElement('canvas'); cvs.width = 320; cvs.height = 300; cvs.className = 'pic'; q.querySelector('#pic').appendChild(cvs);
    const c = cvs.getContext('2d'), ease = v => { v = Math.min(1, Math.max(0, v)); return v * v * (3 - 2 * v); };
    let t0 = null;
    const tick = ts => {
      if (!cvs.isConnected) return;
      if (t0 === null) t0 = ts;
      const t = (ts - t0) / 1000;
      c.clearRect(0, 0, 320, 300);
      drawEnvelopeOpening(c, 160, 210, 7.4, 1 - 2 * ease(t / .45), ease((t - .4) / .8));
      if (t < 1.6) requestAnimationFrame(tick); else showLetterText();
    };
    requestAnimationFrame(tick);
  };
}
function showLetterText() {
  sfx.ok();
  const q = openModal('<div id="pic"></div><div class="letter">たんていミミへ。<br>' + stg().place + 'の どこかに たからものを かくしたよ。<br>てがみの なぞを といて、カギを 3つ あつめてね。</div><p class="small">いきたい ところを タッチすると あるくよ</p><button class="btn" data-focus type="button">なぞを よむ</button>');
  const s = mk(140, 100, x => drawEnvelope(x, 70, 52, 3.6)); s.className = 'prize sm'; q.querySelector('#pic').appendChild(s);
  q.querySelector('.btn').onclick = () => showRiddle(0);
}

/* ===== 2話: ロッカーを えらぶ ===== */
function showLockers() {      // 3つうめの てがみの とおりに ロッカーを えらぶ
  sfx.open();
  const row = data.seed.lr, col = data.seed.lc;
  const p = openModal('<span class="tag">てがみ 3</span><h2>どの ロッカーを あける?</h2><div class="letter slim">' + riddleParts(2).html + '</div><div class="lockers" id="lk"></div><p class="fb" id="fb"></p><div class="row"><button class="btn sub" id="x" type="button">とじる</button></div>', 'lk');
  const lk = p.querySelector('#lk');
  const hints = () => { lk.classList.toggle('hint', lockMiss >= HINT_AT); if (lockMiss >= STAR_AT) lk.querySelector('[data-ok]').classList.add('glow'); };
  lk.insertAdjacentHTML('beforeend', '<span></span>' + [1, 2, 3, 4, 5].map(n => '<span class="lab">' + n + '</span>').join(''));
  for (let r = 1; r <= 4; r++) {
    lk.insertAdjacentHTML('beforeend', '<span class="lab">' + r + '</span>');
    for (let q = 1; q <= 5; q++) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'locker'; b.setAttribute('aria-label', 'うえから ' + r + 'だんめ、ひだりから ' + q + 'ばんめ');
      if (r === row && q === col) b.dataset.ok = '1';
      b.onclick = () => {
        if (b.dataset.ok) {
          lk.querySelectorAll('.locker').forEach(e => { e.disabled = true; });
          b.classList.add('open', 'got'); p.querySelector('#fb').textContent = 'あった!';
          data.letter = true; persist(); refreshHud(); searchMiss = 0; stepTime = 0; helpSaid = false; stopGuide();
          stopMusic(); sfx.found(); setTimeout(showChest, 1100); return;
        }
        sfx.ng(); lockMiss++; b.classList.add('open'); b.disabled = true; hints();
        p.querySelector('#fb').textContent = lockMiss >= STAR_AT ? 'ひかっている ロッカーを あけてみよう' : lockMiss >= HINT_AT ? 'ばんごうを つけたよ。たての ばんごうが「だん」だよ' : 'からっぽ…。てがみを もういちど よんでみよう';
      };
      lk.appendChild(b);
    }
  }
  hints();
  p.querySelector('#x').onclick = closeModal;
}

function showNote() {
  if (!data) return;
  sfx.open(); scrape(0, .16, 2200, 3200, .04);     // ページを めくる おと
  const row = n => '<li><span class="badge">' + n + '</span><span class="q">' + n + 'つうめの てがみ</span><span class="a txt" id="a' + n + '"></span></li>';
  const p = openModal('<div class="nb"><div class="nb-page"><span class="nb-stamp">ひみつ</span><h2>たんていてちょう</h2><ul class="note">' + row(1) + row(2) + row(3) +
    '</ul></div></div><button class="btn" data-focus type="button">とじる</button>', 'notebook');
  const cells = [1, 2, 3].map(n => p.querySelector('#a' + n)), step = keysGot();
  cells.forEach((el, i) => {
    if (i > step) { el.innerHTML = '<span class="nb-blank">?</span>'; return; }
    const r = riddleParts(i);
    if (i === step) { r.canvas.className = 'nb-pic'; el.appendChild(r.canvas); }   // いま さがしている てがみは えも みせる
    el.insertAdjacentHTML('beforeend', '<span>' + r.html + '</span>' + (i < step ? ' <span class="nb-done">みつけた!</span>' : ''));
  });
  // いま さがしている てがみが みえる ところまで、かみを おくる
  if (step > 0) p.querySelector('.nb-page').scrollTop = Math.max(0, cells[Math.min(step, 2)].closest('li').offsetTop - 40);
  p.querySelector('.btn').onclick = closeModal;
}

function showChest() {
  m.dir = m.lookBack || 'left';
  const p = openModal('<h2>' + stg().foundSay + '</h2><div id="pic"></div><p>3つの カギで あけてみよう</p><button class="btn" data-focus type="button">あける</button>');
  const c = mk(240, 200, x => drawChest(x, 20, 10, 5)); c.className = 'prize'; p.querySelector('#pic').appendChild(c);
  p.querySelector('.btn').onclick = () => {
    data.cleared = true;
    if (!data.treasures.includes(stg().treasure.id)) data.treasures.push(stg().treasure.id);
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
  const p = openModal('<h2 id="ttl">カギを さしこむよ…</h2><div id="pic"></div><div id="after" hidden><p>' + stageNo + '話 クリア! めいたんていだね</p>' +
    (stageNo < LAST_STAGE ? '' : '<p class="small">つづきの おはなしは じゅんびちゅうだよ</p>') + '</div><div class="row" id="fins" hidden>' +
    (stageNo < LAST_STAGE ? '<button class="btn" id="next" type="button">つぎの おはなしへ</button>' : '') + '<button class="btn' + (stageNo < LAST_STAGE ? ' sub' : '') + '" id="fin" type="button">タイトルへ</button></div>');
  if (stageNo < LAST_STAGE) p.querySelector('#next').onclick = () => startGame(slotIx, stageNo + 1);
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
    const fade = ease((t - 2.3) / .8);                 // たからばこが きえて、たからものだけ のこる
    const by = 250 - rise * 140 + fade * 60, bs = .5 + rise * 1.6 + fade * .7;
    if (rise > 0) {   // まわる ひかり
      c.save(); c.translate(210, by); c.rotate(t * .6);
      for (let i = 0; i < 12; i++) { c.rotate(PI / 6); poly(c, [[-9, 0], [9, 0], [0, -150 * rise]], 'rgba(255,225,120,' + (.38 * rise) + ')'); }
      c.restore();
    }
    const shake = t < .7 ? Math.sin(t * 60) * 5 * (t / .7) : 0;
    if (fade < 1) { c.globalAlpha = 1 - fade; drawChestOpening(c, 110 + shake, 150, 5, open); c.globalAlpha = 1; }
    if (rise > 0) {
      stg().treasure.draw(c, 210, by, bs);
      for (let i = 0; i < 6; i++) { const a = t * 1.4 + i * PI / 3, r = 70 + 26 * Math.sin(t * 3 + i); starShape(c, 210 + Math.cos(a) * r * rise * 1.3, by + Math.sin(a) * r * rise, 3 + 3 * Math.abs(Math.sin(t * 4 + i)), '#FFFFFF', '#FFD25E'); }
    }
    if (!opened && t > .7) { opened = true; sfx.fanfare(); playMusic('clear', 2.2); p.querySelector('#ttl').textContent = 'たからばこが ひらいた!'; }
    if (!done && t > 3.1) { done = true; p.querySelector('#ttl').textContent = stg().treasure.name + 'を てに いれた!'; p.querySelector('#after').hidden = false; p.querySelector('#fins').hidden = false; (p.querySelector('#next') || p.querySelector('#fin')).focus({ preventScroll: true }); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---------- タイトル ---------- */
/* タイトルの え: ふだんは ゆっくり いきを して、ときどき まばたき。
   しばらく たつと、むしめがねで さがしながら ひだり→みぎ→まんなかへ あるいて、もとに もどる */
const TITLE = { home: 290, left: 130, right: 500, speed: 100, idle: 9, look: .9 };
const titleCat = { x: TITLE.home + 140, last: 0 };
function titlePose(t) {
  const T_ = TITLE, legs = [[T_.home, T_.left], [T_.left, T_.right], [T_.right, T_.home]];
  let u = t % (T_.idle + legs.reduce((s, l) => s + Math.abs(l[1] - l[0]) / T_.speed + T_.look, 0));
  if (u < T_.idle) return { x: T_.home, dir: 'down', walk: false, look: false };
  u -= T_.idle;
  for (const [from, to] of legs) {
    const d = Math.abs(to - from) / T_.speed, dir = to > from ? 'right' : 'left';
    if (u < d) return { x: from + (to - from) * (u / d), dir, walk: true, look: false };
    u -= d;
    if (u < T_.look) return { x: to, dir, walk: false, look: true };   // たちどまって のぞきこむ
    u -= T_.look;
  }
  return { x: T_.home, dir: 'down', walk: false, look: false };
}
function drawTitle(t) {
  const a = $('titleArt').getContext('2d');
  a.clearRect(0, 0, 640, 240);
  const blinkAt = (period, off) => ((t + off) % period) < .14;
  const p = titlePose(t), sgn = p.dir === 'left' ? -1 : 1;
  // シロは ミミの うしろを すこし おくれて ついていく
  const dt = Math.min(.1, Math.max(0, t - titleCat.last)); titleCat.last = t;
  const want = p.dir === 'down' ? TITLE.home + 140 : p.x - sgn * 125;
  const step = Math.sign(want - titleCat.x) * Math.min(Math.abs(want - titleCat.x), 150 * dt);
  titleCat.x += step;
  const catWalk = Math.abs(step) > .01;
  if (catWalk) drawCatDir(a, titleCat.x, 226, 3.6, step > 0 ? 'right' : 'left', Math.abs(Math.sin(t * 11)) * .9, Math.sin(t * 6) * .6);
  else if (p.dir === 'down') drawCat(a, titleCat.x, 226, 3.6, -1, (Math.sin(t * 1.5 + 1.2) + 1) * .25, false, Math.sin(t * 1.1), blinkAt(5.7, 2.5));
  else drawCatDir(a, titleCat.x, 226, 3.6, p.dir, (Math.sin(t * 1.5 + 1.2) + 1) * .25, Math.sin(t * 1.1), blinkAt(5.7, 2.5));
  const bob = p.walk ? Math.abs(Math.sin(t * 10)) * 1.1 : p.look ? .2 : (Math.sin(t * 1.5) + 1) * .3;
  drawGirl(a, p.x, 224, 5.2, p.dir, bob, p.dir === 'down' && blinkAt(4.3, 0));
  // むしめがねが きらり(ふだんは ときどき、のぞきこんだ ときは そのつど)
  const g = p.look ? (t * 1.4) % 1 : p.dir === 'down' ? (t % 6) / .9 : 2;
  if (g < 1) starShape(a, p.dir === 'down' ? p.x + 86 : p.x + sgn * 80, 142, 9 * Math.sin(g * PI), '#FFFFFF');
}
// タイトルの はいけい: ミミたちの あしもとを ちへいせんに して、そらと のはらを えがく
function fitTitle() {
  const sec = $('title'); if (sec.hidden || !sec.clientWidth) return;
  const s = sec.getBoundingClientRect(), a = $('titleArt').getBoundingClientRect();
  drawScenery(sec.clientWidth, Math.max(sec.clientHeight, sec.scrollHeight), a.top - s.top + sec.scrollTop + a.height * .87, 'titleBg', 'titleClouds');
}
function slotState(d) {
  if (!d) return 'はじめから';
  const no = d.stage || 1;
  if (d.cleared) return no + '話 クリア・たからもの ' + d.treasures.length + 'こ';
  const k = (d.s1 ? 1 : 0) + (d.s2 ? 1 : 0) + (d.letter ? 1 : 0);
  return no + '話・カギ ' + k + 'こ';
}
// クリアした データを えらんだ とき: あそぶ はなしを えらぶ
function showStageSelect(ix) {
  const d = store.slots[ix];
  const p = openModal('<h2>どの おはなしで あそぶ?</h2><div class="stages" id="st"></div><button class="btn sub" type="button" id="x">やめる</button>');
  for (let n = 1; n <= LAST_STAGE; n++) {
    const done = d.treasures.includes(STAGE[n].treasure.id), open = n === 1 || d.treasures.includes(STAGE[n - 1].treasure.id);
    const b = document.createElement('button'); b.type = 'button'; b.className = 'stage-btn'; b.disabled = !open;
    b.innerHTML = '<b>' + n + '話</b><span>' + STAGE[n].name + '</span><small>' + (done ? 'クリア! もういちど あそぶ' : open ? 'あたらしい おはなし' : (n - 1) + '話を クリアすると あそべるよ') + '</small>';
    if (done) { const t = mk(96, 96, x => STAGE[n].treasure.draw(x, 48, 50, 1.25)); b.prepend(t); }
    b.onclick = () => { sfx.open(); startGame(ix, n); };
    p.querySelector('#st').appendChild(b);
  }
  p.querySelector('#x').onclick = closeModal;
}
function buildSlots() {
  const host = $('slots'); host.replaceChildren();
  ANIMALS.forEach((a, i) => {
    const d = store.slots[i];
    const wrap = document.createElement('div'); wrap.className = 'slot';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'slot-main';
    b.appendChild(mk(168, 168, x => drawAnimal(x, a.id, 84, 100, 5.4)));
    b.insertAdjacentHTML('beforeend', '<span class="who">' + a.name + '</span><span class="state">' + slotState(d) + '</span>');
    b.onclick = () => { sfx.open(); if (d && d.cleared) showStageSelect(i); else startGame(i); };
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
  fitTitle();
}

/* ---------- にゅうりょく ---------- */
cv.addEventListener('pointerdown', ev => {
  if (busy || !running || chest) return;
  const r = cv.getBoundingClientRect();
  const tx = Math.floor((ev.clientX - r.left) / r.width * COLS), ty = Math.floor((ev.clientY - r.top) / r.height * ROWS);
  if (tx === m.x && ty === m.y && m.p >= 1) return;
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
  else if ((ev.key === ' ' || ev.key === 'Enter') && document.activeElement === document.body) { ev.preventDefault(); search(); }
});
window.addEventListener('keyup', ev => { if (KEYMAP[ev.key] === held) held = null; });
$('btnDig').onclick = search;
$('btnNote').onclick = () => { if (!busy) showNote(); };
$('btnHome').onclick = () => { if (!chest) goTitle(); };
$('btnSound').onclick = () => { store.sound = !store.sound; saveAll(); refreshHud(); sfx.open(); if (store.sound) playMusic(wantTrack); else stopMusic(); };
// おとは さいしょの タッチの あとで ないと ならせない
document.addEventListener('pointerdown', () => { if (!running && !music && $('gate').hidden) playMusic('title'); });
window.addEventListener('resize', fit); window.addEventListener('resize', fitTitle);
if (window.ResizeObserver) new ResizeObserver(fit).observe($('field'));

/* ---------- いりぐち(むしめがね) ---------- */
function setupGate() {
  const gate = $('gate'), lens = $('lens'), c = $('lensArt').getContext('2d');
  // レンズの なかに ミミの かげを ぼんやり うつす
  drawGirl(c, 112, 214, 4.6); c.globalCompositeOperation = 'source-in'; c.fillStyle = '#A9B9E8'; c.fillRect(0, 0, 240, 240); c.globalCompositeOperation = 'source-over';
  num(c, '?', 196, 62, 44, '#D9478A');
  let opening = false;
  gate.onclick = () => {
    if (opening) return; opening = true;
    playMusic('title');
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, .25, i * .07, 'triangle', .08));   // きらりん
    if (calm) { gate.hidden = true; return; }
    const r = lens.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, r0 = lens.clientWidth / 2;
    const far = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) + 40, S = far / r0;
    gate.style.setProperty('--cx', cx + 'px'); gate.style.setProperty('--cy', cy + 'px');
    gate.classList.add('open');
    let t0 = null;
    const tick = ts => {
      if (t0 === null) t0 = ts;
      const p = Math.min(1, (ts - t0) / 950), k = p < .25 ? 1 - .12 * Math.sin(p / .25 * PI) : 1 + (S - 1) * Math.pow((p - .25) / .75, 2.2);
      lens.style.transform = 'scale(' + k + ')';
      gate.style.setProperty('--r', Math.max(0, r0 * k - 1) + 'px');
      if (p < 1) requestAnimationFrame(tick); else gate.hidden = true;
    };
    requestAnimationFrame(tick);
  };
}

/* ---------- はじまり ---------- */
function boot() {
  drawTitle(0); setupGate();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitle);
  drawCat($('catface').getContext('2d'), 58, 128, 5.2);
  buildSlots();
  requestAnimationFrame(frame);
}
let booted = false; const go = () => { if (!booted) { booted = true; boot(); } };
if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('400 13px "Mochiy Pop One"', '123?')]).then(go, go);
setTimeout(go, 1500);
})();
