import { THREE, B, mat, T, fx, clamp } from './util.js';

const V = THREE.Vector3;
const DOWN = new V(0, -1, 0);
const ARM = 2.6;
const _a = new V(), _b = new V(), _c = new V();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

// ---------- 見た目定義(外国人が想像した日本) ----------
export const LOOKS = {
  chef: {
    name: 'タイショー', skin: 0xf0c8a0, shirt: 0xffffff, pants: 0x2a2a3a, shoe: 0x222222,
    hair: 0x2b1b12, hairStyle: 'short', hat: 'toque', longSleeve: true,
    extras: ['headband', 'bigMustache', 'apron', 'buttons'],
  },
  waitress: {
    name: 'ゲイシャ', skin: 0xfbe6d8, shirt: 0xe86a92, pants: 0xe86a92, shoe: 0xffffff,
    hair: 0x151515, hairStyle: 'long', hat: 'none', longSleeve: true,
    extras: ['kimono', 'obi', 'hairSticks', 'blush', 'lips'],
  },
  ninja: {
    name: 'ニンジャ', skin: 0xe8c39a, shirt: 0x1b1b22, pants: 0x1b1b22, shoe: 0x0e0e12, headColor: 0x1b1b22,
    hair: 0x111111, hairStyle: 'bald', hat: 'none', longSleeve: true, handColor: 0x1b1b22,
    extras: ['ninjaMask', 'scarf'],
  },
  cowboy: {
    name: 'カウボーイ', skin: 0xe2a77c, shirt: 0xd9d2c0, pants: 0x3b5b9a, shoe: 0x5a3418,
    hair: 0x5a3a1a, hairStyle: 'short', hat: 'cowboy', extras: ['vest', 'mustache', 'belt'],
  },
  tourist: {
    name: 'カンコウキャク', skin: 0xf3c6a0, shirt: 0x1fa3c9, pants: 0xe8dcb5, shoe: 0xf4f4f4,
    hair: 0xc8a13c, hairStyle: 'short', hat: 'sunhat', extras: ['sunglasses', 'aloha'],
  },
  biz: {
    name: 'ビジネスマン', skin: 0xeab98f, shirt: 0x4a4f5c, pants: 0x3a3f4c, shoe: 0x111111,
    hair: 0x8a8a8a, hairStyle: 'short', hat: 'none', longSleeve: true, extras: ['glasses', 'tie', 'suit'],
  },
  punk: {
    name: 'パンク', skin: 0xf0c8a0, shirt: 0x202020, pants: 0x3a1a4a, shoe: 0xaa1122,
    hair: 0xff4fa8, hairStyle: 'mohawk', hat: 'none', longSleeve: true, extras: ['studs', 'earring'],
  },
  viking: {
    name: 'バイキング', skin: 0xe7b088, shirt: 0x8a5a2a, pants: 0x5a4a3a, shoe: 0x3a2a1a,
    hair: 0xe0b84a, hairStyle: 'short', hat: 'viking', extras: ['vikingBeard', 'fur'], scale: 1.08,
  },
  lady: {
    name: 'マダム', skin: 0xf3c6a0, shirt: 0xd0202e, pants: 0xf2c9a0, shoe: 0xd0202e,
    hair: 0x7a3a1a, hairStyle: 'bun', hat: 'sunhat2', extras: ['skirt', 'lips', 'pearls'],
  },
  salaryman: {
    name: 'サラリマン', skin: 0xeab98f, shirt: 0x1c1f2b, pants: 0x1c1f2b, shoe: 0x0a0a0a,
    hair: 0x111111, hairStyle: 'short', hat: 'none', longSleeve: true, extras: ['suit', 'tie', 'badge', 'glasses', 'briefcase'],
  },
  cyber: {
    name: 'サイバーニンゲン', skin: 0xe8d0c8, shirt: 0x14141f, pants: 0x14141f, shoe: 0x14141f,
    hair: 0x2a2a3a, hairStyle: 'short', hat: 'none', longSleeve: true, extras: ['cyberVisor', 'neonTrim', 'earpiece'],
  },
  robot: {
    name: 'ロボット', skin: 0xb8c2cc, headColor: 0xb8c2cc, shirt: 0x8a96a3, pants: 0x6a7480, shoe: 0x2a2f36,
    handColor: 0x6a7480, longSleeve: true, hair: 0x000000, hairStyle: 'bald', hat: 'none', extras: ['robot'], scale: 1.02,
  },
  luchador: {
    name: 'ルチャドール', skin: 0xd6976a, shirt: 0xd6976a, pants: 0x2e9e4a, shoe: 0xf4d03f,
    hair: 0x000000, hairStyle: 'bald', hat: 'mask', extras: ['champBelt'], fat: true, scale: 1.05,
  },
};

