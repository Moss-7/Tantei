/* たんていミミ2 なないろの ちず — 1話「えき」 2話「としょかん」 3話「どうぶつえん」 4話「うみべ」
   あそびかたは「みる・とく・つかう」だけ。てがみ、カギ、てちょう、さがすボタン、十字ボタンは ない。
   いきたい ばしょや ものを タッチすると ミミが あるき、ついたら しらべる。 */
(() => {
'use strict';
const T = 40, COLS = 12, ROWS = 10, PI = Math.PI;
const SAVE_KEY = 'tantei2-save-v1';
const $ = id => document.getElementById(id);
const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
const calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- セーブ(あつめた かけらと、おとの せってい) ---------- */
function loadAll() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (d && Array.isArray(d.slots)) return d;
    if (d && Array.isArray(d.pieces)) return { slots: [{ pieces: d.pieces, seenPrologue: !!d.seenPrologue, introSeen: d.introSeen || [] }, null, null], sound: d.sound !== false };
  } catch (e) {}
  return { slots: [null, null, null], sound: true };
}
function saveAll() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(store)); } catch (e) {} }
const store = loadAll();
let slotIx = 0, data = { pieces: [], seenPrologue: false, introSeen: [] };   // data: いま あそんでいる ひとの データ

/* ---------- おと ---------- */
let stepAlt = false, actx = null, music = null, wantTrack = null, noiseBuf = null;
const midi = n => 440 * Math.pow(2, (n - 69) / 12);
function audio() { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; }
function note(freq, dur, t0, type, vol, dest) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(dest); o.start(t0); o.stop(t0 + dur + 0.05);
}
function tone(freq, dur, delay = 0, type = 'sine', vol = 0.12) { if (!store.sound) return; try { audio(); note(freq, dur, actx.currentTime + delay, type, vol, actx.destination); } catch (e) {} }
function scrape(delay, dur, f0, f1, vol) {
  if (!store.sound) return;
  try {
    audio();
    if (!noiseBuf) { noiseBuf = actx.createBuffer(1, actx.sampleRate * .5, actx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t0 = actx.currentTime + delay, src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    src.buffer = noiseBuf; src.loop = true; f.type = 'bandpass'; f.Q.value = .9;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .03); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(actx.destination); src.start(t0); src.stop(t0 + dur + .05);
  } catch (e) {}
}
const sfx = {
  ok() { tone(660, .15); tone(880, .25, .12); },
  ng() { tone(220, .2, 0, 'triangle'); },
  open() { tone(520, .12); },
  miss() { tone(311, .16, 0, 'triangle', .14); tone(233, .3, .16, 'triangle', .14); },
  step() { stepAlt = !stepAlt; tone(stepAlt ? 330 : 392, .08, 0, 'triangle', .11); },
  train() { scrape(0, 1.6, 300, 900, .22); for (let i = 0; i < 6; i++) tone(120, .09, i * .22, 'triangle', .16); tone(880, .5, 1.45, 'triangle', .12); tone(1175, .6, 1.55, 'triangle', .1); },   // ガタンゴトン → とうちゃくの ベル
  book() { scrape(0, .3, 1500, 3500, .09); scrape(.35, .3, 2000, 4200, .08); [1319, 1568, 2093].forEach((f, i) => tone(f, .45, 1.1 + i * .1, 'triangle', .08)); },   // ぱらぱら → きらん
  dig() { for (let i = 0; i < 3; i++) scrape(i * .3, .22, 500, 220, .2); },   // ざっ ざっ ざっ
  chest() { tone(392, .12, 0, 'triangle', .1); tone(523, .12, .12, 'triangle', .1); [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, .4, .55 + i * .08, 'triangle', .08)); },
  monkey() { [988, 1319, 988, 1319].forEach((f, i) => tone(f, .09, i * .11, 'square', .05)); tone(1568, .3, .5, 'triangle', .08); },   // ウキキッ
  fanfare() { [523, 523, 523, 659, 784].forEach((f, i) => tone(f, .22, [0, .16, .32, .48, .72][i], 'triangle', .14)); [1047, 1319, 1568].forEach(f => tone(f, 1.3, .98, 'triangle', .09)); },
};
const TRACKS = {
  // タイトル(1さくめと おなじ きょく)
  title: { beat: .27, gate: .5, bassGate: .45, wave: 'square', vol: .028,
    mel: [[69,.5],[0,.5],[72,.5],[0,.5],[76,.5],[0,.5],[75,.5],[76,.5],  [81,1],[0,1],[79,.5],[76,.5],[72,1],
          [74,.5],[0,.5],[77,.5],[0,.5],[81,.5],[0,.5],[80,.5],[81,.5],  [83,1],[0,1],[76,2],
          [84,.5],[83,.5],[81,.5],[79,.5],[81,1],[76,1],  [77,.5],[76,.5],[74,.5],[72,.5],[74,1],[71,1],
          [72,.5],[0,.5],[76,.5],[0,.5],[81,.5],[0,.5],[80,.5],[83,.5],  [81,1.5],[0,.5],[81,.5],[0,1.5]],
    bass: [[45,1],[52,1],[45,1],[52,1], [45,1],[52,1],[45,1],[52,1], [50,1],[57,1],[50,1],[57,1], [52,1],[59,1],[52,1],[56,1],
           [45,1],[52,1],[45,1],[52,1], [50,1],[57,1],[43,1],[50,1], [45,1],[52,1],[45,1],[52,1], [45,1],[52,1],[45,1],[0,1]] },
  // えき: でんしゃの リズムで はずむ ハ長調
  station: { beat: .3, gate: .7,
    mel: [[72,.5],[72,.5],[76,1],[79,1],[76,1], [77,.5],[77,.5],[81,1],[79,2], [76,.5],[76,.5],[79,1],[84,1],[79,1], [81,.5],[79,.5],[77,1],[76,2],
          [74,.5],[74,.5],[77,1],[81,1],[77,1], [76,.5],[76,.5],[79,1],[84,2], [83,.5],[81,.5],[79,.5],[77,.5],[76,1],[74,1], [72,2],[0,2]],
    bass: [[48,1],[55,1],[48,1],[55,1], [53,1],[60,1],[55,1],[62,1], [48,1],[55,1],[48,1],[55,1], [53,1],[60,1],[48,1],[55,1],
           [50,1],[57,1],[50,1],[57,1], [48,1],[55,1],[48,1],[55,1], [55,1],[62,1],[55,1],[62,1], [48,1],[55,1],[48,1],[0,1]] },
  // としょかん: しずかな 3びょうし(ヘ長調)
  library: { beat: .36, gate: .85, vol: .045,
    mel: [[72,1],[77,1],[81,1], [79,2],[77,1], [76,1],[74,1],[76,1], [77,3],
          [72,1],[74,1],[76,1], [77,2],[81,1], [79,1],[77,1],[76,1], [74,3],
          [70,1],[74,1],[77,1], [76,2],[74,1], [72,1],[74,1],[76,1], [77,2],[0,1],
          [81,1],[79,1],[77,1], [76,1],[74,1],[76,1], [77,3], [0,3]],
    bass: [[53,1],[60,1],[60,1], [48,1],[55,1],[55,1], [48,1],[55,1],[55,1], [53,1],[60,1],[60,1],
           [53,1],[60,1],[60,1], [46,1],[53,1],[53,1], [48,1],[55,1],[55,1], [48,1],[55,1],[55,1],
           [46,1],[53,1],[53,1], [48,1],[55,1],[55,1], [48,1],[55,1],[55,1], [53,1],[60,1],[60,1],
           [53,1],[60,1],[60,1], [48,1],[55,1],[55,1], [53,1],[60,1],[60,1], [53,1],[0,2]] },
  // どうぶつえん: ぽんぽん はずむ ト長調
  zoo: { beat: .27, gate: .6,
    mel: [[67,.5],[71,.5],[74,1],[71,.5],[74,.5],[79,1], [78,.5],[76,.5],[74,.5],[72,.5],[71,2], [69,.5],[72,.5],[76,1],[72,.5],[76,.5],[81,1], [79,.5],[78,.5],[76,.5],[74,.5],[79,2],
          [71,.5],[74,.5],[79,1],[74,.5],[79,.5],[83,1], [81,.5],[79,.5],[78,.5],[76,.5],[74,2], [72,.5],[76,.5],[74,.5],[72,.5],[71,1],[69,1], [67,2],[0,2]],
    bass: [[43,1],[50,1],[55,1],[50,1], [38,1],[45,1],[50,1],[45,1], [45,1],[52,1],[57,1],[52,1], [43,1],[50,1],[55,1],[50,1],
           [43,1],[50,1],[55,1],[50,1], [38,1],[45,1],[50,1],[45,1], [48,1],[55,1],[50,1],[45,1], [43,1],[50,1],[43,1],[0,1]] },
  // うみべ: なみの ように ゆったり(ニ長調)
  sea: { beat: .32, gate: .8,
    mel: [[74,1],[76,.5],[78,.5],[81,1],[78,1], [79,1],[78,.5],[76,.5],[74,2], [71,1],[74,.5],[76,.5],[78,1],[76,1], [74,1],[73,.5],[71,.5],[69,2],
          [74,1],[76,.5],[78,.5],[81,1],[83,1], [81,1],[78,.5],[76,.5],[78,2], [79,1],[78,.5],[76,.5],[73,1],[76,1], [74,2],[0,2]],
    bass: [[38,1],[45,1],[50,1],[45,1], [43,1],[50,1],[55,1],[50,1], [47,1],[54,1],[59,1],[54,1], [45,1],[52,1],[57,1],[52,1],
           [38,1],[45,1],[50,1],[45,1], [47,1],[54,1],[59,1],[54,1], [43,1],[50,1],[45,1],[52,1], [38,1],[45,1],[38,1],[0,1]] },
  clear: { beat: .3,
    mel: [[72,.5],[76,.5],[79,.5],[84,1.5],[79,.5],[84,.5], [88,2],[86,1],[84,1], [81,.5],[84,.5],[81,.5],[77,1.5],[81,.5],[84,.5], [79,2],[83,1],[86,1]],
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
  try { audio(); const gain = actx.createGain(); gain.connect(actx.destination); const t = actx.currentTime + .1 + delay; music = { name, gain, tm: t, tb: t, i: 0, j: 0, timer: setInterval(musicTick, 100) }; musicTick(); } catch (e) { music = null; }
}
function musicTick() {
  if (!music) return;
  const tr = TRACKS[music.name], now = actx.currentTime, until = now + .5;
  if (music.tm < now - .2) { music.tm = music.tb = now + .05; music.i = music.j = 0; }
  while (music.tm < until) { const [n, d] = tr.mel[music.i]; if (n) note(midi(n), d * tr.beat * (tr.gate || .95), music.tm, tr.wave || 'triangle', tr.vol || .055, music.gain); music.tm += d * tr.beat; music.i = (music.i + 1) % tr.mel.length; }
  while (music.tb < until) { const [n, d] = tr.bass[music.j]; if (n) note(midi(n), d * tr.beat * (tr.bassGate || .8), music.tb, 'triangle', tr.bassGate ? .09 : .07, music.gain); music.tb += d * tr.beat; music.j = (music.j + 1) % tr.bass.length; }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) stopMusic(); else if (wantTrack && !music) playMusic(wantTrack); });

/* ---------- え: 1作目から ひきつぐ もの ---------- */
function rr(c, x, y, w, h, r, fill, stroke, lw) { c.beginPath(); c.roundRect(x, y, w, h, r); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); } }
function ci(c, x, y, r, fill, stroke, lw) { c.beginPath(); c.arc(x, y, r, 0, PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); } }
function el(c, x, y, rx, ry, fill, stroke, lw) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); } }
function poly(c, pts, fill, stroke, lw) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); } }
function ln(c, x1, y1, x2, y2, col, lw) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = col; c.lineWidth = lw || 2; c.lineCap = 'round'; c.stroke(); }
function num(c, t, x, y, size, col) { c.font = '400 ' + size + 'px "Mochiy Pop One","Zen Maru Gothic",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(t, x, y); }
function starShape(c, x, y, R, fill, stroke) {
  c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? R * .5 : R, a = -PI / 2 + i * PI / 5; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath();
  c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.lineJoin = 'round'; c.stroke(); }
}
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


/* ---------- え: 2で ふえた もの ---------- */
// とけい: ながい はりは 12(ちょうど)か 6(はん)。みじかい はりは、はんの ときは すうじの あいだ
function drawClock(c, x, y, R, h, half, hint) {
  ci(c, x, y, R, '#FFFFFF', '#FF7EB6', R * .16);
  for (let i = 1; i <= 12; i++) { const a = i * PI / 6 - PI / 2; if (R > 40) num(c, i, x + Math.cos(a) * R * .74, y + Math.sin(a) * R * .74 + 1, R * .2, '#3A2D58'); else ci(c, x + Math.cos(a) * R * .76, y + Math.sin(a) * R * .76, R * .06, '#3A2D58'); }
  const la = (half ? PI : 0) - PI / 2; ln(c, x, y, x + Math.cos(la) * R * .62, y + Math.sin(la) * R * .62, hint ? '#2E9C82' : '#3A2D58', Math.max(1.6, R * .05));
  const sa = (h + (half ? .5 : 0)) * PI / 6 - PI / 2; ln(c, x, y, x + Math.cos(sa) * R * .42, y + Math.sin(sa) * R * .42, hint ? '#D9478A' : '#3A2D58', Math.max(2.2, R * (hint ? .1 : .07)));
  ci(c, x, y, Math.max(1.6, R * .06), '#3A2D58');
}
function drawPenguin(c, x, by, s, bob = 0, cheer = false) {   // えきいんの ペンギン。(x, by) は あしもと
  c.save(); c.translate(x, by); c.scale(s, s);
  el(c, 0, 0, 9, 2.8, 'rgba(40,20,70,.18)');
  c.translate(0, -bob);
  el(c, -4, -1, 4, 2, '#FFA63D'); el(c, 4, -1, 4, 2, '#FFA63D');
  el(c, 0, -13, 10, 13, '#3F4A7A'); el(c, 0, -11, 6.5, 9.5, '#FFFFFF');
  c.save(); c.translate(-9, -15); c.rotate(cheer ? -1.9 : .25); el(c, 0, 6, 2.6, 7, '#3F4A7A'); c.restore();
  c.save(); c.translate(9, -15); c.rotate(cheer ? 1.9 : -.25); el(c, 0, 6, 2.6, 7, '#3F4A7A'); c.restore();
  ci(c, -3.3, -19, 1.3, '#3A2D58'); ci(c, 3.3, -19, 1.3, '#3A2D58'); poly(c, [[-2.6, -16.5], [2.6, -16.5], [0, -13.5]], '#FFA63D');
  ci(c, -6, -16, 1.6, 'rgba(255,120,160,.45)'); ci(c, 6, -16, 1.6, 'rgba(255,120,160,.45)');
  rr(c, -8, -29, 16, 6, 2, '#D9478A', '#3A2D58', 1); rr(c, -10, -24.5, 20, 2.6, 1.3, '#3A2D58'); ci(c, 0, -26, 1.6, '#FFC83D');   // えきいんの ぼうし
  c.restore();
}
function drawOwl(c, x, by, s, bob = 0, cheer = false) {   // としょかんの フクロウ。まるい めがねを かけている
  c.save(); c.translate(x, by); c.scale(s, s);
  el(c, 0, 0, 9, 2.8, 'rgba(40,20,70,.18)');
  c.translate(0, -bob);
  el(c, -3.5, -1, 3, 1.6, '#FFA63D'); el(c, 3.5, -1, 3, 1.6, '#FFA63D');
  poly(c, [[-9.5, -21], [-7, -31], [-3, -24]], '#8C5E3C', '#3A2D58', .8); poly(c, [[9.5, -21], [7, -31], [3, -24]], '#8C5E3C', '#3A2D58', .8);   // みみの はね
  el(c, 0, -13, 10.5, 13, '#A9784F'); el(c, 0, -9.5, 7, 8.5, '#F6E3C4');
  for (let i = 0; i < 3; i++) { const yy = -12 + i * 4; ln(c, -3, yy, -1.5, yy + 1.4, '#C9A27A', 1); ln(c, 1.5, yy + 1.4, 3, yy, '#C9A27A', 1); }
  c.save(); c.translate(-9.5, -14); c.rotate(cheer ? -1.7 : .2); el(c, 0, 6, 3, 7.5, '#8C5E3C'); c.restore();
  c.save(); c.translate(9.5, -14); c.rotate(cheer ? 1.7 : -.2); el(c, 0, 6, 3, 7.5, '#8C5E3C'); c.restore();
  el(c, 0, -19, 9, 6.6, '#E2C29A');
  ci(c, -4, -19.2, 3.7, '#FFFFFF', '#3A2D58', 1.1); ci(c, 4, -19.2, 3.7, '#FFFFFF', '#3A2D58', 1.1); ln(c, -.4, -19.6, .4, -19.6, '#3A2D58', 1.1);   // めがね
  ci(c, -4, -18.8, 1.6, '#3A2D58'); ci(c, 4, -18.8, 1.6, '#3A2D58');
  poly(c, [[-1.6, -16.2], [1.6, -16.2], [0, -13.3]], '#FFA63D');
  ci(c, -7, -15.6, 1.4, 'rgba(255,120,160,.45)'); ci(c, 7, -15.6, 1.4, 'rgba(255,120,160,.45)');
  c.restore();
}
function drawTrain(c, x, y, col) {   // うえを むいて はいってくる でんしゃ(よこ 1ます、たて 2ますぶん)
  rr(c, x + 3, y, 34, 84, [14, 14, 6, 6], col, '#3A2D58', 2.5);
  rr(c, x + 8, y + 8, 24, 16, [8, 8, 3, 3], '#BFE9F7', '#3A2D58', 2);
  ci(c, x + 11, y + 31, 3, '#FFE38A', '#3A2D58', 1.2); ci(c, x + 29, y + 31, 3, '#FFE38A', '#3A2D58', 1.2);
  rr(c, x + 8, y + 40, 24, 12, 3, '#BFE9F7', '#3A2D58', 1.6); rr(c, x + 8, y + 58, 24, 12, 3, '#BFE9F7', '#3A2D58', 1.6);
  rr(c, x + 3, y + 74, 34, 5, 0, 'rgba(255,255,255,.55)');
}
function drawPiece(c, x, y, s, col) {   // ちずの かけら
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(-.12);
  poly(c, [[-18, -14], [-4, -17], [8, -12], [19, -15], [17, 2], [20, 14], [6, 17], [-7, 13], [-19, 16], [-16, 1]], '#FFF3D6', '#B58A1F', 2);
  c.save(); c.globalAlpha = .55; poly(c, [[-18, -14], [-4, -17], [8, -12], [19, -15], [17, 2], [-16, 1]], col); c.restore();
  ln(c, -10, 6, -2, 2, '#B58A1F', 1.6); ln(c, -2, 2, 6, 8, '#B58A1F', 1.6); starShape(c, 9, 9, 3.2, '#D9478A');
  c.restore();
}
function drawBook(c, x, y, s, col, open = 0, label = '') {   // ほん。open: 0=とじている → 1=ひらいている(まんなかで くるっと かわる)
  c.save(); c.translate(x, y); c.scale(s, s);
  if (open < .5) {
    c.scale(1 - open * 2 * .9, 1);
    rr(c, -11, -15, 22, 30, 3, col, '#3A2D58', 2); rr(c, -11, -15, 5, 30, [3, 0, 0, 3], 'rgba(0,0,0,.15)');
    rr(c, -3, -9, 11, 8, 2, '#FFFFFF'); if (label) num(c, label, 2.5, -4.6, 7, '#3A2D58');
  } else {
    c.scale((open - .5) * 2, 1);
    poly(c, [[0, -12], [-22, -15], [-22, 13], [0, 15]], '#FFFFFF', '#3A2D58', 2); poly(c, [[0, -12], [22, -15], [22, 13], [0, 15]], '#FFFFFF', '#3A2D58', 2);
    for (let i = 0; i < 4; i++) { ln(c, -18, -8 + i * 5, -4, -7 + i * 5, '#DCD3F0', 1.4); ln(c, 4, -7 + i * 5, 18, -8 + i * 5, '#DCD3F0', 1.4); }
  }
  c.restore();
}
function drawShelf(c, x, y, w, h, col, seedN) {   // ほんだな。うえの ふだが たなの いろ
  rr(c, x, y, w, h, 5, '#B07A4E', '#3A2D58', 2.5);
  rr(c, x + 7, y + 4, w - 14, 12, 4, col, '#3A2D58', 2);
  const rows = 3, top = y + 20, rh = (h - 26) / rows;
  for (let r = 0; r < rows; r++) {
    const yy = top + r * rh; rr(c, x + 5, yy, w - 10, rh - 3, 2, '#7E5134');
    let bx = x + 7; const BC = ['#FF9DB5', '#7FB6F0', '#FFD25E', '#8FD6A6', '#B79CED', '#FFA63D', '#FFFFFF'];
    for (let i = 0; bx < x + w - 10; i++) { const bw = 4 + Math.floor(hash(seedN * 7 + r, i) * 4), bh = rh - 6 - Math.floor(hash(i, seedN + r * 3) * 5); if (bx + bw > x + w - 7) break; rr(c, bx, yy + rh - 4 - bh, bw, bh, 1, BC[Math.floor(hash(i + r, seedN) * 7)]); bx += bw + 1; }
  }
}

