import { useMemo } from 'react';
import { OrbitControls, Environment, Text } from '@react-three/drei';
import { CanvasTexture, RepeatWrapping, SRGBColorSpace, Shape, Path, ExtrudeGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { TileModel } from './TileModel';
import type { TileKind, GameState } from '../types/game';

const FONT_YUJI = '/hive/fonts/YujiSyuku-Regular.ttf';

const TABLE_SIZE = 6;
const FRAME_THICKNESS = 0.15;
const FRAME_HEIGHT = 0.1;

// 牌サイズ（TileModel基準）
const TILE_W = 0.24;
const TILE_H = 0.30;
const TILE_D = 0.17;
const TILE_SPACING = TILE_W + 0.02;

// 各家の手牌・河の配置距離
const HAND_Z = 2.3;
const RIVER_Z = 0.9;

// 各家のサンプル牌
const HAND_TILES: TileKind[] = ['1s', '3s', '5s', '7s', '9s'];
const RIVER_TILES: TileKind[] = ['2s', '4s', '6s'];

// 4家の回転(Y軸)：自家=0, 右家=π/2, 対面=π, 左家=-π/2
const PLAYERS = [
  { name: 'self', rotY: 0 },
  { name: 'right', rotY: -Math.PI / 2 },
  { name: 'opposite', rotY: Math.PI },
  { name: 'left', rotY: Math.PI / 2 },
] as const;

// フェルト風テクスチャ生成（放射グラデーション + 微細ノイズ）
const createFeltTexture = (): CanvasTexture => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 放射グラデーション（中央が僅かに明るい）
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.7);
  grad.addColorStop(0, '#1f6b32');
  grad.addColorStop(1, '#1a5c2a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // 微細ノイズでフェルトの繊維感
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 12;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

// 木目テクスチャ生成
const createWoodTexture = (): CanvasTexture => {
  const w = 256;
  const h = 64;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // ベースカラー
  ctx.fillStyle = '#3d2b1f';
  ctx.fillRect(0, 0, w, h);

  // 木目ライン
  for (let y = 0; y < h; y++) {
    const brightness = Math.sin(y * 0.8 + Math.random() * 0.5) * 8
      + Math.sin(y * 2.5) * 4
      + (Math.random() - 0.5) * 6;
    const r = Math.max(0, Math.min(255, 61 + brightness));
    const g = Math.max(0, Math.min(255, 43 + brightness * 0.7));
    const b = Math.max(0, Math.min(255, 31 + brightness * 0.5));
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, y, w, 1);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
};

// 枠のジオメトリ（角丸）
const FRAME_RADIUS = 0.02;
const FRAME_SEGMENTS = 3;
const frameGeomH = new RoundedBoxGeometry(
  TABLE_SIZE + FRAME_THICKNESS * 2, FRAME_HEIGHT, FRAME_THICKNESS,
  FRAME_SEGMENTS, FRAME_RADIUS,
);
const frameGeomV = new RoundedBoxGeometry(
  FRAME_THICKNESS, FRAME_HEIGHT, TABLE_SIZE,
  FRAME_SEGMENTS, FRAME_RADIUS,
);

// 面取り矩形パスを描画（角を斜めカット）
const drawChamferedRect = (target: Shape | Path, w: number, h: number, c: number) => {
  const hw = w / 2, hh = h / 2;
  target.moveTo(-hw + c, -hh);
  target.lineTo(hw - c, -hh);
  target.lineTo(hw, -hh + c);
  target.lineTo(hw, hh - c);
  target.lineTo(hw - c, hh);
  target.lineTo(-hw + c, hh);
  target.lineTo(-hw, hh - c);
  target.lineTo(-hw, -hh + c);
  target.closePath();
};

// 中抜き板（卓サイズ、確認用）
const hollowBoardShape = new Shape();
const _hbs = TABLE_SIZE / 2;
hollowBoardShape.moveTo(-_hbs, -_hbs);
hollowBoardShape.lineTo(_hbs, -_hbs);
hollowBoardShape.lineTo(_hbs, _hbs);
hollowBoardShape.lineTo(-_hbs, _hbs);
hollowBoardShape.closePath();
const hollowBoardHole = new Path();
drawChamferedRect(hollowBoardHole, 3.2, 3.2, 0.11);
hollowBoardShape.holes.push(hollowBoardHole);
const hollowBoardGeom = new ExtrudeGeometry(hollowBoardShape, { depth: 0.02, bevelEnabled: false });
hollowBoardGeom.translate(0, 0, -0.01);

// 中央パネル外枠（中抜きフレーム）
const panelFrameShape = new Shape();
drawChamferedRect(panelFrameShape, 1.2, 1.2, 0.06);
const panelHole = new Path();
drawChamferedRect(panelHole, 0.86, 0.86, 0.06);
panelFrameShape.holes.push(panelHole);
const panelFrameGeom = new ExtrudeGeometry(panelFrameShape, { depth: 0.04, bevelEnabled: false });
panelFrameGeom.translate(0, 0, -0.02);

// 中央パネル溝底（穴の奥に敷く黒い四角）
const panelBaseShape = new Shape();
drawChamferedRect(panelBaseShape, 0.86, 0.86, 0.06);
const panelBaseGeom = new ExtrudeGeometry(panelBaseShape, { depth: 0.02, bevelEnabled: false });
panelBaseGeom.translate(0, 0, -0.01);

// 面取り矩形 + 4辺に台形切り欠きパスを描画
const drawChamferedRectWithNotches = (
  shape: Shape,
  w: number, h: number, c: number,
  notchOuterHalf: number, notchInnerHalf: number, notchDepth: number,
) => {
  const hw = w / 2, hh = h / 2;

  // 底辺 (y=-hh) 左→右
  shape.moveTo(-hw + c, -hh);
  shape.lineTo(-notchOuterHalf, -hh);
  shape.lineTo(-notchInnerHalf, -hh + notchDepth);
  shape.lineTo(notchInnerHalf, -hh + notchDepth);
  shape.lineTo(notchOuterHalf, -hh);
  shape.lineTo(hw - c, -hh);
  // 右下面取り
  shape.lineTo(hw, -hh + c);
  // 右辺 (x=hw) 下→上
  shape.lineTo(hw, -notchOuterHalf);
  shape.lineTo(hw - notchDepth, -notchInnerHalf);
  shape.lineTo(hw - notchDepth, notchInnerHalf);
  shape.lineTo(hw, notchOuterHalf);
  shape.lineTo(hw, hh - c);
  // 右上面取り
  shape.lineTo(hw - c, hh);
  // 上辺 (y=hh) 右→左
  shape.lineTo(notchOuterHalf, hh);
  shape.lineTo(notchInnerHalf, hh - notchDepth);
  shape.lineTo(-notchInnerHalf, hh - notchDepth);
  shape.lineTo(-notchOuterHalf, hh);
  shape.lineTo(-hw + c, hh);
  // 左上面取り
  shape.lineTo(-hw, hh - c);
  // 左辺 (x=-hw) 上→下
  shape.lineTo(-hw, notchOuterHalf);
  shape.lineTo(-hw + notchDepth, notchInnerHalf);
  shape.lineTo(-hw + notchDepth, -notchInnerHalf);
  shape.lineTo(-hw, -notchOuterHalf);
  shape.lineTo(-hw, -hh + c);
  // 左下面取り
  shape.closePath();
};

// 中央パネル内側（台形切り欠き付き）
const panelInnerShape = new Shape();
drawChamferedRectWithNotches(panelInnerShape, 0.85, 0.85, 0.055, 0.18, 0.14, 0.025);
const panelInnerGeom = new ExtrudeGeometry(panelInnerShape, { depth: 0.02, bevelEnabled: false });
panelInnerGeom.translate(0, 0, -0.01);

// 漢数字変換
const KANJI_NUM = ['〇', '一', '二', '三', '四'] as const;
const toKanji = (n: number): string => KANJI_NUM[n] ?? String(n);

// ターン表示ランプ（台形、内パネルのノッチに嵌る）
const LAMP_OUTER = 0.17;
const LAMP_INNER = 0.13;
const LAMP_NOTCH = 0.022;
const PANEL_HH = 0.425; // 0.85 / 2

const lampShape = new Shape();
lampShape.moveTo(-LAMP_OUTER, -PANEL_HH);
lampShape.lineTo(-LAMP_INNER, -PANEL_HH + LAMP_NOTCH);
lampShape.lineTo(LAMP_INNER, -PANEL_HH + LAMP_NOTCH);
lampShape.lineTo(LAMP_OUTER, -PANEL_HH);
lampShape.closePath();
const lampGeom = new ExtrudeGeometry(lampShape, { depth: 0.02, bevelEnabled: false });
lampGeom.translate(0, 0, -0.01);

interface TableSceneProps {
  gameState?: GameState;
  playerId?: string;
}

// 自家を基準にした相対座席順を取得（自家=0, 右=1, 対面=2, 左=3）
const getRelativeSeatOrder = (
  players: GameState['players'],
  myId: string,
): GameState['players'][number][] => {
  const myIndex = players.findIndex((p) => p.id === myId);
  if (myIndex === -1) return players;
  const ordered: GameState['players'][number][] = [];
  for (let i = 0; i < players.length; i++) {
    ordered.push(players[(myIndex + i) % players.length]);
  }
  return ordered;
};

export const TableScene = ({ gameState, playerId }: TableSceneProps = {}) => {
  const feltTexture = useMemo(() => createFeltTexture(), []);
  const woodTexture = useMemo(() => createWoodTexture(), []);

  return (
    <>
      {/* ライティング */}
      <Environment preset="studio" environmentIntensity={0.1} />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[0, 8, 0]}
        intensity={0.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-camera-near={1}
        shadow-camera-far={20}
        shadow-bias={-0.002}
      />
      <directionalLight position={[-3, 5, -2]} intensity={0.2} />

      {/* テーブル面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[TABLE_SIZE, TABLE_SIZE]} />
        <meshStandardMaterial map={feltTexture} roughness={0.95} metalness={0} />
      </mesh>

      {/* 中抜き板（確認用・上空に浮かせ） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 3, 0]} geometry={hollowBoardGeom}>
        <meshStandardMaterial color="#1a5c2a" roughness={0.9} metalness={0} />
      </mesh>

      {/* テーブル枠（4辺・角丸 + 木目） */}
      {/* 手前 (+Z) */}
      <mesh position={[0, FRAME_HEIGHT / 2, TABLE_SIZE / 2 + FRAME_THICKNESS / 2]} geometry={frameGeomH}>
        <meshStandardMaterial map={woodTexture} roughness={0.7} />
      </mesh>
      {/* 奥 (-Z) */}
      <mesh position={[0, FRAME_HEIGHT / 2, -(TABLE_SIZE / 2 + FRAME_THICKNESS / 2)]} geometry={frameGeomH}>
        <meshStandardMaterial map={woodTexture} roughness={0.7} />
      </mesh>
      {/* 左 (-X) */}
      <mesh position={[-(TABLE_SIZE / 2 + FRAME_THICKNESS / 2), FRAME_HEIGHT / 2, 0]} geometry={frameGeomV}>
        <meshStandardMaterial map={woodTexture} roughness={0.7} />
      </mesh>
      {/* 右 (+X) */}
      <mesh position={[TABLE_SIZE / 2 + FRAME_THICKNESS / 2, FRAME_HEIGHT / 2, 0]} geometry={frameGeomV}>
        <meshStandardMaterial map={woodTexture} roughness={0.7} />
      </mesh>

      {/* 4家の牌配置 — groupでY回転し、牌自体はX回転のみ */}
      {gameState && playerId ? (
        // 実データモード
        (() => {
          const seatedPlayers = getRelativeSeatOrder(gameState.players, playerId);
          return seatedPlayers.map((player, seatIdx) => {
            const isSelf = seatIdx === 0;
            const rotY = PLAYERS[seatIdx]?.rotY ?? 0;
            return (
              <group key={player.id} rotation={[0, rotY, 0]}>
                {/* 手牌 */}
                {player.hand.map((tile, i) => {
                  const lx = (i - (player.hand.length - 1) / 2) * TILE_SPACING;
                  return (
                    <TileModel
                      key={`hand-${tile.id}`}
                      kind={isSelf ? tile.kind : '1s'}
                      isRed={isSelf ? tile.isRed : false}
                      position={isSelf
                        ? [lx, TILE_D / 2, HAND_Z]
                        : [lx, TILE_H / 2, HAND_Z]
                      }
                      rotation={isSelf
                        ? [-Math.PI / 2 + 0.3, 0, 0]
                        : [0, 0, 0]
                      }
                    />
                  );
                })}

                {/* 河 */}
                {player.discards.map((tile, i) => {
                  const lx = (i - (player.discards.length - 1) / 2) * TILE_SPACING;
                  return (
                    <TileModel
                      key={`river-${tile.id}`}
                      kind={tile.kind}
                      isRed={tile.isRed}
                      position={[lx, TILE_D / 2, RIVER_Z]}
                      rotation={[-Math.PI / 2, 0, 0]}
                    />
                  );
                })}
              </group>
            );
          });
        })()
      ) : (
        // サンプルモード（テストページ互換）
        PLAYERS.map((player) => {
          const isSelf = player.name === 'self';
          return (
            <group key={player.name} rotation={[0, player.rotY, 0]}>
              {/* 手牌 */}
              {HAND_TILES.map((kind, i) => {
                const lx = (i - (HAND_TILES.length - 1) / 2) * TILE_SPACING;
                return (
                  <TileModel
                    key={`${player.name}-hand-${i}`}
                    kind={isSelf ? kind : '1s'}
                    position={isSelf
                      ? [lx, TILE_D / 2, HAND_Z]
                      : [lx, TILE_H / 2, HAND_Z]
                    }
                    rotation={isSelf
                      ? [-Math.PI / 2 + 0.3, 0, 0]
                      : [0, 0, 0]
                    }
                  />
                );
              })}

              {/* 河 */}
              {RIVER_TILES.map((kind, i) => {
                const lx = (i - (RIVER_TILES.length - 1) / 2) * TILE_SPACING;
                return (
                  <TileModel
                    key={`${player.name}-river-${i}`}
                    kind={kind}
                    position={[lx, TILE_D / 2, RIVER_Z]}
                    rotation={[-Math.PI / 2, 0, 0]}
                  />
                );
              })}
            </group>
          );
        })
      )}

      {/* 中央情報パネル（外枠・中抜きフレーム） */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={panelFrameGeom} castShadow>
        <meshStandardMaterial color="#0a0a0a" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* 中央情報パネル（溝底） */}
      <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={panelBaseGeom}>
        <meshStandardMaterial color="#0a0a0a" roughness={0.9} metalness={0.1} />
      </mesh>
      {/* 中央情報パネル（内枠・角丸・溝表現） */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={panelInnerGeom} castShadow>
        <meshStandardMaterial color="#181818" roughness={0.7} metalness={0.15} />
      </mesh>

      {/* ターン表示ランプ（4辺） */}
      {PLAYERS.map((player, seatIdx) => {
        const isActive = gameState && playerId
          ? getRelativeSeatOrder(gameState.players, playerId)[seatIdx]?.id === gameState.currentTurn
          : false;
        return (
          <group key={`lamp-${seatIdx}`} rotation={[0, player.rotY, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={lampGeom}>
              <meshStandardMaterial
                color={isActive ? '#ff4444' : '#e0e0e0'}
                emissive={isActive ? '#ff0000' : '#000000'}
                emissiveIntensity={isActive ? 0.8 : 0}
                roughness={0.4}
              />
            </mesh>
          </group>
        );
      })}

      {/* 中央パネル情報表示 */}
      {gameState && (
        <>
          {/* 左側: 局数（上）+ 残牌数（下） */}
          <Text
            font={FONT_YUJI}
            position={[-0.15, 0.03, -0.08]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.14}
            color="#e0e0e0"
            anchorX="center"
            anchorY="middle"
          >
            {`東${toKanji(gameState.round)}局`}
          </Text>
          <Text
            font={FONT_YUJI}
            position={[-0.15, 0.03, 0.12]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.1}
            color="#aaaaaa"
            anchorX="center"
            anchorY="middle"
          >
            {`残 ${gameState.deck.length}`}
          </Text>

          {/* 右側: ドラ牌 */}
          {gameState.doraTile && (
            <group position={[0.22, 0.03, 0.02]} scale={[0.55, 0.55, 0.55]}>
              <TileModel
                kind={gameState.doraTile.kind}
                isRed={gameState.doraTile.isRed}
                position={[0, TILE_D / 2, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
              />
            </group>
          )}
        </>
      )}

      <OrbitControls makeDefault target={[0, 0, 0.4]} />
    </>
  );
};
