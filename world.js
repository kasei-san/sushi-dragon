import { THREE, B, N, mat, neonMat, neonMats, pixTexture, textTexture, decal, sign, T, rand } from './util.js';
import { makePiece } from './items.js';

export const SEAT_X = Array.from({ length: 10 }, (_, i) => -20.25 + 4.5 * i);
export const SEAT_Z = 3.9;
export const COUNTER_TOP = 3.5;
export const ROOM = { w: 48, zBack: -9, zFront: 45, h: 24 };

export function buildWorld(scene) {
  const anim = [];
  const W = ROOM.w, HW = W / 2;

  // ---------- ライティング ----------
  scene.add(new THREE.HemisphereLight(0xffe0cc, 0x4a2a44, 1.05));
  const sun = new THREE.DirectionalLight(0xffdcc0, 1.45);
  sun.position.set(-10, 24, 20);
  sun.target.position.set(0, 0, -2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 26, bottom: -18, near: 1, far: 110 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  [[-19, 11, -2], [-9, 11, -2], [9, 11, -2], [19, 11, -2], [-12, 8, 5], [12, 8, 5]].forEach((p, i) => {
    const l = new THREE.PointLight(i % 2 ? 0x2bf0ff : 0xff5a9a, 38, 0, 2);
    l.position.set(...p);
    scene.add(l);
  });

  // ---------- 床・壁・天井 ----------
  const floorTex = pixTexture(60, 108, (g, w, h) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const row = y >> 1, off = (row * 13) % 17;
        const seam = (x + off) % 20 === 0;
        const base = 30 + (row % 3) * 2.5 + Math.random() * 4;
        g.fillStyle = seam ? 'hsl(20,45%,8%)' : y % 2 ? `hsl(18,36%,${base * 0.62}%)` : `hsl(22,38%,${base * 0.72}%)`;
        g.fillRect(x, y, 1, 1);
      }
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, 54), new THREE.MeshLambertMaterial({ map: floorTex }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 18);
  floor.receiveShadow = true;
  scene.add(floor);

  // 客席側の派手な赤絨毯
  const rugTex = pixTexture((W - 6) * 2, 20, (g, w, h) => {
    g.fillStyle = '#7a1420'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff2bd6'; g.fillRect(0, 0, w, 1); g.fillRect(0, h - 1, w, 1); g.fillRect(0, 0, 1, h); g.fillRect(w - 1, 0, 1, h);
    g.fillStyle = '#d9a520'; g.fillRect(1, 1, w - 2, 1); g.fillRect(1, h - 2, w - 2, 1); g.fillRect(1, 1, 1, h - 2); g.fillRect(w - 2, 1, 1, h - 2);
    g.fillStyle = '#2bf0ff'; g.fillRect(3, 3, w - 6, 1); g.fillRect(3, h - 4, w - 6, 1); g.fillRect(3, 3, 1, h - 6); g.fillRect(w - 4, 3, 1, h - 6);
    for (let cx = 6; cx < w - 4; cx += 6)
      for (let cy = 6; cy < h - 4; cy += 6) {
        g.fillStyle = (cx / 6 + cy / 6) % 2 ? '#d9a520' : '#e8d8b0';
        for (let d = -2; d <= 2; d++) { const r = 2 - Math.abs(d); g.fillRect(cx + d, cy - r, 1, r * 2 + 1); }
      }
  });
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(W - 6, 10), new THREE.MeshLambertMaterial({ map: rugTex, emissive: 0xffffff, emissiveMap: rugTex, emissiveIntensity: 0.12 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.03, 7.6);
  rug.receiveShadow = true;
  scene.add(rug);

  const backTex = pixTexture(W * 2, 48, (g, w, h) => {
    g.fillStyle = '#7a1e26'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h - 10; y++)
      for (let x = 0; x < w; x++) {
        if ((x + y) % 8 === 0 || (x - y + 96) % 8 === 0) { g.fillStyle = '#93303a'; g.fillRect(x, y, 1, 1); }
        if ((x + y) % 8 === 0 && (x - y + 96) % 8 === 0) { g.fillStyle = '#d9a520'; g.fillRect(x, y, 1, 1); }
      }
    g.fillStyle = '#1a0a10'; g.fillRect(0, 0, w, 2);
    g.fillStyle = '#d9a520'; g.fillRect(0, h - 10, w, 1);
    g.fillStyle = '#ff2bd6'; g.fillRect(0, h - 9, w, 1);
    for (let y = h - 8; y < h; y++)
      for (let x = 0; x < w; x++) { g.fillStyle = x % 4 === 0 ? '#1d110c' : (x >> 2) % 2 ? '#2b1a12' : '#33201a'; g.fillRect(x, y, 1, 1); }
  });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, ROOM.h), new THREE.MeshLambertMaterial({ map: backTex, emissive: 0xffffff, emissiveMap: backTex, emissiveIntensity: 0.15 }));
  back.position.set(0, ROOM.h / 2, ROOM.zBack);
  back.receiveShadow = true;
  scene.add(back);

  const sideTex = pixTexture(108, 48, (g, w, h) => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let c;
        if (y < 2) c = '#1a0a10';
        else if (y >= h - 8) c = x % 4 === 0 ? '#1d110c' : '#2b1a12';
        else if (x % 12 < 2) c = '#3a2418';
        else c = Math.random() < 0.06 ? '#8a6a58' : '#a58a72';
        g.fillStyle = c; g.fillRect(x, y, 1, 1);
      }
  });
  [[-HW, Math.PI / 2], [HW, -Math.PI / 2]].forEach(([x, ry]) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(54, ROOM.h), new THREE.MeshLambertMaterial({ map: sideTex }));
    wall.rotation.y = ry;
    wall.position.set(x, ROOM.h / 2, 18);
    wall.receiveShadow = true;
    scene.add(wall);
  });

  // 障子の窓(側壁)
  const shojiTex = pixTexture(16, 20, (g, w, h) => {
    g.fillStyle = '#ffe9b8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#5a3a24';
    for (let x = 0; x < w; x += 4) g.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
    g.fillRect(w - 1, 0, 1, h); g.fillRect(0, h - 1, w, 1);
  });
  [[-HW + 0.05, Math.PI / 2], [HW - 0.05, -Math.PI / 2]].forEach(([x, ry]) => {
    decal(scene, shojiTex, 4, 5, x, 8.5, -5, { ry, glow: 1.1 });
  });

  // ネオン(側壁・点滅)
  const neonTex = textTexture(['SUSHI', '寿司!!'], 5, 3, { bg: '#180820', fg: '#ff4fd8', border: '#4fe8ff', weight: 900 });
  const neon = decal(scene, neonTex, 5, 3, -HW + 0.08, 10.2, -3, { ry: Math.PI / 2, glow: 2.6 });
  anim.push((t) => { neon.material.emissiveIntensity = Math.sin(t * 9) > 0.92 || Math.sin(t * 2.1) > 0.97 ? 0.3 : 2.6; });

  // ---------- 厨房側(畳の一段高い床) ----------
  B(scene, 0x5a3a22, W - 1, 0.6, 8, 0, 0, -5);
  const tatamiTex = pixTexture((W - 1) * 2, 16, (g, w, h) => {
    for (let my = 0, r = 0; my < h; my += 6, r++)
      for (let mx = (r % 2) * 6 - 12; mx < w; mx += 12) {
        g.fillStyle = '#5b6630'; g.fillRect(mx, my, 12, 6);
        g.fillStyle = '#8c9a4c'; g.fillRect(mx + 1, my + 1, 10, 4);
        g.fillStyle = '#7e8c40'; for (let k = 0; k < 4; k++) g.fillRect(mx + 1, my + 1 + k, 10, 1 - (k % 2));
        g.fillStyle = '#1e2a1e'; g.fillRect(mx, my, 1, 6);
      }
  });
  const tatami = new THREE.Mesh(new THREE.PlaneGeometry(W - 1, 8), new THREE.MeshLambertMaterial({ map: tatamiTex }));
  tatami.rotation.x = -Math.PI / 2;
  tatami.position.set(0, 0.62, -5);
  tatami.receiveShadow = true;
  scene.add(tatami);

  // 奥の戸棚
  B(scene, 0x4a2c1a, W - 1, 3.2, 1.7, 0, 0.6, -8.15);
  B(scene, 0x7a4a2a, W - 0.8, 0.25, 1.9, 0, 3.8, -8.15);

  // ---------- カウンターと椅子 ----------
  B(scene, 0x5a3520, W - 4, 3.1, 3.1, 0, 0, 0.55);
  B(scene, 0xe3b878, W - 3.2, 0.45, 3.7, 0, 3.05, 0.8);
  B(scene, 0xd4a017, W - 3.2, 0.12, 0.12, 0, 3.4, 2.65);
  const plaques = [['おマミ'], ['スシ ダイスキ'], ['寿 司'], ['ワサビ 爆盛'], ['ゴハン ダケ'], ['ニンジャ OK'], ['ゲイシャ 割引'], ['サムライ 定食'], ['ヤキソバ 寿司'], ['ハラキリ セット']];
  SEAT_X.forEach((x, i) => {
    sign(scene, plaques[i], 3.6, 1.2, x, 1.5, 2.1 + 0.15, { bg: '#0a0614', fg: i % 2 ? '#2bf0ff' : '#ff5fe0', border: i % 2 ? '#2bf0ff' : '#ff2bd6', frame: 0x2a140c, glow: 1.5 });
    // 椅子
    B(scene, 0x2a2a2f, 1.6, 0.2, 1.6, x, 0, SEAT_Z);
    B(scene, 0x9aa0aa, 0.5, 1.8, 0.5, x, 0.2, SEAT_Z);
    B(scene, 0xc0392b, 2.0, 0.7, 2.0, x, 2.0, SEAT_Z);
    B(scene, 0xf4d03f, 2.1, 0.1, 2.1, x, 2.45, SEAT_Z);
    // 醤油皿・箸置き
    B(scene, 0x1a1a1a, 0.7, 0.22, 0.6, x + 0.9, COUNTER_TOP, 2.35);
    B(scene, 0x4a2410, 0.55, 0.02, 0.45, x + 0.9, COUNTER_TOP + 0.22, 2.35);
  });
  // まな板・ネタケース・おひつ(店主の作業場)
  B(scene, 0xe6c48f, 4.4, 0.3, 2.0, 0, COUNTER_TOP, -0.2);
  B(scene, 0xb0794a, 1.9, 1.0, 1.9, 3.7, COUNTER_TOP, -0.2);
  B(scene, 0x8a5a2e, 2.0, 0.15, 2.0, 3.7, COUNTER_TOP + 0.5, -0.2);
  B(scene, 0xfaf7ee, 1.6, 0.2, 1.6, 3.7, COUNTER_TOP + 1.0, -0.2);
  B(scene, 0xc0c8d4, 2.4, 0.3, 1.7, -3.7, COUNTER_TOP, -0.2);
  B(scene, 0xd8283a, 1.5, 0.6, 0.9, -4.0, COUNTER_TOP + 0.3, -0.2);
  B(scene, 0xff8a5c, 1.0, 0.5, 0.8, -3.2, COUNTER_TOP + 0.3, -0.2);

  // ---------- 招き猫(カウンター端・手を振る) ----------
  {
    const g = new THREE.Group();
    g.position.set(-16.6, 4.05, -8.05);
    g.scale.setScalar(1.2);
    scene.add(g);
    B(g, 0xffffff, 1.6, 1.5, 1.2, 0, 0, 0);
    B(g, 0xffffff, 1.9, 1.4, 1.4, 0, 1.5, 0);
    [-1, 1].forEach((s) => {
      B(g, 0xffffff, 0.5, 0.55, 0.4, s * 0.65, 2.9, 0);
      B(g, 0xffb0b8, 0.25, 0.3, 0.1, s * 0.65, 2.95, 0.2);
      B(g, 0x111111, 0.2, 0.28, 0.1, s * 0.45, 2.25, 0.7);
      B(g, 0x111111, 0.55, 0.05, 0.06, s * 0.95, 2.05, 0.7);
      B(g, 0x111111, 0.55, 0.05, 0.06, s * 0.95, 1.85, 0.7);
    });
    B(g, 0xff8a9a, 0.3, 0.2, 0.1, 0, 1.95, 0.72);
    B(g, 0xe89a3c, 0.55, 0.5, 0.1, -0.5, 2.6, 0.7);
    B(g, 0xc8102e, 1.7, 0.3, 1.3, 0, 1.35, 0);
    B(g, 0xf4d03f, 0.4, 0.4, 0.3, 0, 0.95, 0.65);
    B(g, 0xf4d03f, 0.8, 1.0, 0.25, -0.85, 0.3, 0.55);
    const arm = new THREE.Group();
    arm.position.set(0.85, 1.25, 0.3);
    g.add(arm);
    B(arm, 0xffffff, 0.55, 1.5, 0.55, 0, 0, 0);
    B(arm, 0xffb0b8, 0.3, 0.3, 0.1, 0, 1.2, 0.3);
    anim.push((t) => { arm.rotation.z = -0.35 + Math.sin(t * 5) * 0.4; });
  }

  // ---------- 鳥居(店主の背後) ----------
  {
    const red = 0xc01818;
    [-7.2, 7.2].forEach((x) => {
      B(scene, 0x111111, 1.4, 0.6, 1.4, x, 0.6, -6.8);
      B(scene, red, 1.0, 8.4, 1.0, x, 1.2, -6.8);
    });
    B(scene, red, 16.2, 0.55, 0.7, 0, 7.8, -6.8);
    B(scene, red, 18.4, 0.75, 1.3, 0, 9.35, -6.8);
    B(scene, 0x111111, 19.0, 0.28, 1.5, 0, 10.1, -6.8);
    [-1, 1].forEach((s) => B(scene, 0x111111, 0.9, 0.6, 1.5, s * 9.3, 10.2, -6.8));
    sign(scene, ['寿司'], 1.3, 1.8, 0, 8.4, -6.55, { bg: '#0a0614', fg: '#ffe14a', vertical: true, border: '#ffe14a', frame: 0xc01818, glow: 2.4 });
  }

  // ---------- 壁の飾り ----------
  sign(scene, ['スシ ドラゴン', '寿司 バー ・ 本場 ニッポン'], 12.6, 2.6, 0, 12.2, ROOM.zBack + 0.2, {
    bg: '#0a0614', fg: '#ffe14a', border: '#ff2bd6', frame: 0x120a24, glow: 1.8,
  });
  sign(scene, ['本日 ノ おススメ', 'ドラゴン ロール　￥９９９', 'カリフォルニア　￥８８８', 'テンプラ アイス　￥７７７', 'ワサビ ショット　￥６６６', 'おマミ　￥∞'], 5.6, 5.4, 11.4, 9.9, ROOM.zBack + 0.2, {
    bg: '#08141c', fg: '#7afcff', border: '#2bf0ff', frame: 0x2a140c, glow: 1.3,
  });
  // 富士山と五重塔(ドット絵)
  const fujiTex = pixTexture(56, 42, (g, w, h) => {
    for (let y = 0; y < h; y++) { g.fillStyle = `hsl(${205 - y * 0.6},${70 - y}%,${74 + y * 0.5}%)`; g.fillRect(0, y, w, 1); }
    g.fillStyle = '#e02020';
    for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) if (x * x + y * y <= 40) g.fillRect(42 + x, 11 + y, 1, 1);
    g.fillStyle = '#ffffff'; [[4, 6, 10], [30, 4, 12], [18, 12, 8]].forEach(([x, y, l]) => { g.fillRect(x, y, l, 2); g.fillRect(x + 2, y - 1, l - 4, 1); });
    for (let y = 12; y < 34; y++) {
      const half = (y - 12) * 1.15 + 1;
      g.fillStyle = '#3b5b9a'; g.fillRect(Math.round(24 - half), y, Math.round(half * 2), 1);
      if (y < 20) { g.fillStyle = '#ffffff'; const cap = half + (y % 2 ? 0 : 1); g.fillRect(Math.round(24 - cap * 0.9), y, Math.round(cap * 1.8), 1); }
    }
    g.fillStyle = '#3a7a3a'; g.fillRect(0, 34, w, 8);
    g.fillStyle = '#2f6a9a'; g.fillRect(8, 37, 22, 3);
    for (let i = 0; i < 5; i++) {
      const y = 14 + i * 4, wd = 9 - i;
      g.fillStyle = '#c01818'; g.fillRect(44 - (wd >> 1) + 1, y + 1, wd - 2, 3);
      g.fillStyle = '#f2c744'; g.fillRect(44 - (wd >> 1) - 1, y, wd + 2, 1);
    }
    g.fillStyle = '#2a4a2a';
    [5, 12, 50].forEach((x) => { g.fillRect(x, 30, 3, 5); g.fillRect(x - 1, 32, 5, 2); g.fillRect(x + 1, 28, 1, 2); });
  });
  B(scene, 0x7a4a2a, 6.4, 4.9, 0.3, -11.6, 8.5, ROOM.zBack + 0.02);
  decal(scene, fujiTex, 5.6, 4.2, -11.6, 10.95, ROOM.zBack + 0.2, { glow: 1.2 });

  // ---------- 提灯 ----------
  const lanternTxt = [['酒'], ['祭'], ['福'], ['スシ'], ['ニンジャ'], ['寿司'], ['芸者'], ['天ぷら'], ['侍'], ['刺身'], ['忍'], ['ラーメン']];
  const NEON = [0xff2bd6, 0x2bf0ff, 0xffe14a, 0x8a5cff];
  B(scene, 0x1e120c, W - 1, 0.5, 0.5, 0, 15.8, -5.2);
  N(scene, 0x2bf0ff, W - 1, 0.1, 0.06, 0, 15.5, -4.92, 2.6);
  [-22, -19, -16, -13, -10.2, -7.6, 7.6, 10.2, 13, 16, 19, 22].forEach((x, i) => {
    const g = new THREE.Group();
    g.position.set(x, 15.8, -5.2);
    scene.add(g);
    const Lc = 1.4;
    B(g, 0x222222, 0.08, Lc, 0.08, 0, 0, 0, { anchor: 'top' });
    B(g, 0xd4a017, 2.2, 0.25, 2.2, 0, -Lc - 0.25, 0);
    B(g, 0xd8281e, 2.0, 2.4, 2.0, 0, -Lc - 2.65, 0, { emissive: 0xff3a1a, ei: 0.9 });
    B(g, 0xd4a017, 2.2, 0.25, 2.2, 0, -Lc - 2.9, 0);
    N(g, NEON[i % 4], 2.3, 0.08, 2.3, 0, -Lc - 3.0, 0, 2.6);
    B(g, 0xd4a017, 0.2, 0.9, 0.2, 0, -Lc - 2.9, 0, { anchor: 'top' });
    const tex = textTexture(lanternTxt[i], 1.4, 2.0, { bg: '#ffb060', fg: '#1a1010', vertical: true });
    decal(g, tex, 1.4, 2.0, 0, -Lc - 1.45, 1.02, { glow: 0.55 });
    anim.push((t) => { g.rotation.z = Math.sin(t * 0.9 + i) * 0.035; });
  });

  // ---------- 戸棚の上の小物 ----------
  const cy = 3.8 + 0.25, cz = -8.05;
  // 炊飯器
  B(scene, 0xf1f1ee, 2.6, 2.0, 2.4, -5.2, cy, cz);
  B(scene, 0xc8102e, 2.7, 0.4, 2.5, -5.2, cy + 2.0, cz);
  B(scene, 0x111111, 0.5, 0.3, 0.2, -5.2, cy + 1.3, cz + 1.25);
  decal(scene, textTexture('スシ ライス', 2.2, 0.7, { fg: '#c8102e' }), 2.2, 0.7, -5.2, cy + 0.6, cz + 1.22, { glow: 0.2 });
  // 蒸籠
  [0, 0.7, 1.4].forEach((y, i) => B(scene, i % 2 ? 0xc99a5b : 0xd9ab6b, 2.4, 0.7, 2.4, -2.6, cy + y, cz));
  B(scene, 0xb08040, 2.6, 0.3, 2.6, -2.6, cy + 2.1, cz);
  // 急須
  B(scene, 0xf3efe2, 1.9, 1.5, 1.9, 2.6, cy, cz);
  B(scene, 0x2f7f6e, 1.95, 0.3, 1.95, 2.6, cy + 0.5, cz);
  B(scene, 0xf3efe2, 0.9, 0.5, 0.5, 3.75, cy + 0.8, cz);
  B(scene, 0xf3efe2, 0.6, 0.9, 0.3, 1.4, cy + 0.5, cz);
  B(scene, 0xf3efe2, 0.7, 0.3, 0.7, 2.6, cy + 1.5, cz);
  // 樽(サケ ジュース)
  B(scene, 0xc99a5b, 2.6, 2.6, 2.6, 5.8, cy, cz);
  [0.35, 1.9].forEach((y) => B(scene, 0x3a2410, 2.7, 0.22, 2.7, 5.8, cy + y, cz));
  decal(scene, textTexture(['サケ', 'ジュース'], 1.5, 1.6, { bg: '#f5efe0', fg: '#1a1010', vertical: true }), 1.5, 1.6, 5.8, cy + 1.3, cz + 1.32, { glow: 0.2 });
  // 巨大醤油ボトル
  B(scene, 0x2a1a10, 1.6, 2.6, 1.6, 9.6, cy, cz);
  B(scene, 0x2a1a10, 0.8, 0.8, 0.8, 9.6, cy + 2.6, cz);
  B(scene, 0xc8102e, 1.0, 0.4, 1.0, 9.6, cy + 3.4, cz);
  decal(scene, textTexture(['醤油', 'ダイスキ'], 1.2, 1.6, { bg: '#f5efe0', fg: '#c8102e', vertical: true }), 1.2, 1.6, 9.6, cy + 1.3, cz + 0.82, { glow: 0.2 });
  // マグロ(まるごと)
  B(scene, 0xb0794a, 5.0, 0.3, 2.0, 12.4, cy, cz);
  B(scene, 0x3a6ea5, 4.0, 1.4, 1.2, 12.4, cy + 0.3, cz);
  B(scene, 0xdfe6ee, 3.6, 0.5, 1.0, 12.4, cy + 0.3, cz + 0.1);
  B(scene, 0x2a4e85, 0.6, 1.9, 0.3, 10.0, cy + 0.35, cz);
  B(scene, 0x2a4e85, 0.8, 0.8, 0.3, 12.4, cy + 1.6, cz);
  B(scene, 0x111111, 0.25, 0.25, 0.1, 14.0 - 0.3, cy + 1.0, cz + 0.62);


  // 広くなった壁の飾り(左右にも看板と戸棚の小物)
  sign(scene, ['ゲイシャ', 'ハッピー アワー', 'ニンジャ 割引'], 5.4, 4.4, -19.5, 9.9, ROOM.zBack + 0.2, { bg: '#12061c', fg: '#ff8adf', border: '#ff2bd6', frame: 0x120a24, glow: 2.2 });
  sign(scene, ['本日 ノ', 'サムライ セット', '￥９９９ ポッキリ'], 5.4, 4.4, 19.5, 9.9, ROOM.zBack + 0.2, { bg: '#061420', fg: '#9af4ff', border: '#2bf0ff', frame: 0x120a24, glow: 2.2 });
  [[16.5, 0], [-16.5, 1]].forEach(([x, k]) => {
    B(scene, 0xc99a5b, 2.6, 2.6, 2.6, x + 4, cy, cz);
    [0.35, 1.9].forEach((y) => B(scene, 0x3a2410, 2.7, 0.22, 2.7, x + 4, cy + y, cz));
    decal(scene, textTexture(['サケ', 'ジュース'], 1.5, 1.6, { bg: '#f5efe0', fg: '#1a1010', vertical: true }), 1.5, 1.6, x + 4, cy + 1.3, cz + 1.32, { glow: 0.2 });
  });
  [-21, 14.5, 21.5].forEach((x) => {
    B(scene, 0xf1f1ee, 2.6, 2.0, 2.4, x, cy, cz);
    B(scene, 0xc8102e, 2.7, 0.4, 2.5, x, cy + 2.0, cz);
  });
  [[-19, 0], [18, 1]].forEach(([x]) => {
    B(scene, 0xf3efe2, 1.9, 1.5, 1.9, x, cy, cz);
    B(scene, 0x2f7f6e, 1.95, 0.3, 1.95, x, cy + 0.5, cz);
    B(scene, 0xf3efe2, 0.9, 0.5, 0.5, x + 1.15, cy + 0.8, cz);
  });

  // ---------- 水槽 ----------
  {
    const tx = -10.4, ty = 3.8 + 0.25, tz = -8.05;
    B(scene, 0x222222, 5.8, 0.25, 2.5, tx, ty, tz);
    B(scene, 0xe8d8a0, 5.5, 0.4, 2.2, tx, ty + 0.25, tz);
    B(scene, 0x222222, 5.8, 0.25, 2.5, tx, ty + 3.7, tz);
    const water = B(scene, 0x6cc4f0, 5.5, 3.4, 2.2, tx, ty + 0.3, tz, { opacity: 0.32, shadow: false });
    water.renderOrder = 2;
    [-2.2, 2.2].forEach((x) => B(scene, 0x222222, 0.2, 3.6, 2.5, tx + x + Math.sign(x) * 0.5, ty + 0.25, tz));
    [[-1.8, 1.4], [0.9, 2.0], [2.0, 1.0]].forEach(([x, h]) => B(scene, 0x2c8a3a, 0.35, h, 0.25, tx + x, ty + 0.6, tz - 0.4));
    // ロブスター
    B(scene, 0xd8281e, 1.0, 0.45, 0.6, tx + 1.2, ty + 0.65, tz + 0.5);
    B(scene, 0xd8281e, 0.35, 0.3, 0.6, tx + 1.9, ty + 0.65, tz + 0.5);
    B(scene, 0xd8281e, 0.35, 0.5, 0.3, tx + 0.5, ty + 0.65, tz + 0.5);
    const fishes = [0xff8a2a, 0xffd23f, 0xff5a8a, 0x4fe8ff, 0xff8a2a].map((c, i) => {
      const f = new THREE.Group();
      B(f, c, 0.75, 0.48, 0.36, 0, 0, 0, { anchor: 'center' });
      B(f, c, 0.32, 0.55, 0.15, -0.5, 0, 0, { anchor: 'center' });
      B(f, 0x111111, 0.1, 0.1, 0.05, 0.25, 0.08, 0.19, { anchor: 'center' });
      f.position.set(tx, ty + 1.2 + i * 0.5, tz + rand(-0.6, 0.6));
      scene.add(f);
      return { f, ph: rand(0, 6), sp: rand(0.4, 0.9), r: rand(1.4, 2.0), y: ty + 1.2 + i * 0.5, x: tx };
    });
    anim.push((t) => fishes.forEach((o) => {
      const a = t * o.sp + o.ph;
      o.f.position.x = o.x + Math.sin(a) * o.r;
      o.f.position.y = o.y + Math.sin(a * 2.3) * 0.15;
      o.f.rotation.y = Math.cos(a) > 0 ? 0 : Math.PI;
    }));
  }

  // ---------- 鉢植え(桜と竹) ----------
  {
    const px = 22.4, pz = -5.4;
    B(scene, 0x2a5a9a, 2.4, 1.2, 2.4, px, 0.6, pz);
    B(scene, 0x5a3a22, 0.9, 4.8, 0.9, px, 1.8, pz);
    B(scene, 0x5a3a22, 0.6, 0.6, 2.6, px, 5.0, pz).rotation.y = 0.5;
    for (let i = 0; i < 46; i++) {
      const s = rand(0.9, 1.7), a = rand(0, 6.28), r = rand(0, 2.6);
      B(scene, [0xffb7c8, 0xffa0b8, 0xffd0dc, 0xff8fb0][i % 4], s, s * 0.8, s, px + Math.cos(a) * r, 5.8 + rand(-0.2, 2.2), pz + Math.sin(a) * r * 0.8);
    }
    const bx = -22.4;
    B(scene, 0x2a5a9a, 2.2, 1.2, 2.2, bx, 0.6, pz);
    [[-0.5, 9.5], [0.3, 11], [0.6, 8.2]].forEach(([dx, h], k) => {
      B(scene, 0x6fae3c, 0.55, h, 0.55, bx + dx, 1.8, pz + (k - 1) * 0.4);
      for (let y = 2.8; y < h; y += 1.8) B(scene, 0x4a8a28, 0.72, 0.15, 0.72, bx + dx, y, pz + (k - 1) * 0.4);
      B(scene, 0x4c9a3c, 2.2, 0.35, 0.6, bx + dx, h + 0.6, pz + (k - 1) * 0.4);
    });
  }

  // ---------- サイバー・ネオン ----------
  const CY = 0x2bf0ff, MG = 0xff2bd6, YL = 0xffe14a, PU = 0x8a5cff;
  N(scene, CY, W - 3.2, 0.1, 0.06, 0, 3.3, 2.68, 3);            // カウンター天板の前縁
  N(scene, MG, W - 4, 0.14, 0.06, 0, 0.4, 2.13, 3);              // カウンター足元
  N(scene, MG, 18.2, 0.1, 0.06, 0, 9.02, -6.12, 3);              // 鳥居の輪郭
  [-1, 1].forEach((s) => [-0.55, 0.55].forEach((d) => N(scene, CY, 0.1, 8.4, 0.06, s * 7.2 + d, 5.4, -6.28, 3)));
  N(scene, MG, W - 2, 0.16, 0.08, 0, 6.2, -8.9, 2.4);            // 奥の壁を走るライン
  N(scene, CY, W - 2, 0.16, 0.08, 0, 15.0, -8.9, 2.4);
  N(scene, MG, W - 2, 0.16, 0.08, 0, 23.2, -8.9, 2.4);
  [-1, 1].forEach((s) => { N(scene, PU, 0.16, 15, 0.1, s * (HW - 0.3), 7.5, -8.9, 2.6); N(scene, CY, 0.12, 12, 0.1, s * (HW - 0.3), 20, 5, 2.6).rotation.y = 0; });

  // 上段の大ネオン看板
  sign(scene, ['SUSHI DRAGON'], 18, 3.6, 0, 19.8, ROOM.zBack + 0.2, { bg: '#05030d', fg: '#2bf0ff', border: '#ff2bd6', frame: 0x120a24, glow: 2.0, font: '"Arial Black","Helvetica Neue",Impact,sans-serif', weight: 900 });
  sign(scene, ['電脳 寿司 ・ サイバー スシ'], 12, 1.8, 0, 22.3, ROOM.zBack + 0.2, { bg: '#05030d', fg: '#ff5fe0', border: '#ffe14a', frame: 0x120a24, glow: 1.9 });
  sign(scene, ['寿司'], 2.6, 6, -13, 19.5, ROOM.zBack + 0.2, { bg: '#05030d', fg: '#ff5fe0', border: '#ff2bd6', frame: 0x120a24, glow: 2.0, vertical: true });
  sign(scene, ['忍者'], 2.6, 6, 13, 19.5, ROOM.zBack + 0.2, { bg: '#05030d', fg: '#ffe14a', border: '#ffe14a', frame: 0x120a24, glow: 2.0, vertical: true });
  sign(scene, ['ネオ', 'トウキョウ'], 3.6, 5, -19.5, 19.5, ROOM.zBack + 0.2, { bg: '#05030d', fg: '#9af4ff', border: '#2bf0ff', frame: 0x120a24, glow: 1.9, vertical: true });
  sign(scene, ['24ジカン', 'エイギョウ'], 3.6, 5, 19.5, 19.5, ROOM.zBack + 0.2, { bg: '#05030d', fg: '#ff8adf', border: '#ff2bd6', frame: 0x120a24, glow: 1.9, vertical: true });

  // 右の側壁のOPENサイン
  decal(scene, textTexture(['OPEN', '営業中'], 5, 3, { bg: '#05030d', fg: '#ffe14a', border: '#ff2bd6' }), 5, 3, HW - 0.08, 10.2, -3, { ry: -Math.PI / 2, glow: 1.9 });

  // 浮かぶホログラム寿司
  const holo = new THREE.Group();
  holo.position.set(0, 16.6, -3.5);
  holo.scale.setScalar(2.6);
  scene.add(holo);
  const hp = makePiece('maguro');
  hp.traverse((o) => { if (o.isMesh) { o.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2bf0ff).multiplyScalar(2.2), transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }); o.castShadow = false; } });
  hp.position.set(-0.55, -0.4, 0);
  holo.add(hp);
  anim.push((t) => { holo.rotation.y = t * 0.9; holo.position.y = 16.6 + Math.sin(t * 1.6) * 0.3; });

  // ネオンのゆらぎ(呼吸するように明るさを変える)
  anim.push((t) => neonMats.forEach((m) => {
    const u = m.userData;
    m.color.copy(u.base).multiplyScalar(u.k * (1 + 0.12 * Math.sin(t * 2.2 + u.phase)));
  }));

  return { anim };
}