/* ---------- いどうの きほん ---------- */
const bk = (x, y) => x + ',' + y;
function blocked(x, y) { return x < 0 || y < 0 || x >= COLS || y >= ROWS || S.blocked(x, y); }
function findPath(sx, sy, gx, gy) {
  const prev = new Map(), q = [[sx, sy]]; prev.set(bk(sx, sy), null);
  let best = [sx, sy], bestD = Math.abs(sx - gx) + Math.abs(sy - gy);
  while (q.length) {
    const [x, y] = q.shift(), d = Math.abs(x - gx) + Math.abs(y - gy);
    if (d < bestD) { bestD = d; best = [x, y]; }
    if (d === 0) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, k = bk(nx, ny); if (blocked(nx, ny) || prev.has(k)) continue; prev.set(k, [x, y]); q.push([nx, ny]); }
  }
  const out = []; let cur = best;
  while (cur && !(cur[0] === sx && cur[1] === sy)) { out.unshift(cur); cur = prev.get(bk(cur[0], cur[1])); }
  return out;
}

/* ---------- じょうたい ---------- */
// step: 0=1つめを みる → 1=2つめを みる → 2=つかう → 3=かいけつ
const cv = $('cv'), ctx = cv.getContext('2d');
let S = null, seed = null, step = 0, running = false, busy = false, miss = 0, tNow = 0, runId = 0;
let m, cat, path = [], pending = null, dest = null, anim = null, win = null, shake = 0, cardNew = false;
const timeText = (h, half) => h + 'じ' + (half ? 'はん' : '');
const shuffle = a => a.map(v => [Math.random(), v]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
function drawWho(c, who, x, by, s, bob = 0, cheer = false) {
  if (who === 'pen') drawPenguin(c, x, by, s, bob, cheer); else if (who === 'ele') drawElephant(c, x, by, s * 1.15, bob, cheer); else if (who === 'kame') drawTurtle(c, x, by, s * 1.1, bob, cheer); else drawOwl(c, x, by, s, bob, cheer);
}
function say(t, who) {
  who = who || S.npc.who;
  $('say').textContent = t;
  const f = $('face').getContext('2d'); f.clearRect(0, 0, 120, 120);
  if (who === 'pen') drawPenguin(f, 60, 110, 3.3); else if (who === 'owl') drawOwl(f, 60, 112, 3.2); else if (who === 'ele') drawElephant(f, 60, 112, 3.0); else if (who === 'mon') drawMonkey(f, 60, 108, 3.9); else if (who === 'kame') drawTurtle(f, 60, 106, 3.4); else if (who === 'girl') drawGirl(f, 60, 150, 3.2, 'down'); else drawCat(f, 58, 128, 5.2);
}
function drawTray() {
  const tray = $('tray'); tray.replaceChildren();
  S.cards().forEach((cd, i) => {
    if (step < i + 1) return;
    const e = document.createElement('span'); e.className = 'card' + (cardNew && step === i + 1 ? ' new' : '') + (i === 1 && step === 2 && miss >= 2 ? ' glow' : '');
    e.appendChild(mk(64, 64, cd.draw)); const b = document.createElement('b'); b.textContent = cd.label; e.appendChild(b); tray.appendChild(e);
  });
  cardNew = false;
}
const PIECE_COL = ['#FF7E8A', '#FFA63D', '#FFD25E', '#8FD6A6', '#7FB6F0', '#8C9BEA', '#B79CED'];
function drawPieces() {
  let h = '', got = 0;
  for (let i = 0; i < 7; i++) { const g = data.pieces.includes(i + 1); if (g) got++; h += '<i class="' + (g ? 'got' : '') + '" style="' + (g ? 'background:' + PIECE_COL[i] : '') + '"></i>'; }
  $('pieces').innerHTML = h; $('pieces').setAttribute('aria-label', 'ちずの かけら ' + got + 'まい');
}
// こたえが わかって、さいごに あたった とき: ちずの かけらが でてくる
function winPiece(delay) {
  const id = runId;
  setTimeout(() => { if (id !== runId) return; win = { t: 0 }; sfx.fanfare(); playMusic('clear', 2.2); if (!data.pieces.includes(S.n)) data.pieces.push(S.n); saveAll(); drawPieces(); say(S.thanks); }, delay);
  setTimeout(() => { if (id !== runId) return; say('ちずに もどって、つぎの ばしょへ いこう', 'cat'); $('btnAgain').hidden = false; }, delay + 4300);
}
function wrongPlace(text, hintText) {   // つかう ばしょを まちがえた: いらいにんが くびを ふる。なんどでも やりなおせる
  miss++; shake = .6; sfx.miss(); drawTray(); say(miss >= 2 ? hintText : text);
}
const face = (x, y) => { m.dir = x > m.x ? 'right' : x < m.x ? 'left' : y < m.y ? 'up' : 'down'; };

/* ==================== 1話 えき ==================== */
const PLATS = [{ n: 1, x: 1, tx: 2, col: '#FF9DB5' }, { n: 2, x: 5, tx: 6, col: '#7FB6F0' }, { n: 3, x: 9, tx: 10, col: '#8FD6A6' }];
const EKI = {
  n: 1, name: 'えき', track: 'station', npc: { who: 'pen', x: 10, y: 3 },
  thanks: 'ありがとう! おれいに、ちずの かけらを あげるね',
  intro: {
    lines: [['pen', 'たいへん! とけいが くるって、でんしゃの ばんせんが わからないの'], ['pen', 'でんしゃが こないと、ひろった おとしものも とどけられないよ'], ['girl', 'まかせて! たんていミミが しらべるよ']],
    from: { m: [0, 4, 'right'], cat: [0, 5, 'up'] }, to: [8, 3], after: { m: [8, 3, 'right'], cat: [7, 3, 'right'] }, first: 'ひかっている とけいを みてみよう',
    point(c, t) { const bob = Math.sin(t * 5) * 3, ax = 10 * T + 6 - bob, ay = 2 * T + 22 - bob; poly(c, [[ax - 12, ay - 12], [ax + 4, ay - 8], [ax - 8, ay + 4]], '#FFC83D', '#3A2D58', 2); ln(c, ax - 3, ay - 3, ax + 8, ay + 8, '#3A2D58', 3); },   // じこくひょうの ほうへ ななめうえ
  },
  glow: [[2 * T - 12, 6, 64, 64, 32], [6 * T + 4, 8, 4 * T - 8, 58, 6]],
  blocked(x, y) {
    if (y < 2) return true;
    if (x === 10 && y === 3) return true;
    if (y >= 6) return !PLATS.some(p => p.x === x);   // かいさつより したは、ホームの ますだけ あるける
    return false;
  },
  objs: [
    { id: 'clock', hit: (x, y) => y < 2 && x >= 1 && x <= 3, stand: [[2, 2], [1, 2], [3, 2]] },
    { id: 'table', hit: (x, y) => y < 2 && x >= 6 && x <= 9, stand: [[7, 2], [8, 2], [6, 2], [9, 2]] },
    { id: 'npc', hit: (x, y) => x === 10 && (y === 3 || y === 2), stand: [[9, 3], [10, 4], [11, 3]] },
    ...PLATS.map(p => ({ id: 'plat', n: p.n, hit: (x, y) => y >= 6 && x >= p.x - 1 && x <= p.tx, stand: [[p.x, 7]] })),
  ],
  newSeed() {
    const h = 2 + Math.floor(Math.random() * 10), half = Math.random() < .5;
    // じこくひょう: 30ぷんずつ ちがう 3つの じかん。まんなかが いまの じかん
    const mins = h * 60 + (half ? 30 : 0), rows = [-30, 0, 30].map(d => { const v = mins + d; return { h: Math.floor(v / 60), half: v % 60 === 30 }; });
    const plats = shuffle([1, 2, 3]);
    rows.forEach((r, i) => { r.plat = plats[i]; });
    return { h, half, rows, ans: rows[1].plat };
  },
  cards() {
    return [{ label: timeText(seed.h, seed.half), draw: x => drawClock(x, 32, 32, 26, seed.h, seed.half, false) },
            { label: 'ばんせん', draw: x => { ci(x, 32, 32, 28, '#FFE38A'); num(x, seed.ans, 32, 34, 34, '#3A2D58'); } }];
  },
  act(o) {
    const tt = timeText(seed.h, seed.half);
    if (o.id === 'clock') { m.dir = 'up'; if (step === 0) EKI.lookClock(); else say('いまは ' + tt + 'だよ', 'cat'); }
    else if (o.id === 'table') { m.dir = 'up'; if (step === 0) say('さきに とけいを みて、いまの じかんを しらべよう', 'cat'); else if (step === 1) EKI.lookTable(); else say(tt + 'の でんしゃは ' + seed.ans + 'ばんせんだよ', 'cat'); }
    else if (o.id === 'npc') { face(10, 3); say(['いま なんじかな? ひかっている とけいを タッチして みてね', 'じこくひょうで、その じかんの でんしゃを さがして ほしいな', 'カードの ばんせんの ホームを タッチしてね', 'ありがとう! たすかったよ'][step]); }
    else if (o.id === 'plat') {
      m.dir = 'right';
      if (step < 2) { say('どの ホームか、まだ わからないよ。' + (step === 0 ? 'とけい' : 'じこくひょう') + 'を みよう', 'cat'); return; }
      if (step > 2) return;
      if (o.n !== seed.ans) { wrongPlace('この ホームじゃ ないみたい', 'カードの ばんごうと、ホームの ばんごうを くらべてみて'); return; }
      step = 3; busy = true; stopMusic(); sfx.train();
      anim = { n: o.n, t: 0 }; say('でんしゃが きた!');
      winPiece(1900);
    }
  },
  lookClock() {
    sfx.open();
    const p = openModal('<h2>とけいは なんじ?</h2><div id="pic"></div><div class="row" id="ch"></div><p class="fb" id="fb"></p>');
    const paint = hint => { const c = mk(300, 300, x => drawClock(x, 150, 150, 132, seed.h, seed.half, hint)); c.className = 'pic'; p.querySelector('#pic').replaceChildren(c); };
    paint(false);
    // えらぶ もの: ただしい じかん、「はん」の ありなしを まちがえた もの、ながい はりの すうじを よんだ もの、1じかん ずれた もの
    const next = seed.h % 12 + 1, opts = [[seed.h, seed.half], [seed.h, !seed.half], [seed.half ? 6 : 12, false], [next, seed.half]];
    const seen = new Set(), list = shuffle(opts.filter(o => { const k = o.join(); if (seen.has(k)) return false; seen.add(k); return true; }));
    list.forEach(([h, half]) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'choice'; b.innerHTML = h + '<small>じ' + (half ? 'はん' : '') + '</small>';
      b.onclick = () => (h === seed.h && half === seed.half)
        ? right(p, 'せいかい! ' + timeText(h, half), () => { step = 1; cardNew = true; drawTray(); say('じこくひょうで、' + timeText(h, half) + 'の でんしゃを さがして ほしいな'); })
        : wrong(p, b, 'みじかい はりと ながい はりを みよう', seed.half ? 'みどりの ながい はりが 6なら「はん」。ピンクの みじかい はりは ' + seed.h + 'を すぎた ところ' : 'みどりの ながい はりが 12なら ちょうど。ピンクの みじかい はりの すうじを よもう', () => paint(true));
      p.querySelector('#ch').appendChild(b);
    });
  },
  lookTable() {
    sfx.open();
    const p = openModal('<h2>' + timeText(seed.h, seed.half) + 'の でんしゃは なんばんせん?</h2><div id="pic"></div><div class="row" id="ch"></div><p class="fb" id="fb"></p>');
    const paint = hint => {
      const c = mk(480, 250, x => {
        rr(x, 4, 4, 472, 242, 16, '#3F4A7A', '#3A2D58', 4); num(x, 'じこくひょう', 240, 30, 21, '#FFFFFF');
        seed.rows.forEach((r, i) => {
          const y = 56 + i * 62, me = hint && i === 1;
          rr(x, 20, y, 440, 52, 10, me ? '#FFF4B8' : '#FFFFFF', me ? '#FFC83D' : null, 5);
          drawClock(x, 52, y + 26, 20, r.h, r.half, false); num(x, timeText(r.h, r.half), 150, y + 28, 25, '#3A2D58');
          ln(x, 232, y + 26, 276, y + 26, '#B3A8D3', 5); poly(x, [[290, y + 26], [274, y + 15], [274, y + 37]], '#B3A8D3');
          ci(x, 344, y + 26, 20, PLATS[r.plat - 1].col, '#3A2D58', 3); num(x, r.plat, 344, y + 28, 22, '#3A2D58'); num(x, 'ばんせん', 414, y + 28, 17, '#3A2D58');
        });
      });
      c.className = 'pic'; p.querySelector('#pic').replaceChildren(c);
    };
    paint(false);
    [1, 2, 3].forEach(n => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'choice'; b.innerHTML = n + '<small>ばんせん</small>';
      b.onclick = () => n === seed.ans
        ? right(p, 'せいかい! ' + n + 'ばんせん', () => { step = 2; cardNew = true; drawTray(); say(n + 'ばんせんの ホームを タッチしてね'); })
        : wrong(p, b, 'カードと おなじ じかんの ぎょうを さがそう', 'きいろの ぎょうが ' + timeText(seed.h, seed.half) + 'だよ。みぎの ばんごうを みよう', () => paint(true));
      p.querySelector('#ch').appendChild(b);
    });
  },
  floor(c) {
    for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) {
      const x = q * T, y = r * T;
      if (r < 2) { c.fillStyle = '#FFF3DC'; c.fillRect(x, y, T, T); c.fillStyle = '#EBD9B8'; c.fillRect(x, y + (r ? 19 : 9), T, 2); c.fillRect(x + (r ? 12 : 30), y, 2, T); if (r === 1) { c.fillStyle = '#F08A7A'; c.fillRect(x, y + T - 6, T, 6); } continue; }
      if (r < 6) { c.fillStyle = (q + r) % 2 ? '#E1DAEC' : '#EAE4F3'; c.fillRect(x, y, T, T); continue; }
      const pl = PLATS.find(p => p.x === q), tr = PLATS.find(p => p.tx === q);
      if (pl) { c.fillStyle = '#D9D2E6'; c.fillRect(x, y, T, T); c.fillStyle = '#FFC83D'; c.fillRect(x + T - 6, y, 4, T); }                       // ホーム(きいろい せん)
      else if (tr) { c.fillStyle = '#8C7CA8'; c.fillRect(x, y, T, T); c.fillStyle = '#5E4F7A'; for (let i = 0; i < 3; i++) c.fillRect(x + 4, y + 5 + i * 13, T - 8, 5); c.fillStyle = '#D9D2E6'; c.fillRect(x + 9, y, 3, T); c.fillRect(x + T - 12, y, 3, T); }   // せんろ
      else { c.fillStyle = '#B7A9CF'; c.fillRect(x, y, T, T); }
    }
    // かいさつの さく と ホームの ばんごう
    for (let q = 0; q < COLS; q++) if (!PLATS.some(p => p.x === q)) { rr(c, q * T, 6 * T + 14, T, 6, 0, '#FFFFFF'); rr(c, q * T + 16, 6 * T + 6, 8, 26, 3, '#FFFFFF', '#CFC4E2', 1.5); }
    // えきの かんばん、とけい、じこくひょう
    rr(c, 4 * T + 6, 8, 68, 30, 8, '#D9478A', '#3A2D58', 2.5); num(c, 'えき', 4 * T + 40, 24, 19, '#FFFFFF');
    drawClock(c, 2 * T + 20, 38, 30, seed.h, seed.half, false);
    rr(c, 6 * T + 4, 8, 4 * T - 8, 58, 6, '#3F4A7A', '#3A2D58', 2.5);
    seed.rows.forEach((r, i) => { rr(c, 6 * T + 10, 14 + i * 16, 4 * T - 20, 13, 3, '#FFFFFF'); num(c, timeText(r.h, r.half), 6 * T + 44, 21 + i * 16, 9.5, '#3A2D58'); ci(c, 9 * T + 12, 20.5 + i * 16, 5.5, step >= 1 ? PLATS[r.plat - 1].col : '#DCD3F0'); });
  },
  items(c, t, items) {
    PLATS.forEach((p, i) => items.push({ y: 6.5, f: () => {   // ホームの ばんごうの かんばん
      const x = p.x * T + T, y = 6 * T - 2, on = step === 2 && (miss < 3 || p.n === seed.ans), bob = on ? Math.sin(t * 4 + i * 1.3) * 3 : 0;
      rr(c, x - 3, y + 4, 6, 26, 2, '#8C7CA8'); ci(c, x, y - 4, 17, p.col, '#3A2D58', 3); num(c, p.n, x, y - 2, 20, '#3A2D58');
      if (on) { ci(c, x, y - 4, 22 + Math.sin(t * 4 + i * 1.3) * 2, null, 'rgba(255,200,61,.9)', 3); poly(c, [[x - 8, y - 36 + bob], [x + 8, y - 36 + bob], [x, y - 26 + bob]], '#FFC83D', '#FFFFFF', 2); }
    } }));
    if (anim) { const p = PLATS[anim.n - 1], k = 1 - Math.pow(1 - Math.min(1, anim.t / 1.5), 3); items.push({ y: 20, f: () => drawTrain(c, p.tx * T, (ROWS + 1) * T - k * (ROWS + 1 - 6.7) * T, p.col) }); }
  },
  fx() {},
};

/* ==================== 2話 としょかん ====================
   フクロウが、おちてきた かけらを ほんに はさんだけど、どの ほんか わすれた。
   メモ(たしざん) → ほんの ばんごう → あんないばん(かずの ならび) → たなの いろ → その たなを タッチ */
