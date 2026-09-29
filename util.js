import * as THREE from './vendor/three.module.js';
export { THREE };

export const T = { dt: 0.016, t: 0 };
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// ---------- ボクセル(箱)ヘルパー ----------
const geoCache = new Map();
const matCache = new Map();

export function geo(w, h, d, anchor = 'bottom') {
  const k = `${w},${h},${d},${anchor}`;
  let g = geoCache.get(k);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    if (anchor === 'bottom') g.translate(0, h / 2, 0);
    else if (anchor === 'top') g.translate(0, -h / 2, 0);
    geoCache.set(k, g);
  }
  return g;
}

export function mat(color, o = {}) {
  const op = o.opacity ?? 1;
  const mk = () =>
    new THREE.MeshLambertMaterial({
      color,
      emissive: o.emissive ?? 0x000000,
      emissiveIntensity: o.ei ?? 1,
      transparent: op < 1,
      opacity: op,
      depthWrite: op >= 1,
    });
  if (o.unique) return mk();
  const k = `${color}|${o.emissive ?? 0}|${o.ei ?? 1}|${op}`;
  let m = matCache.get(k);
  if (!m) matCache.set(k, (m = mk()));
  return m;
}

/** 箱を作る。anchor: 'bottom'(下辺基準) | 'top'(上辺基準) | 'center' */
export function B(parent, color, w, h, d, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo(w, h, d, o.anchor ?? 'bottom'), mat(color, o));
  m.position.set(x, y, z);
  m.castShadow = o.shadow !== false;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

// ---------- テクスチャ ----------
export const MINCHO =
  '"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP","Songti SC","MS PMincho",serif';

function finishTex(tex, pixel) {
  tex.colorSpace = THREE.SRGBColorSpace;
  if (pixel) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
  } else {
    tex.anisotropy = 8;
  }
  return tex;
}

/** ドット絵キャンバス(1px=1ドット)→ニアレストのテクスチャ */
export function pixTexture(pw, ph, draw) {
  const c = document.createElement('canvas');
  c.width = pw;
  c.height = ph;
  const g = c.getContext('2d');
  draw(g, pw, ph);
  return finishTex(new THREE.CanvasTexture(c), true);
}

/** 明朝体の文字看板テクスチャ。text は文字列 or 行の配列。vertical なら縦書き(配列は右→左の列) */
export function textTexture(text, w, h, o = {}) {
  const ppu = o.ppu ?? 40;
  const c = document.createElement('canvas');
  c.width = Math.round(w * ppu);
  c.height = Math.round(h * ppu);
  const g = c.getContext('2d');
  if (o.bg) {
    g.fillStyle = o.bg;
    g.fillRect(0, 0, c.width, c.height);
  }
  if (o.border) {
    g.strokeStyle = o.border;
    g.lineWidth = ppu * 0.14;
    g.strokeRect(ppu * 0.14, ppu * 0.14, c.width - ppu * 0.28, c.height - ppu * 0.28);
  }
  g.fillStyle = o.fg ?? '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const font = o.font ?? MINCHO;
  const weight = o.weight ?? 900;
  const lines = Array.isArray(text) ? text : [text];
  if (o.vertical) {
    const cols = lines.map((l) => [...l]);
    const maxN = Math.max(...cols.map((s) => s.length));
    const size = Math.min((c.height * 0.88) / maxN, (c.width * 0.9) / cols.length);
    g.font = `${weight} ${size}px ${font}`;
    cols.forEach((chars, ci) => {
      const cx = c.width * (1 - (ci + 0.5) / cols.length);
      const y0 = (c.height - chars.length * size) / 2;
      chars.forEach((ch, j) => g.fillText(ch, cx, y0 + size * (j + 0.55)));
    });
  } else {
    g.font = `${weight} 100px ${font}`;
    const maxW = Math.max(...lines.map((l) => g.measureText(l).width));
    const size = Math.min((c.height * 0.8) / lines.length, ((c.width * 0.92) / maxW) * 100);
    g.font = `${weight} ${size}px ${font}`;
    lines.forEach((l, i) => g.fillText(l, c.width / 2, (c.height * (i + 0.5)) / lines.length + size * 0.04));
  }
  return finishTex(new THREE.CanvasTexture(c), false);
}