const ARM_ANG = { rest: 0.2 };
const _RED = new THREE.Color(0xff2a1a);

export class Actor {
  constructor(look) {
    const L = (this.look = look);
    this.name = look.name;
    this.root = new THREE.Group();
    this.root.scale.setScalar(L.scale ?? 1);
    this.baseY = 0;
    this.faceAngle = 0;
    this.phase = Math.random() * 6;
    this.speed = 0; this.walkAmt = 0;
    this._lx = NaN; this._lz = 0;
    this.seated = false; this.sitBlend = 0;
    this.lean = 0;
    this.talkUntil = 0; this.chewUntil = 0; this.gestures = false;
    this.face = 'normal'; this.spicy = 0; this.spicyTarget = 0;
    this.blinkAt = T.t + 2 + Math.random() * 3;
    this.lookFn = null;
    this.hatH = 0;

    const W = L.fat ? 3.5 : 2.6; // 胴幅
    const D = L.fat ? 1.9 : 1.5;
    this.upper = new THREE.Group();
    this.upper.position.y = 2.6;
    this.root.add(this.upper);

    // 脚
    this.legs = [-1, 1].map((s) => {
      const hip = new THREE.Group();
      hip.position.set(s * (L.fat ? 0.85 : 0.62), 2.6, 0);
      this.root.add(hip);
      B(hip, L.pants, 1.05, 1.4, 1.05, 0, 0.05, 0, { anchor: 'top' });
      const knee = new THREE.Group();
      knee.position.y = -1.3;
      hip.add(knee);
      B(knee, L.pants, 1.0, 1.3, 1.0, 0, 0, 0, { anchor: 'top' });
      B(knee, L.shoe, 1.1, 0.55, 1.6, 0, -1.3, 0.25);
      return { hip, knee };
    });

    // 胴
    B(this.upper, L.shirt, W, 2.4, D, 0, 0, 0);

    // 頭
    this.head = new THREE.Group();
    this.head.position.y = 2.4;
    this.upper.add(this.head);
    this.headMat = mat(L.headColor ?? L.skin, { unique: true });
    this.skinCol = new THREE.Color(L.headColor ?? L.skin);
    const hm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.2).translate(0, 1.1, 0), this.headMat);
    hm.castShadow = hm.receiveShadow = true;
    this.head.add(hm);
    // 顔パーツ
    this.eyes = [-1, 1].map((s) => B(this.head, 0x1a1418, 0.3, 0.45, 0.1, s * 0.6, 0.85, 1.1));
    const mouthCol = L.extras.includes('lips') ? 0xc8102e : L.headColor ? L.headColor : 0x7a2a2a;
    this.mouth = B(this.head, mouthCol, 0.7, 0.18, 0.1, 0, 0.32, 1.1);
    this.mouthBase = mouthCol;
    B(this.head, 0xd9a07a, 0.35, 0.3, 0.3, 0, 0.62, 1.15).visible = !L.headColor && !L.extras.includes('bigMustache') && L.hat !== 'mask';

    // 腕
    const sleeve = L.sleeve ?? L.shirt;
    const fore = L.longSleeve ? sleeve : L.skin;
    this.arms = [-1, 1].map((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(s * (W / 2 + 0.4), 2.15, 0);
      this.upper.add(pivot);
      const aw = L.fat ? 1.2 : 0.9;
      B(pivot, sleeve, aw, 1.6, aw, 0, 0.2, 0, { anchor: 'top' });
      B(pivot, fore, aw - 0.1, 0.7, aw - 0.1, 0, -1.3, 0, { anchor: 'top' });
      B(pivot, L.handColor ?? L.skin, 0.78, 0.75, 0.78, 0, -2.0, 0, { anchor: 'top' });
      const hand = new THREE.Group();
      hand.position.y = -2.6;
      pivot.add(hand);
      return { s, pivot, hand, aim: null, held: null, tq: new THREE.Quaternion() };
    });

    this._dress(L, W, D);
    this._updateMatrices();
  }

  _updateMatrices() { this.root.updateMatrixWorld(true); }

  _dress(L, W, D) {
    const h = this.head, u = this.upper, ex = L.extras;
    const hc = L.hair;
    // 髪
    switch (L.hairStyle) {
      case 'short': case 'bun': case 'pigtails':
        B(h, hc, 2.5, 0.6, 2.3, 0, 1.75, -0.05);
        B(h, hc, 2.5, 1.6, 0.5, 0, 0.6, -1.0);
        B(h, hc, 0.2, 0.9, 0.9, -1.25, 0.9, -0.3); B(h, hc, 0.2, 0.9, 0.9, 1.25, 0.9, -0.3);
        if (L.hairStyle === 'bun') B(h, hc, 1.1, 1.1, 1.1, 0, 2.2, -0.3);
        break;
      case 'long':
        B(h, hc, 2.6, 0.7, 2.4, 0, 1.7, -0.05);
        B(h, hc, 2.7, 3.7, 0.6, 0, -1.3, -1.05);
        B(h, hc, 0.25, 1.4, 1.0, -1.28, 0.5, -0.2); B(h, hc, 0.25, 1.4, 1.0, 1.28, 0.5, -0.2);
        B(h, hc, 2.5, 0.5, 0.4, 0, 1.4, 1.05); // 前髪
        B(h, hc, 1.1, 1.0, 1.1, 0, 2.25, -0.3); // お団子
        break;
      case 'mohawk':
        B(h, hc, 0.6, 1.5, 2.4, 0, 1.9, 0, { emissive: 0xff2bd6, ei: 1.8 });
        B(h, hc, 0.6, 0.9, 0.7, 0, 2.6, -0.5, { emissive: 0xff2bd6, ei: 1.8 });
        break;
    }
    // 帽子・仮面
    switch (L.hat) {
      case 'toque':
        B(h, 0xffffff, 2.6, 0.5, 2.4, 0, 1.95, 0);
        B(h, 0xffffff, 3.0, 2.0, 2.8, 0, 2.4, 0);
        B(h, 0xffffff, 3.3, 0.7, 3.1, 0, 4.3, 0);
        this.hatH = 3.1;
        break;
      case 'cowboy':
        B(h, 0x6b3f1e, 4.2, 0.2, 3.7, 0, 1.95, 0);
        B(h, 0x6b3f1e, 2.5, 1.1, 2.3, 0, 2.15, 0);
        B(h, 0x2b1a0c, 2.55, 0.25, 2.35, 0, 2.2, 0);
        B(h, 0x6b3f1e, 2.0, 0.2, 1.8, 0, 3.2, 0);
        B(h, 0x6b3f1e, 4.2, 0.25, 0.5, 0, 2.05, 1.7); // ツバ反り
        this.hatH = 1.5;
        break;
      case 'viking':
        B(h, 0x9aa0aa, 2.6, 1.1, 2.4, 0, 1.75, 0);
        B(h, 0x7d838c, 0.35, 1.0, 0.2, 0, 1.0, 1.15);
        [-1, 1].forEach((s) => {
          B(h, 0xf0e6c8, 0.55, 0.9, 0.55, s * 1.5, 2.1, 0);
          B(h, 0xf0e6c8, 0.5, 0.9, 0.5, s * 1.85, 2.9, 0);
          B(h, 0xf0e6c8, 0.4, 0.5, 0.4, s * 1.85, 3.7, 0);
        });
        this.hatH = 2.2;
        break;
      case 'sunhat':
        B(h, 0xe6c37a, 4.3, 0.15, 4.1, 0, 1.95, 0);
        B(h, 0xe6c37a, 2.6, 0.9, 2.5, 0, 2.05, 0);
        B(h, 0xd82e2e, 2.65, 0.25, 2.55, 0, 2.1, 0);
        this.hatH = 1.2;
        break;
      case 'sunhat2':
        B(h, 0x7b2d8b, 4.6, 0.15, 4.2, 0, 1.95, 0);
        B(h, 0x7b2d8b, 2.7, 0.9, 2.6, 0, 2.05, 0);
        B(h, 0xf4d03f, 2.75, 0.2, 2.65, 0, 2.1, 0);
        B(h, 0xff7ab8, 0.6, 0.9, 0.5, 1.2, 2.9, 0.5); // 造花
        this.hatH = 1.9;
        break;
      case 'mask':
        // ルチャドールのマスク: 赤地に金の星型
        this.headMat.color.set(0xd8232f);
        this.skinCol.set(0xd8232f);
        B(h, 0xf4d03f, 1.0, 0.75, 0.07, -0.6, 0.72, 1.06);
        B(h, 0xf4d03f, 1.0, 0.75, 0.07, 0.6, 0.72, 1.06);
        B(h, 0x2456d6, 2.5, 0.5, 2.3, 0, 1.75, 0);
        B(h, 0xf4d03f, 0.5, 1.2, 0.07, 0, 1.0, 1.06);
        B(h, 0xd6976a, 1.5, 0.7, 0.07, 0, 0.1, 1.06);
        this.hatH = 0.5;
        break;
    }
    // 追加パーツ
    const has = (k) => ex.includes(k);
    if (has('headband')) {
      B(h, 0xff2b6a, 2.5, 0.42, 2.3, 0, 1.45, 0, { emissive: 0xff2b6a, ei: 2.2 });
      B(h, 0xffffff, 0.62, 0.42, 0.06, 0, 1.45, 1.17, { emissive: 0xffffff, ei: 1.5 });
      B(h, 0xd81e1e, 0.3, 1.1, 0.1, 0.5, 0.4, -1.15); B(h, 0xd81e1e, 0.3, 1.0, 0.1, -0.4, 0.3, -1.15);
    }
    if (has('bigMustache')) {
      B(h, 0x141010, 1.9, 0.36, 0.3, 0, 0.55, 1.15);
      [-1, 1].forEach((s) => B(h, 0x141010, 0.42, 0.55, 0.28, s * 1.05, 0.5, 1.12));
    }
    if (has('mustache')) B(h, 0x4a2c14, 1.5, 0.3, 0.28, 0, 0.55, 1.15);
    if (has('apron')) {
      B(u, 0x2c4a9a, 2.3, 2.3, 0.1, 0, 0.1, D / 2 + 0.05);
      B(u, 0xf4d03f, 1.0, 0.7, 0.05, 0, 0.9, D / 2 + 0.12);
    }
    if (has('buttons')) [0.5, 1.4].forEach((y) => B(u, 0xd4a017, 0.25, 0.25, 0.08, -0.85, y, D / 2 + 0.02));
    if (has('kimono')) {
      B(this.root, L.shirt, 3.1, 1.9, 2.0, 0, 1.15, 0);
      B(u, L.shirt, W + 0.2, 2.4, D + 0.15, 0, 0, 0);
      B(u, 0xffffff, 0.8, 2.0, 0.08, 0, 0.3, D / 2 + 0.12); // 襟
      [[-0.9, 0.2], [0.7, 1.2], [-0.2, 1.7], [0.9, 0.3], [-1.1, 1.5]].forEach(([x, y]) => B(u, 0xffffff, 0.3, 0.3, 0.06, x, y, D / 2 + 0.1));
    }
    if (has('obi')) {
      B(u, 0xf4d03f, W + 0.35, 0.95, D + 0.4, 0, 0.1, 0);
      B(u, 0xc8102e, 2.0, 1.6, 0.6, 0, 0, -D / 2 - 0.5); // 背中のでかリボン
    }
    if (has('hairSticks')) {
      B(h, 0x2bf0ff, 0.12, 2.2, 0.12, -0.3, 2.3, -0.3, { emissive: 0x2bf0ff, ei: 3 }).rotation.z = 0.5;
      B(h, 0xff2bd6, 0.12, 2.2, 0.12, 0.3, 2.3, -0.3, { emissive: 0xff2bd6, ei: 3 }).rotation.z = -0.5;
    }
    if (has('blush')) [-1, 1].forEach((s) => B(h, 0xff9aa2, 0.42, 0.26, 0.05, s * 0.9, 0.45, 1.11));
    if (has('ninjaMask')) {
      B(h, L.skin, 2.42, 0.62, 0.12, 0, 0.75, 1.03);
      B(h, 0x2bf0ff, 2.5, 0.4, 2.3, 0, 1.55, 0, { emissive: 0x2bf0ff, ei: 2.6 }); // 光るはちまき
      this.eyes.forEach((e) => { e.material = mat(0xff2b3a, { emissive: 0xff2b3a, ei: 3 }); });
    }
    if (has('scarf')) {
      B(u, 0xd81e1e, 2.2, 0.6, 1.7, 0, 1.9, 0);
      B(u, 0xd81e1e, 0.5, 1.6, 0.3, 0.7, 0.5, -D / 2 - 0.3);
    }
    if (has('vest')) { B(u, 0x6b3f1e, W + 0.05, 2.0, D + 0.1, 0, 0.2, 0); B(u, L.shirt, 0.9, 2.0, 0.06, 0, 0.2, D / 2 + 0.1); B(u, 0xd4a017, 0.5, 0.5, 0.1, 0.85, 1.3, D / 2 + 0.12); }
    if (has('belt')) B(u, 0x3a2410, W + 0.1, 0.4, D + 0.1, 0, 0, 0), B(u, 0xf4d03f, 0.7, 0.45, 0.1, 0, -0.03, D / 2 + 0.08);
    if (has('sunglasses')) { [-1, 1].forEach((s) => B(h, 0xff2bd6, 0.95, 0.6, 0.15, s * 0.6, 0.7, 1.12, { emissive: 0xff2bd6, ei: 1.6 })); B(h, 0x2bf0ff, 1.4, 0.14, 0.15, 0, 1.15, 1.12, { emissive: 0x2bf0ff, ei: 2.5 }); }
    if (has('glasses')) { [-1, 1].forEach((s) => { B(h, 0x222222, 1.05, 0.09, 0.12, s * 0.6, 1.4, 1.12); B(h, 0x222222, 1.05, 0.09, 0.12, s * 0.6, 0.68, 1.12); B(h, 0x222222, 0.09, 0.8, 0.12, s * 0.6 - 0.5, 0.63, 1.12); B(h, 0x222222, 0.09, 0.8, 0.12, s * 0.6 + 0.5, 0.63, 1.12); }); B(h, 0x222222, 0.3, 0.09, 0.12, 0, 1.1, 1.12); }
    if (has('aloha')) {
      [[-0.9, 0.3], [0.6, 1.5], [-0.3, 1.1], [0.9, 0.5], [-1.0, 1.8], [0.2, 0.2], [0.1, 1.9]].forEach(([x, y], i) => B(u, i % 2 ? 0xffe14a : 0xff5a8a, 0.4, 0.4, 0.06, x, y, D / 2 + 0.03));
    }
    if (has('suit')) { B(u, L.shirt, W + 0.1, 2.4, D + 0.1, 0, 0, 0); B(u, 0xffffff, 0.9, 2.3, 0.06, 0, 0, D / 2 + 0.1); }
    if (has('tie')) { B(u, 0xc8102e, 0.4, 1.8, 0.08, 0, 0.3, D / 2 + 0.17); B(u, 0xc8102e, 0.55, 0.3, 0.08, 0, 2.0, D / 2 + 0.17); }
    if (has('studs')) [[-1, 2.0], [1, 2.0], [-0.4, 1.6], [0.4, 1.6]].forEach(([x, y]) => B(u, 0x2bf0ff, 0.22, 0.22, 0.14, x, y, D / 2 + 0.05, { emissive: 0x2bf0ff, ei: 3 }));
    if (has('earring')) B(h, 0xffe14a, 0.25, 0.5, 0.25, 1.28, 0.4, 0, { emissive: 0xffe14a, ei: 3 });
    if (has('vikingBeard')) { B(h, 0xe0b84a, 2.4, 1.1, 0.7, 0, -0.9, 0.85); B(h, 0xe0b84a, 0.5, 1.3, 0.5, -0.5, -1.7, 0.95); B(h, 0xe0b84a, 0.5, 1.3, 0.5, 0.5, -1.7, 0.95); B(h, 0xe0b84a, 2.5, 0.5, 0.4, 0, 0.55, 1.1); }
    if (has('fur')) B(u, 0xd9d2c0, W + 0.5, 0.7, D + 0.5, 0, 1.8, 0);
    if (has('skirt')) B(this.root, L.shirt, 3.2, 1.7, 2.1, 0, 1.4, 0);
    if (has('pearls')) for (let i = 0; i < 5; i++) B(u, 0xffffff, 0.3, 0.3, 0.2, -0.9 + i * 0.45, 2.05 - Math.abs(i - 2) * 0.25, D / 2 + 0.08);
    const NC = L.neon ?? 0x2bf0ff;
    if (has('cyberVisor')) {
      B(h, 0x0a0a12, 2.6, 0.75, 0.26, 0, 0.7, 1.06);
      [-1, 1].forEach((s) => B(h, NC, 0.95, 0.3, 0.06, s * 0.62, 0.92, 1.2, { emissive: NC, ei: 3.2 }));
      B(h, NC, 2.6, 0.07, 0.06, 0, 1.46, 1.06, { emissive: NC, ei: 2.5 });
      B(h, NC, 2.52, 0.14, 2.32, 0, 0.98, 0, { emissive: NC, ei: 2.6 }); // 後ろからも見えるネオンの帯
    }
    if (has('neonTrim')) {
      [-1, 1].forEach((s) => B(u, NC, 0.12, 2.2, 0.05, s * 0.95, 0.1, D / 2 + 0.03, { emissive: NC, ei: 2.8 }));
      this.arms.forEach((a) => B(a.pivot, NC, 0.98, 0.14, 0.98, 0, -0.9, 0, { emissive: NC, ei: 2.8 }));
      this.legs.forEach((l) => B(l.hip, NC, 1.08, 0.12, 1.08, 0, -0.6, 0, { emissive: NC, ei: 2.8 }));
    }
    if (has('earpiece')) B(h, NC, 0.3, 0.5, 0.3, 1.3, 0.6, 0.1, { emissive: NC, ei: 3 });
    if (has('badge')) { B(u, 0x2b6ad6, 0.1, 1.6, 0.05, 0.9, 1.9, D / 2 + 0.1); B(u, 0xffffff, 0.7, 0.5, 0.06, 0.9, 1.4, D / 2 + 0.12); }
    if (has('briefcase')) { B(this.root, 0x5a3a22, 1.8, 1.3, 0.6, -2.5, -0.05, 0.4); B(this.root, 0x222222, 0.9, 0.12, 0.15, -2.5, 1.25, 0.4); }
    if (has('robot')) {
      this.eyes.forEach((e) => { e.material = mat(0x2bf0ff, { emissive: 0x2bf0ff, ei: 3 }); });
      this.mouth.material = mat(0x0a1016);
      B(h, 0x8a96a3, 0.16, 0.9, 0.16, 0, 2.2, 0);
      B(h, 0xff2b3a, 0.4, 0.4, 0.4, 0, 3.05, 0, { emissive: 0xff2b3a, ei: 3 });
      [-1, 1].forEach((s) => { B(h, 0x6a7480, 0.4, 0.9, 0.5, s * 1.35, 0.6, 0); B(h, 0xffe14a, 0.14, 0.14, 0.05, s * 1.56, 1.05, 0, { emissive: 0xffe14a, ei: 3 }); });
      B(h, 0x2a2f36, 2.5, 0.2, 2.3, 0, 1.6, 0);
      B(u, 0x1a2028, 1.7, 1.3, 0.08, 0, 0.5, D / 2 + 0.05);
      [[-0.5, 0x2bf0ff], [0, 0xff2bd6], [0.5, 0x7aff4a]].forEach(([x, c]) => B(u, c, 0.3, 0.25, 0.05, x, 1.25, D / 2 + 0.11, { emissive: c, ei: 3 }));
      B(u, 0x2bf0ff, 1.3, 0.1, 0.05, 0, 0.75, D / 2 + 0.11, { emissive: 0x2bf0ff, ei: 2.5 });
      B(u, 0x6a7480, W + 0.15, 0.3, D + 0.15, 0, 2.1, 0);
    }
    if (has('champBelt')) { B(u, 0xf4d03f, W + 0.2, 0.7, D + 0.2, 0, 0, 0); B(u, 0xd81e1e, 1.0, 0.6, 0.1, 0, 0.05, D / 2 + 0.15); }
  }

  // ---------- 操作用API ----------
  teleport(x, y, z) {
    this.root.position.set(x, y, z);
    this._lx = x; this._lz = z; this.speed = 0;
  }
  /** ワールド座標を返す関数へ腕を向ける。tip: 道具の長さぶん手前で止める */
  aimWorld(i, fn, tip = 0) {
    const arm = this.arms[i];
    arm.aim = () => {
      const loc = this.upper.worldToLocal(_a.copy(fn()));
      if (tip) {
        _b.subVectors(loc, arm.pivot.position).normalize();
        loc.addScaledVector(_b, -tip);
      }
      return loc;
    };
  }
  aimLocal(i, v) { this.arms[i].aim = () => v; }
  aimOff(i) { this.arms[i].aim = null; }
  aimAllOff() { this.arms.forEach((a) => (a.aim = null)); }
  hold(i, item, o = {}) {
    const arm = this.arms[i];
    if (arm.held) arm.held.removeFromParent();
    arm.held = item;
    arm.hand.add(item);
    item.position.set(0, o.y ?? -0.1, 0);
    item.rotation.set(0, 0, 0);
    item.userData.upright = o.upright ?? true;
    return item;
  }
  release(i) {
    const arm = this.arms[i];
    const it = arm.held;
    arm.held = null;
    if (it) it.removeFromParent();
    return it;
  }
  setLook(target) {
    if (!target) this.lookFn = null;
    else if (target instanceof Actor) this.lookFn = () => target.head.getWorldPosition(_c).setY(_c.y + 1.2);
    else if (typeof target === 'function') this.lookFn = target;
    else this.lookFn = () => target;
  }
  setFace(kind) { this.face = kind; }
  talk(sec) { this.talkUntil = T.t + sec; }
  chew(sec) { this.chewUntil = T.t + sec; }
  headWorld(v = new V()) {
    this.head.getWorldPosition(v);
    v.y += (2.2 + this.hatH + 0.4) * (this.look.scale ?? 1);
    return v;
  }
  mouthPoint() { return this._mouthLocal ?? (this._mouthLocal = new V(0, 2.4 + 0.45, 1.5)); }

  update(dt) {
    const r = this.root;
    // 速度→歩行アニメ
    if (Number.isNaN(this._lx)) { this._lx = r.position.x; this._lz = r.position.z; }
    const v = Math.hypot(r.position.x - this._lx, r.position.z - this._lz) / Math.max(dt, 1e-4);
    this._lx = r.position.x; this._lz = r.position.z;
    this.speed += (Math.min(v, 12) - this.speed) * (1 - Math.exp(-10 * dt));
    this.walkAmt = clamp(this.speed / 3, 0, 1);
    this.phase += this.speed * dt * 2.2;
    const k8 = 1 - Math.exp(-8 * dt);
    this.sitBlend += ((this.seated ? 1 : 0) - this.sitBlend) * k8;
    const sb = this.sitBlend;

    r.rotation.y += angDiff(r.rotation.y, this.faceAngle) * (1 - Math.exp(-10 * dt));
    r.position.y = this.baseY + 0.1 * sb + Math.abs(Math.sin(this.phase)) * 0.18 * this.walkAmt;

    // 脚
    this.legs.forEach((l, i) => {
      const ph = this.phase + i * Math.PI;
      const hipW = Math.sin(ph) * 0.8 * this.walkAmt;
      const kneeW = Math.max(0, Math.sin(ph + 0.9)) * 0.9 * this.walkAmt;
      l.hip.rotation.x = lerp(hipW, -Math.PI / 2 * 0.97, sb) + Math.sin(T.t * 2 + i * 2 + this.phase) * 0.05 * sb;
      l.knee.rotation.x = lerp(kneeW, Math.PI / 2 * 0.97, sb);
    });

    // 上半身
    this.upper.rotation.x += (this.lean + Math.sin(T.t * 1.7 + this.phase) * 0.012 - this.upper.rotation.x) * k8;
    this.upper.position.y = 2.6 + Math.sin(T.t * 2 + this.phase) * 0.03;

    // 頭
    let yaw = 0, pitch = 0;
    if (this.lookFn) {
      const p = this.upper.worldToLocal(_b.copy(this.lookFn()));
      yaw = clamp(Math.atan2(p.x, p.z), -1.0, 1.0);
      pitch = clamp(Math.atan2(p.y - 3.4, Math.hypot(p.x, p.z)), -0.35, 0.45);
    }
    this.head.rotation.y += (yaw - this.head.rotation.y) * k8;
    this.head.rotation.x += (-pitch - this.head.rotation.x) * k8;
    const talking = T.t < this.talkUntil;
    if (talking) this.head.rotation.x += Math.sin(T.t * 9) * 0.01;

    // 表情
    const f = this.face;
    let eyeY = 1, eyeS = 1, mX = 1, mY = 1;
    if (f === 'happy') { eyeY = 0.25; mX = 1.35; mY = 1.7; }
    else if (f === 'shock') { eyeS = 1.35; mX = 0.7; mY = 3.4; }
    else if (f === 'spicy') { eyeY = 0.2; mX = 1.7; mY = 3.6; }
    if (T.t > this.blinkAt) { if (T.t > this.blinkAt + 0.12) this.blinkAt = T.t + 2.5 + Math.random() * 3.5; else eyeY = Math.min(eyeY, 0.1); }
    if (talking) mY *= 1 + (0.5 + 0.5 * Math.sin(T.t * 24)) * 1.6;
    if (T.t < this.chewUntil) mY *= 1 + Math.abs(Math.sin(T.t * 13)) * 1.4;
    this.eyes.forEach((e) => { e.scale.y += (eyeY * eyeS - e.scale.y) * 0.5; e.scale.x = eyeS; });
    this.mouth.scale.set(mX, mY, 1);
    this.spicy += (this.spicyTarget - this.spicy) * (1 - Math.exp(-3 * dt));
    this.headMat.color.copy(this.skinCol).lerp(_RED, this.spicy);
    if (this.spicy > 0.6 && Math.random() < dt * 6) {
      this.head.getWorldPosition(_c);
      _c.y += 1.2;
      fx.puff(_c.clone().add(new V(0, 0, 0)), 0x7ad0ff, 2, { size: 0.16, speed: 2, up: 1.5, life: 0.7 });
    }

    // 腕
    this.arms.forEach((arm, i) => {
      let stretch = 1;
      if (arm.aim) {
        const p = arm.aim();
        _b.subVectors(p, arm.pivot.position);
        const len = _b.length();
        arm.tq.setFromUnitVectors(DOWN, _b.divideScalar(len || 1));
        stretch = clamp(len / ARM, 0.7, 1.25);
      } else if (this.seated) {
        // 座ってカウンターに手を置く
        _b.set(arm.s * 1.4, 0.95, 2.0).sub(arm.pivot.position);
        _b.y += Math.sin(T.t * 1.3 + i) * 0.03;
        stretch = clamp(_b.length() / ARM, 0.7, 1.4);
        arm.tq.setFromUnitVectors(DOWN, _b.normalize());
      } else {
        const swing = Math.sin(this.phase + (arm.s > 0 ? Math.PI : 0)) * 0.9 * this.walkAmt;
        if (talking && this.gestures) {
          _b.set(arm.s * (0.5 + 0.3 * Math.sin(T.t * 5 + i)), -0.35 + Math.sin(T.t * 7 + i * 2) * 0.45, 0.75 + Math.sin(T.t * 4.3 + i) * 0.3);
        } else {
          _b.set(arm.s * ARM_ANG.rest, -Math.cos(swing), Math.sin(swing));
        }
        arm.tq.setFromUnitVectors(DOWN, _b.normalize());
      }
      arm.pivot.quaternion.slerp(arm.tq, 1 - Math.exp(-14 * dt));
      arm.pivot.scale.y += (stretch - arm.pivot.scale.y) * (1 - Math.exp(-12 * dt));
      arm.hand.scale.y = 1 / arm.pivot.scale.y;
      if (arm.held && arm.held.userData.upright) {
        arm.held.parent.getWorldQuaternion(_q);
        arm.held.quaternion.copy(_q).invert();
        if (arm.held.userData.tilt) {
          _q2.setFromAxisAngle(_a.set(1, 0, 0), arm.held.userData.tilt * 1);
          arm.held.quaternion.multiply(_q2);
        }
      }
    });
  }
}