const SHELVES = [{ x: 1, col: '#FF9DB5', name: 'ピンク' }, { x: 4, col: '#FFD25E', name: 'きいろ' }, { x: 7, col: '#8FD6A6', name: 'みどり' }, { x: 10, col: '#7FB6F0', name: 'みずいろ' }];
const MEMO = { x: 1 * T + 6, y: 3 * T + 3, w: 32, h: 22 };
function drawMemoPaper(c, x, y, w, h) { c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(-.08); rr(c, -w / 2, -h / 2, w, h, 3, '#FFFBEA', '#B58A1F', 1.5); for (let i = 0; i < 3; i++) ln(c, -w / 2 + 5, -h / 2 + 6 + i * 5, w / 2 - 5 - (i === 2 ? 8 : 0), -h / 2 + 6 + i * 5, '#B3A8D3', 1.4); c.restore(); }
const LIB = {
  n: 2, name: 'としょかん', track: 'library', npc: { who: 'owl', x: 2, y: 2 },
  thanks: 'ホー! ありがとう。かけらを どうぞ',
  intro: {
    lines: [['owl', 'ホー! そらから おちてきた かけらを、ほんに はさんで おいたの'], ['owl', 'でも どの ほんか わすれちゃった。メモは かいたんだけど…'], ['girl', 'まかせて! たんていミミが みつけるよ']],
    from: { m: [6, 9, 'up'], cat: [7, 9, 'up'] }, to: [4, 3], after: { m: [4, 3, 'left'], cat: [5, 3, 'left'] }, first: 'ひかっている メモを みてみよう',
    point(c, t) { const bob = Math.abs(Math.sin(t * 5)) * 5, ax = MEMO.x + MEMO.w / 2, ay = MEMO.y - 6 - bob; poly(c, [[ax - 9, ay - 10], [ax + 9, ay - 10], [ax, ay]], '#FFC83D', '#3A2D58', 2); ln(c, ax, ay - 10, ax, ay - 22, '#3A2D58', 3); },   // メモを ゆびさす
  },
  glow: [[MEMO.x - 2, MEMO.y - 2, MEMO.w + 4, MEMO.h + 4, 6], [7 * T + 4, 8, 4 * T - 8, 58, 6]],
  blocked(x, y) {
    if (y < 2) return true;
    if (x === 2 && y === 2) return true;                         // フクロウ
    if (y === 3 && x >= 1 && x <= 3) return true;                 // カウンター
    if (y === 4 && (x === 6 || x === 7)) return true;             // よむ つくえ
    if ((y === 6 || y === 7) && SHELVES.some(s => x === s.x || x === s.x + 1)) return true;   // ほんだな
    return false;
  },
  objs: [
    { id: 'npc', hit: (x, y) => x === 2 && (y === 2 || y === 1), stand: [[3, 2], [1, 2], [2, 4]] },
    { id: 'memo', hit: (x, y) => y === 3 && x >= 1 && x <= 3, stand: [[4, 3], [2, 4], [1, 4], [3, 4], [0, 3]] },
    { id: 'board', hit: (x, y) => y < 2 && x >= 7 && x <= 10, stand: [[8, 2], [9, 2], [7, 2], [10, 2]] },
    ...SHELVES.map((s, i) => ({ id: 'shelf', i, hit: (x, y) => (y === 6 || y === 7) && (x === s.x || x === s.x + 1), stand: [[s.x, 8], [s.x + 1, 8]] })),
  ],
  newSeed() {
    const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6), s = a + b;
    const order = shuffle([0, 1, 2, 3]);   // order[k]: 「3k+1〜3k+3ばん」の ほんが ある たな
    return { a, b, s, order, ans: order[Math.floor((s - 1) / 3)] };
  },
  cards() {
    const sh = SHELVES[seed.ans];
    return [{ label: seed.s + 'ばん', draw: x => drawBook(x, 32, 32, 1.8, '#B79CED', 0, String(seed.s)) },
            { label: sh.name + 'の たな', draw: x => drawShelf(x, 10, 6, 44, 52, sh.col, 3) }];
  },
  act(o) {
    const sh = SHELVES[seed.ans];
    if (o.id === 'memo') { face(m.x < 1 ? 1 : m.x > 3 ? 3 : m.x, 3); if (step === 0) LIB.lookMemo(); else say('ほんの ばんごうは ' + seed.s + 'ばんだよ', 'cat'); }
    else if (o.id === 'board') { m.dir = 'up'; if (step === 0) say('さきに メモを みて、ほんの ばんごうを しらべよう', 'cat'); else if (step === 1) LIB.lookBoard(); else say(seed.s + 'ばんの ほんは ' + sh.name + 'の たなだよ', 'cat'); }
    else if (o.id === 'npc') { face(2, 2); say(['ひかっている メモを みてね。ほんの ばんごうが かいてあるの', 'あんないばんで、その ばんごうの たなを さがしてね', 'カードの いろの たなを タッチしてね', 'ホー! たすかったよ'][step]); }
    else if (o.id === 'shelf') {
      m.dir = 'up';
      if (step < 2) { say('どの たなか、まだ わからないよ。' + (step === 0 ? 'メモ' : 'あんないばん') + 'を みよう', 'cat'); return; }
      if (step > 2) return;
      if (o.i !== seed.ans) { wrongPlace('この たなには ないみたい', 'カードと おなじ いろの たなを タッチしてね'); return; }
      step = 3; busy = true; stopMusic(); sfx.book();
      anim = { i: o.i, t: 0 }; say('あった! この ほんだ!', 'cat');
      winPiece(2100);
    }
  },
  // メモ: ほんの えを かぞえて たしざん
  lookMemo() {
    sfx.open();
    const p = openModal('<h2>ほんの ばんごうは いくつ?</h2><div id="pic"></div><div class="row" id="ch"></div><p class="fb" id="fb"></p>');
    const { a, b, s } = seed;
    const paint = hint => {
      const c = mk(480, 250, x => {
        x.save(); x.translate(240, 125); x.rotate(-.02); rr(x, -226, -116, 452, 232, 10, '#FFFBEA', '#B58A1F', 3); x.restore();
        num(x, 'ばんごうの メモ', 240, 30, 18, '#8C5E3C');
        const grp = (n, x0, from) => { for (let i = 0; i < n; i++) { const bx = x0 + (i % 3) * 30, by = 92 + Math.floor(i / 3) * 46; drawBook(x, bx, by, 1.05, '#FF9DB5', 0); if (hint) { ci(x, bx, by + 26, 9, '#FFC83D'); num(x, from + i, bx, by + 27, 11, '#3A2D58'); } } };
        // ひだりの ほん a さつ、みぎの ほん b さつ
        grp(a, 62, 1);
        num(x, '+', 190, 112, 40, '#3A2D58');
        const g2 = (n, x0, from) => { for (let i = 0; i < n; i++) { const bx = x0 + (i % 3) * 30, by = 92 + Math.floor(i / 3) * 46; drawBook(x, bx, by, 1.05, '#7FB6F0', 0); if (hint) { ci(x, bx, by + 26, 9, '#FFC83D'); num(x, from + i, bx, by + 27, 11, '#3A2D58'); } } };
        g2(b, 248, a + 1);
        num(x, '= ?', 400, 112, 40, '#D9478A');
        num(x, a, 92, 206, 30, '#3A2D58'); num(x, '+', 190, 206, 30, '#3A2D58'); num(x, b, 278, 206, 30, '#3A2D58');
      });
      c.className = 'pic'; p.querySelector('#pic').replaceChildren(c);
    };
    paint(false);
    const set = new Set([s, s - 1, s + 1, s + 2]); set.delete(0);
    [...set].sort((u, v) => u - v).forEach(n => {
      const b2 = document.createElement('button'); b2.type = 'button'; b2.className = 'choice'; b2.innerHTML = n + '<small>ばん</small>';
      b2.onclick = () => n === s
        ? right(p, 'せいかい! ' + a + '+' + b + '=' + s, () => { step = 1; cardNew = true; drawTray(); say('あんないばんで、' + s + 'ばんの ほんの たなを しらべてね'); })
        : wrong(p, b2, 'ほんの えを ぜんぶ かぞえて みよう', 'ほんに ばんごうを つけたよ。さいごの ほんは いくつ?', () => paint(true));
      p.querySelector('#ch').appendChild(b2);
    });
  },
  // あんないばん: 1〜12の かずの ならびが 4つの いろに わかれている
  lookBoard() {
    sfx.open();
    const s = seed.s, p = openModal('<h2>' + s + 'ばんの ほんは どの たな?</h2><div id="pic"></div><div class="row" id="ch"></div><p class="fb" id="fb"></p>');
    const paint = hint => {
      const c = mk(480, 250, x => {
        rr(x, 4, 4, 472, 242, 16, '#2F6B57', '#3A2D58', 4); num(x, 'あんないばん', 240, 30, 21, '#FFFFFF');
        const cw = 36, x0 = 240 - cw * 6;
        for (let k = 0; k < 4; k++) {
          const sh = SHELVES[seed.order[k]], bx = x0 + k * cw * 3;
          drawShelf(x, bx + cw * 1.5 - 24, 56, 48, 60, sh.col, k + 1);
          rr(x, bx + 3, 132, cw * 3 - 6, 54, 10, sh.col, '#3A2D58', 2.5);
          for (let j = 0; j < 3; j++) { const nn = k * 3 + j + 1, cx = bx + cw * j + cw / 2, me = hint && nn === s; if (me) ci(x, cx, 159, 16, '#FFFFFF', '#D9478A', 4); num(x, nn, cx, 160, 20, '#3A2D58'); }
          ln(x, bx + cw * 1.5, 118, bx + cw * 1.5, 130, '#FFFFFF', 3);
        }
        if (hint) { const k = Math.floor((s - 1) / 3), cx = x0 + (s - 1) * cw + cw / 2, bob = 0; poly(x, [[cx - 9, 214 + bob], [cx + 9, 214 + bob], [cx, 196 + bob]], '#FFC83D', '#FFFFFF', 2); num(x, 'ここ', cx, 230, 14, '#FFFFFF'); void k; }
      });
      c.className = 'pic'; p.querySelector('#pic').replaceChildren(c);
    };
    paint(false);
    SHELVES.forEach((sh, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'choice col'; b.innerHTML = '<i class="sw" style="background:' + sh.col + '"></i><small>' + sh.name + '</small>';
      b.onclick = () => i === seed.ans
        ? right(p, 'せいかい! ' + sh.name + 'の たな', () => { step = 2; cardNew = true; drawTray(); say(sh.name + 'の たなを タッチしてね'); })
        : wrong(p, b, 'カードの ばんごうを、すうじの ならびで さがそう', 'ピンクの まるが ' + s + 'だよ。その うえの たなの いろを みよう', () => paint(true));
      p.querySelector('#ch').appendChild(b);
    });
  },
  floor(c) {
    for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) {
      const x = q * T, y = r * T;
      if (r < 2) { c.fillStyle = '#E8F2E1'; c.fillRect(x, y, T, T); c.fillStyle = '#D6E6CC'; c.fillRect(x + 18, y, 4, T); if (r === 1) { c.fillStyle = '#8C5E3C'; c.fillRect(x, y + T - 6, T, 6); } continue; }
      c.fillStyle = r % 2 ? '#F3DFC1' : '#EFD8B6'; c.fillRect(x, y, T, T); c.fillStyle = '#E2C79E'; c.fillRect(x + ((r % 2) ? 8 : 28), y, 2, T); c.fillRect(x, y + T - 2, T, 2);
    }
    el(c, 6.5 * T + 20, 4.6 * T, 2.3 * T, .95 * T, '#CDE7C0');                                   // じゅうたん
    rr(c, 5.6 * T, 9.35 * T, 1.8 * T, .6 * T, 8, '#D9478A', '#3A2D58', 2);                     // いりぐちの マット
    // かべ: まど、かんばん、あんないばん
    rr(c, 1.3 * T, 6, 1.4 * T, 60, [28, 28, 4, 4], '#BFE9F7', '#FFFFFF', 5); ln(c, 2 * T, 10, 2 * T, 64, '#FFFFFF', 3);
    rr(c, 4 * T + 2, 10, 2.6 * T, 30, 8, '#8FD6A6', '#3A2D58', 2.5); num(c, 'としょかん', 5.3 * T + 2, 26, 15, '#3A2D58');
    rr(c, 7 * T + 4, 8, 4 * T - 8, 58, 6, '#2F6B57', '#3A2D58', 2.5);
    for (let k = 0; k < 4; k++) { const sh = SHELVES[seed.order[k]], bx = 7 * T + 12 + k * 35; rr(c, bx, 16, 31, 20, 3, step >= 1 ? sh.col : '#9DBFAF'); rr(c, bx, 40, 31, 18, 3, '#FFFFFF'); num(c, (k * 3 + 1) + '〜' + (k * 3 + 3), bx + 15.5, 49.5, 8.5, '#3A2D58'); }
  },
  items(c, t, items) {
    items.push({ y: 3.8, f: () => {   // カウンターと メモ
      rr(c, 1 * T, 3 * T - 2, 3 * T, T - 2, 6, '#C98A5E', '#3A2D58', 2.5); rr(c, 1 * T, 3 * T + 26, 3 * T, 12, [0, 0, 6, 6], '#A86F48');
      drawMemoPaper(c, MEMO.x, MEMO.y, MEMO.w, MEMO.h); rr(c, 3 * T - 6, 3 * T + 4, 22, 14, 3, '#7FB6F0', '#3A2D58', 1.5);
    } });
    items.push({ y: 4.8, f: () => {   // よむ つくえ
      rr(c, 6 * T + 2, 4 * T + 2, 2 * T - 4, T - 8, 6, '#C98A5E', '#3A2D58', 2.5); drawBook(c, 6.6 * T, 4 * T + 14, .6, '#FF9DB5', 1); drawBook(c, 7.4 * T, 4 * T + 16, .55, '#B79CED', 0);
    } });
    SHELVES.forEach((s, i) => items.push({ y: 7.9, f: () => {
      const x = s.x * T + 3, y = 6 * T - 16, w = 2 * T - 6, h = 2 * T + 10;
      drawShelf(c, x, y, w, h, s.col, i + 1);
      if (anim && anim.i === i) rr(c, x + 30, y + 22, 8, 18, 1, '#3A2D58');   // ほんが ぬけた すきま
      const on = step === 2 && (miss < 3 || i === seed.ans);
      if (on) { const bob = Math.sin(t * 4 + i * 1.3) * 3, cx = x + w / 2; c.beginPath(); c.roundRect(x - 4, y - 4, w + 8, h + 8, 9); c.strokeStyle = 'rgba(255,200,61,.85)'; c.lineWidth = 4; c.stroke(); poly(c, [[cx - 8, y - 22 + bob], [cx + 8, y - 22 + bob], [cx, y - 12 + bob]], '#FFC83D', '#FFFFFF', 2); }
    } }));
  },
  fx(c) {   // ほんが たなから とびだして、まんなかで ひらく
    if (!anim) return;
    const s = SHELVES[anim.i], k = 1 - Math.pow(1 - Math.min(1, anim.t / 1), 3), sx = s.x * T + 37, sy = 6 * T + 14, ex = COLS * T / 2, ey = 4 * T;
    const x = sx + (ex - sx) * k, y = sy + (ey - sy) * k - Math.sin(k * PI) * 40, open = Math.min(1, Math.max(0, (anim.t - 1.1) / .6));
    c.save(); if (win) c.globalAlpha = Math.max(0, 1 - win.t / .5);
    if (anim.t > 1.4) ci(c, x, y, 50 + Math.sin(anim.t * 6) * 4, 'rgba(255,230,130,.45)');
    drawBook(c, x, y, 1 + k * 1.8, '#B79CED', open, String(seed.s)); c.restore();
  },
};


/* ==================== 3話 どうぶつえん ====================
   いたずらザルの モンが、かけらを どこかの どうぶつの へやに かくした。
   てがみ(あんごう) → 「ひだり」か「みぎ」 / バナナ(ひきざん) → なんばんめ / ふたつを あわせて へやを タッチ */