/** テクスチャを貼った平面 */
export function decal(parent, tex, w, h, x, y, z, o = {}) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshLambertMaterial({
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: o.glow ?? 0.55,
      transparent: !!o.alpha,
      alphaTest: o.alpha ? 0.5 : 0,
    })
  );
  m.position.set(x, y, z);
  m.rotation.y = o.ry ?? 0;
  m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}

/** 枠つき看板 */
export function sign(parent, text, w, h, x, y, z, o = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const fw = o.frameW ?? 0.25;
  B(g, o.frame ?? 0x3a2416, w + fw * 2, h + fw * 2, 0.3, 0, 0, 0, { anchor: 'center' });
  const tex = textTexture(text, w, h, o);
  decal(g, tex, w, h, 0, 0, 0.17, { glow: o.glow });
  if (o.ry) g.rotation.y = o.ry;
  parent.add(g);
  return g;
}

// ---------- 生成器ベースのスクリプト用ユーティリティ ----------
export function* wait(s) {
  let t = 0;
  while (t < s) {
    t += T.dt;
    yield;
  }
}
export function* until(fn) {
  while (!fn()) yield;
}
export function* tween(dur, fn, ease = easeInOut) {
  let t = 0;
  while (t < dur) {
    t += T.dt;
    fn(ease(Math.min(t / dur, 1)));
    yield;
  }
  fn(1);
}

const tasks = [];
export function spawn(gen) {
  tasks.push(gen);
  return gen;
}
export function runTasks() {
  for (let i = tasks.length - 1; i >= 0; i--) {
    let r;
    try {
      r = tasks[i].next();
    } catch (e) {
      console.error(e);
      window.__showError?.(e);
      tasks.splice(i, 1);
      continue;
    }
    if (r.done) tasks.splice(i, 1);
  }
}

// ---------- パーティクル(ぽわん・湯気・涙) ----------
export const fx = {
  list: [],
  scene: null,
  puff(pos, color = 0xffffff, n = 8, o = {}) {
    for (let i = 0; i < n; i++) {
      const s = rand(o.size ?? 0.3, (o.size ?? 0.3) * 2);
      const m = new THREE.Mesh(geo(s, s, s, 'center'), mat(color, { emissive: o.glow ? color : 0, ei: 0.6 }));
      m.position.copy(pos).add(new THREE.Vector3(rand(-0.3, 0.3), rand(-0.2, 0.3), rand(-0.3, 0.3)));
      const sp = o.speed ?? 3;
      const vel = new THREE.Vector3(rand(-sp, sp), rand(o.up ?? 0, (o.up ?? 0) + sp), rand(-sp, sp));
      const life = rand(0.5, 1) * (o.life ?? 0.8);
      this.scene.add(m);
      this.list.push({ m, vel, life, max: life, g: o.g ?? -6, spin: rand(-4, 4) });
    }
  },
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.m.removeFromParent();
        this.list.splice(i, 1);
        continue;
      }
      p.vel.y += p.g * dt;
      p.m.position.addScaledVector(p.vel, dt);
      p.m.rotation.y += p.spin * dt;
      p.m.scale.setScalar(Math.max(0.01, p.life / p.max));
    }
  },
};

// ---------- ネオン(ブルームで光る発光マテリアル) ----------
export const NEON_GAIN = 0.62; // サイバー度の調整つまみ(1で最大)
const neonCache = new Map();
export const neonMats = [];
export function neonMat(hex, k = 3) {
  const key = hex + '|' + k;
  let m = neonCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: hex, toneMapped: false });
    k *= NEON_GAIN;
    m.color.multiplyScalar(k); // 1を超える輝度 → ブルームのしきい値を超える
    m.userData = { base: new THREE.Color(hex), k, phase: Math.random() * 6 };
    neonCache.set(key, m);
    neonMats.push(m);
  }
  return m;
}
export function N(parent, hex, w, h, d, x = 0, y = 0, z = 0, k = 3) {
  const m = new THREE.Mesh(geo(w, h, d, 'center'), neonMat(hex, k));
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}
