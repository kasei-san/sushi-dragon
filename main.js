import { THREE, T, spawn, runTasks, wait, until, tween, rand, pick, fx, easeOut, easeInOut, clamp } from './util.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildWorld, SEAT_X, SEAT_Z, COUNTER_TOP, ROOM } from './world.js';
import { Actor, LOOKS } from './actors.js';
import * as I from './items.js';

const V = THREE.Vector3;
const params = new URLSearchParams(location.search);

// ---------- レンダラー・カメラ(客席側の固定カメラ) ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05030d);
fx.scene = scene;

const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 200);
// ネオンをにじませるブルーム(HDRで描いてから合成)
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
const renderPass = new RenderPass(scene, camera);
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), params.has('bloom') ? parseFloat(params.get('bloom')) : 0.5, 0.4, 1.0);
composer.addPass(renderPass);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const CAM_TARGET = new V(0, 3.6, -2);
const CAM_DIR = new V(0, 11, 21);
let STAGE_W = innerWidth;
let logOpen = true;
function layout() {
  const logw = logOpen && innerWidth >= 900 ? Math.round(clamp(innerWidth * 0.22, 260, 380)) : 0;
  document.documentElement.style.setProperty('--logw', logw + 'px');
  document.getElementById('log').classList.toggle('on', logw > 0);
  STAGE_W = innerWidth - logw;
}
function resize() {
  layout();
  const w = STAGE_W, h = innerHeight;
  renderer.setSize(w, h);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  camera.aspect = w / h;
  // 狭い画面では引いてカウンター全体(幅約30)が入るようにする
  const k = Math.max(1, (ROOM.w + 5) / (2 * 22 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
  camera.position.copy(CAM_TARGET).addScaledVector(CAM_DIR, k);
  camera.lookAt(CAM_TARGET);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
addEventListener('keydown', (e) => { if (e.key === 'l' || e.key === 'L') { logOpen = !logOpen; resize(); } });
resize();

const world = buildWorld(scene);

// ---------- ライブログ(右パネル) ----------
const logBody = document.getElementById('logbody');
const fmtTime = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const seatNo = (a) => (a.seat ? `(${a.seat.i + 1}番)` : '');
function log(kind, tag, text, who = null, role = '') {
  const el = document.createElement('div');
  el.className = `ent ${kind} ${role}`;
  const add = (cls, txt) => { const sp = document.createElement('span'); sp.className = cls; sp.textContent = txt; el.appendChild(sp); };
  add('t', fmtTime(T.t));
  add('tag', tag);
  if (who) add('who', who);
  el.appendChild(document.createTextNode(text));
  const stick = logBody.scrollHeight - logBody.scrollTop - logBody.clientHeight < 40;
  logBody.appendChild(el);
  while (logBody.childElementCount > 150) logBody.firstChild.remove();
  if (stick) logBody.scrollTop = logBody.scrollHeight;
}

// ---------- 吹き出し(ドット絵フォント) ----------
const layer = document.getElementById('bubbles');
const bubbles = new Map();
const _bv = new V();

function say(actor, text, o = {}) {
  const old = bubbles.get(actor);
  if (old) old.el.remove();
  const el = document.createElement('div');
  el.className = 'bubble ' + (o.kind ?? actor.role ?? 'guest');
  if (actor.role !== 'guest' && actor.role !== 'ninja' && !o.noWho) {
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = actor.name;
    el.appendChild(who);
  }
  const body = document.createElement('span');
  el.appendChild(body);
  layer.appendChild(el);
  const b = { actor, el, body, text, n: 0, t: 0, life: o.life ?? 1.4 + text.length / 24 + 1.3, lift: 0 };
  bubbles.set(actor, b);
  actor.talk(text.length / 24 + 0.15);
  if (o.kind !== 'money' && !o.nolog) log(o.tag ? 'order' : 'say', o.tag ?? '発言', `「${text.trim()}」`, `${actor.name}${seatNo(actor)}:`, actor.role);
  return b;
}
function* speak(actor, text, o = {}) {
  const b = say(actor, text, o);
  yield* wait(text.length / 24 + (o.hold ?? 0.7));
  return b;
}
function removeBubble(actor) {
  const b = bubbles.get(actor);
  if (b) { b.el.remove(); bubbles.delete(actor); }
}
function updateBubbles(dt) {
  const W = STAGE_W, H = innerHeight;
  const items = [];
  for (const [actor, b] of bubbles) {
    b.t += dt;
    b.n += dt * 26;
    b.body.textContent = b.text.slice(0, Math.floor(b.n));
    if (b.t > b.life) b.el.classList.add('out');
    if (b.t > b.life + 0.3) { b.el.remove(); bubbles.delete(actor); continue; }
    actor.headWorld(_bv).project(camera);
    const w = b.el.offsetWidth + 8, h = b.el.offsetHeight + 16;
    let x = (_bv.x * 0.5 + 0.5) * W;
    let y = (-_bv.y * 0.5 + 0.5) * H;
    x = clamp(x, w / 2 + 6, W - w / 2 - 6);
    items.push({ b, x, y, w, h });
  }
  // 重なった吹き出しは新しい方を上へずらす
  items.sort((a, c) => a.b.t - c.b.t > 0 ? -1 : 1);
  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    for (let j = 0; j < i; j++) {
      const c = items[j];
      if (Math.abs(a.x - c.x) < (a.w + c.w) / 2 && a.y > c.y - c.h && a.y - a.h < c.y) a.y = c.y - c.h - 2;
    }
    a.y = Math.max(a.y, a.h + 4);
    a.b.el.style.transform = `translate(${a.x}px, ${a.y}px) translate(-50%, -100%)`;
  }
}
function flashAt(worldPos) {
  const v = worldPos.clone().project(camera);
  const el = document.createElement('div');
  el.className = 'flash';
  el.style.left = (v.x * 0.5 + 0.5) * STAGE_W + 'px';
  el.style.top = (-v.y * 0.5 + 0.5) * innerHeight + 'px';
  document.getElementById('flash-layer').appendChild(el);
  setTimeout(() => el.remove(), 400);
}

// ---------- 登場人物 ----------
const actors = [];
function addActor(a, role) {
  a.role = role;
  actors.push(a);
  scene.add(a.root);
  return a;
}
function removeActor(a) {
  removeBubble(a);
  a.root.removeFromParent();
  const i = actors.indexOf(a);
  if (i >= 0) actors.splice(i, 1);
}

const chef = addActor(new Actor(LOOKS.chef), 'chef');
chef.root.position.set(0, 0.6, -2.0);
chef.baseY = 0.6;
chef.gestures = true;

const waitress = addActor(new Actor(LOOKS.waitress), 'staff');
waitress.root.position.set(-11.5, 0.6, -2.0);
waitress.baseY = 0.6;
waitress.gestures = true;

const ninja = addActor(new Actor(LOOKS.ninja), 'ninja');
ninja.root.visible = false;

// ---------- 席 ----------
const CUP_SIDE = SEAT_X.map((_, i) => (i < 5 ? -1 : 1));
const chefSeat = (seat) => seat.i === 4 || seat.i === 5;
const seats = SEAT_X.map((x, i) => ({
  i, x, state: 'free', c: null, plate: null, cup: null, plateArrived: false,
  plateHome: new V(x, COUNTER_TOP, 1.0),
  cupHome: new V(x + CUP_SIDE[i] * 2.25, COUNTER_TOP, 1.3),
}));

const teaJobs = [];
const cleanJobs = [];
const orders = [];

// ---------- 台詞 ----------
const LINES = {
  cowboy: {
    order: ['ステーキ スシ ハ アル カ？', 'ウシ ノ スシ ヲ ヨロシク ダゼ！'],
    react: ['ヤーハー！ ウマイ ゼ！', 'ナマ ダケド イケル ナ！'],
    chat: ['ウィスキー ハ ドコ ダ？', 'コノ ミセ、 ウマ ハ イナイ ノカ？'],
    bye: ['ゴチ ダゼ！ アバヨ！'],
  },
  tourist: {
    order: ['カリフォルニア ロール プリーズ！', 'スシ ピザ ハ アル？'],
    react: ['SUGOI! オイシー！', 'ワサビ ハ ミドリ ノ アイス？'],
    chat: ['インスタ ニ アゲル ヨ！', 'ニンジャ ハ ドコ？'],
    bye: ['アリガトゴザマス！ ハロー！'],
  },
  biz: {
    order: ['オマカセ デ。 カード ハ ツカエル？', 'コレ ハ ケイヒ デ オチル？'],
    react: ['ウム。 ホンモノ ダ。', 'ナカナカ ノ アジ ダ。'],
    chat: ['スシ ハ ROI ガ タカイ', 'ワタシ ハ コドク ノ グルメ'],
    bye: ['ゴチソウ サマ。 レシート ヲ。'],
  },
  punk: {
    order: ['ワサビ ゼンブ ノセテ！', 'ケチャップ ヲ ください！'],
    react: ['ヤバイ！ ウマイ！', 'ロック ダゼ！'],
    chat: ['スシ ハ パンク！', 'ギター ハ ドコ？'],
    bye: ['ジャーナ！ ノー フューチャー！'],
  },
  viking: {
    order: ['ウミ ノ サカナ ヲ ヨコセ！', 'ハチミツ サケ ハ ナイ カ！'],
    react: ['ウォォ！ ウマイ！', 'ヴァルハラ ノ アジ ダ！'],
    chat: ['スコール！ ヲ ヤロウ！', 'ワレ ハ ニンジャ ノ トモ ダ'],
    bye: ['ヴァルハラ デ マタ ナ！'],
  },
  lady: {
    order: ['ダイエット チュウ ナノ… アボカド ダケ', 'ミソスープ ニ フォーク ハ ツカエル？'],
    react: ['マァ！ ステキ！', 'ヘルシー ネ！'],
    chat: ['コノ キモノ ノ ウェイトレス ステキ ネ', 'ダーリン ガ ニホン ダイスキ ナノ'],
    bye: ['オホホ！ ゴキゲンヨウ！'],
  },
  luchador: {
    order: ['ルチャ ロール ヲ 100コ！', 'ハンバーガー ハ ナイ カ？'],
    react: ['ウオオ！ ウマイ！！', 'パワー ガ ミナギル！'],
    chat: ['ワタシ ハ サムライ ノ ショウゾウ！', 'スモウ カ？ ルチャ カ？'],
    bye: ['アスタ ラ ビスタ！ ドスコイ！'],
  },
};
LINES.salaryman = {
  order: ['ザンギョウ ノ アト ノ スシ ダ…', 'カチョウ ノ オゴリ ダト イイ ナ…', 'ハヤク ダシテ クレ。 ネムイ。'],
  react: ['ウマイ… ナミダ ガ…', 'ニッポン ノ アジ ダ… ヒサシブリ'],
  chat: ['スシ ハ カイギシツ デ タベル モノ ジャ ナイ', 'アシタ モ ザンギョウ ダ…'],
  bye: ['ゴチソウ サマ。 マタ ザンギョウ ダ…'],
};
LINES.cyber = {
  order: ['ネオン ロール ヲ ダウンロード シテ', 'ワサビ ノ スキャン ヲ ハジメル ゼ', 'ARメニュー ハ ドコ？'],
  react: ['ネオン ノ アジ ガ スル！', 'チョー サイバー！', 'ワサビ ガ ニューロン ニ キク…'],
  chat: ['コノ ミセ、 ハッキング シテ イイ？', 'ワタシ ノ メ ハ 4K ダ ゼ'],
  bye: ['ログアウト スル ゼ。 マタ ナ'],
};
LINES.robot = {
  order: ['ショクジ ヲ カイシ シマス。 マグロ ヲ ヨウセイ', 'ワサビ ノ セイブン ヲ カイセキ チュウ…', 'ピピッ！ スシ ヲ オネガイ シマス'],
  react: ['オイシイ ヲ ケンシュツ シマシタ', 'ピー！ ウマイ ヲ カクニン', 'ブルブル… カンドウ ガ ショウジ'],
  chat: ['ワタシ ノ ハシ ノ セイド ハ 0.1mm', 'オイル ヨリ ショウユ ガ スキ デス'],
  bye: ['ゴチソウ サマ デシタ。 シャットダウン シマス'],
};
const CHEF_WELCOME = ['イラッシャイマセー！', 'ヘイ ラッシャイ ラッシャイ！', 'ヨウコソ！ スシ ノ クニ ヘ！', 'ドウゾ ドウゾ！ ナマ ノ サカナ ヨ！'];
const CHEF_ACCEPT = ['ハイヨー！ オマカセ アレ！', 'ヨロコンデー！ ニンジャ ノ ハヤサ デ！', 'ワカリマシタ！ ワサビ ハ ダイモリ？', 'ゴチュウモン アリガトゴザマス！'];
const CHEF_SERVE = ['ヘイ、 オマチ！', 'ドウゾ！ スーッ と！', 'ハイ！ サムライ スタイル！', 'オイシイ ヨ！ タブン！'];
const CHEF_IDLE = ['スシ ハ… ココロ… ニンジャ…', 'コノ ホウチョウ ハ 800ネン マエ…', 'ワサビ ハ タベル ヨリ ヌル…', 'ホンモノ ノ スシ ハ ヤッパリ ニホン ノ アジ…', 'キョウ ノ マグロ ハ ゲンキ ヨ'];
const CHEF_CHAT = ['オキャクサン、 ニホン ハ ハジメテ？', 'ハシ ハ ボー ノ ヨウナ モノ ネ！', 'スシ ニ ケチャップ ハ… ダメ！', 'ワタシ ノ ムスメ ハ ゲイシャ ヨ！', 'ニンジャ ハ ウチ ノ ウェイター ヨ'];
const WAITRESS_LINES = ['オキャクサマ ハ カミサマ デス！', 'ニコニコ ニコニコ！', 'ハイ、 ハイ、 ハイ！', 'オカワリ ハ ジユウ デス！ タブン！', 'ゲイシャ ハッピー アワー！'];
const NINJA_LINES = ['ニンニン！', 'ドロン！', 'ニンジャ ジャ ナイ ヨ？', 'セッシャ ハ ウェイター ニン', 'ゴハン ノ ジュツ！'];

// ---------- 共通の動作 ----------
function* walkTo(a, x, z, speed = 5) {
  const p = a.root.position;
  for (;;) {
    const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz);
    if (d < 0.06) break;
    const s = Math.min(d, speed * T.dt);
    p.x += (dx / d) * s;
    p.z += (dz / d) * s;
    a.faceAngle = Math.atan2(dx, dz);
    yield;
  }
}
/** 厨房側の通路を移動。店主のいる中央をよけるため奥の列で迂回する */
function* goRow(a, x, z = -2.0, speed = 6) {
  const p = a.root.position;
  if (Math.min(p.x, x) < 3.4 && Math.max(p.x, x) > -3.4) {
    yield* walkTo(a, p.x, -4.4, speed);
    yield* walkTo(a, x, -4.4, speed);
  }
  yield* walkTo(a, x, z, speed);
  a.faceAngle = 0;
}
const tv = (x, y, z) => { const v = new V(x, y, z); return () => v; };
const wp = (obj, dx = 0, dy = 0, dz = 0) => { const v = new V(), o = new V(dx, dy, dz); return () => obj.getWorldPosition(v).add(o); };

let sales = 0, guests = 0;
function earn(amount, actor) {
  sales += amount;
  document.getElementById('sales').textContent = sales.toFixed(2);
  log('money', '売上', `+$${amount.toFixed(2)}  ${actor.name}${seatNo(actor)} のお会計 (累計 $${sales.toFixed(2)})`);
  const b = say(actor, `+$${amount.toFixed(2)}`, { kind: 'money', life: 1.3, noWho: true });
  b.n = 99;
}
function poof(pos, n = 16) {
  fx.puff(pos, 0xe8e8f0, n, { size: 0.45, speed: 4.5, up: 0.5, life: 1.0, g: -1 });
  fx.puff(pos, 0x9a9ab8, Math.floor(n / 2), { size: 0.35, speed: 3.5, up: 0.5, life: 0.8, g: -1 });
}

// ---------- 店主 ----------
const P = {
  rice: new V(3.7, COUNTER_TOP + 1.5, -0.2),
  fish: new V(-3.7, COUNTER_TOP + 1.1, -0.2),
  board: new V(0, COUNTER_TOP + 1.0, -0.1),
};

function* nigiri(kind, plate, slot) {
  chef.aimWorld(0, tv(P.fish.x, P.fish.y, P.fish.z));
  chef.aimWorld(1, tv(P.rice.x, P.rice.y, P.rice.z));
  chef.lean = 0.12;
  yield* wait(0.4);
  const piece = I.makePiece(kind);
  piece.scale.setScalar(0.82);
  chef.hold(1, piece, { y: -0.25 });
  // 握る(両手をまな板の上で上下)
  const kn = new V();
  chef.aimWorld(0, () => kn.set(P.board.x - 0.55, P.board.y + 0.35 + Math.sin(T.t * 16) * 0.25, P.board.z));
  const kn2 = new V();
  chef.aimWorld(1, () => kn2.set(P.board.x + 0.55, P.board.y + 0.35 + Math.cos(T.t * 16) * 0.25, P.board.z));
  chef.face = 'normal';
  if (Math.random() < 0.6) say(chef, pick(['ホッ！', 'ハッ！', 'セイ！', 'ヨッ！']), { life: 0.8 });
  yield* wait(0.65);
  // 皿へ置く
  const sw = plate.localToWorld(slot.clone());
  chef.aimWorld(1, tv(sw.x, sw.y + 0.5, sw.z));
  chef.aimWorld(0, tv(sw.x - 1.4, sw.y + 1.2, sw.z - 0.3));
  yield* wait(0.3);
  chef.release(1);
  piece.userData.upright = false;
  plate.add(piece);
  piece.position.copy(slot);
  piece.quaternion.identity();
  plate.userData.pieces.push(piece);
  yield* wait(0.15);
}

function* chefTea(seat) {
  chef.state = 'tea';
  const cup = I.makeCup();
  yield* walkTo(chef, clamp(seat.cupHome.x * 0.5, -2.2, 2.2), -2.0, 4);
  chef.faceAngle = 0;
  chef.setLook(() => seat.c?.head.getWorldPosition(new V()) ?? P.board);
  yield* speak(chef, 'オチャ ドウゾ！ タダ ヨ！', { hold: 0.2 });
  chef.hold(1, cup, { y: -0.1 });
  chef.lean = 0.3;
  const h = seat.cupHome;
  chef.aimWorld(1, tv(h.x, h.y + 1.8, h.z));
  yield* wait(0.7);
  chef.aimWorld(1, tv(h.x, h.y + 0.15, h.z));
  yield* wait(0.35);
  chef.release(1);
  scene.add(cup);
  cup.position.copy(h);
  cup.quaternion.identity();
  cup.userData.upright = false;
  cup.userData.hot = 30;
  seat.cup = cup;
  log('tea', '配膳', `お茶を出した → ${seat.i + 1}番席`, `${chef.name}:`, 'chef');
  yield* wait(0.25);
  chef.lean = 0;
  chef.aimAllOff();
}

function* serveOrder({ c, seat }) {
  chef.state = 'making';
  yield* walkTo(chef, clamp(seat.x * 0.06, -0.6, 0.6), -2.0, 4);
  chef.faceAngle = 0;
  chef.setLook(c);
  yield* speak(chef, pick(CHEF_ACCEPT), { hold: 0.2 });
  // 皿を用意して握る
  const plate = I.makePlate();
  plate.position.set(0, COUNTER_TOP, 1.0);
  scene.add(plate);
  const kinds = c.look === LOOKS.lady ? ['avocado', 'avocado', 'avocado'] : shuffle(I.NETA_KEYS).slice(0, 3);
  log('make', '握り', `${kinds.map((k) => I.NETA[k].label).join('・')} を握る → ${seat.i + 1}番席 ${c.name}`, `${chef.name}:`, 'chef');
  chef.setLook(() => P.board.clone().add(new V(0, 0.5, 0)));
  for (let i = 0; i < 3; i++) yield* nigiri(kinds[i], plate, plate.userData.slots[i]);
  chef.aimAllOff();
  chef.lean = 0;
  // 皿を滑らせる(西部劇スタイル)
  chef.setLook(c);
  say(chef, pick(CHEF_SERVE));
  chef.lean = 0.42;
  const from = plate.position.clone(), to = seat.plateHome.clone();
  const dist = Math.abs(to.x - from.x);
  const lp = new V();
  chef.aimWorld(0, () => lp.set(clamp(plate.position.x, -1.2, 1.2) - 0.9, plate.position.y + 0.6, plate.position.z - 0.6));
  const rp = new V();
  chef.aimWorld(1, () => rp.set(clamp(plate.position.x, -1.2, 1.2) + 0.9, plate.position.y + 0.6, plate.position.z - 0.6));
  yield* wait(0.35);
  if (dist > 0.1) {
    yield* tween(0.5 + dist * 0.04, (t) => { plate.position.lerpVectors(from, to, t); }, easeOut);
  }
  seat.plate = plate;
  seat.plateArrived = true;
  log('serve', '提供', `皿を滑らせた → ${seat.i + 1}番席 ${c.name}`, `${chef.name}:`, 'chef');
  yield* wait(0.3);
  chef.aimAllOff();
  chef.lean = 0;
  chef.state = 'idle';
  yield* wait(0.3);
}

function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function* chefIdle() {
  chef.state = 'idle';
  const r = Math.random();
  const seated = seats.filter((s) => s.c && (s.c.state === 'waiting' || s.c.state === 'eating'));
  if (r < 0.28 && seated.length) {
    // お客さんと雑談
    const s = pick(seated);
    chef.setLook(s.c);
    s.c.setLook(chef);
    chef.faceAngle = clamp(Math.atan2(s.x - chef.root.position.x, 8), -0.7, 0.7);
    yield* speak(chef, pick(CHEF_CHAT));
    if (s.c.state === 'waiting' || s.c.state === 'eating') {
      yield* wait(0.2);
      s.c.setFace('happy');
      yield* speak(s.c, pick(LINES[s.c.lk].chat));
      s.c.setFace('normal');
    }
    chef.faceAngle = 0;
  } else if (r < 0.5) {
    // 包丁を研ぐ
    const knife = I.makeKnife();
    chef.hold(1, knife, { y: -0.1, upright: false });
    chef.setLook(() => P.board);
    const k = new V(), k2 = new V();
    chef.aimWorld(1, () => k.set(1.0 + Math.sin(T.t * 9) * 0.5, COUNTER_TOP + 1.2, -0.4));
    chef.aimWorld(0, () => k2.set(-0.6, COUNTER_TOP + 1.3, -0.4));
    yield* wait(0.5);
    if (Math.random() < 0.6) say(chef, pick(CHEF_IDLE));
    yield* wait(2.4);
    chef.release(1);
    chef.aimAllOff();
  } else if (r < 0.68) {
    // ひとりごと & 招き猫に話しかける
    chef.setLook(tv(-16.6, 6, -8));
    chef.faceAngle = -0.5;
    yield* speak(chef, 'ネコ サン、 キョウ モ ゲンキ？');
    yield* wait(0.4);
    chef.faceAngle = 0;
  } else if (r < 0.85) {
    // 中央付近をうろうろ
    chef.setLook(null);
    yield* walkTo(chef, rand(-1.2, 1.2), -2.0, 2.5);
    chef.faceAngle = 0;
    if (Math.random() < 0.5) say(chef, pick(CHEF_IDLE));
    yield* wait(1.2);
  } else {
    // 客席に手を振る
    chef.setLook(null);
    const w = new V();
    chef.aimWorld(1, () => w.set(2.2, 8.3 + Math.sin(T.t * 9) * 0.5, 0));
    yield* speak(chef, pick(CHEF_WELCOME));
    chef.aimAllOff();
  }
  chef.setLook(null);
  yield* wait(rand(0.4, 1.2));
}

function* chefLoop() {
  yield* wait(0.5);
  for (;;) {
    const tj = teaJobs.findIndex((j) => chefSeat(j.seat));
    if (orders.length) {
      yield* serveOrder(orders.shift());
      chef.setLook(null);
    } else if (tj >= 0) {
      const j = teaJobs.splice(tj, 1)[0];
      yield* chefTea(j.seat);
    } else {
      yield* chefIdle();
    }
  }
}

// ---------- 店員(ゲイシャ風ウェイトレス) ----------
function* waitressServeTea(seat) {
  const w = waitress;
  const tray = I.makeTray();
  tray.position.set(0, 0.7, 2.1);
  w.upper.add(tray);
  const cup = I.makeCup();
  tray.add(cup);
  cup.position.set(0.8, 0.15, 0.1);
  const l = new V(-1.6, 0.85, 1.8), r = new V(1.6, 0.85, 1.8);
  w.aimLocal(0, l);
  w.aimLocal(1, r);
  const cx = seat.cupHome.x;
  yield* goRow(w, cx, -2.0, 9);
  w.faceAngle = 0;
  w.setLook(() => seat.c?.head.getWorldPosition(new V()) ?? tray.getWorldPosition(new V()));
  say(w, pick(['ハイ！ ドウゾ！ ジャパニーズ ティー！', 'オチャ デス！ ヤケド ニ チュウイ！', 'ハイ、 ハイ、 ハイ！ オチャ！']));
  tray.remove(cup);
  w.aimAllOff();
  w.aimLocal(0, l);
  w.hold(1, cup, { y: -0.1 });
  w.lean = 0.3;
  const h = seat.cupHome;
  w.aimWorld(1, tv(h.x, h.y + 1.8, h.z));
  yield* wait(0.7);
  w.aimWorld(1, tv(h.x, h.y + 0.15, h.z));
  yield* wait(0.35);
  w.release(1);
  scene.add(cup);
  cup.position.copy(h);
  cup.quaternion.identity();
  cup.userData.upright = false;
  cup.userData.hot = 30;
  seat.cup = cup;
  log('tea', '配膳', `お茶を出した → ${seat.i + 1}番席`, `${w.name}:`, 'staff');
  yield* wait(0.3);
  w.lean = 0;
  tray.removeFromParent();
  w.aimAllOff();
  w.setLook(null);
}

function* waitressIdle() {
  const w = waitress;
  const home = pick([-19, -14, -9, 9, 14, 19]);
  yield* goRow(w, home, -2.0, 8);
  const r = Math.random();
  if (r < 0.45) {
    // カウンターを拭く
    const c = new V();
    w.aimWorld(1, () => c.set(home + Math.sin(T.t * 7) * 1.2, COUNTER_TOP + 0.4, 0.5 + Math.cos(T.t * 7) * 0.3));
    w.lean = 0.3;
    if (Math.random() < 0.6) say(w, pick(WAITRESS_LINES));
    yield* wait(3);
    w.aimAllOff();
    w.lean = 0;
  } else if (r < 0.75) {
    // カメラ目線で手を振る
    w.setLook(() => camera.position);
    const a = new V();
    w.aimWorld(1, () => a.set(home + 2.2, 8.4 + Math.sin(T.t * 9) * 0.5, 0));
    yield* speak(w, pick(['ハーイ！ ゲイシャ ダヨ！', 'ヨウコソ！ スシ ドラゴン ヘ！', 'ニコニコ！']));
    w.aimAllOff();
    w.setLook(null);
  } else {
    yield* wait(rand(1.5, 3));
  }
}

function* waitressLoop() {
  yield* wait(0.5);
  for (;;) {
    const i = teaJobs.findIndex((j) => !chefSeat(j.seat));
    if (i >= 0) {
      const j = teaJobs.splice(i, 1)[0];
      yield* waitressServeTea(j.seat);
    } else {
      yield* waitressIdle();
    }
  }
}

// ---------- 忍者(皿下げ担当。カウンターの上を走る) ----------
let ninjaIdle = 0;
function* ninjaClean(seat) {
  const n = ninja;
  const px = seat.x, pz = 0.35;
  n.baseY = COUNTER_TOP;
  n.teleport(px - 1.2, COUNTER_TOP, pz);
  n.root.visible = true;
  n.faceAngle = 0;
  poof(new V(px - 1.2, COUNTER_TOP + 3, pz));
  yield* wait(0.3);
  say(n, pick(NINJA_LINES));
  n.setLook(null);
  const plate = seat.plate, cup = seat.cup;
  log('clean', '片付け', `${seat.i + 1}番席の皿と湯呑みを回収`, `${n.name}:`, 'ninja');
  if (plate) {
    n.aimWorld(0, wp(plate, -0.9, 0.4, 0));
    n.aimWorld(1, wp(plate, 0.9, 0.4, 0));
    n.lean = 0.35;
    yield* wait(0.5);
    n.lean = 0;
    plate.removeFromParent();
    plate.position.set(0, 0.7, 2.1);
    plate.rotation.set(0, 0, 0);
    n.upper.add(plate);
    if (cup) {
      cup.removeFromParent();
      cup.position.set(1.0, 0.2, 0.3);
      plate.add(cup);
      cup.quaternion.identity();
    }
    n.aimLocal(0, new V(-1.6, 0.85, 1.8));
    n.aimLocal(1, new V(1.6, 0.85, 1.8));
  }
  yield* wait(0.5);
  // ジャンプして消える
  yield* tween(0.35, (t) => { n.baseY = COUNTER_TOP + Math.sin(t * Math.PI) * 2.2; }, (t) => t);
  poof(n.head.getWorldPosition(new V()));
  n.root.visible = false;
  n.aimAllOff();
  plate?.removeFromParent();
  cup?.removeFromParent();
  removeBubble(n);
  seat.plate = null;
  seat.cup = null;
  seat.plateArrived = false;
  seat.state = 'free';
}

function* ninjaCameo() {
  const n = ninja;
  const dir = Math.random() < 0.5 ? 1 : -1;
  n.baseY = COUNTER_TOP;
  n.teleport(-24 * dir, COUNTER_TOP, 0.2);
  n.root.visible = true;
  poof(new V(-24 * dir, COUNTER_TOP + 3, 0.2), 10);
  const say1 = say(n, pick(['ニンニン！', 'ニンジャ ジャ ナイ ヨ！', 'ドロン！ ドロン！', 'ミナサン ニ ゴアイサツ！']));
  say1.life = 1.8;
  yield* walkTo(n, 24 * dir, 0.2, 16);
  poof(n.head.getWorldPosition(new V()), 10);
  n.root.visible = false;
  removeBubble(n);
}

function* ninjaLoop() {
  for (;;) {
    const s = cleanJobs.shift();
    if (s) { ninjaIdle = 0; yield* ninjaClean(s); }
    else {
      ninjaIdle += T.dt;
      if (ninjaIdle > rand(35, 55)) { ninjaIdle = 0; yield* ninjaCameo(); }
      yield;
    }
  }
}

// ---------- お客さん ----------
const usedLooks = new Set();
const LOOK_KEYS = ['cowboy', 'tourist', 'biz', 'punk', 'viking', 'lady', 'luchador', 'salaryman', 'cyber', 'robot'];
const NEONS = [0x2bf0ff, 0xff2bd6, 0xffe14a, 0x7aff4a, 0xff5a2b];
const TRAITS = {
  cowboy: { tool: 'fork' },
  tourist: { tool: 'chopsticks', photo: true },
  biz: { tool: 'chopsticks' },
  punk: { tool: 'chopsticks', wasabi: true },
  viking: { tool: 'hand', toast: true },
  lady: { tool: 'fork' },
  luchador: { tool: 'hand', flex: true },
  salaryman: { tool: 'chopsticks', tired: true },
  cyber: { tool: 'chopsticks', scan: true },
  robot: { tool: 'chopsticks', spark: true },
};

function makeCustomer(key) {
  const look = key === 'cyber' ? { ...LOOKS.cyber, neon: pick(NEONS) } : LOOKS[key];
  const c = addActor(new Actor(look), 'guest');
  c.lk = key;
  c.trait = TRAITS[key];
  c.state = 'entering';
  if (c.trait.tool === 'chopsticks') c.tool = I.makeChopsticks();
  else if (c.trait.tool === 'fork') c.tool = I.makeFork();
  if (c.tool) c.arms[1].hand.add(c.tool);
  return c;
}

function* sitDown(c, seat) {
  c.faceAngle = Math.PI;
  yield* wait(0.3);
  c.seated = true;
  const p = c.root.position, z0 = p.z;
  yield* tween(0.5, (t) => { p.z = z0 + (SEAT_Z - z0) * t; });
}
function* standUp(c) {
  c.seated = false;
  c.aimAllOff();
  const p = c.root.position, z0 = p.z;
  yield* tween(0.5, (t) => { p.z = z0 + (5.0 - z0) * t; });
}

function mouthWorld(c) { const v = new V(); return () => c.upper.localToWorld(v.copy(c.mouthPoint())); }

function* eatPiece(c, seat, piece) {
  const plate = seat.plate;
  const tip = c.tool ? c.tool.userData.tip : 0;
  const pv = new V();
  c.setLook(() => piece.getWorldPosition(pv));
  c.lean = 0.14;
  c.aimWorld(1, () => piece.getWorldPosition(pv).add({ x: 0, y: 0.4, z: 0 }), tip);
  yield* wait(0.7);
  plate.remove(piece);
  piece.userData.upright = true;
  c.hold(1, piece, { y: c.tool ? -tip - 0.15 : -0.3 });
  // パンク: ワサビ全乗せ
  let wasabi = false;
  if (c.trait.wasabi && !c.wasabiDone) {
    wasabi = true;
    c.wasabiDone = true;
    const blob = I.makeWasabiBlob();
    blob.scale.setScalar(1.5);
    piece.add(blob);
    blob.position.set(0, 0.7, 0);
    yield* speak(c, 'ワサビ ゼンブ ノセタ ゼ！', { hold: 0.3 });
  }
  c.lean = 0.02;
  c.setLook(chef);
  const mw = mouthWorld(c);
  c.aimWorld(1, mw, tip + 0.15);
  yield* wait(0.8);
  // ぱくっ
  c.release(1);
  c.chew(1.3);
  c.lean = 0;
  c.aimOff(1);
  if (wasabi) {
    c.setFace('spicy');
    c.spicyTarget = 1;
    c.lean = -0.1;
    say(c, 'カラーーーッ！！！ ',{ kind: 'shout', life: 2.0 });
    yield* wait(0.5);
    // お茶で流し込む
    yield* sipTea(c, seat, true);
    c.spicyTarget = 0;
    c.setFace('happy');
    yield* speak(c, 'ケド… ウマイ！！', { hold: 0.4 });
    c.setFace('normal');
  } else if (c.trait.spark && Math.random() < 0.5) {
    const hp = c.head.getWorldPosition(new V());
    hp.y += 1.2;
    fx.puff(hp, 0xffe14a, 12, { size: 0.18, speed: 5, up: 2, glow: true, life: 0.6 });
    c.setFace('shock');
    say(c, pick(['バチッ！ ショート シタ！', 'エラー: ワサビ ガ ハイッテ ル', 'ピピッ！ オイシイ ヲ ケンシュツ']), { life: 1.8 });
    yield* wait(1.2);
    c.setFace('normal');
  } else {
    c.setFace('happy');
    yield* wait(1.2);
    if (Math.random() < 0.55) {
      yield* speak(c, pick(LINES[c.lk].react), { hold: 0.4 });
    }
    c.setFace('normal');
  }
}

function* sipTea(c, seat, gulp = false) {
  const cup = seat.cup;
  if (!cup || cup.parent !== scene) return;
  const arm = CUP_SIDE[seat.i] < 0 ? 1 : 0;
  const cpos = new V();
  c.setLook(chef);
  c.aimWorld(arm, () => cup.getWorldPosition(cpos).add({ x: 0, y: 0.35, z: 0 }));
  c.lean = 0.1;
  yield* wait(0.55);
  cup.removeFromParent();
  cup.userData.upright = true;
  c.hold(arm, cup, { y: -0.1 });
  const mw = mouthWorld(c);
  c.aimWorld(arm, mw, 0.3);
  yield* wait(0.6);
  yield* tween(0.35, (t) => { cup.userData.tilt = -0.9 * t; });
  yield* wait(gulp ? 1.3 : 0.7);
  yield* tween(0.3, (t) => { cup.userData.tilt = -0.9 * (1 - t); });
  const h = seat.cupHome;
  c.aimWorld(arm, tv(h.x, h.y + 0.15, h.z));
  yield* wait(0.6);
  c.release(arm);
  cup.userData.tilt = 0;
  cup.userData.upright = false;
  scene.add(cup);
  cup.position.copy(h);
  cup.quaternion.identity();
  c.aimOff(arm);
  c.lean = 0;
  if (!gulp) { c.setFace('happy'); yield* wait(0.5); c.setFace('normal'); }
}

function* takePhoto(c, seat) {
  const cam = I.makeCamera();
  c.hold(1, cam, { y: -0.4, upright: false });
  c.aimLocal(0, new V(-0.6, 3.0, 1.8));
  c.aimLocal(1, new V(0.6, 3.0, 1.8));
  c.setLook(() => seat.plate.getWorldPosition(new V()));
  yield* speak(c, 'ワォ！ インスタ ニ アゲル ヨ！', { hold: 0.3 });
  for (let i = 0; i < 2; i++) {
    flashAt(seat.plate.getWorldPosition(new V()).add(new V(0, 1.5, 0)));
    fx.puff(seat.plate.getWorldPosition(new V()).add(new V(0, 1, 0)), 0xffffff, 6, { size: 0.2, speed: 4, glow: true, life: 0.5 });
    say(c, 'パシャッ！', { life: 0.7 });
    yield* wait(0.5);
  }
  c.release(1);
  c.aimAllOff();
}

function* cheer(c, big) {
  c.aimLocal(0, new V(-1.5, 4.6, 0.6));
  c.aimLocal(1, new V(1.5, 4.6, 0.6));
  c.setFace('happy');
  yield* wait(big ? 1.3 : 0.9);
  c.aimAllOff();
  c.setFace('normal');
}

function* customerLife(c, seat, seated = false) {
  const L = LINES[c.lk];
  c.seat = seat;
  seat.state = 'busy';
  seat.c = c;
  seat.plateArrived = false;
  guests++;
  document.getElementById('guests').textContent = guests;
  if (seated) {
    c.root.position.set(seat.x, 0, SEAT_Z);
    c.faceAngle = Math.PI;
    c.root.rotation.y = Math.PI;
    c.seated = true;
    c.sitBlend = 1;
  } else {
    c.root.position.set(36, 0, 5.8);
    c.faceAngle = -Math.PI / 2;
    c.root.rotation.y = -Math.PI / 2;
    yield* walkTo(c, seat.x, 5.8, 8);
    yield* walkTo(c, seat.x, 4.9, 3);
    c.setLook(chef);
    if (chef.state !== 'making') say(chef, pick(CHEF_WELCOME));
    yield* sitDown(c, seat);
  }
  c.setLook(chef);
  c.state = 'seated';
  log('visit', seated ? '着席' : '来店', `${c.name} が ${seat.i + 1}番席 に座った`);
  if (!seated) teaJobs.push({ seat });
  else {
    // 最初から座っている客はお茶つき
    const cup = I.makeCup();
    cup.position.copy(seat.cupHome);
    cup.userData.upright = false;
    cup.userData.hot = 20;
    scene.add(cup);
    seat.cup = cup;
  }
  yield* wait(rand(0.8, 2.2));
  c.state = 'ordering';
  yield* speak(c, pick(L.order), { hold: 0.2, tag: '注文' });
  orders.push({ c, seat });
  c.state = 'waiting';
  if (c.trait.tired) {
    spawn((function* () {
      while (c.state === 'waiting') {
        yield* wait(rand(2.5, 4.5));
        if (c.state !== 'waiting') break;
        c.setFace('happy');
        say(c, 'Zzz…', { life: 2 });
        yield* wait(2);
        if (c.state === 'waiting') c.setFace('normal');
      }
    })());
  }
  yield* until(() => seat.plateArrived);
  // 皿が滑ってきた!
  c.state = 'eating';
  c.aimLocal(0, new V(-1.2, 0.9, 2.0));
  c.aimLocal(1, new V(1.2, 0.9, 2.0));
  c.setFace('shock');
  if (Math.random() < 0.7) say(c, pick(['オォ！', 'ワァオ！', 'ハヤイ！', 'キャッチ！']), { life: 1 });
  yield* wait(0.5);
  c.aimAllOff();
  c.setFace('normal');
  if (c.trait.scan) { say(c, pick(['スキャン: カロリー 320kcal', 'AR: タベゴロ 100%', 'ネオン ノ アジ ガ スル']), { life: 2 }); yield* wait(1.2); }
  if (c.trait.photo) yield* takePhoto(c, seat);
  const pieces = seat.plate.userData.pieces.slice();
  for (let i = 0; i < pieces.length; i++) {
    yield* eatPiece(c, seat, pieces[i]);
    if (i === 0 && !c.wasabiDone) yield* sipTea(c, seat);
    if (i === 1 && Math.random() < 0.5) yield* sipTea(c, seat);
    if (i === 1 && c.trait.toast) {
      // 乾杯!
      const cup = seat.cup;
      say(c, 'スコール！！', { kind: 'shout', life: 1.6 });
      yield* cheer(c, true);
    }
  }
  if (c.trait.flex) { say(c, 'ルチャ！！', { kind: 'shout', life: 1.4 }); yield* cheer(c, true); }
  c.setLook(chef);
  // ごちそうさま & お会計
  c.state = 'done';
  yield* speak(c, pick(L.bye), { hold: 0.2 });
  chef.setLook(c);
  if (chef.state !== 'making') yield* speak(chef, pick(['アリガトゴザマス！ マタ ドウゾ！', 'サヨナラ！ ゲンキ デ！', 'マタ キテ ネ！ ハラキリ ハ シナイ ヨ！']), { hold: 0.2 });
  earn(rand(9, 19) + 0.99 - 1, c);
  yield* wait(0.6);
  yield* standUp(c);
  c.state = 'leaving';
  log('leave', '退店', `${c.name} が ${seat.i + 1}番席 を立った`);
  seat.c = null;
  seat.state = 'dirty';
  cleanJobs.push(seat);
  c.setLook(null);
  yield* walkTo(c, seat.x, 5.8, 3);
  yield* walkTo(c, -36, 5.8, 8);
  usedLooks.delete(c.lk);
  removeActor(c);
}

function pickLook() {
  const unused = LOOK_KEYS.filter((k) => !usedLooks.has(k));
  return pick(unused.length ? unused : LOOK_KEYS);
}

function* spawner() {
  // 開店直後から座っている客を数名
  const first = [3, 6, 9, 0, 5].map((i) => seats[i]);
  const forced = (params.get('first') || '').split(',').filter(Boolean); // デバッグ用: ?first=cyber,robot
  for (const [n, s] of first.entries()) {
    const key = forced[n] ?? pickLook();
    usedLooks.add(key);
    const c = makeCustomer(key);
    spawn(customerLife(c, s, true));
    yield* wait(rand(1.2, 2.2));
  }
  for (;;) {
    yield* wait(rand(3, 6));
    const free = seats.filter((s) => s.state === 'free');
    if (!free.length) continue;
    const s = pick(free);
    s.state = 'reserved';
    const key = pickLook();
    usedLooks.add(key);
    spawn(customerLife(makeCustomer(key), s, false));
  }
}

// ---------- メインループ ----------
function updateSteam(dt) {
  for (const s of seats) {
    const cup = s.cup;
    if (!cup || cup.parent !== scene || !(cup.userData.hot > 0)) continue;
    cup.userData.hot -= dt;
    cup.userData.steamT = (cup.userData.steamT ?? 0) - dt;
    if (cup.userData.steamT <= 0) {
      cup.userData.steamT = 0.35;
      fx.puff(cup.position.clone().add(new V(0, 1.3, 0)), 0xffffff, 1, { size: 0.16, speed: 0.15, up: 1.2, life: 1.3, g: 0 });
    }
  }
}

function step(dt) {
  dt = Math.max(0, dt);
  T.dt = dt;
  T.t += dt;
  runTasks();
  scene.updateMatrixWorld();
  for (const a of actors) a.update(dt);
  world.anim.forEach((f) => f(T.t));
  updateSteam(dt);
  fx.update(dt);
  updateBubbles(dt);
}

spawn(chefLoop());
spawn(waitressLoop());
spawn(ninjaLoop());
spawn(spawner());

const SPEED = parseFloat(params.get('speed') || '1.5'); // 全体の進行速度(1.0で等速)
const warp = parseFloat(params.get('warp') || '0');
for (let i = 0; i < warp * 30; i++) step(1 / 30);

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  // rAFの時刻は performance.now() より古いことがあり、最初のフレームでdtが負になる。負dtは腕の補間を発散させる
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = Math.max(last, now);
  step(dt * SPEED);
  composer.render();
}
if (params.has('record')) {
  // 録画モード: 外部から1フレームずつ時間を進めて描画する(動画書き出し用)
  window.__advance = (dt, sub = 1) => { for (let i = 0; i < sub; i++) step(dt / sub); composer.render(); };
} else {
  requestAnimationFrame(frame);
}
document.fonts?.load('16px DotGothic16');
window.__sushi = { scene, camera, chef, waitress, ninja, seats, actors, step, renderer };