function drawElephant(c, x, by, s, bob = 0, cheer = false) {   // どうぶつえんの ゾウ
  c.save(); c.translate(x, by); c.scale(s, s);
  el(c, 0, 0, 11, 3, 'rgba(40,20,70,.18)');
  c.translate(0, -bob);
  for (const lx of [-8, -3, 3, 8]) rr(c, lx - 2.4, -8, 4.8, 8, 2, '#98A3C0', '#3A2D58', .8);
  el(c, 0, -11, 12, 8.5, '#A9B4CE', '#3A2D58', .8);
  el(c, -9.5, -21, 6, 7.5, '#A9B4CE', '#3A2D58', .8); el(c, -9.5, -21, 3.6, 5, '#FFC3D6');   // おおきな みみ
  el(c, 9.5, -21, 6, 7.5, '#A9B4CE', '#3A2D58', .8); el(c, 9.5, -21, 3.6, 5, '#FFC3D6');
  el(c, 0, -21, 7.5, 7, '#B7C1D8');
  c.beginPath(); c.moveTo(0, -18);   // はな
  if (cheer) c.bezierCurveTo(1, -24, 6, -30, 9, -31); else c.bezierCurveTo(0, -12, -1, -9, 2.5, -8);
  c.strokeStyle = '#3A2D58'; c.lineWidth = 4.6; c.lineCap = 'round'; c.stroke(); c.strokeStyle = '#B7C1D8'; c.lineWidth = 3; c.stroke();
  ci(c, -3, -22.5, 1.2, '#3A2D58'); ci(c, 3, -22.5, 1.2, '#3A2D58');
  ci(c, -5.4, -19, 1.4, 'rgba(255,120,160,.45)'); ci(c, 5.4, -19, 1.4, 'rgba(255,120,160,.45)');
  c.restore();
}
function drawMonkey(c, x, by, s, bob = 0, cheer = false) {   // いたずらザルの モン
  c.save(); c.translate(x, by); c.scale(s, s);
  el(c, 0, 0, 8, 2.4, 'rgba(40,20,70,.18)');
  c.translate(0, -bob);
  c.beginPath(); c.moveTo(6, -5); c.bezierCurveTo(14, -6, 14, -16, 9, -17); c.strokeStyle = '#9C6A44'; c.lineWidth = 2; c.lineCap = 'round'; c.stroke();   // しっぽ
  el(c, 0, -7, 6.5, 7, '#9C6A44'); el(c, 0, -6, 4, 4.6, '#F3D3B0');
  c.save(); c.translate(-6, -10); c.rotate(cheer ? -2.2 : .4); el(c, 0, 4, 1.8, 4.5, '#9C6A44'); c.restore();
  c.save(); c.translate(6, -10); c.rotate(cheer ? 2.2 : -.4); el(c, 0, 4, 1.8, 4.5, '#9C6A44'); c.restore();
  ci(c, -8, -20, 3, '#9C6A44'); ci(c, 8, -20, 3, '#9C6A44'); ci(c, -8, -20, 1.6, '#F3D3B0'); ci(c, 8, -20, 1.6, '#F3D3B0');
  ci(c, 0, -20, 7.5, '#9C6A44'); el(c, 0, -18.5, 5.6, 5, '#F3D3B0');
  ci(c, -2.2, -20.5, 1, '#3A2D58'); ci(c, 2.2, -20.5, 1, '#3A2D58');
  c.beginPath(); c.arc(0, -17.4, 1.8, .2, PI - .2); c.strokeStyle = '#3A2D58'; c.lineWidth = .9; c.stroke();
  c.restore();
}
// どうぶつの へやの まどに いる かお
function drawAnimalFace(c, kind, x, y, r) {
  const k = r / 10, eye = (dx, col = '#3A2D58') => ci(c, x + dx * k, y - 1 * k, 1.3 * k, col);
  if (kind === 'usagi') { el(c, x - 3.5 * k, y - 10 * k, 2.4 * k, 6 * k, '#FFFFFF', '#3A2D58', 1); el(c, x + 3.5 * k, y - 10 * k, 2.4 * k, 6 * k, '#FFFFFF', '#3A2D58', 1); ci(c, x, y, 7 * k, '#FFFFFF', '#3A2D58', 1); }
  else if (kind === 'kirin') { ln(c, x - 3 * k, y - 6 * k, x - 4 * k, y - 11 * k, '#C98A3C', 1.6 * k); ln(c, x + 3 * k, y - 6 * k, x + 4 * k, y - 11 * k, '#C98A3C', 1.6 * k); ci(c, x, y, 7 * k, '#FFD25E', '#3A2D58', 1); ci(c, x - 4 * k, y - 4 * k, 1.5 * k, '#C98A3C'); ci(c, x + 4.5 * k, y + 2 * k, 1.3 * k, '#C98A3C'); }
  else if (kind === 'panda') { ci(c, x - 5.5 * k, y - 5.5 * k, 2.6 * k, '#3A2D58'); ci(c, x + 5.5 * k, y - 5.5 * k, 2.6 * k, '#3A2D58'); ci(c, x, y, 7 * k, '#FFFFFF', '#3A2D58', 1); el(c, x - 2.6 * k, y - 1 * k, 1.9 * k, 2.4 * k, '#3A2D58'); el(c, x + 2.6 * k, y - 1 * k, 1.9 * k, 2.4 * k, '#3A2D58'); eye(-2.6, '#FFFFFF'); eye(2.6, '#FFFFFF'); }
  else if (kind === 'raion') { for (let i = 0; i < 10; i++) { const a = i * PI / 5; ci(c, x + Math.cos(a) * 7 * k, y + Math.sin(a) * 7 * k, 3 * k, '#E58A2E'); } ci(c, x, y, 6.6 * k, '#FFD25E', '#3A2D58', 1); }
  else if (kind === 'kaba') { ci(c, x - 5 * k, y - 6 * k, 1.8 * k, '#A99CC8'); ci(c, x + 5 * k, y - 6 * k, 1.8 * k, '#A99CC8'); el(c, x, y, 7.6 * k, 6.6 * k, '#B9ADD8', '#3A2D58', 1); el(c, x, y + 2.6 * k, 5 * k, 3 * k, '#CDC3E8'); ci(c, x - 1.6 * k, y + 2.4 * k, .7 * k, '#3A2D58'); ci(c, x + 1.6 * k, y + 2.4 * k, .7 * k, '#3A2D58'); }
  else { ci(c, x - 5.5 * k, y - 5.5 * k, 2.4 * k, '#B07A4E'); ci(c, x + 5.5 * k, y - 5.5 * k, 2.4 * k, '#B07A4E'); ci(c, x, y, 7 * k, '#B07A4E', '#3A2D58', 1); el(c, x, y + 2 * k, 3.2 * k, 2.4 * k, '#F3D3B0'); ci(c, x, y + 1.2 * k, .9 * k, '#3A2D58'); }   // くま
  if (kind !== 'panda') { eye(-2.6); eye(2.6); }
  ci(c, x - 4.6 * k, y + 2 * k, 1.2 * k, 'rgba(255,120,160,.5)'); ci(c, x + 4.6 * k, y + 2 * k, 1.2 * k, 'rgba(255,120,160,.5)');
}
// あんごうの しるし 9しゅるい
const SYM_COL = ['#FFC83D', '#FF7EB6', '#5AA7E8', '#4CC3A6', '#FFA63D', '#9C7BE0', '#F2B63C', '#E5534B', '#3DBBD6'];
function drawSym(c, k, x, y, r, bg = '#FFFBEA') {
  const col = SYM_COL[k];
  if (k === 0) starShape(c, x, y, r, col, '#3A2D58');
  else if (k === 1) { ci(c, x - r * .45, y - r * .25, r * .5, col); ci(c, x + r * .45, y - r * .25, r * .5, col); poly(c, [[x - r * .92, y - r * .05], [x + r * .92, y - r * .05], [x, y + r * .85]], col); }
  else if (k === 2) ci(c, x, y, r * .8, col, '#3A2D58', 1.5);
  else if (k === 3) poly(c, [[x, y - r * .85], [x + r * .9, y + r * .7], [x - r * .9, y + r * .7]], col, '#3A2D58', 1.5);
  else if (k === 4) rr(c, x - r * .7, y - r * .7, r * 1.4, r * 1.4, 2, col, '#3A2D58', 1.5);
  else if (k === 5) poly(c, [[x, y - r * .9], [x + r * .7, y], [x, y + r * .9], [x - r * .7, y]], col, '#3A2D58', 1.5);
  else if (k === 6) { ci(c, x, y, r * .8, col); ci(c, x + r * .38, y - r * .25, r * .66, bg); }   // つき
  else if (k === 7) { rr(c, x - r * .25, y - r * .8, r * .5, r * 1.6, 2, col); rr(c, x - r * .8, y - r * .25, r * 1.6, r * .5, 2, col); }   // じゅうじ
  else { for (let i = 0; i < 5; i++) { const a = i * PI * 2 / 5 - PI / 2; ci(c, x + Math.cos(a) * r * .5, y + Math.sin(a) * r * .5, r * .38, col); } ci(c, x, y, r * .3, '#FFE38A'); }   // はな
}
const ZOO_ANIMALS = ['usagi', 'kirin', 'panda', 'raion', 'kaba', 'kuma'];
const HOUSE_COL = ['#FFD6E4', '#FFF0B8', '#DDF3E4', '#FFE0C2', '#E4DDF7', '#D9ECFB'];
const DIRS = { left: 'ひだり', right: 'みぎ' };
const KANA = ['み', 'ぎ', 'ひ', 'だ', 'り', 'う', 'え', 'し', 'た'];
const WORDS = ['みぎ', 'ひだり', 'うえ', 'した'];
const HON = n => n + ['', 'ぽん', 'ほん', 'ぼん', 'ほん', 'ほん', 'ぽん', 'ほん', 'ぽん', 'ほん', 'ぽん'][n];
function drawBanana(c, x, y, s, peel = false) {
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(-.3);
  if (peel) { poly(c, [[0, -8], [-7, 6], [-3, 5], [0, 9], [3, 5], [7, 6]], '#FFE38A', '#B58A1F', 1.4); ln(c, 0, -8, 0, -12, '#7A5A2A', 2); }
  else { c.beginPath(); c.arc(-6, -6, 14, .15, 1.5); c.arc(-6, -6, 8, 1.5, .15, true); c.closePath(); c.fillStyle = '#FFD25E'; c.fill(); c.strokeStyle = '#B58A1F'; c.lineWidth = 1.4; c.stroke(); }
  c.restore();
}
const LETTER = { x: 10 * T - 15, y: 5 * T + 7, w: 30, h: 22 };
const ZOO = {
  n: 3, name: 'どうぶつえん', track: 'zoo', npc: { who: 'ele', x: 2, y: 6 },
  thanks: 'パオーン! ありがとう。かけらを どうぞ',
  intro: {
    lines: [['ele', 'たいへん! いたずらザルの モンが、かけらを もっていっちゃった'], ['ele', 'どこかの へやに かくしたみたい。てがみが おいてあるよ'], ['girl', 'まかせて! たんていミミが さがすよ']],
    from: { m: [5, 9, 'up'], cat: [6, 9, 'up'] }, to: [3, 6], after: { m: [3, 6, 'left'], cat: [4, 6, 'left'] }, first: 'ひかっている てがみを みてみよう',
    point(c, t) { const bob = Math.abs(Math.sin(t * 5)) * 5, ax = LETTER.x + LETTER.w / 2, ay = LETTER.y - 6 - bob; poly(c, [[ax - 9, ay - 10], [ax + 9, ay - 10], [ax, ay]], '#FFC83D', '#3A2D58', 2); ln(c, ax, ay - 10, ax, ay - 22, '#3A2D58', 3); },
  },
  glow: [[LETTER.x - 2, LETTER.y - 2, LETTER.w + 4, LETTER.h + 4, 6], [7 * T + 2, 7 * T - 6, 36, 40, 8]],
  blocked(x, y) {
    if (y < 2) return true;                                       // どうぶつの へや
    if (x === 2 && y === 6) return true;                           // ゾウ
    if (x <= 1 && (y === 7 || y === 8)) return true;               // いけ
    if (y === 5 && (x === 9 || x === 10)) return true;             // ベンチ
    if (x === 7 && y === 7) return true;                           // バナナの ふくろ
    if (y === 3 && (x === 6 || x === 11)) return true;             // き
    return false;
  },
  objs: [
    { id: 'npc', hit: (x, y) => x === 2 && (y === 6 || y === 5), stand: [[3, 6], [2, 7], [1, 6]] },
    { id: 'letter', hit: (x, y) => y === 5 && (x === 9 || x === 10), stand: [[9, 6], [10, 6], [8, 5], [11, 5], [9, 4], [10, 4]] },
    { id: 'bag', hit: (x, y) => x === 7 && y === 7, stand: [[7, 8], [6, 7], [8, 7], [7, 6]] },
    ...ZOO_ANIMALS.map((a, i) => ({ id: 'house', i, hit: (x, y) => y < 2 && (x === i * 2 || x === i * 2 + 1), stand: [[i * 2, 2], [i * 2 + 1, 2]] })),
  ],
  newSeed() {
    const dir = Math.random() < .5 ? 'left' : 'right', n = 2 + Math.floor(Math.random() * 4), eat = 3 + Math.floor(Math.random() * 3);
    const key = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]);   // key[k]: KANA[k] の しるし
    return { dir, n, eat, total: n + eat, key, ans: dir === 'left' ? n - 1 : 6 - n };
  },
  cards() {
    return [{ label: DIRS[seed.dir] + 'から', draw: x => { const d = seed.dir === 'left' ? -1 : 1; ln(x, 32 - d * 18, 32, 32 + d * 14, 32, '#D9478A', 7); poly(x, [[32 + d * 26, 32], [32 + d * 10, 18], [32 + d * 10, 46]], '#D9478A'); } },
            { label: seed.n + 'ばんめ', draw: x => { for (let i = 0; i < 3; i++) rr(x, 6 + i * 18, 22, 16, 22, 3, i === 1 ? '#FFC83D' : '#E4DDF0', '#3A2D58', 1.5); num(x, seed.n, 32, 54, 14, '#3A2D58'); } }];
  },
  act(o) {
    const dn = DIRS[seed.dir];
    if (o.id === 'letter') { m.dir = m.y > 5 ? 'up' : m.y < 5 ? 'down' : m.x < 9 ? 'right' : 'left'; if (step === 0) ZOO.lookLetter(); else say(dn + 'から かぞえる って かいてあったね', 'cat'); }
    else if (o.id === 'bag') { face(7, 7); if (step === 0) say('さきに てがみを よんでみよう', 'cat'); else if (step === 1) ZOO.lookBag(); else say('のこった バナナは ' + HON(seed.n) + 'だったね', 'cat'); }
    else if (o.id === 'npc') { face(2, 6); say(['ひかっている てがみを よんでみて。モンの じだよ', 'モンが たべた バナナの ふくろを しらべてね', dn + 'から ' + seed.n + 'ばんめの へやを タッチしてね', 'パオーン! たすかったよ'][step]); }
    else if (o.id === 'house') {
      m.dir = 'up';
      if (step < 2) { say('どの へやか、まだ わからないよ。' + (step === 0 ? 'てがみ' : 'バナナの ふくろ') + 'を みよう', 'cat'); return; }
      if (step > 2) return;
      if (o.i !== seed.ans) {   // かぞえかたを おしえる
        miss++; sfx.miss(); drawTray();
        const pos = seed.dir === 'left' ? o.i + 1 : 6 - o.i, other = seed.dir === 'left' ? 6 - o.i : o.i + 1, on = seed.dir === 'left' ? 'みぎ' : 'ひだり';
        say(other === seed.n ? 'そこは ' + on + 'から ' + seed.n + 'ばんめ。カードは ' + dn + 'から だよ' : dn + 'から かぞえると、ここは ' + pos + 'ばんめ だよ', 'cat');
        return;
      }
      step = 3; busy = true; stopMusic(); sfx.monkey();
      anim = { i: o.i, t: 0 }; say('みつかっちゃった! ごめんね', 'mon');
      winPiece(1700);
    }
  },
  // モンの てがみ: しるしを ひらがなに なおす
  lookLetter() {
    sfx.open();
    const p = openModal('<h2>あんごうを とこう</h2><div id="pic"></div><div class="row" id="ch"></div><p class="fb" id="fb"></p>');
    const word = DIRS[seed.dir], code = [...word].map(ch => seed.key[KANA.indexOf(ch)]);
    const paint = hint => {
      const c = mk(480, 270, x => {
        rr(x, 6, 6, 468, 258, 12, '#FFFBEA', '#B58A1F', 3);
        num(x, 'かけらは へやに かくしたよ', 240, 32, 19, '#3A2D58');
        code.forEach((k, i) => { const bx = 90 + i * 56; rr(x, bx - 24, 54, 48, 48, 8, '#FFFFFF', '#3A2D58', 2.5); drawSym(x, k, bx, 78, 17, '#FFFFFF'); if (hint) num(x, word[i], bx, 118, 18, '#D9478A'); });
        num(x, 'から かぞえてね', 90 + code.length * 56 + 52, 79, 19, '#3A2D58');
        num(x, 'のこった バナナの かずの へやだよ  モン', 240, 146, 15, '#8C5E3C');
        // あんごうひょう
        rr(x, 16, 166, 448, 90, 10, '#F3EFFB', '#CFC4E2', 2);
        KANA.forEach((ch, i) => { const bx = 41 + i * 49.5, me = hint && word.includes(ch); if (me) rr(x, bx - 21, 172, 42, 78, 8, '#FFF4B8', '#FFC83D', 3); drawSym(x, seed.key[i], bx, 196, 14, me ? '#FFF4B8' : '#F3EFFB'); num(x, ch, bx, 232, 20, '#3A2D58'); });
      });
      c.className = 'pic'; p.querySelector('#pic').replaceChildren(c);
    };
    paint(false);
    WORDS.forEach(w => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'choice'; b.innerHTML = w;
      b.onclick = () => w === word
        ? right(p, 'せいかい! 「' + word + 'から かぞえてね」', () => { step = 1; cardNew = true; drawTray(); say('つぎは、モンが たべた バナナの ふくろを しらべてね'); })
        : wrong(p, b, 'したの ひょうで、おなじ しるしを さがそう', 'しるしの したに ひらがなを かいたよ。よんでみよう', () => paint(true));
      p.querySelector('#ch').appendChild(b);
    });
  },
  // バナナ: ひきざん
  lookBag() {
    sfx.open();
    const { total, eat, n } = seed, p = openModal('<h2>のこった バナナは なんぼん?</h2><div id="pic"></div><div class="row" id="ch"></div><p class="fb" id="fb"></p>');
    const paint = hint => {
      const c = mk(480, 250, x => {
        rr(x, 4, 4, 472, 242, 16, '#E8F5DD', '#3A2D58', 3);
        // ふくろ
        poly(x, [[40, 80], [150, 80], [166, 200], [24, 200]], '#C98A5E', '#3A2D58', 2.5); rr(x, 60, 66, 70, 18, 6, '#B07A4E', '#3A2D58', 2);
        rr(x, 44, 112, 102, 58, 8, '#FFFFFF', '#3A2D58', 2); drawBanana(x, 70, 144, 1.1); num(x, HON(total), 116, 141, 19, '#3A2D58');
        num(x, 'はじめ', 95, 222, 15, '#3A2D58');
        // たべた かわ
        num(x, 'モンが たべた', 330, 40, 16, '#3A2D58');
        for (let i = 0; i < eat; i++) drawBanana(x, 236 + (i % 3) * 62 + (i >= 3 ? 30 : 0), 92 + Math.floor(i / 3) * 56, 2, true);
        if (hint) { for (let i = 0; i < total; i++) { const bx = 196 + i * 27, out = i >= n; drawBanana(x, bx, 210, 1, out); if (out) ln(x, bx - 10, 200, bx + 10, 220, '#E5534B', 2.5); else ci(x, bx, 228, 7, '#FFC83D'); } }
        else num(x, HON(total) + ' − ' + HON(eat) + ' = ?', 330, 212, 20, '#D9478A');
      });
      c.className = 'pic'; p.querySelector('#pic').replaceChildren(c);
    };
    paint(false);
    const set = new Set([n - 1, n, n + 1, n + 2]); set.delete(0);
    [...set].sort((u, v) => u - v).forEach(k => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'choice'; b.innerHTML = k + '<small>' + HON(k).slice(String(k).length) + '</small>';
      b.onclick = () => k === n
        ? right(p, 'せいかい! ' + total + '−' + eat + '=' + n, () => { step = 2; cardNew = true; drawTray(); say(DIRS[seed.dir] + 'から ' + n + 'ばんめの へやを タッチしてね'); })
        : wrong(p, b, 'はじめの かずから、たべた かずを ひこう', 'バナナを ならべたよ。×が たべた ぶん。のこりは いくつ?', () => paint(true));
      p.querySelector('#ch').appendChild(b);
    });
  },
  floor(c, t) {
    for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) {
      const x = q * T, y = r * T;
      c.fillStyle = (q + r) % 2 ? '#F6E7C1' : '#F2E0B6'; c.fillRect(x, y, T, T);
    }
    c.fillStyle = '#BFE3A8'; c.fillRect(0, 2 * T, COLS * T, 10);                       // へやの まえの しばふ
    el(c, 9.5 * T, 8.6 * T, 2.2 * T, .9 * T, '#CDEBB8'); el(c, 3.6 * T, 3.6 * T, 1.6 * T, .7 * T, '#CDEBB8');
    rr(c, -10, 7 * T + 4, 2 * T + 6, 2 * T - 8, 22, '#9FD9F0', '#7FB6F0', 3);            // いけ
    for (let i = 0; i < 3; i++) ln(c, 10 + i * 22, 7.6 * T + i * 14, 26 + i * 22, 7.6 * T + i * 14, '#FFFFFF', 2);
    rr(c, 4.6 * T, 9.35 * T, 2.8 * T, .6 * T, 8, '#4CC3A6', '#3A2D58', 2);               // いりぐち
    // どうぶつの へや 6つ
    ZOO_ANIMALS.forEach((a, i) => {
      const x0 = i * 2 * T;
      rr(c, x0 + 3, 12, 2 * T - 6, 2 * T - 10, 6, HOUSE_COL[i], '#3A2D58', 2.5);
      poly(c, [[x0 - 1, 16], [x0 + T, -2], [x0 + 2 * T + 1, 16]], '#D9478A', '#3A2D58', 2.5);
      ci(c, x0 + T, 40, 18, '#FFFFFF', '#3A2D58', 2);
      drawAnimalFace(c, a, x0 + T, 42, 14);
      rr(c, x0 + T - 9, 60, 18, 14, [8, 8, 0, 0], '#B07A4E', '#3A2D58', 1.5);
      const on = step === 2 && (miss < 3 || i === seed.ans);
      if (on) { const p = (Math.sin(t * 4 + i * 1.2) + 1) / 2; c.beginPath(); c.roundRect(x0 + 1, 2, 2 * T - 2, 2 * T - 2, 8); c.strokeStyle = 'rgba(255,200,61,' + (.5 + .4 * p) + ')'; c.lineWidth = 4; c.stroke(); }
      if (step === 2 && miss >= 2) { const nn = seed.dir === 'left' ? i + 1 : 6 - i; ci(c, x0 + 12, 64, 10, '#FFC83D', '#3A2D58', 2); num(c, nn, x0 + 12, 65, 12, '#3A2D58'); }
    });
  },
  items(c, t, items) { itemsZoo(c, items); },
  fx(c) {   // モンが へやから とびだしてくる
    if (!anim) return;
    // まどから とびだして、ミミの となりの ますに おりる
    const i = anim.i, k = Math.min(1, anim.t / .7), sx = i * 2 * T + T, ex = (m.x === i * 2 ? i * 2 + 1 : i * 2) * T + 20;
    const x = sx + (ex - sx) * k, y = 50 + (2 * T + 4 - 50) * k - Math.sin(k * PI) * 40;
    drawMonkey(c, x, y, 1.5, 0, anim.t > .7 && Math.sin(anim.t * 10) > 0);
  },
};
function itemsZoo(c, zooItems) {
  zooItems.push({ y: 5.8, f: () => {   // ベンチと てがみ
    rr(c, 9 * T + 2, 5 * T + 4, 2 * T - 4, 18, 5, '#C98A5E', '#3A2D58', 2.5); rr(c, 9 * T + 8, 5 * T + 22, 5, 14, 2, '#8C5A3C'); rr(c, 11 * T - 13, 5 * T + 22, 5, 14, 2, '#8C5A3C');
    c.save(); c.translate(LETTER.x + LETTER.w / 2, LETTER.y + LETTER.h / 2); c.rotate(.08); rr(c, -LETTER.w / 2, -LETTER.h / 2, LETTER.w, LETTER.h, 3, '#FFFBEA', '#B58A1F', 1.5); drawSym(c, 0, -6, 0, 5, '#FFFBEA'); drawSym(c, 2, 5, 0, 5, '#FFFBEA'); c.restore();
  } });
  zooItems.push({ y: 7.8, f: () => {   // バナナの ふくろと かわ
    poly(c, [[7 * T + 8, 7 * T + 4], [8 * T - 8, 7 * T + 4], [8 * T - 4, 8 * T - 4], [7 * T + 4, 8 * T - 4]], '#C98A5E', '#3A2D58', 2); drawBanana(c, 7 * T + 20, 7 * T + 20, .7);
    drawBanana(c, 6 * T + 26, 7 * T + 30, .8, true); drawBanana(c, 8 * T + 12, 8 * T + 6, .8, true);
  } });
  for (const [tx, ty] of [[11, 3], [6, 3]]) zooItems.push({ y: ty + .9, f: () => { rr(c, tx * T + 16, ty * T + 14, 8, 22, 2, '#8C5A3C'); ci(c, tx * T + 20, ty * T + 8, 15, '#8FD6A6', '#3A2D58', 2); } });   // き
}


