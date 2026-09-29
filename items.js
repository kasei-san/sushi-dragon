import { THREE, B } from './util.js';

// 皿は黒漆、寿司ネタは色付きの箱
export const NETA = {
  maguro: { color: 0xd8283a, label: 'マグロ' },
  salmon: { color: 0xff8a5c, label: 'サーモン' },
  tamago: { color: 0xffd23f, label: 'タマゴ' },
  ebi: { color: 0xff9a8b, label: 'エビ' },
  ika: { color: 0xf3f0e0, label: 'イカ' },
  unagi: { color: 0x5a2e16, label: 'ウナギ' },
  avocado: { color: 0x7fb03a, label: 'アボカド' },
  ikura: { color: 0xff6a13, label: 'イクラ' },
};
export const NETA_KEYS = Object.keys(NETA);

export function makePlate() {
  const g = new THREE.Group();
  B(g, 0x1c1c22, 3.6, 0.25, 2.1, 0, 0, 0);
  B(g, 0xb01c2a, 3.25, 0.06, 1.75, 0, 0.25, 0);
  B(g, 0x4c9a3c, 2.9, 0.05, 0.45, 0, 0.31, 0.6); // 謎の葉っぱ
  g.userData.slots = [-1.05, 0, 1.05].map((x) => new THREE.Vector3(x, 0.36, -0.1));
  g.userData.pieces = [];
  return g;
}

export function makePiece(kind) {
  const g = new THREE.Group();
  const n = NETA[kind];
  if (kind === 'ikura') {
    // 軍艦: 海苔の壁+イクラ
    B(g, 0xfaf7ee, 1.0, 0.5, 0.75, 0, 0, 0);
    B(g, 0x14161a, 1.15, 0.6, 0.9, 0, 0.05, 0);
    B(g, n.color, 0.85, 0.3, 0.6, 0, 0.6, 0, { emissive: 0x552000, ei: 0.6 });
  } else {
    B(g, 0xfaf7ee, 1.1, 0.5, 0.75, 0, 0, 0);
    B(g, n.color, 1.28, 0.3, 0.88, 0, 0.5, 0);
    if (kind === 'unagi') B(g, 0x14161a, 0.25, 0.34, 0.92, 0, 0.5, 0); // 海苔帯
    if (kind === 'ebi') B(g, 0xffffff, 0.2, 0.32, 0.9, -0.3, 0.5, 0);
  }
  g.userData.kind = kind;
  return g;
}

export function makeWasabiBlob() {
  const g = new THREE.Group();
  B(g, 0x63c132, 0.8, 0.45, 0.6, 0, 0, 0, { emissive: 0x1a5a10, ei: 0.5 });
  B(g, 0x8be04a, 0.45, 0.3, 0.4, 0.1, 0.4, 0);
  return g;
}

export function makeCup() {
  const g = new THREE.Group();
  B(g, 0xf3efe2, 0.95, 1.05, 0.95, 0, 0, 0);
  B(g, 0x2f7f6e, 0.95, 0.22, 0.95, 0, 0.3, 0); // 謎の青緑帯
  B(g, 0x8fb83c, 0.72, 0.06, 0.72, 0, 1.03, 0);
  g.userData.steam = true;
  return g;
}

export function makeChopsticks() {
  const g = new THREE.Group();
  B(g, 0x9c6a3a, 0.11, 1.6, 0.11, -0.14, 0.3, 0, { anchor: 'top' });
  B(g, 0x9c6a3a, 0.11, 1.6, 0.11, 0.14, 0.3, 0.06, { anchor: 'top' });
  g.userData.tip = 1.35;
  return g;
}

export function makeFork() {
  const g = new THREE.Group();
  B(g, 0xc9ced6, 0.14, 1.5, 0.14, 0, 0.3, 0, { anchor: 'top' });
  [-0.22, 0, 0.22].forEach((x) => B(g, 0xc9ced6, 0.08, 0.5, 0.08, x, -1.15, 0, { anchor: 'top' }));
  B(g, 0xc9ced6, 0.6, 0.1, 0.14, 0, -1.1, 0, { anchor: 'top' });
  g.userData.tip = 1.65;
  return g;
}

export function makeTray(withPot = true) {
  const g = new THREE.Group();
  B(g, 0x7a3b1d, 3.4, 0.15, 2.2, 0, 0, 0);
  B(g, 0xb85c2c, 3.4, 0.3, 0.12, 0, 0.15, 1.04);
  if (withPot) {
    B(g, 0xf3efe2, 1.1, 0.9, 1.1, -0.9, 0.15, 0);
    B(g, 0x2f7f6e, 1.1, 0.2, 1.1, -0.9, 0.4, 0);
    B(g, 0xf3efe2, 0.45, 0.35, 0.3, -0.9, 0.65, 0.7);
    B(g, 0xf3efe2, 0.5, 0.2, 0.5, -0.9, 1.05, 0);
  }
  return g;
}

export function makeKnife() {
  const g = new THREE.Group();
  B(g, 0x6a3f1e, 0.28, 0.28, 1.0, 0, -0.1, -0.4);
  B(g, 0xe8ecf2, 0.08, 0.34, 3.0, 0, -0.13, 0.6);
  return g;
}

export function makeCamera() {
  const g = new THREE.Group();
  B(g, 0x22252b, 1.5, 0.95, 0.6, 0, 0, 0);
  B(g, 0xb9bfc9, 0.6, 0.6, 0.35, 0.1, 0.18, 0.4);
  B(g, 0xffffff, 0.35, 0.22, 0.12, -0.5, 0.95, 0.1, { emissive: 0xffffff });
  return g;
}

export function makeMaki(kind = 'california') {
  const g = new THREE.Group();
  B(g, 0xfaf7ee, 1.0, 0.9, 0.9, 0, 0, 0);
  B(g, kind === 'dragon' ? 0x2c8a3a : 0xff8a5c, 0.6, 0.15, 0.9, 0, 0.9, 0);
  return g;
}
