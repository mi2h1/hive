import { useMemo } from 'react';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { TileModel } from './TileModel';
import type { TileKind, GameState } from '../types/game';

const TABLE_SIZE = 6;
const FRAME_THICKNESS = 0.15;
const FRAME_HEIGHT = 0.1;

// 牌サイズ（TileModel基準）
const TILE_W = 0.26;
const TILE_H = 0.35;
const TILE_D = 0.18;
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
      <directionalLight position={[2, 8, 4]} intensity={0.5} />
      <directionalLight position={[-3, 5, -2]} intensity={0.2} />

      {/* テーブル面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[TABLE_SIZE, TABLE_SIZE]} />
        <meshStandardMaterial map={feltTexture} roughness={0.95} metalness={0} />
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

      {/* 中央情報パネル */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[1.2, 0.04, 1.2]} />
        <meshStandardMaterial color="#111111" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* 中央パネル情報表示 */}
      {gameState && (
        <>
          <Html
            position={[0, 0.06, 0]}
            center
            transform
            rotation={[-Math.PI / 2, 0, 0]}
            scale={0.15}
            style={{ pointerEvents: 'none' }}
          >
            <div style={{
              color: '#e0e0e0',
              fontFamily: 'sans-serif',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                東{gameState.round}局
              </div>
              <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '2px' }}>
                残り {gameState.deck.length} 枚
              </div>
            </div>
          </Html>
          {/* ドラ牌をパネル上に小さく表示 */}
          {gameState.doraTile && (
            <group position={[0, 0.05, 0.25]} scale={[0.6, 0.6, 0.6]}>
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