/* ==================== 4話 うみべ ====================
   ウミガメが すなはまに かけらを うめた。ばしょを かいた てがみは やぶれて、はんぶんは カモメが もっていった。
   ビンの てがみ(たしざん) → みぎへ いくつ / カモメの てがみ(ながさ: かいがら いくつぶん) → したへ いくつ / ヤシの きから かぞえて ほる */
function drawTurtle(c, x, by, s, bob = 0, cheer = false) {   // うみべの ウミガメ
  c.save(); c.translate(x, by); c.scale(s, s);
  el(c, 0, 0, 11, 3, 'rgba(40,20,70,.18)');
  c.translate(0, -bob);
  c.save(); c.translate(-9, -5); c.rotate(cheer ? -1 : .4); el(c, -3, 0, 5, 2.4, '#8FD0A0', '#3A2D58', .8); c.restore();
  c.save(); c.translate(9, -5); c.rotate(cheer ? 1 : -.4); el(c, 3, 0, 5, 2.4, '#8FD0A0', '#3A2D58', .8); c.restore();
  el(c, 0, -8, 11.5, 8, '#4CA37A', '#3A2D58', .9);
  el(c, 0, -9, 6, 4.4, '#6CC08F'); for (const [dx, dy] of [[-7, -7], [7, -7], [-4, -3], [4, -3]]) ci(c, dx, dy, 2, '#6CC08F');
  ci(c, 0, -19, 6.2, '#9ED9A8', '#3A2D58', .9);
  ci(c, -2.3, -20, 1.1, '#3A2D58'); ci(c, 2.3, -20, 1.1, '#3A2D58');
  c.beginPath(); c.arc(0, -18, 2, .3, PI - .3); c.strokeStyle = '#3A2D58'; c.lineWidth = .8; c.stroke();
  ci(c, -4.4, -17.6, 1.2, 'rgba(255,120,160,.5)'); ci(c, 4.4, -17.6, 1.2, 'rgba(255,120,160,.5)');
  c.restore();
}
function drawGull(c, x, by, s, flap = 0, paper = false) {   // かもめ
  c.save(); c.translate(x, by); c.scale(s, s);
  ln(c, -1.5, -3, -1.5, 0, '#FFA63D', 1.2); ln(c, 1.5, -3, 1.5, 0, '#FFA63D', 1.2);
  el(c, 0, -7, 7, 4.6, '#FFFFFF', '#3A2D58', .9);
  ci(c, 5, -12.5, 3.8, '#FFFFFF', '#3A2D58', .9); poly(c, [[8.4, -13], [12.5, -12], [8.4, -11]], '#FFA63D'); ci(c, 6, -13.4, .8, '#3A2D58');
  c.save(); c.translate(-1, -8); c.rotate(-flap); el(c, -3, 0, 6, 2.6, '#B8C4D8', '#3A2D58', .8); c.restore();
  if (paper) { c.save(); c.translate(13, -11); c.rotate(.2); rr(c, -1, -3, 8, 9, 1, '#FFFBEA', '#B58A1F', .8); c.restore(); }
  c.restore();
}
function drawPalm(c, x, by, s = 1) {   // めじるしの ヤシの き。(x, by) は ねもと
  c.save(); c.translate(x, by); c.scale(s, s); x = 0; by = 0;
  el(c, 2, 2, 13, 4, 'rgba(120,90,40,.25)');
  for (let i = 0; i < 6; i++) { const k = i / 6; rr(c, x - 6 + k * 9, by - 8 - i * 10, 12 - k * 3, 11, 3, i % 2 ? '#B07A4E' : '#C98A5E', '#3A2D58', 1.2); }
  const tx = x + 9, ty = by - 66;
  for (let i = 0; i < 6; i++) { c.save(); c.translate(tx, ty); c.rotate(-PI / 2 + (i - 2.5) * .62); el(c, 15, 0, 17, 5.5, i % 2 ? '#4CC38A' : '#3DAF78', '#3A2D58', 1.2); c.restore(); }
  ci(c, tx - 4, ty + 5, 4, '#8C5A3C', '#3A2D58', 1); ci(c, tx + 4, ty + 6, 4, '#8C5A3C', '#3A2D58', 1);
  c.restore();
}
function drawChest(c, x, y, s, open = 0) {   // たからばこ
  c.save(); c.translate(x, y); c.scale(s, s);
  if (open > 0) ci(c, 0, -8, 10 + open * 8, 'rgba(255,230,130,' + (.6 * open) + ')');
  rr(c, -14, -6, 28, 17, 3, '#C98A5E', '#3A2D58', 2); rr(c, -14, -1, 28, 4, 0, '#FFC83D'); rr(c, -3, -4, 6, 7, 1.5, '#FFC83D', '#3A2D58', 1.2);
  c.save(); c.translate(-14, -6); c.rotate(-open * 1.9); rr(c, 0, -8, 28, 9, [6, 6, 0, 0], '#B07A4E', '#3A2D58', 2); rr(c, 0, -4, 28, 3, 0, '#FFC83D'); c.restore();
  c.restore();
}
function drawShell(c, x, y, r, col = '#FFC3D6') {   // ほたての かいがら
  const pts = [[x, y + r * .7]]; for (let i = 0; i <= 8; i++) { const a = PI * 1.12 + i * PI * .76 / 8; pts.push([x + Math.cos(a) * r, y + r * .25 + Math.sin(a) * r]); }
  poly(c, pts, col, '#3A2D58', 1.5);
  for (let i = 2; i <= 6; i += 2) ln(c, x, y + r * .7, pts[i + 1][0] * .7 + x * .3, pts[i + 1][1] * .7 + (y + r * .7) * .3, 'rgba(58,45,88,.35)', 1.2);
  rr(c, x - r * .3, y + r * .55, r * .6, r * .3, 2, col, '#3A2D58', 1.2);
}
function drawBottle(c, x, y, s) {   // てがみの はいった ビン(よこに ころがっている)
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(-.15);
  rr(c, -14, -7, 22, 14, 6, 'rgba(160,220,240,.8)', '#3A2D58', 1.6); rr(c, 7, -3.5, 7, 7, 2, 'rgba(160,220,240,.8)', '#3A2D58', 1.4); rr(c, 13, -3, 4, 6, 1.5, '#C98A5E', '#3A2D58', 1.2);
  rr(c, -10, -4, 13, 8, 2, '#FFFBEA', '#B58A1F', 1); ci(c, -9, -4, 1.6, 'rgba(255,255,255,.9)');
  c.restore();
}
const PALM = { x: 2, y: 3 };
const SEA_GLOW = [[6 * T + 2, 2 * T + 9, 36, 28, 8], [10 * T + 6, 1 * T + 4, 2 * T - 12, T + 30, 10]];
const DIG = { id: 'dig', tx: 0, ty: 0, stand: [],
  hit(x, y) {   // ほる ばしょ: 3つめの ステップで、すなはまの ますを タッチした とき
    if (step !== 2 || y < 3 || blocked(x, y)) return false;
    DIG.tx = x; DIG.ty = y; DIG.stand = [[x - 1, y], [x, y + 1], [x + 1, y], [x, y - 1]];
    return true;
  } };
const SEA = {
  n: 4, name: 'うみべ', track: 'sea', npc: { who: 'kame', x: 0, y: 8 },
  thanks: 'ありがとう! かけらを どうぞ',
  intro: {
    lines: [['kame', 'たいへん! かけらを うめた ばしょの てがみが、なみに ながされちゃった'], ['kame', 'ビンに はいって もどってきたけど、はんぶん やぶれているの'], ['girl', 'まかせて! たんていミミが ほりあてるよ']],
    from: { m: [10, 9, 'up'], cat: [11, 9, 'up'] }, to: [1, 8], after: { m: [1, 8, 'left'], cat: [2, 8, 'left'] }, first: 'ひかっている ビンを みてみよう',
    point(c, t) { const bob = Math.abs(Math.sin(t * 5)) * 5, ax = 6 * T + 20, ay = 2 * T + 6 - bob; poly(c, [[ax - 9, ay - 10], [ax + 9, ay - 10], [ax, ay]], '#FFC83D', '#3A2D58', 2); ln(c, ax, ay - 10, ax, ay - 22, '#3A2D58', 3); },
  },
  glow: SEA_GLOW,
  blocked(x, y) {
    if (y < 2) return true;                                   // うみ
    if (x === PALM.x && y === PALM.y) return true;            // ヤシの き
    if (x === 6 && y === 2) return true;                      // ビン
    if (y === 2 && x >= 10) return true;                      // いわ
    if (x === 0 && y === 8) return true;                      // ウミガメ
    return false;
  },
  objs: [
    { id: 'npc', hit: (x, y) => x === 0 && (y === 8 || y === 7), stand: [[1, 8], [0, 7], [0, 9]] },
    { id: 'bottle', hit: (x, y) => x === 6 && (y === 2 || y === 1), stand: [[5, 2], [7, 2], [6, 3]] },
    { id: 'gull', hit: (x, y) => x >= 10 && (y === 1 || y === 2), stand: [[9, 2], [10, 3], [11, 3]] },
    { id: 'palm', hit: (x, y) => x === PALM.x && (y === PALM.y || y === PALM.y - 1), stand: [[3, 3], [1, 3], [2, 4], [2, 2]] },
    DIG,
  ],
  newSeed() {
    const a = 2 + Math.floor(Math.random() * 3), b = 1 + Math.floor(Math.random() * 3), d = 2 + Math.floor(Math.random() * 3);
    return { a, b, r: a + b, d, tx: PALM.x + a + b, ty: PALM.y + d, holes: [] };
  },
  cards() {
    const arrow = (x, dx, dy, n) => { ln(x, 32 - dx * 16, 30 - dy * 16, 32 + dx * 8, 30 + dy * 8, '#2E9C82', 6); poly(x, dx ? [[32 + dx * 22, 30], [32 + dx * 6, 17], [32 + dx * 6, 43]] : [[32, 30 + dy * 22], [19, 30 + dy * 6], [45, 30 + dy * 6]], '#2E9C82'); };
    return [{ label: 'みぎへ ' + seed.r + 'ます', draw: x => arrow(x, 1, 0, seed.r) }, { label: 'したへ ' + seed.d + 'ます', draw: x => arrow(x, 0, 1, seed.d) }];
  },
  act(o) {
    const where = 'ヤシのきから みぎへ ' + seed.r + 'ます、したへ ' + seed.d + 'ます';
    if (o.id === 'bottle') { face(6, 2); if (step === 0) SEA.lookBottle(); else say('ビンの てがみには「みぎへ ' + seed.r + 'ます」って かいてあったね', 'cat'); }
    else if (o.id === 'gull') { face(10, 2); tone(1200, .12, 0, 'triangle', .07); tone(1000, .16, .14, 'triangle', .07); if (step === 0) say('さきに ビンの てがみを よもう', 'cat'); else if (step === 1) SEA.lookGull(); else say('カモメの てがみには「したへ ' + seed.d + 'ます」って かいてあったね', 'cat'); }
    else if (o.id === 'palm') { face(PALM.x, PALM.y); say(step < 2 ? 'おおきな ヤシのき。めじるしに なりそう' : 'ヤシのきの となりが 1ます。ここから かぞえてね', 'cat'); }
    else if (o.id === 'npc') { face(0, 8); say(['ひかっている ビンの てがみを よんでみて', 'のこりの はんぶんは、いわの カモメが もっていったの', where + 'の ところを ほってね', 'ありがとう! たすかったよ'][step]); }
    else if (o.id === 'dig') {
      const x = o.tx, y = o.ty, id = runId;
      face(x, y); busy = true; sfx.dig(); anim = { x, y, t: 0, ok: x === seed.tx && y === seed.ty }; say('ほってみよう!', 'cat');
      setTimeout(() => {
        if (id !== runId) return;
        if (anim.ok) { step = 3; stopMusic(); sfx.chest(); say('たからばこが でてきた!', 'cat'); winPiece(1500); return; }
        if (!seed.holes.some(h => h[0] === x && h[1] === y)) seed.holes.push([x, y]);
        anim = null; busy = false; miss++; sfx.miss(); drawTray();
        const dx = x - PALM.x, dy = y - PALM.y;
        say(dx <= 0 ? 'ここは ヤシのきより ひだりだよ。ヤシのきから みぎへ かぞえよう'
          : dy === 0 ? 'ここは みぎへ ' + dx + 'ます。つぎは したへ ' + seed.d + 'ます'
          : 'ここは みぎへ ' + dx + 'ます、したへ ' + dy + 'ます だよ', 'cat');
      }, 1000);
    }
  },
  // ビンの てがみ(ひだりの はんぶん): フィールドと おなじ ますの え。かいがら 1こが 1ます
  lookBottle() {
    sfx.open();
    const { a, b, r } = seed, p = openModal('<h2>ヤシのきから みぎへ なんます?</h2><div id="pic"></div><div class="row" id="ch"></div><p class="fb" id="fb"></p>');
    const paint = hint => {
      const c = mk(480, 250, x => {
        const edge = [[452, 8], [468, 40], [448, 72], [470, 108], [450, 146], [470, 182], [452, 218], [466, 244]];
        poly(x, [[12, 8], ...edge, [12, 244]], '#FFFBEA', '#B58A1F', 3);
        num(x, 'ビンの てがみ', 230, 30, 17, '#8C5E3C');
        num(x, 'ヤシのきから みぎへ', 230, 62, 18, '#3A2D58');
        const u = 44, x0 = 24, y0 = 112;
        for (let i = 0; i <= 9; i++) { rr(x, x0 + i * u, y0, u, u, 0, i % 2 ? '#F0DAAA' : '#F7E6BC'); }
        x.strokeStyle = '#E2C68E'; x.lineWidth = 1.5; x.strokeRect(x0, y0, u * 10, u);
        drawPalm(x, x0 + u / 2, y0 + 34, .55);
        for (let i = 0; i < r; i++) {
          const bx = x0 + (i + 1) * u + u / 2;
          drawShell(x, bx, y0 + 18, 15, i < a ? '#FFC3D6' : '#BFE3F7');
          if (hint) { ci(x, bx, y0 + u + 14, 10, '#FFC83D'); num(x, i + 1, bx, y0 + u + 15, 12, '#3A2D58'); }
        }
        num(x, '+', x0 + (a + 1) * u, y0 - 12, 24, '#3A2D58');
        num(x, 'かいがら 1こで 1ます すすんでね', 230, 222, 16, '#3A2D58');
      });
      c.className = 'pic'; p.querySelector('#pic').replaceChildren(c);
    };
    paint(false);
    const set = new Set([r - 1, r, r + 1, r + 2]); set.delete(0);
    [...set].sort((u, v) => u - v).forEach(k => {
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'choice'; btn.innerHTML = k + '<small>ます</small>';
      btn.onclick = () => k === r
        ? right(p, 'せいかい! ' + a + '+' + b + '=' + r + 'ます', () => { step = 1; cardNew = true; drawTray(); say('のこりの はんぶんは、いわの カモメが もっていったの'); })
        : wrong(p, btn, 'かいがらを ぜんぶ かぞえて みよう', 'かいがらに ばんごうを つけたよ。さいごは いくつ?', () => paint(true));
      p.querySelector('#ch').appendChild(btn);
    });
  },
  // カモメの てがみ(みぎの はんぶん): たての ますの よこに ひも。ひもは なんます ぶん?
  lookGull() {
    sfx.open();
    const { d } = seed, p = openModal('<h2>ひもは なんます ぶん?</h2><div id="pic"></div><div class="row" id="ch"></div><p class="fb" id="fb"></p>');
    const paint = hint => {
      const c = mk(480, 260, x => {
        const edge = [[34, 8], [18, 40], [38, 74], [16, 110], [36, 148], [18, 186], [36, 222], [20, 254]];
        poly(x, [[468, 8], [468, 254], ...edge.slice().reverse()], '#FFFBEA', '#B58A1F', 3);
        num(x, 'カモメの てがみ', 150, 34, 16, '#8C5E3C');
        num(x, 'そこから したへ', 150, 92, 19, '#3A2D58');
        num(x, 'ひもの ながさ ぶん', 150, 140, 17, '#3A2D58');
        num(x, 'すすんでね', 150, 168, 17, '#3A2D58');
        const u = 32, cx = 300, y0 = 16;
        rr(x, cx - u / 2, y0, u, u, 0, '#F7E6BC'); starShape(x, cx, y0 + u / 2, 9, '#FFC83D', '#3A2D58'); num(x, 'そこ', cx - 40, y0 + u / 2, 13, '#D9478A');
        for (let i = 1; i <= 6; i++) { const yy = y0 + i * u, me = hint && i <= d; rr(x, cx - u / 2, yy, u, u, 0, me ? '#FFF4B8' : i % 2 ? '#F0DAAA' : '#F7E6BC'); if (me) num(x, i, cx, yy + u / 2 + 1, 15, '#D9478A'); }
        x.strokeStyle = '#E2C68E'; x.lineWidth = 1.5; x.strokeRect(cx - u / 2, y0, u, u * 7);
        const rx = cx + 34, r0 = y0 + u, r1 = y0 + u + d * u;
        x.beginPath(); for (let q = r0; q <= r1; q += 2) { const xx = rx + Math.sin((q - r0) / 9) * 2.5; q === r0 ? x.moveTo(xx, q) : x.lineTo(xx, q); } x.strokeStyle = '#C98A3C'; x.lineWidth = 5; x.lineCap = 'round'; x.stroke();
        ci(x, rx, r0, 5, '#D9478A'); ci(x, rx, r1, 5, '#D9478A');
        drawShell(x, 410, 200, 24);
      });
      c.className = 'pic'; p.querySelector('#pic').replaceChildren(c);
    };
    paint(false);
    const set = new Set([d - 1, d, d + 1, d + 2]); set.delete(0);
    [...set].sort((u, v) => u - v).forEach(k => {
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'choice'; btn.innerHTML = k + '<small>ます</small>';
      btn.onclick = () => k === d
        ? right(p, 'せいかい! ' + d + 'ます', () => { step = 2; cardNew = true; seed.demo = tNow; drawTray(); say('ヤシのきの となりが 1ます。ここから かぞえて ほってね', 'cat'); tone(1175, .15, .2, 'triangle', .08); })
        : wrong(p, btn, 'ひもの はしから はしまで、ますを かぞえよう', 'ひもの よこの ますに ばんごうを つけたよ。いくつ?', () => paint(true));
      p.querySelector('#ch').appendChild(btn);
    });
  },
  floor(c, t) {
    for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) {
      const x = q * T, y = r * T;
      if (r < 2) { c.fillStyle = r ? '#8DD3F2' : '#73C3EA'; c.fillRect(x, y, T, T); continue; }
      if (r === 2) { c.fillStyle = '#EAD3A2'; c.fillRect(x, y, T, T); continue; }
      c.fillStyle = (q + r) % 2 ? '#F7E6BC' : '#F0DAAA'; c.fillRect(x, y, T, T);   // ますが かぞえやすい ように いちまつ もよう
    }
    // なみ
    for (let i = 0; i < 2; i++) { c.beginPath(); for (let q = 0; q <= COLS * T; q += 8) { const yy = 2 * T - 4 + Math.sin(q / 18 + t * 1.6 + i * 2) * 3 - i * 30; q ? c.lineTo(q, yy) : c.moveTo(q, yy); } c.strokeStyle = 'rgba(255,255,255,' + (i ? .5 : .95) + ')'; c.lineWidth = i ? 2 : 4; c.stroke(); }
    // いわと カモメ
    el(c, 11 * T, 2 * T + 22, 38, 17, '#B7AFC9', '#3A2D58', 2.5); el(c, 10.6 * T, 2 * T + 14, 18, 7, '#CFC8DE');
    drawGull(c, 10.9 * T, 2 * T + 10, 1.5, step < 2 ? 0 : Math.sin(t * 6) * .3, step < 2);
    // ほった あな
    for (const [hx, hy] of seed.holes) { el(c, hx * T + 20, hy * T + 24, 13, 7, '#C9AE7C', '#A88A58', 1.5); }
    // ほる だんの はじめ: ヤシのきの となりに「1」が ポンと でる(かぞえかたの おてほん)
    if (step === 2) { const k = bounce((t - (seed.demo || 0)) / .5), bx = (PALM.x + 1) * T + 20, by2 = PALM.y * T + 20; c.save(); c.translate(bx, by2); c.scale(k, k); ci(c, 0, 0, 13, '#FFC83D', '#3A2D58', 2); num(c, 1, 0, 1, 15, '#3A2D58'); c.restore(); }
    // ヒント: 5かい はずれたら、ヤシのきから みぎと したに ものさしの ばんごう
    if (step === 2 && miss >= 5) {
      for (let i = 2; PALM.x + i < COLS; i++) { ci(c, (PALM.x + i) * T + 20, PALM.y * T + 20, 9, 'rgba(255,255,255,.85)', '#2E9C82', 2); num(c, i, (PALM.x + i) * T + 20, PALM.y * T + 21, 11, '#2E9C82'); }
      for (let j = 1; PALM.y + j < ROWS - 1; j++) { const cx = (PALM.x + seed.r) * T + 20; ci(c, cx, (PALM.y + j) * T + 20, 9, 'rgba(255,255,255,.85)', '#D9478A', 2); num(c, j, cx, (PALM.y + j) * T + 21, 11, '#D9478A'); }
    }
  },
  items(c, t, items) {
    items.push({ y: 2.6, f: () => drawBottle(c, 6 * T + 20, 2 * T + 22, 1.15) });
    items.push({ y: PALM.y + .9, f: () => {
      if (step === 2 && !anim) { const p = (Math.sin(t * 4) + 1) / 2; ci(c, PALM.x * T + 20, PALM.y * T + 22, 17 + p * 3, null, 'rgba(255,200,61,' + (.5 + .4 * p) + ')', 4); }   // めじるしが ひかる
      drawPalm(c, PALM.x * T + 20, PALM.y * T + 25);
    } });
    items.push({ y: 8.2, f: () => { ln(c, 9 * T + 20, 8 * T + 36, 9 * T + 24, 7 * T + 6, '#8C5A3C', 3); c.beginPath(); c.arc(9 * T + 24, 7 * T + 8, 26, PI, 0); c.closePath(); c.fillStyle = '#FF9DB5'; c.fill(); c.strokeStyle = '#3A2D58'; c.lineWidth = 2; c.stroke(); for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(9 * T + 24, 7 * T + 8); c.arc(9 * T + 24, 7 * T + 8, 26, PI + i * PI / 3 + PI / 12, PI + i * PI / 3 + PI / 4); c.closePath(); c.fillStyle = '#FFFFFF'; c.fill(); } } });   // パラソル(かざり)
  },
  fx(c) {   // すなが とんで、あたりなら たからばこが でてくる
    if (!anim) return;
    const { x, y, t } = anim, cx = x * T + 20, cy = y * T + 24;
    el(c, cx, cy, 13, 7, '#C9AE7C', '#A88A58', 1.5);
    if (t < 1) for (let i = 0; i < 6; i++) { const k = (t * 3 + i / 6) % 1, a = -PI / 2 + (i - 2.5) * .45; ci(c, cx + Math.cos(a) * k * 26, cy + Math.sin(a) * k * 30 + k * k * 30, 3, '#E2C68E'); }
    if (anim.ok && t > 1) { const k = Math.min(1, (t - 1) / .5), op = Math.min(1, Math.max(0, (t - 1.5) / .4)); c.save(); if (win) c.globalAlpha = Math.max(0, 1 - win.t / .6); drawChest(c, cx, cy + 4 - k * 4, 1.3, op); c.restore(); }
  },
};

