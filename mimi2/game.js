/* たんていミミ2 なないろの ちず — 1話「えき」
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
  try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); if (d && Array.isArray(d.pieces)) return d; } catch (e) {}
  return { pieces: [], sound: true };
}
function saveAll() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(store)); } catch (e) {} }
const store = loadAll();

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
  fanfare() { [523, 523, 523, 659, 784].forEach((f, i) => tone(f, .22, [0, .16, .32, .48, .72][i], 'triangle', .14)); [1047, 1319, 1568].forEach(f => tone(f, 1.3, .98, 'triangle', .09)); },
};
const TRACKS = {
  // えき: でんしゃの リズムで はずむ ハ長調
  station: { beat: .3, gate: .7,
    mel: [[72,.5],[72,.5],[76,1],[79,1],[76,1], [77,.5],[77,.5],[81,1],[79,2], [76,.5],[76,.5],[79,1],[84,1],[79,1], [81,.5],[79,.5],[77,1],[76,2],
          [74,.5],[74,.5],[77,1],[81,1],[77,1], [76,.5],[76,.5],[79,1],[84,2], [83,.5],[81,.5],[79,.5],[77,.5],[76,1],[74,1], [72,2],[0,2]],
    bass: [[48,1],[55,1],[48,1],[55,1], [53,1],[60,1],[55,1],[62,1], [48,1],[55,1],[48,1],[55,1], [53,1],[60,1],[48,1],[55,1],
           [50,1],[57,1],[50,1],[57,1], [48,1],[55,1],[48,1],[55,1], [55,1],[62,1],[55,1],[62,1], [48,1],[55,1],[48,1],[0,1]] },
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
  while (music.tm < until) { const [n, d] = tr.mel[music.i]; if (n) note(midi(n), d * tr.beat * (tr.gate || .95), music.tm, 'triangle', .055, music.gain); music.tm += d * tr.beat; music.i = (music.i + 1) % tr.mel.length; }
  while (music.tb < until) { const [n, d] = tr.bass[music.j]; if (n) note(midi(n), d * tr.beat * .8, music.tb, 'triangle', .07, music.gain); music.tb += d * tr.beat; music.j = (music.j + 1) % tr.bass.length; }
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

/* ---------- マップ: えき(よこ 12 × たて 10) ---------- */
const PLATS = [{ n: 1, x: 1, tx: 2, col: '#FF9DB5' }, { n: 2, x: 5, tx: 6, col: '#7FB6F0' }, { n: 3, x: 9, tx: 10, col: '#8FD6A6' }];
const PEN = { x: 10, y: 3 };
const bk = (x, y) => x + ',' + y;
function blocked(x, y) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS || y < 2) return true;
  if (x === PEN.x && y === PEN.y) return true;
  if (y >= 6) return !PLATS.some(p => p.x === x);   // かいさつより したは、ホームの ますだけ あるける
  return false;
}
// タッチできる もの。stand は、その ものを しらべる ときに たつ ます
const OBJS = [
  { id: 'clock', hit: (x, y) => y < 2 && x >= 1 && x <= 3, stand: [[2, 2], [1, 2], [3, 2]] },
  { id: 'table', hit: (x, y) => y < 2 && x >= 6 && x <= 9, stand: [[7, 2], [8, 2], [6, 2], [9, 2]] },
  { id: 'pen', hit: (x, y) => x === PEN.x && (y === PEN.y || y === PEN.y - 1), stand: [[9, 3], [10, 4], [11, 3]] },
  ...PLATS.map(p => ({ id: 'plat', n: p.n, hit: (x, y) => y >= 6 && x >= p.x - 1 && x <= p.tx, stand: [[p.x, 7]] })),
];
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
// step: 0=とけいを みる → 1=じこくひょうを みる → 2=ホームを えらぶ → 3=かいけつ
const cv = $('cv'), ctx = cv.getContext('2d');
let seed = null, step = 0, running = false, busy = false, miss = 0, tNow = 0;
let m, cat, path = [], pending = null, dest = null, train = null, win = null, shake = 0, cardNew = false;
const timeText = (h, half) => h + 'じ' + (half ? 'はん' : '');
function newSeed() {
  const h = 2 + Math.floor(Math.random() * 10), half = Math.random() < .5;
  // じこくひょう: 30ぷんずつ ちがう 3つの じかん。まんなかが いまの じかん
  const mins = h * 60 + (half ? 30 : 0), rows = [-30, 0, 30].map(d => { const v = mins + d; return { h: Math.floor(v / 60), half: v % 60 === 30 }; });
  const plats = [1, 2, 3].sort(() => Math.random() - 0.5);
  rows.forEach((r, i) => { r.plat = plats[i]; });
  return { h, half, rows, ans: rows[1].plat };
}
function say(t, who = 'pen') {
  $('say').textContent = t;
  const f = $('face').getContext('2d'); f.clearRect(0, 0, 120, 120);
  if (who === 'pen') drawPenguin(f, 60, 110, 3.3); else drawCat(f, 58, 128, 5.2);
}
const HINT = ['いま なんじかな? ひかっている とけいを タッチして みてね', 'じこくひょうで、その じかんの でんしゃを さがして ほしいな', 'カードの ばんせんの ホームを タッチしてね'];
function drawTray() {
  const tray = $('tray'); tray.replaceChildren();
  const add = (label, draw, isNew) => { const e = document.createElement('span'); e.className = 'card' + (isNew ? ' new' : ''); e.appendChild(mk(64, 64, draw)); const b = document.createElement('b'); b.textContent = label; e.appendChild(b); tray.appendChild(e); return e; };
  if (step >= 1) add(timeText(seed.h, seed.half), x => drawClock(x, 32, 32, 26, seed.h, seed.half, false), cardNew && step === 1);
  if (step >= 2) { const e = add('ばんせん', x => { ci(x, 32, 32, 28, '#FFE38A'); num(x, seed.ans, 32, 34, 34, '#3A2D58'); }, cardNew && step === 2); if (miss >= 2 && step === 2) e.classList.add('glow'); }
  cardNew = false;
}
function drawPieces() {
  const got = store.pieces.length; let h = '';
  for (let i = 0; i < 7; i++) h += '<i class="' + (i < got ? 'got' : '') + '" style="' + (i < got ? 'background:' + PIECE_COL[i] : '') + '"></i>';
  $('pieces').innerHTML = h; $('pieces').setAttribute('aria-label', 'ちずの かけら ' + got + 'まい');
}
const PIECE_COL = ['#FF7E8A', '#FFA63D', '#FFD25E', '#8FD6A6', '#7FB6F0', '#8C9BEA', '#B79CED'];

