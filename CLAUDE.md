# CLAUDE.md — 寿司ドラゴン（Three.js ボクセル寿司屋）

外国人が勘違いした日本の寿司屋を、Three.js のボクセルアートで作るプロジェクト。ビルドなしの静的サイト（ES Modules）。詳細な機能・操作は `README.md` を参照。

## 実行・確認

```bash
python3 -m http.server 8765      # → http://localhost:8765/  （file:// では動かない）
tools/shot.sh <warp秒> <出力.png> [幅] [高さ]   # ヘッドレスChromeで静止画
```

- コードを変えたら **必ず `tools/shot.sh` で実際に描画して目視確認**する（型検査やテストは無い）。JS の構文チェックは `node --check <file>`。
- 時間が経った状態を見るには `?warp=45`、客の種類を固定するには `?first=cyber,robot`（`README.md` のパラメータ表を参照）。
- 実行時エラーは画面下部の赤い帯（`#err`）に出る。
- 動画は `?record=1` ＋ `tools/record.mjs`（`puppeteer-core` を別途 `npm i`）＋ ffmpeg。手順は README。

## 構成と役割

- `main.js`: カメラ・ブルーム、吹き出し、ライブログ、シナリオ（店主・店員・忍者・客）。
- `world.js`: 店内の建物・小物・ネオン・ライティング。`SEAT_X`（10席）、`COUNTER_TOP`、`ROOM` を export。
- `actors.js`: `Actor` クラスと `LOOKS`（見た目定義）。新しい客は `LOOKS` に追加 → `main.js` の `LOOK_KEYS` / `TRAITS` / `LINES` に追加。
- `items.js`: 皿・寿司・湯呑み・道具。`util.js`: `B()`、看板テクスチャ、`neonMat`/`N()`、ジェネレータ用ユーティリティ、`fx`（パーティクル）。
- `vendor/` は取得済みの外部ライブラリ（three.js r160、postprocessing）。編集しない。

## 規約・作法

- 形状はすべて直方体。`B(parent, color, w, h, d, x, y, z, opts)` を使う。`anchor` は `'bottom'`（既定）/ `'top'` / `'center'`。色マテリアルはキャッシュ共有される。**色を後から変える必要があるメッシュには `unique: true` を付ける**（例: 顔が赤くなる頭）。
- 動きの台本はジェネレータ（`function*`）。待ちは `yield* wait(秒)` / `yield* until(() => 条件)` / `yield* tween(...)`。`spawn(gen)` で登録する。
- 腕は `aimWorld(i, fn, tip)`（ワールド座標を返す関数へ向ける）/ `aimLocal(i, vec)` / `aimOff(i)` / `aimAllOff()`。持ち物は `hold(i, item)` / `release(i)`。
- 発言は `say(actor, text, opts)`（吹き出しとログの両方に出る）。ログだけなら `log(kind, tag, text, who, role)`。
- 文言は **カタカナ混じりの変な日本語**（「オマカセ アレ！」「ワサビ ハ ニンジャ ノ チカラ」など）がこのプロジェクトの持ち味。看板は明朝体（`MINCHO`）、吹き出し・ログは DotGothic16。
- サイバー度は `util.js` の `NEON_GAIN` とブルーム（`main.js` の `UnrealBloomPass` 引数）で調整する。ネオンを増やすときは `N()` / `neonMat()` を使う。
- 座標系: 店主は +z を向き、客は -z を向いて座る。カウンター天板は y=3.5、席は z=3.9、店主の作業位置は z=-2。カメラは客席側の高所から見下ろす固定位置（`CAM_TARGET` / `CAM_DIR`。画面幅に応じて距離が自動調整される）。

## 落とし穴（実際に踏んだもの）

- **dt が負になると腕の補間が発散し、手に持つ箸・フォークが巨大化する**。rAF の時刻は `performance.now()` より古いことがあるため、`frame()` では `clamp(dt, 0, 0.05)` にしている。時間を扱うコードを触るときは負値・0 を想定する。
- カメラが壁の高さ（`ROOM.h`）を超えると、壁の外側の暗い余白が映る。天井は無い（見下ろし視点のため撤去済み）。
- 席数や部屋幅（`ROOM.w`）を変えるときは、次も一緒に直す: カウンター・床・絨毯・奥の壁テクスチャの幅、`CUP_SIDE`（お茶を置く側）、`chefSeat()`（店主がお茶を出す席）、客の出入口の x（画面外にすること）、影カメラの範囲。
- 客席側から見るため、**客の顔は基本的に見えない**。顔の演出（サイバーの目など）は、後ろ・横から見えるもの（ネオンの帯など）も併用する。
- ヘッドレス Chrome の描画は SwiftShader（ソフトウェア描画）。確認用としては十分だが、実機の GPU より遅い。
- 新しい `PointLight` を増減するとシェーダが再コンパイルされる。動的に増減しない。

## 応答スタイル

- この作業ディレクトリの README / コード内コメント / 成果物は、通常の丁寧な日本語で書く（口調の演出は入れない）。