const STAGES = [EKI, LIB, ZOO, SEA];

/* はなしの プロローグ: コマ0 は かけらが おちてくる(じどう)。コマ1〜3 は かいわで、タッチで すすむ */
let intro = null;   // { k: コマ, t: その コマに なってからの じかん, walked: ミミが ついたか }
function introLine() {
  const [who, text] = S.intro.lines[intro.k - 1]; intro.t = 0; say(text, who); $('talk').classList.add('big');
  if (who === 'pen') { tone(660, .07, 0, 'square', .04); tone(740, .07, .09, 'square', .04); }
  else if (who === 'owl') { tone(523, .12, 0, 'sine', .1); tone(440, .18, .14, 'sine', .1); }   // ホー
  else tone(988, .12, 0, 'triangle', .07);
}
function nextIntro() {
  if (!intro || intro.k === 0 || !intro.walked || intro.t < .5) return;   // よみおわる まえの れんだで とばない ように
  if (intro.k < S.intro.lines.length) { intro.k++; introLine(); return; }
  endIntro();
}
const place = (o, [x, y, dir]) => { o.x = o.fx = x; o.y = o.fy = y; o.dir = dir; };
function endIntro() {
  if (!intro) return;
  intro = null; busy = false; path = []; $('talk').classList.remove('big'); $('btnSkip2').hidden = true;
  if (!data.introSeen.includes(S.n)) { data.introSeen.push(S.n); saveAll(); }
  m.p = 1; place(m, S.intro.after.m); place(cat, S.intro.after.cat);
  say(S.intro.first, 'cat');
}
function startStage(n) {
  S = STAGES[n - 1]; runId++;
  seed = S.newSeed(); step = 0; miss = 0; path = []; pending = null; dest = null; anim = null; win = null; busy = false; shake = 0;
  m = { p: 1 }; cat = {};
  $('stageName').textContent = n + '話 ' + S.name; cv.setAttribute('aria-label', S.name + 'の マップ');
  $('title').hidden = true; $('mapScreen').hidden = true; $('prologue').hidden = true; $('game').hidden = false; $('btnAgain').hidden = true;
  refreshSound(); drawPieces(); drawTray(); fit(); running = true; playMusic(S.track);
  if (!data.introSeen) data.introSeen = [];
  if (data.introSeen.includes(n)) { intro = null; place(m, S.intro.after.m); place(cat, S.intro.after.cat); $('talk').classList.remove('big'); $('btnSkip2').hidden = true; say(S.intro.first, 'cat'); return; }
  // はじめての ときは プロローグ: ミミは いりぐちから くる
  intro = { k: 0, t: 0, walked: false }; place(m, S.intro.from.m); place(cat, S.intro.from.cat);
  $('btnSkip2').hidden = false; $('talk').classList.add('big'); say('あれ? そらから ひかる ものが…', 'cat');
  tone(1568, .25, .3, 'triangle', .08); tone(1319, .25, .5, 'triangle', .08); tone(1047, .4, .7, 'triangle', .08);
}
function goTitle() { running = false; runId++; pro = null; closeModal(); playMusic('title'); $('game').hidden = true; $('mapScreen').hidden = true; $('prologue').hidden = true; $('title').hidden = false; buildSlots(); }
function refreshSound() { $('btnSound').setAttribute('aria-pressed', String(store.sound)); $('btnSound').setAttribute('aria-label', store.sound ? 'おとを けす' : 'おとを だす'); }

/* ---------- いどう ---------- */
function startStep(nx, ny) {
  cat.fx = cat.x; cat.fy = cat.y; cat.dir = m.x > cat.x ? 'right' : m.x < cat.x ? 'left' : m.y < cat.y ? 'up' : m.y > cat.y ? 'down' : cat.dir; cat.x = m.x; cat.y = m.y;
  m.fx = m.x; m.fy = m.y; m.dir = nx > m.x ? 'right' : nx < m.x ? 'left' : ny > m.y ? 'down' : 'up'; m.x = nx; m.y = ny; m.p = 0; sfx.step();
}
function update(dt) {
  if (intro) {
    intro.t += dt;
    if (intro.k === 0 && intro.t > 2.2) { intro.k = 1; intro.t = 0; path = findPath(m.x, m.y, S.intro.to[0], S.intro.to[1]); }
    if (intro.k >= 1 && !intro.walked && !path.length && m.p >= 1) { intro.walked = true; m.dir = S.intro.after.m[2]; introLine(); }
  }
  if (m.p < 1) { m.p = Math.min(1, m.p + dt * 5.5); return; }
  if (busy && !intro) return;
  if (path.length) { const [nx, ny] = path.shift(); startStep(nx, ny); return; }
  dest = null;
  if (pending) { const o = pending; pending = null; S.act(o); }
}
function goTo(tx, ty) {
  if (freeze) return;
  if (intro) { nextIntro(); return; }
  if (busy || win) return;
  const o = S.objs.find(q => q.hit(tx, ty));
  if (!o) { pending = null; path = findPath(m.x, m.y, tx, ty); dest = path.length ? path[path.length - 1] : null; return; }
  // ものを タッチした とき: その まえまで あるいて、ついたら しらべる
  let best = null;
  for (const s of o.stand) { if (s[0] === m.x && s[1] === m.y) { best = []; break; } const pth = findPath(m.x, m.y, s[0], s[1]), l = pth[pth.length - 1]; if (l && l[0] === s[0] && l[1] === s[1] && (!best || pth.length < best.length)) best = pth; }
  if (!best) return;
  path = best; pending = o; dest = path.length ? path[path.length - 1] : null;
}

/* ---------- ちかくで みる がめん(1話に 2かいだけ) ---------- */
function openModal(html) { busy = true; path = []; pending = null; dest = null; $('panel').innerHTML = '<button class="close" id="x" type="button" aria-label="とじる">×</button>' + html; $('modal').hidden = false; $('panel').scrollTop = 0; $('panel').querySelector('#x').onclick = closeModal; return $('panel'); }
function closeModal() { $('modal').hidden = true; $('panel').innerHTML = ''; busy = false; }
function mk(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d')); return c; }
function right(p, msg, then) {
  sfx.ok(); const fb = p.querySelector('#fb'); fb.textContent = msg; fb.classList.add('good'); p.querySelectorAll('button').forEach(b => { b.disabled = true; });
  setTimeout(() => { closeModal(); then(); }, 1200);
}
function wrong(p, b, first, hint, onHint) { sfx.ng(); p.miss = (p.miss || 0) + 1; b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); p.querySelector('#fb').textContent = p.miss >= 2 ? hint : first; if (p.miss >= 2 && onHint) onHint(); }


/* ---------- プロローグ(はじめての 1かいだけ) ----------
   ミミの へやで ほうせきが ひかり、7いろの かけらに わかれて まどから まちへ とんでいく。ぜんぶで 6びょう、ことばは 3つ */
const PLACES = [
  { id: 'eki', name: 'えき', x: 120, y: 236 },
  { id: 'lib', name: 'としょかん', x: 236, y: 220 },
  { id: 'zoo', name: 'どうぶつえん', x: 372, y: 246 },
  { id: 'sea', name: 'うみべ', x: 414, y: 116 },
  { id: 'park', name: 'ゆうえんち', x: 290, y: 104 },
  { id: 'forest', name: 'もり', x: 76, y: 104 },
  { id: 'tower', name: 'とけいとう', x: 190, y: 64 },
];
// いける ばしょ: できている はなしで、まえの はなしの かけらを もっている ところ
const isOpen = i => i < STAGES.length && (i === 0 || data.pieces.includes(i));
const nextPlace = () => PLACES.findIndex((pl, i) => isOpen(i) && !data.pieces.includes(i + 1));
const PROLOGUE_LINES = [[0, 'たからものの ほうせきが ひかりだした…', 'cat'], [1.7, 'かけらが まちへ とんでいっちゃった!', 'girl'], [3.9, 'かけらを あつめに いこう!', 'cat']];
let pro = null, mapT0 = 0;
function drawMoonGem(c, x, y, s, glow = 0) {
  c.save(); c.translate(x, y); c.scale(s, s);
  ci(c, 0, 0, 30 + glow * 14, 'rgba(255,220,110,' + (.3 + glow * .35) + ')');
  ci(c, -2, 0, 20, '#FFE38A', '#B58A1F', 1.8);
  c.save(); c.beginPath(); c.arc(7, -5, 16, 0, PI * 2); c.clip(); ci(c, 0, 0, 40, '#FFF8E1'); c.restore();
  ci(c, -2, 0, 20, null, '#B58A1F', 1.8);
  poly(c, [[6, -2], [14, 6], [6, 16], [-2, 6]], '#B79CED', '#6B4FB0', 1.5); poly(c, [[6, -2], [10, 6], [6, 16], [2, 6]], '#D7C6F8');
  c.restore();
}
function drawRoom(c) {
  c.fillStyle = '#FBE9F0'; c.fillRect(0, 0, 480, 360);
  for (let x = 0; x < 480; x += 40) { c.fillStyle = x % 80 ? '#F7DDE8' : '#FBE9F0'; c.fillRect(x, 0, 40, 250); }   // かべの しまもよう
  c.fillStyle = '#E8B07E'; c.fillRect(0, 250, 480, 110); c.fillStyle = '#D89B6A'; for (let y = 262; y < 360; y += 24) c.fillRect(0, y, 480, 2);
  // まど: よるの まち
  rr(c, 286, 30, 160, 130, 10, '#2B2452', '#FFFFFF', 8);
  for (let i = 0; i < 9; i++) starShape(c, 300 + hash(i, 3) * 132, 44 + hash(i, 5) * 50, 2 + hash(i, 7) * 2, '#FFFFFF');
  for (let i = 0; i < 6; i++) { const bx = 296 + i * 24, bh = 24 + hash(i, 9) * 30; c.fillStyle = '#4B3C74'; c.fillRect(bx, 152 - bh, 22, bh); c.fillStyle = '#FFE38A'; c.fillRect(bx + 8, 160 - bh + 6, 5, 5); }
  ln(c, 366, 34, 366, 156, '#FFFFFF', 5); ln(c, 290, 96, 442, 96, '#FFFFFF', 5);
  // つくえ
  rr(c, 40, 190, 230, 22, 6, '#C98A5E', '#8C5A3C', 3); rr(c, 56, 210, 14, 70, 3, '#8C5A3C'); rr(c, 240, 210, 14, 70, 3, '#8C5A3C');
  el(c, 155, 190, 46, 9, '#FFFFFF', '#CFC4E2', 2);   // ざぶとん(ほうせきの だい)
}
function drawProlog(t) {
  const c = $('proCv').getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0);
  drawRoom(c);
  const glow = t < 1.5 ? (Math.sin(t * 9) + 1) / 2 * Math.min(1, t / .6) : 0;
  if (t < 1.5) drawMoonGem(c, 155, 160 + Math.sin(t * 3) * 2, 2, glow);
  if (t >= 1.4 && t < 1.9) { c.fillStyle = 'rgba(255,255,255,' + (1 - (t - 1.4) / .5) + ')'; c.fillRect(0, 0, 480, 360); }   // パッと ひかる
  // 7いろの かけらが まどから そとへ とんでいく
  if (t >= 1.5) for (let i = 0; i < 7; i++) {
    const k = Math.min(1, Math.max(0, (t - 1.5 - i * .14) / 1.3)), e = k * k * (3 - 2 * k);
    const sx = 155, sy = 160, ex = 300 + i * 20, ey = 40 + (i % 3) * 26, mx2 = 200 + i * 18, my2 = 30 - (i % 2) * 20;
    const x = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * mx2 + e * e * ex, y = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * my2 + e * e * ey;
    if (k < 1) { for (let j = 1; j <= 3; j++) starShape(c, x - j * 8, y + j * 4, 4 - j, PIECE_COL[i]); drawPiece(c, x, y, .9, PIECE_COL[i]); }
    else ci(c, ex + Math.sin(t * 6 + i) * 2, ey, 3, PIECE_COL[i]);   // まどの そとで きらっと ひかって きえる
  }
  // ミミと シロ
  const jump = t > 1.5 && t < 2.4 ? Math.abs(Math.sin((t - 1.5) * 9)) * 10 : 0;
  drawGirl(c, 110, 330, 3, t > 1.6 && t < 3.9 ? 'right' : 'down', jump, false);
  drawCat(c, 220, 334, 2.4, -1, t > 3.9 ? Math.abs(Math.sin(t * 6)) * 3 : 0, false, Math.sin(t * 3));
}
function playPrologue() {
  $('title').hidden = true; $('prologue').hidden = false; $('mapScreen').hidden = true;
  pro = { t: 0, line: -1 }; playMusic('station');
}
function prologueTick(dt) {
  pro.t += dt; drawProlog(pro.t);
  const li = PROLOGUE_LINES.reduce((a, l, i) => pro.t >= l[0] ? i : a, -1);
  if (li !== pro.line) { pro.line = li; $('proSay').textContent = PROLOGUE_LINES[li][1]; if (li === 1) { tone(1568, .3, 0, 'triangle', .1); scrape(0, .5, 3000, 5000, .08); } else tone(880, .1, 0, 'sine', .07); }
  if (pro.t > 6) endPrologue();
}
function endPrologue() { if (!pro) return; pro = null; data.seenPrologue = true; saveAll(); showMap(); }