function startStage() {
  seed = newSeed(); step = 0; miss = 0; path = []; pending = null; dest = null; train = null; win = null; busy = false;
  m = { x: 5, y: 4, fx: 5, fy: 4, p: 1, dir: 'down' }; cat = { x: 4, y: 4, fx: 4, fy: 4, dir: 'right' };
  $('title').hidden = true; $('game').hidden = false; $('btnAgain').hidden = true;
  refreshSound(); drawPieces(); drawTray(); fit(); running = true; playMusic('station');
  say('でんしゃが なんばんせんに くるか、わからなく なっちゃった!');
}
function goTitle() { running = false; closeModal(); playMusic(null); $('game').hidden = true; $('title').hidden = false; }
function refreshSound() { $('btnSound').setAttribute('aria-pressed', String(store.sound)); $('btnSound').setAttribute('aria-label', store.sound ? 'おとを けす' : 'おとを だす'); }

/* ---------- いどう ---------- */
function startStep(nx, ny) {
  cat.fx = cat.x; cat.fy = cat.y; cat.dir = m.x > cat.x ? 'right' : m.x < cat.x ? 'left' : m.y < cat.y ? 'up' : m.y > cat.y ? 'down' : cat.dir; cat.x = m.x; cat.y = m.y;
  m.fx = m.x; m.fy = m.y; m.dir = nx > m.x ? 'right' : nx < m.x ? 'left' : ny > m.y ? 'down' : 'up'; m.x = nx; m.y = ny; m.p = 0; sfx.step();
}
function update(dt) {
  if (m.p < 1) { m.p = Math.min(1, m.p + dt * 5.5); return; }
  if (busy) return;
  if (path.length) { const [nx, ny] = path.shift(); startStep(nx, ny); return; }
  dest = null;
  if (pending) { const o = pending; pending = null; act(o); }
}
function goTo(tx, ty) {
  if (busy || win) return;
  const o = OBJS.find(q => q.hit(tx, ty));
  if (!o) { pending = null; path = findPath(m.x, m.y, tx, ty); dest = path.length ? path[path.length - 1] : null; return; }
  // ものを タッチした とき: その まえまで あるいて、ついたら しらべる
  let best = null;
  for (const s of o.stand) { if (s[0] === m.x && s[1] === m.y) { best = []; break; } const pth = findPath(m.x, m.y, s[0], s[1]), l = pth[pth.length - 1]; if (l && l[0] === s[0] && l[1] === s[1] && (!best || pth.length < best.length)) best = pth; }
  if (!best) return;
  path = best; pending = o; dest = path.length ? path[path.length - 1] : null;
}
function act(o) {
  if (o.id === 'clock') { m.dir = 'up'; if (step === 0) lookClock(); else say('いまは ' + timeText(seed.h, seed.half) + 'だよ', 'cat'); }
  else if (o.id === 'table') { m.dir = 'up'; if (step === 0) say('さきに とけいを みて、いまの じかんを しらべよう', 'cat'); else if (step === 1) lookTable(); else say(timeText(seed.h, seed.half) + 'の でんしゃは ' + seed.ans + 'ばんせんだよ', 'cat'); }
  else if (o.id === 'pen') { m.dir = m.x < PEN.x ? 'right' : m.x > PEN.x ? 'left' : 'up'; say(step < 3 ? HINT[step] : 'ありがとう! たすかったよ'); }
  else if (o.id === 'plat') choosePlat(o.n);
}
function choosePlat(n) {
  m.dir = 'right';
  if (step < 2) { say('どの ホームか、まだ わからないよ。' + (step === 0 ? 'とけい' : 'じこくひょう') + 'を みよう', 'cat'); return; }
  if (step > 2) return;
  if (n !== seed.ans) {   // ちがう ホーム: ペンギンが くびを ふる。なんどでも やりなおせる
    miss++; shake = .6; sfx.miss(); drawTray();
    say(miss >= 2 ? 'カードの ばんごうと、ホームの ばんごうを くらべてみて' : 'この ホームじゃ ないみたい');
    return;
  }
  step = 3; busy = true; stopMusic(); sfx.train();
  train = { n, t: 0 }; say('でんしゃが きた!');
  setTimeout(() => { win = { t: 0 }; sfx.fanfare(); playMusic('clear', 2.2); if (!store.pieces.includes(1)) store.pieces.push(1); saveAll(); drawPieces(); say('ありがとう! おれいに、ちずの かけらを あげるね'); }, 1900);
  setTimeout(() => { say('つぎの ばしょは じゅんびちゅうだよ', 'cat'); $('btnAgain').hidden = false; }, 6200);
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
function lookClock() {
  sfx.open();
  const p = openModal('<h2>とけいは なんじ?</h2><div id="pic"></div><div class="row" id="ch"></div><p class="fb" id="fb"></p>');
  const paint = hint => { const c = mk(300, 300, x => drawClock(x, 150, 150, 132, seed.h, seed.half, hint)); c.className = 'pic'; p.querySelector('#pic').replaceChildren(c); };
  paint(false);
  // えらぶ もの: ただしい じかん、「はん」の ありなしを まちがえた もの、ながい はりの すうじを よんだ もの、1じかん ずれた もの
  const next = seed.h % 12 + 1, opts = [[seed.h, seed.half], [seed.h, !seed.half], [seed.half ? 6 : 12, false], [next, seed.half]];
  const seen = new Set(), list = opts.filter(o => { const k = o.join(); if (seen.has(k)) return false; seen.add(k); return true; }).sort(() => Math.random() - 0.5);
  list.forEach(([h, half]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'choice'; b.innerHTML = h + '<small>じ' + (half ? 'はん' : '') + '</small>';
    b.onclick = () => (h === seed.h && half === seed.half)
      ? right(p, 'せいかい! ' + timeText(h, half), () => { step = 1; cardNew = true; drawTray(); say('じこくひょうで、' + timeText(h, half) + 'の でんしゃを さがして ほしいな'); })
      : wrong(p, b, 'みじかい はりと ながい はりを みよう', seed.half ? 'みどりの ながい はりが 6なら「はん」。ピンクの みじかい はりは ' + seed.h + 'を すぎた ところ' : 'みどりの ながい はりが 12なら ちょうど。ピンクの みじかい はりの すうじを よもう', () => paint(true));
    p.querySelector('#ch').appendChild(b);
  });
}
function lookTable() {
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
  // ゆかと かべ
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
  if (step === 0) glowRect(c, t, 2 * T - 12, 6, 64, 64, 32);
  if (step === 1) glowRect(c, t, 6 * T + 4, 8, 4 * T - 8, 58, 6);
  if (dest) ci(c, dest[0] * T + 20, dest[1] * T + 22, 9 + Math.sin(t * 6) * 2, null, 'rgba(217,71,138,.7)', 3);

  const items = [];
  PLATS.forEach((p, i) => items.push({ y: 6.5, f: () => {   // ホームの ばんごうの かんばん
    const x = p.x * T + T, y = 6 * T - 2, on = step === 2 && (miss < 3 || p.n === seed.ans), bob = on ? Math.sin(t * 4 + i * 1.3) * 3 : 0;
    rr(c, x - 3, y + 4, 6, 26, 2, '#8C7CA8'); ci(c, x, y - 4, 17, p.col, '#3A2D58', 3); num(c, p.n, x, y - 2, 20, '#3A2D58');
    if (on) { ci(c, x, y - 4, 22 + Math.sin(t * 4 + i * 1.3) * 2, null, 'rgba(255,200,61,.9)', 3); poly(c, [[x - 8, y - 36 + bob], [x + 8, y - 36 + bob], [x, y - 26 + bob]], '#FFC83D', '#FFFFFF', 2); }
  } }));
  if (train) { const p = PLATS[train.n - 1], k = 1 - Math.pow(1 - Math.min(1, train.t / 1.5), 3); items.push({ y: 20, f: () => drawTrain(c, p.tx * T, (ROWS + 1) * T - k * (ROWS + 1 - 6.7) * T, p.col) }); }
  const sx = shake > 0 ? Math.sin(shake * 40) * 3 : 0;
  items.push({ y: PEN.y + .9, f: () => drawPenguin(c, PEN.x * T + 20 + sx, PEN.y * T + 37, 1.5, win ? Math.abs(Math.sin(t * 7)) * 7 : Math.sin(t * 2) * .6 + .6, !!win) });
  const e = m.p, mx = m.fx + (m.x - m.fx) * e, my = m.fy + (m.y - m.fy) * e, cx = cat.fx + (cat.x - cat.fx) * e, cy = cat.fy + (cat.y - cat.fy) * e, walking = m.p < 1;
  items.push({ y: my + .95, f: () => drawGirl(c, mx * T + 20, my * T + 37, 1.6, m.dir, win ? Math.abs(Math.sin(t * 8)) * 8 : walking ? Math.abs(Math.sin(e * PI)) * 3 : Math.sin(t * 2.4) * .6 + .6) });
  items.push({ y: cy + .94, f: () => drawCatDir(c, cx * T + 20, cy * T + 37, 1.35, cat.dir, walking ? Math.abs(Math.sin(e * PI + 1)) * 2 : 0, walking ? Math.sin(t * 8) * .5 : Math.sin(t * 1.2) * .4) });
  items.sort((a, b) => a.y - b.y).forEach(o => o.f());

  if (win) {   // ちずの かけらが ひかりの なかから でてくる
    const k = win.t, cx2 = COLS * T / 2, cy2 = 4 * T, out = 1 - Math.pow(1 - Math.min(1, k / .9), 3);
    if (k < .3 && !calm) { c.fillStyle = 'rgba(255,255,255,' + (.5 * (1 - k / .3)) + ')'; c.fillRect(0, 0, COLS * T, ROWS * T); }
    c.save(); c.translate(cx2, cy2); c.rotate(k * .6);
    for (let i = 0; i < 12; i++) { c.rotate(PI / 6); poly(c, [[-10, 0], [10, 0], [0, -150 * out]], 'rgba(255,230,130,' + (i % 2 ? .5 : .3) + ')'); }
    c.restore();
    drawPiece(c, cx2, cy2 - Math.sin(k * 2.4) * 4, 3.2 * bounce(k / .6), PIECE_COL[0]);
    for (let i = 0; i < 10; i++) { const a = k * 1.2 + i * PI / 5, r = 70 + 20 * Math.sin(k * 3 + i); starShape(c, cx2 + Math.cos(a) * r * out * 1.4, cy2 + Math.sin(a) * r * out, 3 + 3 * Math.abs(Math.sin(k * 4 + i)), i % 2 ? '#FFFFFF' : '#FFC83D', '#FFC83D'); }
  }
}
const bounce = v => { v = Math.min(1, Math.max(0, v)); return 1 - Math.pow(1 - v, 3) * Math.cos(v * PI * 2.5); };

let last = 0;
function frame(ts) {
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; tNow = ts / 1000;
  if (running) {
    if (train) train.t += dt; if (win) win.t += dt; if (shake > 0) shake = Math.max(0, shake - dt);
    update(dt); render(tNow);
  } else if (!$('title').hidden && !calm) drawTitle(tNow);
  requestAnimationFrame(frame);
}
function fit() {
  const f = $('field'); if (!f.clientWidth) return;
  const w = Math.max(160, Math.min(f.clientWidth - 6, (f.clientHeight - 6) * (COLS / ROWS))), h = w * ROWS / COLS;
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const bw = Math.round(Math.min(1440, Math.max(480, w * (window.devicePixelRatio || 1))));
  if (cv.width !== bw) { cv.width = bw; cv.height = Math.round(bw * ROWS / COLS); }
}
function drawTitle(t) {
  const a = $('titleArt').getContext('2d'); a.clearRect(0, 0, 480, 300);
  drawPiece(a, 240, 78 - Math.sin(t * 1.6) * 4, 3.4, PIECE_COL[Math.floor(t / 1.5) % 7]);
  drawGirl(a, 170, 284, 5, 'down', (Math.sin(t * 1.5) + 1) * .3, (t % 4.3) < .14);
  drawCat(a, 300, 286, 3.5, -1, (Math.sin(t * 1.5 + 1.2) + 1) * .25, false, Math.sin(t * 1.1), ((t + 2.5) % 5.7) < .14);
}

/* ---------- にゅうりょく: いきたい ばしょや ものを タッチするだけ ---------- */
cv.addEventListener('pointerdown', ev => {
  if (!running) return;
  const r = cv.getBoundingClientRect();
  goTo(Math.floor((ev.clientX - r.left) / r.width * COLS), Math.floor((ev.clientY - r.top) / r.height * ROWS));
});
const KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
window.addEventListener('keydown', ev => {   // パソコンでは やじるしキーでも あるける
  if (!running || busy || win || !KEYS[ev.key] || m.p < 1) return;
  ev.preventDefault(); const [dx, dy] = KEYS[ev.key];
  const o = OBJS.find(q => q.hit(m.x + dx, m.y + dy) && q.stand.some(s => s[0] === m.x && s[1] === m.y));
  if (o) { path = []; act(o); } else if (!blocked(m.x + dx, m.y + dy)) { path = []; pending = null; startStep(m.x + dx, m.y + dy); }
});
$('title').onclick = () => { sfx.open(); startStage(); };
$('btnHome').onclick = goTitle;
$('btnAgain').onclick = startStage;
$('btnSound').onclick = () => { store.sound = !store.sound; saveAll(); refreshSound(); sfx.open(); if (store.sound) playMusic(wantTrack); else stopMusic(); };
window.addEventListener('resize', fit);
if (window.ResizeObserver) new ResizeObserver(fit).observe($('field'));

let booted = false; const go = () => { if (booted) return; booted = true; drawTitle(0); requestAnimationFrame(frame); };
if (document.fonts && document.fonts.load) document.fonts.load('400 13px "Mochiy Pop One"', '123えき').then(go, go);
setTimeout(go, 1500);
})();