/* ---------- まちの ちず: かけらが おちた 7かしょ。ひかっている ばしょを タッチして いく ---------- */
/* ちずの うえで ミミが あるく: みちで つながった ばしょを たどって、えらんだ ばしょへ */
const ROADS = [[0, 1], [1, 2], [1, 4], [4, 3], [4, 6], [6, 5]];
let mapAt = 0, mapWalk = null;   // mapAt: ミミが いる ばしょ。mapWalk: { pts, seg, len, d, speed, to, rest }
const mapSpot = i => [PLACES[i].x - 34, PLACES[i].y + 30];
function mapRoute(a, b) {
  const prev = { [a]: -1 }, q = [a];
  while (q.length) { const v = q.shift(); if (v === b) break; ROADS.forEach(([p, r]) => { const w = p === v ? r : r === v ? p : -1; if (w >= 0 && !(w in prev)) { prev[w] = v; q.push(w); } }); }
  const out = []; for (let v = b; v !== -1 && v !== undefined; v = prev[v]) out.unshift(v);
  return out[0] === a ? out : [a, b];
}
/* ---------- ばめんの きりかえ: はなしへは むしめがねで のぞきこむ。ちずへは みじかい あんてん ---------- */
let wiping = false, freeze = false;   // wiping: きりかえちゅう。freeze: はなしの じかんを とめる(むしめがねが ひらくまで)
function lensInto(n, sx, sy, R0) {
  const w = $('wipe'), L = $('wlens'), far = Math.hypot(innerWidth, innerHeight) + 40, ease = v => 1 - Math.pow(1 - v, 3);
  wiping = true; w.classList.remove('fade'); w.style.opacity = 1; w.hidden = false;
  [784, 988, 1175, 1568].forEach((f, i) => tone(f, .25, i * .07, 'triangle', .08));   // きらりん(いりぐちと おなじ)
  const put = (cx, cy, R, k, r) => {
    L.style.width = L.style.height = 2 * R + 'px'; L.style.left = cx - R + 'px'; L.style.top = cy - R + 'px'; L.style.borderWidth = R * .18 + 'px'; L.style.transform = 'scale(' + Math.max(0, k) + ')';
    w.style.setProperty('--cx', cx + 'px'); w.style.setProperty('--cy', cy + 'px'); w.style.setProperty('--r', Math.max(0, r) + 'px');
  };
  let t0 = null, sw = null;
  const tick = ts => {
    if (t0 === null) t0 = ts;
    const t = (ts - t0) / 1000;
    // じかんわり(びょう): ちずで ポンと でる → まわりが くらく なる → すこし まつ → とじる / はなしで ポンと でる → まつ → ひろがる
    const A1 = .35, A2 = 1.15, A3 = 1.35, A4 = 1.65, B1 = .35, B2 = .75, B3 = 1.7;
    if (t < A4) {   // ちずの うえ: むしめがねが でて、まわりが くらく なり、とじる
      const inner = R0 * .82 - 2, k = t < A1 ? bounce(t / A1) : t < A3 ? 1 : 1 - (t - A3) / (A4 - A3);
      put(sx, sy, R0, k, t < A1 ? far : t < A2 ? far + (inner - far) * ease((t - A1) / (A2 - A1)) : inner * k);
    } else {        // まっくらな あいだに はなしの がめんへ。まんなかで むしめがねが ひらく
      if (!sw) { freeze = true; startStage(n); const f = $('field').getBoundingClientRect(), R = Math.max(40, Math.min(f.width, f.height) * .22); const q = cv.getBoundingClientRect(), cl = (v, a, b) => Math.min(b, Math.max(a, v));   // レンズの なかに ミミが みえる ように
        sw = { cx: cl(q.left + (m.x + .5) / COLS * q.width, R, innerWidth - R), cy: cl(q.top + (m.y + .1) / ROWS * q.height, R, innerHeight - R), R, S: far / (R * .82) }; }
      const u = t - A4, inner = sw.R * .82 - 2;
      const k = u < B1 ? bounce(u / B1) : u < B2 ? 1 : 1 + (sw.S - 1) * Math.pow(Math.min(1, (u - B2) / (B3 - B2)), 2.2);
      put(sw.cx, sw.cy, sw.R, k, inner * k);
      if (u >= B3) { w.hidden = true; wiping = false; freeze = false; return; }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function fadeTo(fn) {   // くらく なって、きりかわって、あかるく なる
  if (wiping) return;
  const w = $('wipe'); wiping = true; w.classList.add('fade'); w.style.opacity = 0; w.hidden = false;
  let t0 = null, done = false;
  const tick = ts => {
    if (t0 === null) t0 = ts;
    const t = (ts - t0) / 1000;
    const D = .45, H2 = .15;   // くらく なる → まっくらで すこし まつ → あかるく なる
    if (t >= D && !done) { done = true; fn(); }
    w.style.opacity = t < D ? t / D : t < D + H2 ? 1 : Math.max(0, 1 - (t - D - H2) / D);
    if (t < D * 2 + H2) requestAnimationFrame(tick); else { w.hidden = true; wiping = false; }
  };
  requestAnimationFrame(tick);
}
function walkOnMap(i) {
  if (calm) { mapAt = i; fadeTo(() => startStage(i + 1)); return; }
  const pts = mapRoute(mapAt, i).map(mapSpot); if (pts.length < 2) pts.push(pts[0]);
  const seg = pts.slice(1).map((p, k) => Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1])), len = seg.reduce((s, v) => s + v, 0);
  mapWalk = { pts, seg, len, d: 0, speed: Math.max(140, len / 2.2), to: i, rest: 0, step: 0 };
  $('mapSay').textContent = PLACES[i].name + 'へ しゅっぱつ!';
}
function mapWalkPos() {   // いまの いちと むき
  const w = mapWalk; let d = w.d;
  for (let k = 0; k < w.seg.length; k++) {
    const [x0, y0] = w.pts[k], [x1, y1] = w.pts[k + 1];
    if (d <= w.seg[k] || k === w.seg.length - 1) { const f = w.seg[k] ? Math.min(1, d / w.seg[k]) : 1, dx = x1 - x0, dy = y1 - y0; return [x0 + dx * f, y0 + dy * f, Math.abs(dy) > Math.abs(dx) * 1.5 ? (dy > 0 ? 'down' : 'up') : dx < 0 ? 'left' : 'right']; }
    d -= w.seg[k];
  }
  return [...w.pts[w.pts.length - 1], 'right'];
}
function mapWalkTick(dt) {
  const w = mapWalk;
  if (w.d < w.len) { w.d = Math.min(w.len, w.d + w.speed * dt); w.step -= dt; if (w.step <= 0) { w.step = .22; sfx.step(); } return; }
  if (w.rest === 0) tone(988, .12, 0, 'triangle', .07);
  w.rest += dt;   // ついたら ぴょんと はねて、すこし まってから はじまる
  if (w.rest > .55) {
    mapWalk = null; mapAt = w.to;
    const r = $('mapCv').getBoundingClientRect(), pl = PLACES[w.to];
    lensInto(w.to + 1, r.left + pl.x / 480 * r.width, r.top + pl.y / 300 * r.height, Math.max(30, 36 / 480 * r.width));
  }
}
function showMap() {
  // ミミの いる ばしょ: はなしから もどったら その ばしょ。タイトルからなら、さいごに かけらを とった ばしょ
  if (!$('game').hidden && S) mapAt = S.n - 1;
  else { mapAt = 0; for (let i = 0; i < STAGES.length; i++) if (data.pieces.includes(i + 1)) mapAt = i; }
  mapWalk = null;
  running = false; runId++; closeModal(); pro = null;
  $('title').hidden = true; $('prologue').hidden = true; $('game').hidden = true; $('mapScreen').hidden = false;
  mapT0 = tNow; drawPieces(); playMusic('station');
  $('mapSay').textContent = nextPlace() >= 0 ? 'ひかっている ばしょを タッチしてね' : 'つぎの ばしょは じゅんびちゅう。なんどでも あそべるよ';
}
const MAP_ICON = {
  eki(c, x, y) { rr(c, x - 13, y - 6, 26, 16, 3, '#D9478A', '#3A2D58', 2); poly(c, [[x - 15, y - 6], [x + 15, y - 6], [x, y - 17]], '#7FB6F0', '#3A2D58', 2); },   // えきの たてもの
  park(c, x, y) { ln(c, x - 9, y + 13, x, y - 2, '#3A2D58', 2); ln(c, x + 9, y + 13, x, y - 2, '#3A2D58', 2); ci(c, x, y - 2, 12, null, '#B79CED', 3); for (let k = 0; k < 6; k++) { const a = k * PI / 3; ln(c, x, y - 2, x + Math.cos(a) * 12, y - 2 + Math.sin(a) * 12, '#B79CED', 1.5); ci(c, x + Math.cos(a) * 12, y - 2 + Math.sin(a) * 12, 3, PIECE_COL[k], '#3A2D58', 1); } },   // かんらんしゃ
  forest(c, x, y) { for (const [dx, sc] of [[-7, .85], [6, 1]]) { rr(c, x + dx - 2, y + 4, 4, 8, 1, '#8C5A3C'); poly(c, [[x + dx, y - 14 * sc], [x + dx + 9 * sc, y + 5], [x + dx - 9 * sc, y + 5]], '#4CC38A', '#3A2D58', 1.5); } },   // もり
  tower(c, x, y) { rr(c, x - 7, y - 6, 14, 20, 2, '#E4DDF7', '#3A2D58', 1.8); poly(c, [[x - 9, y - 6], [x + 9, y - 6], [x, y - 18]], '#D9478A', '#3A2D58', 1.8); ci(c, x, y + 1, 4.5, '#FFFFFF', '#3A2D58', 1.2); ln(c, x, y + 1, x, y - 2, '#3A2D58', 1); ln(c, x, y + 1, x + 2, y + 1, '#3A2D58', 1); },   // とけいとう
  sea(c, x, y) { ln(c, x - 2, y + 12, x + 2, y - 8, '#8C5A3C', 2.5); c.beginPath(); c.arc(x + 2, y - 7, 15, PI, 0); c.closePath(); c.fillStyle = '#FF9DB5'; c.fill(); c.strokeStyle = '#3A2D58'; c.lineWidth = 2; c.stroke(); drawShell(c, x + 9, y + 6, 6); },   // パラソルと かいがら
  zoo(c, x, y) { ln(c, x - 12, y + 10, x - 12, y - 6, '#3A2D58', 3); ln(c, x + 12, y + 10, x + 12, y - 6, '#3A2D58', 3); c.beginPath(); c.arc(x, y - 6, 12, PI, 0); c.strokeStyle = '#4CC3A6'; c.lineWidth = 5; c.stroke(); drawElephant(c, x, y + 11, .55); },   // どうぶつえんの もん
  lib(c, x, y) { rr(c, x - 13, y - 5, 26, 16, 3, '#8FD6A6', '#3A2D58', 2); poly(c, [[x - 16, y - 5], [x + 16, y - 5], [x, y - 17]], '#B07A4E', '#3A2D58', 2); drawBook(c, x, y + 3, .38, '#FFFFFF', 1); },   // としょかん
};
function drawMap(t) {
  const c = $('mapCv').getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0);
  // やぶれた ちずの かみ
  c.fillStyle = '#F3EFFB'; c.fillRect(0, 0, 480, 300);
  poly(c, [[14, 20], [120, 10], [230, 22], [350, 8], [466, 18], [470, 140], [460, 282], [330, 292], [210, 280], [90, 294], [12, 284], [20, 150]], '#FFF3D6', '#B58A1F', 3);
  c.save(); c.globalAlpha = .55;
  el(c, 430, 150, 60, 110, '#9FD9F0');                                   // うみ
  for (let i = 0; i < 6; i++) ci(c, 40 + i * 20, 110 + (i % 2) * 14, 18, '#8FD6A6');   // もり
  c.restore();
  c.setLineDash([8, 7]); c.strokeStyle = '#C98A5E'; c.lineWidth = 4; c.beginPath();      // みち
  c.moveTo(120, 236); c.lineTo(236, 220); c.lineTo(372, 246); c.moveTo(236, 220); c.lineTo(290, 104); c.lineTo(414, 116); c.moveTo(290, 104); c.lineTo(190, 64); c.lineTo(76, 104); c.stroke(); c.setLineDash([]);
  const nx = nextPlace();
  PLACES.forEach((pl, i) => {
    const got = data.pieces.includes(i + 1), open = isOpen(i), on = i === nx, p = (Math.sin(t * 4) + 1) / 2;
    if (on) { ci(c, pl.x, pl.y, 30 + p * 5, null, 'rgba(255,200,61,' + (.6 + .4 * p) + ')', 6); for (let j = 0; j < 4; j++) { const a = t * .9 + j * PI / 2; starShape(c, pl.x + Math.cos(a) * 36, pl.y + Math.sin(a) * 36, 3 + 3 * Math.abs(Math.sin(t * 3 + j)), '#FFFFFF', '#FFC83D'); } }
    ci(c, pl.x, pl.y, 24, open ? '#FFFFFF' : '#E4DDF0', '#3A2D58', 3);
    if (got) drawPiece(c, pl.x, pl.y, .95, PIECE_COL[i]);
    else if (open) MAP_ICON[pl.id](c, pl.x, pl.y);
    else num(c, '?', pl.x, pl.y + 1, 22, '#9A90B8');
    rr(c, pl.x - 38, pl.y + 27, 76, 22, 8, open ? '#FFFFFF' : 'rgba(255,255,255,.6)', open ? '#3A2D58' : '#CFC4E2', 2);
    num(c, pl.name, pl.x, pl.y + 38.5, pl.name.length > 4 ? 10 : 12.5, open ? '#3A2D58' : '#9A90B8');
  });
  if (mapWalk) {   // あるいている
    const [x, y, dir] = mapWalkPos(), r = mapWalk.rest;
    drawGirl(c, x, y, 1.3, r > 0 ? 'down' : dir, r > 0 ? Math.abs(Math.sin(r * 9)) * 8 : Math.abs(Math.sin(mapWalk.d / 9)) * 3);
  } else { const [x, y] = mapSpot(mapAt); drawGirl(c, x, y, 1.3, 'right', Math.abs(Math.sin(t * 3)) * 2); }
}

/* ---------- えがく ---------- */
function glowRect(c, t, x, y, w, h, r) {
  const p = (Math.sin(t * 4) + 1) / 2, g = 4 + p * 4;
  c.beginPath(); c.roundRect(x - g, y - g, w + g * 2, h + g * 2, r + g); c.strokeStyle = 'rgba(255,200,61,' + (.55 + .4 * p) + ')'; c.lineWidth = 6; c.stroke();
  c.beginPath(); c.roundRect(x - g, y - g, w + g * 2, h + g * 2, r + g); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 2; c.stroke();
  for (let i = 0; i < 4; i++) { const a = t * .9 + i * PI / 2; starShape(c, x + w / 2 + Math.cos(a) * (w / 2 + 12), y + h / 2 + Math.sin(a) * (h / 2 + 12), 3 + 3 * Math.abs(Math.sin(t * 3 + i)), '#FFFFFF', '#FFC83D'); }
}
function render(t) {
  const c = ctx, sc = cv.width / (COLS * T);
  c.setTransform(sc, 0, 0, sc, 0, 0);
  S.floor(c, t);
  if (!intro && step < 2) glowRect(c, t, ...S.glow[step]);
  if (dest) ci(c, dest[0] * T + 20, dest[1] * T + 22, 9 + Math.sin(t * 6) * 2, null, 'rgba(217,71,138,.7)', 3);

  const items = [];
  S.items(c, t, items);
  const N = S.npc, sx = shake > 0 ? Math.sin(shake * 40) * 3 : 0;
  const flap = intro && intro.k === 1 && intro.walked ? Math.sin(t * 14) > 0 : false;   // こまって てを ばたばた
  items.push({ y: N.y + .9, f: () => drawWho(c, N.who, N.x * T + 20 + sx, N.y * T + 37, 1.5, win ? Math.abs(Math.sin(t * 7)) * 7 : flap ? 2 : Math.sin(t * 2) * .6 + .6, !!win || flap) });
  const e = m.p, mx = m.fx + (m.x - m.fx) * e, my = m.fy + (m.y - m.fy) * e, cx = cat.fx + (cat.x - cat.fx) * e, cy = cat.fy + (cat.y - cat.fy) * e, walking = m.p < 1;
  const proud = intro && intro.k === 3 && intro.t < 1.2;   // 「まかせて!」で ぴょんと はねる
  items.push({ y: my + .95, f: () => drawGirl(c, mx * T + 20, my * T + 37, 1.6, proud ? 'down' : m.dir, proud ? Math.abs(Math.sin(intro.t * 8)) * 9 : win ? Math.abs(Math.sin(t * 8)) * 8 : walking ? Math.abs(Math.sin(e * PI)) * 3 : Math.sin(t * 2.4) * .6 + .6) });
  items.push({ y: cy + .94, f: () => drawCatDir(c, cx * T + 20, cy * T + 37, 1.35, cat.dir, walking ? Math.abs(Math.sin(e * PI + 1)) * 2 : 0, walking ? Math.sin(t * 8) * .5 : Math.sin(t * 1.2) * .4) });
  items.sort((a, b) => a.y - b.y).forEach(o => o.f());
  S.fx(c, t);
  if (intro && intro.k === 0) {   // かけらが そらから おちてきて、いらいにんの ところで きえる
    const k = Math.min(1, intro.t / 1.6), sg = N.x < COLS / 2 ? 1 : -1, x = N.x * T + 20 + sg * (1 - k) * 60, y = -30 + k * (N.y * T + 40);
    if (k < 1) { for (let j = 1; j <= 4; j++) starShape(c, x + sg * j * 9, y - j * 14, 5 - j, '#FFC83D'); drawPiece(c, x, y, 1, PIECE_COL[S.n - 1]); }
    else { const r = (intro.t - 1.6) / .5; if (r < 1) { ci(c, N.x * T + 20, N.y * T + 10, 10 + r * 40, null, 'rgba(255,200,61,' + (1 - r) + ')', 5); } }
  }
  if (intro && intro.k === 2 && intro.walked) S.intro.point(c, t);

  if (win) {   // ちずの かけらが ひかりの なかから でてくる
    const k = win.t, cx2 = COLS * T / 2, cy2 = 4 * T, out = 1 - Math.pow(1 - Math.min(1, k / .9), 3);
    if (k < .3 && !calm) { c.fillStyle = 'rgba(255,255,255,' + (.5 * (1 - k / .3)) + ')'; c.fillRect(0, 0, COLS * T, ROWS * T); }
    c.save(); c.translate(cx2, cy2); c.rotate(k * .6);
    for (let i = 0; i < 12; i++) { c.rotate(PI / 6); poly(c, [[-10, 0], [10, 0], [0, -150 * out]], 'rgba(255,230,130,' + (i % 2 ? .5 : .3) + ')'); }
    c.restore();
    drawPiece(c, cx2, cy2 - Math.sin(k * 2.4) * 4, 3.2 * bounce(k / .6), PIECE_COL[S.n - 1]);
    for (let i = 0; i < 10; i++) { const a = k * 1.2 + i * PI / 5, r = 70 + 20 * Math.sin(k * 3 + i); starShape(c, cx2 + Math.cos(a) * r * out * 1.4, cy2 + Math.sin(a) * r * out, 3 + 3 * Math.abs(Math.sin(k * 4 + i)), i % 2 ? '#FFFFFF' : '#FFC83D', '#FFC83D'); }
  }
}
const bounce = v => { v = Math.min(1, Math.max(0, v)); return 1 - Math.pow(1 - v, 3) * Math.cos(v * PI * 2.5); };

let last = 0;
function frame(ts) {
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; tNow = ts / 1000;
  if (running) {
    if (anim) anim.t += dt; if (win) win.t += dt; if (shake > 0) shake = Math.max(0, shake - dt);
    if (!freeze) update(dt); render(tNow);
  } else if (pro) prologueTick(dt);
  else if (!$('mapScreen').hidden) { if (mapWalk) mapWalkTick(dt); drawMap(calm ? 0 : tNow - mapT0); }
  else if (!$('title').hidden && !calm) { drawTitle(tNow); drawTitleBg(tNow); }
  requestAnimationFrame(frame);
}
function fit() {
  const f = $('field'); if (!f.clientWidth) return;
  const w = Math.max(160, Math.min(f.clientWidth - 6, (f.clientHeight - 6) * (COLS / ROWS))), h = w * ROWS / COLS;
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const bw = Math.round(Math.min(1440, Math.max(480, w * (window.devicePixelRatio || 1))));
  if (cv.width !== bw) { cv.width = bw; cv.height = Math.round(bw * ROWS / COLS); }
}
/* ---------- タイトル: 1さくめと おなじ かたち(ミミと シロが あるいて さがす / 3にんぶんの セーブ)。はいけいは ゆうやけの まち ---------- */
const ANIMALS = [{ id: 'rabbit', name: 'うさぎ' }, { id: 'cat', name: 'ねこ' }, { id: 'bear', name: 'くま' }];
function drawAnimal(c, kind, cx, cy, s) {
  c.save(); c.translate(cx, cy); c.scale(s, s);
  if (kind === 'rabbit') { el(c, -5, -13, 3.2, 9, '#FFFFFF', '#D9CFE8', 1); el(c, 5, -13, 3.2, 9, '#FFFFFF', '#D9CFE8', 1); el(c, -5, -13, 1.4, 6, '#FFB7CF'); el(c, 5, -13, 1.4, 6, '#FFB7CF'); ci(c, 0, 0, 10, '#FFFFFF', '#D9CFE8', 1); }
  else if (kind === 'bear') { ci(c, -8, -7, 4.5, '#B98058'); ci(c, 8, -7, 4.5, '#B98058'); ci(c, -8, -7, 2.2, '#E3B58F'); ci(c, 8, -7, 2.2, '#E3B58F'); ci(c, 0, 0, 10, '#B98058'); el(c, 0, 3.5, 4.5, 3.5, '#E3B58F'); }
  else { poly(c, [[-10, -3], [-9, -14], [-2, -8]], '#FFE2A8', '#E6BF7A', 1); poly(c, [[10, -3], [9, -14], [2, -8]], '#FFE2A8', '#E6BF7A', 1); ci(c, 0, 0, 10, '#FFE2A8', '#E6BF7A', 1); }
  ci(c, -3.5, -1, 1.3, '#3A2D58'); ci(c, 3.5, -1, 1.3, '#3A2D58'); ci(c, 0, 2.6, 1.3, '#FF8FB3');
  ci(c, -6.5, 2.5, 2, 'rgba(255,120,160,.4)'); ci(c, 6.5, 2.5, 2, 'rgba(255,120,160,.4)');
  c.restore();
}
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
  const st = Math.sign(want - titleCat.x) * Math.min(Math.abs(want - titleCat.x), 150 * dt);
  titleCat.x += st;
  if (Math.abs(st) > .01) drawCatDir(a, titleCat.x, 226, 3.6, st > 0 ? 'right' : 'left', Math.abs(Math.sin(t * 11)) * .9, Math.sin(t * 6) * .6);
  else if (p.dir === 'down') drawCat(a, titleCat.x, 226, 3.6, -1, (Math.sin(t * 1.5 + 1.2) + 1) * .25, false, Math.sin(t * 1.1), blinkAt(5.7, 2.5));
  else drawCatDir(a, titleCat.x, 226, 3.6, p.dir, (Math.sin(t * 1.5 + 1.2) + 1) * .25, Math.sin(t * 1.1), blinkAt(5.7, 2.5));
  const bob = p.walk ? Math.abs(Math.sin(t * 10)) * 1.1 : p.look ? .2 : (Math.sin(t * 1.5) + 1) * .3;
  drawGirl(a, p.x, 224, 5.2, p.dir, bob, p.dir === 'down' && blinkAt(4.3, 0));
  // むしめがねが きらり(ふだんは ときどき、のぞきこんだ ときは そのつど)
  const g = p.look ? (t * 1.4) % 1 : p.dir === 'down' ? (t % 6) / .9 : 2;
  if (g < 1) starShape(a, p.dir === 'down' ? p.x + 86 : p.x + sgn * 80, 142, 9 * Math.sin(g * PI), '#FFFFFF');
}
// はいけい: ゆうやけの そらと まちの シルエット。そらには 7いろの かけらが ゆっくり またたく
let tbg = null;
function fitTitle() {
  const sec = $('title'); if (sec.hidden || !sec.clientWidth) return;
  const s = sec.getBoundingClientRect(), a = $('titleArt').getBoundingClientRect(), cv2 = $('titleBg');
  const W = sec.clientWidth, H = Math.max(sec.clientHeight, sec.scrollHeight), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv2.style.height = H + 'px'; cv2.width = Math.round(W * dpr); cv2.height = Math.round(H * dpr);
  tbg = { W, H, dpr, hz: a.top - s.top + sec.scrollTop + a.height * .87 };
  drawTitleBg(0);
}
const TITLE_BG = /bg=sunset/.test(location.search) ? 'sunset' : 'map';   // ゆうやけの まちは べつの きかいに つかう ため のこしておく
// はいけい(ちず): ふるびた たからの ちず。うごかない ぶぶんは いちど だけ かいて とっておき、まいかい きらめきだけ かさねる
const SEPIA = 'rgba(110,72,36,', sep = a => SEPIA + a + ')';
function oldMapSpots(W, H) {   // 7つの ばしょ(うえに 4つ、したに 3つ。まんなかは もじと ボタンの ため あけておく)
  return { tower: [W * .5, H * .05], forest: [W * .1, H * .15], park: [W * .86, H * .1], sea: [W * .9, H * .44], eki: [W * .12, H * .85], lib: [W * .48, H * .94], zoo: [W * .86, H * .87] };
}
function paperEdge(W, H, m) {   // やぶれた かみの ふち
  const pts = [], step = 16, jag = (i, k) => (hash(i, k) - .5) * 7;
  for (let x = m; x < W - m; x += step) pts.push([x, m + jag(x, 1)]);
  for (let y = m; y < H - m; y += step) pts.push([W - m + jag(y, 2), y]);
  for (let x = W - m; x > m; x -= step) pts.push([x, H - m + jag(x, 3)]);
  for (let y = H - m; y > m; y -= step) pts.push([m + jag(y, 4), y]);
  return pts;
}
function buildOldMap(W, H, hz, dpr) {
  const o = document.createElement('canvas'); o.width = Math.round(W * dpr); o.height = Math.round(H * dpr);
  const c = o.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  // つくえ
  c.fillStyle = '#5E4030'; c.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 9) { c.fillStyle = 'rgba(0,0,0,' + (.04 + hash(y, 7) * .06) + ')'; c.fillRect(0, y, W, 3); }
  // かみ
  const m = Math.max(8, Math.min(16, W * .02)), edge = paperEdge(W, H, m);
  c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 12; poly(c, edge, '#EAD3A0'); c.restore();
  c.save(); c.beginPath(); edge.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.clip();
  const vg = c.createRadialGradient(W / 2, H * .45, Math.min(W, H) * .25, W / 2, H / 2, Math.max(W, H) * .72);
  vg.addColorStop(0, 'rgba(255,246,215,.55)'); vg.addColorStop(.6, 'rgba(214,170,100,.15)'); vg.addColorStop(1, 'rgba(120,70,25,.55)');
  c.fillStyle = vg; c.fillRect(0, 0, W, H);
  // しみ と よごれ
  for (let i = 0; i < 9; i++) { const x = hash(i, 11) * W, y = hash(i, 13) * H, r = 18 + hash(i, 17) * 50; ci(c, x, y, r, sep(.05 + hash(i, 19) * .05)); }
  for (let i = 0; i < 2; i++) { const x = W * (.2 + .6 * hash(i, 23)), y = H * (.25 + .5 * hash(i, 29)), r = 26 + 10 * i; ci(c, x, y, r, null, sep(.12), 3); ci(c, x + 3, y + 2, r - 4, null, sep(.06), 2); }   // コップの あと
  for (let i = 0; i < 420; i++) ci(c, hash(i, 31) * W, hash(i, 37) * H, .6 + hash(i, 41) * 1.1, sep(.08 + hash(i, 43) * .12));
  // うすい ますめ
  c.strokeStyle = sep(.07); c.lineWidth = 1; for (let x = 40; x < W; x += 56) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 40; y < H; y += 56) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  // おりめ(かげと ひかり)
  for (const fx of [1 / 3, 2 / 3]) { ln(c, W * fx, 0, W * fx, H, 'rgba(120,70,25,.18)', 3); ln(c, W * fx + 2, 0, W * fx + 2, H, 'rgba(255,250,230,.35)', 1.5); }
  ln(c, 0, H / 2, W, H / 2, 'rgba(120,70,25,.16)', 3); ln(c, 0, H / 2 + 2, W, H / 2 + 2, 'rgba(255,250,230,.3)', 1.5);
  const S = oldMapSpots(W, H), s = Math.min(1.15, Math.max(.75, W / 640));
  // うみ: なみの せんと ふね
  c.save(); c.globalAlpha = .9;
  const sx = W * .88; el(c, W * 1.02, H * .42, W * .2, H * .2, 'rgba(120,180,190,.18)');
  for (let i = 0; i < 6; i++) { const y = H * .3 + i * 20 * s, x0 = sx - 30 * s + (i % 2) * 14; c.beginPath(); for (let k = 0; k < 3; k++) c.arc(x0 + k * 12 * s, y, 6 * s, PI, 0); c.strokeStyle = sep(.4); c.lineWidth = 1.6; c.stroke(); }
  c.restore();
  const ship = (x, y) => { c.save(); c.translate(x, y); c.scale(s, s); poly(c, [[-16, 0], [16, 0], [10, 8], [-10, 8]], sep(.15), sep(.6), 1.6); ln(c, 0, 0, 0, -24, sep(.6), 1.6); poly(c, [[1, -22], [14, -6], [1, -6]], 'rgba(255,248,225,.6)', sep(.6), 1.4); poly(c, [[-1, -20], [-12, -6], [-1, -6]], 'rgba(255,248,225,.6)', sep(.6), 1.4); c.restore(); };
  ship(W * .93, H * .62);
  // やま と き(ペンの せん)
  const mount = (x, y, k) => { c.save(); c.translate(x, y); c.scale(s * k, s * k); poly(c, [[-18, 0], [0, -26], [18, 0]], 'rgba(255,248,225,.35)', sep(.6), 1.6); for (let j = 0; j < 4; j++) ln(c, 2 + j * 3, -20 + j * 5, 6 + j * 3, -20 + j * 5 + 4, sep(.45), 1.1); c.restore(); };
  mount(W * .25, H * .1, 1); mount(W * .3, H * .12, .8); mount(W * .7, H * .2, .9); mount(W * .76, H * .21, .7);
  const tree = (x, y) => { c.save(); c.translate(x, y); c.scale(s, s); ln(c, 0, 0, 0, -6, sep(.6), 1.4); ci(c, 0, -10, 6, 'rgba(120,170,100,.25)', sep(.6), 1.3); c.restore(); };
  [[.05, .3], [.08, .33], [.04, .38], [.2, .78], [.24, .8], [.7, .78], [.95, .76], [.32, .97], [.65, .96]].forEach(([fx, fy]) => tree(W * fx, H * fy));
  // くねくね みち(うえの 4つ と したの 3つ を それぞれ つなぐ)
  const road = (pts) => { c.setLineDash([7, 7]); c.strokeStyle = sep(.6); c.lineWidth = 2.6; c.beginPath(); pts.forEach((p, i) => { if (!i) c.moveTo(p[0], p[1]); else { const q = pts[i - 1]; c.bezierCurveTo(q[0] + (p[0] - q[0]) * .3, q[1] + 34 * s, q[0] + (p[0] - q[0]) * .7, p[1] - 34 * s, p[0], p[1]); } }); c.stroke(); c.setLineDash([]); };
  road([S.forest, S.tower, S.park, S.sea]); road([S.eki, S.lib, S.zoo]);
  // にじ(いろあせた すいさい): ミミたちの うしろから、ななめに かかる アーチ
  { const R = Math.max(210, Math.min(W * .42, H * .5)); c.save(); c.translate(W * .5, hz + 6); c.rotate(-.32);
    for (let k = 0; k < 7; k++) { c.beginPath(); c.arc(0, 0, R + (3 - k) * 4.2, PI * 1.02, PI * 1.98); c.strokeStyle = PIECE_COL[k]; c.globalAlpha = .4; c.lineWidth = 4.4; c.stroke(); }
    c.restore(); c.globalAlpha = 1; }
  // 7つの ばしょ: かけらの いろの にじみ と、セピアの わく
  PLACES.forEach((pl, i) => {
    const [x, y] = S[pl.id];
    c.save(); c.translate(x, y); c.scale(s, s);
    c.globalAlpha = .42; for (let k = 0; k < 4; k++) ci(c, (hash(i, k) - .5) * 10, (hash(k, i) - .5) * 8, 20 + hash(i + k, 3) * 6, PIECE_COL[i]); c.globalAlpha = 1;
    c.beginPath(); for (let k = 0; k <= 24; k++) { const a = k / 24 * PI * 2, r = 22 + (hash(i, k) - .5) * 2.5; k ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(r, 0); } c.strokeStyle = sep(.55); c.lineWidth = 1.6; c.stroke();
    c.globalAlpha = .88; MAP_ICON[pl.id](c, 0, 0); c.globalAlpha = 1;
    c.restore();
  });
  // ばつじるし と ほうい じしゃく
  const xm = [W * .64, H * .07]; ln(c, xm[0] - 9, xm[1] - 9, xm[0] + 9, xm[1] + 9, 'rgba(180,50,60,.65)', 4); ln(c, xm[0] + 9, xm[1] - 9, xm[0] - 9, xm[1] + 9, 'rgba(180,50,60,.65)', 4);
  const cx = W - 44 * s - m, cy = H * .7, R = 26 * s;
  ci(c, cx, cy, R, 'rgba(255,248,225,.45)', sep(.55), 1.5); ci(c, cx, cy, R * .78, null, sep(.35), 1);
  for (let k = 0; k < 8; k++) { const a = k * PI / 4 - PI / 2, L = k % 2 ? R * .55 : R * .95, w = R * .16; poly(c, [[cx + Math.cos(a) * L, cy + Math.sin(a) * L], [cx + Math.cos(a + PI / 2) * w, cy + Math.sin(a + PI / 2) * w], [cx, cy], [cx + Math.cos(a - PI / 2) * w, cy + Math.sin(a - PI / 2) * w]], k === 0 ? 'rgba(180,50,60,.7)' : k % 2 ? sep(.35) : sep(.55)); }
  num(c, 'N', cx, cy - R - 9, 12 * s, sep(.7));
  c.restore();
  return o;
}
function drawTitleMap(c, W, H, hz, t) {
  if (!tbg.cache) tbg.cache = buildOldMap(W, H, hz, tbg.dpr);
  c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(tbg.cache, 0, 0); c.setTransform(tbg.dpr, 0, 0, tbg.dpr, 0, 0);
  // ばしょの うえで ときどき きらり
  const S = oldMapSpots(W, H), s = Math.min(1.15, Math.max(.75, W / 640));
  PLACES.forEach((pl, i) => { const g = ((t * .35 + i * .37) % 1) / .18; if (g < 1) { const [x, y] = S[pl.id]; starShape(c, x + 16 * s, y - 16 * s, 7 * s * Math.sin(g * PI), '#FFFFFF', 'rgba(255,200,61,.9)'); } });
}
function drawTitleBg(t) {
  if (!tbg) return;
  const { W, H, dpr, hz } = tbg, c = $('titleBg').getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (TITLE_BG === 'map') { drawTitleMap(c, W, H, hz, t); return; }
  const sky = c.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, '#B7A2E6'); sky.addColorStop(.55, '#F4A9C8'); sky.addColorStop(1, '#FFD9A8');
  c.fillStyle = sky; c.fillRect(0, 0, W, hz + 1);
  ci(c, W * .8, hz - 70, 70, 'rgba(255,236,170,.35)'); ci(c, W * .8, hz - 70, 44, 'rgba(255,240,190,.95)');   // しずむ おひさま
  // そらの かけら(7いろ)
  for (let i = 0; i < 7; i++) {
    const x = W * (.08 + i * .14), y = Math.max(18, hz * (.12 + .1 * Math.sin(i * 1.3 + 1))), tw = .55 + .45 * Math.sin(t * 1.4 + i * 1.7);
    c.save(); c.globalAlpha = .45 + .45 * tw; starShape(c, x, y, 4 + tw * 3, PIECE_COL[i], 'rgba(255,255,255,.9)'); c.restore();
  }
  // まちの シルエット(とおく)。まどに あかり
  const base = hz + 2, unit = Math.max(26, W / 26);
  for (let i = 0, x = -10; x < W + 10; i++) {
    const w = unit * (.9 + hash(i, 2) * .8), h = unit * (1.1 + hash(i, 4) * 1.6);
    const tower = i === 5;   // とけいとう
    const bh = tower ? unit * 3.6 : h;
    rr(c, x, base - bh, w - 3, bh, tower ? [w / 2, w / 2, 0, 0] : [4, 4, 0, 0], '#A58CD6');
    if (tower) { ci(c, x + w / 2 - 1.5, base - bh + w * .55, w * .26, '#FFF3D6'); ln(c, x + w / 2 - 1.5, base - bh + w * .55, x + w / 2 - 1.5, base - bh + w * .4, '#A58CD6', 2); }
    else for (let r = 0; r < 2; r++) for (let q = 0; q < 2; q++) if (hash(i * 3 + r, q) > .45) rr(c, x + 5 + q * (w / 2 - 3), base - h + 7 + r * 13, 5, 6, 1, '#FFE38A');
    x += w;
  }
  // じめん: ゆうやけ いろの のはらと、ちずと おなじ てんてんの みち
  const gr = c.createLinearGradient(0, base, 0, H);
  gr.addColorStop(0, '#C7DFA4'); gr.addColorStop(1, '#ABD08E');
  c.fillStyle = gr; c.fillRect(0, base, W, H - base);
  c.setLineDash([10, 9]); c.strokeStyle = 'rgba(201,138,94,.8)'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, base + 26); c.bezierCurveTo(W * .3, base + 12, W * .6, base + 44, W, base + 22); c.stroke(); c.setLineDash([]);
}
function slotState(d) {
  if (!d) return 'はじめから';
  return d.pieces.length ? 'かけら ' + d.pieces.length + 'まい' : 'つづきから';
}
function buildSlots() {
  const host = $('slots'); host.replaceChildren();
  ANIMALS.forEach((a, i) => {
    const d = store.slots[i];
    const wrap = document.createElement('div'); wrap.className = 'slot';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'slot-main';
    b.appendChild(mk(168, 168, x => drawAnimal(x, a.id, 84, 100, 5.4)));
    b.insertAdjacentHTML('beforeend', '<span class="who">' + a.name + '</span><span class="state">' + slotState(d) + '</span>');
    b.onclick = () => { sfx.open(); startSlot(i); };
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
function startSlot(i) {   // えらんだ ひとの データで はじめる。プロローグは その ひとが はじめての ときだけ
  slotIx = i;
  if (!store.slots[i]) { store.slots[i] = { pieces: [], seenPrologue: false, introSeen: [] }; saveAll(); }
  data = store.slots[i];
  for (const id of ['who', 'mapWho']) { const w = $(id), c = w.getContext('2d'); c.clearRect(0, 0, 72, 72); drawAnimal(c, ANIMALS[i].id, 36, 42, 2.5); w.setAttribute('aria-label', ANIMALS[i].name + 'の データ'); }
  if (data.seenPrologue) showMap(); else playPrologue();
}

/* ---------- いりぐち(むしめがね): 1さくめと おなじ ---------- */
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
    const far = Math.hypot(Math.max(cx, innerWidth - cx), Math.max(cy, innerHeight - cy)) + 40, S2 = far / r0;
    gate.style.setProperty('--cx', cx + 'px'); gate.style.setProperty('--cy', cy + 'px');
    gate.classList.add('open');
    let t0 = null;
    const tick = ts => {
      if (t0 === null) t0 = ts;
      const p = Math.min(1, (ts - t0) / 950), k = p < .25 ? 1 - .12 * Math.sin(p / .25 * PI) : 1 + (S2 - 1) * Math.pow((p - .25) / .75, 2.2);
      lens.style.transform = 'scale(' + k + ')';
      gate.style.setProperty('--r', Math.max(0, r0 * k - 1) + 'px');
      if (p < 1) requestAnimationFrame(tick); else gate.hidden = true;
    };
    requestAnimationFrame(tick);
  };
}

/* ---------- にゅうりょく: いきたい ばしょや ものを タッチするだけ ---------- */
cv.addEventListener('pointerdown', ev => {
  if (!running) return;
  const r = cv.getBoundingClientRect();
  goTo(Math.floor((ev.clientX - r.left) / r.width * COLS), Math.floor((ev.clientY - r.top) / r.height * ROWS));
});
const KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
window.addEventListener('keydown', ev => {   // パソコンでは やじるしキーでも あるける
  if (freeze) return;
  if (intro && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); nextIntro(); return; }
  if (!running || busy || win || intro || !KEYS[ev.key] || m.p < 1) return;
  ev.preventDefault(); const [dx, dy] = KEYS[ev.key];
  const o = S.objs.find(q => q.id !== 'dig' && q.hit(m.x + dx, m.y + dy) && q.stand.some(s => s[0] === m.x && s[1] === m.y));
  if (o) { path = []; S.act(o); } else if (!blocked(m.x + dx, m.y + dy)) { path = []; pending = null; startStep(m.x + dx, m.y + dy); }
});
$('btnSkip').onclick = ev => { ev.stopPropagation(); endPrologue(); };
$('mapCv').addEventListener('pointerdown', ev => {   // ちずの ばしょを タッチ
  const r = $('mapCv').getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * 480, y = (ev.clientY - r.top) / r.height * 300;
  const i = PLACES.findIndex(q => Math.hypot(q.x - x, q.y - y) < 34); if (i < 0) return;
  if (mapWalk || wiping) return;
  if (isOpen(i)) { sfx.open(); walkOnMap(i); return; }
  sfx.miss();
  $('mapSay').textContent = i < STAGES.length ? 'さきに ' + PLACES[i - 1].name + 'の かけらを みつけよう' : PLACES[i].name + 'は、まだ いけないよ';
});
$('mapHome').onclick = goTitle;
$('btnHome').onclick = () => fadeTo(showMap);
$('btnAgain').onclick = () => fadeTo(showMap);
$('btnSkip2').onclick = endIntro;
$('talk').addEventListener('click', ev => { if (intro && !freeze && ev.target.id !== 'btnSkip2') nextIntro(); });
$('btnSound').onclick = () => { store.sound = !store.sound; saveAll(); refreshSound(); sfx.open(); if (store.sound) playMusic(wantTrack); else stopMusic(); };
window.addEventListener('resize', fit);
if (window.ResizeObserver) new ResizeObserver(fit).observe($('field'));

let booted = false; const go = () => { if (booted) return; booted = true; buildSlots(); drawTitle(0); setupGate(); requestAnimationFrame(frame); };
window.addEventListener('resize', fitTitle);
if (document.fonts && document.fonts.load) document.fonts.load('400 13px "Mochiy Pop One"', '123えき').then(go, go);
setTimeout(go, 1500);
})();
