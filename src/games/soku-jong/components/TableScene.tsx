import { OrbitControls, Environment } from '@react-three/drei';
import { TileModel } from './TileModel';
import type { TileKind } from '../types/game';

const TABLE_SIZE = 6;
const FRAME_THICKNESS = 0.15;
const FRAME_HEIGHT = 0.1;
const FRAME_COLOR = '#3d2b1f';
const TABLE_COLOR = '#1a5c2a';

// 牌サイズ（TileModel基準）
const TILE_W = 0.26;
const TILE_D = 0.18;
const TILE_SPACING = TILE_W + 0.02;

// 各家の手牌・河の配置距離
const HAND_Z = 2.3;
const RIVER_Z = 0.6;

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

export const TableScene = () => {
  return (
    <>
      {/* ライティング */}
      <Environment preset="studio" environmentIntensity={0.3} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 8, 4]} intensity={0.8} />
      <directionalLight position={[-3, 5, -2]} intensity={0.3} />

      {/* テーブル面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[TABLE_SIZE, TABLE_SIZE]} />
        <meshStandardMaterial color={TABLE_COLOR} roughness={0.9} metalness={0} />
      </mesh>

      {/* テーブル枠（4辺） */}
      {/* 手前 (+Z) */}
      <mesh position={[0, FRAME_HEIGHT / 2, TABLE_SIZE / 2 + FRAME_THICKNESS / 2]}>
        <boxGeometry args={[TABLE_SIZE + FRAME_THICKNESS * 2, FRAME_HEIGHT, FRAME_THICKNESS]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.7} />
      </mesh>
      {/* 奥 (-Z) */}
      <mesh position={[0, FRAME_HEIGHT / 2, -(TABLE_SIZE / 2 + FRAME_THICKNESS / 2)]}>
        <boxGeometry args={[TABLE_SIZE + FRAME_THICKNESS * 2, FRAME_HEIGHT, FRAME_THICKNESS]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.7} />
      </mesh>
      {/* 左 (-X) */}
      <mesh position={[-(TABLE_SIZE / 2 + FRAME_THICKNESS / 2), FRAME_HEIGHT / 2, 0]}>
        <boxGeometry args={[FRAME_THICKNESS, FRAME_HEIGHT, TABLE_SIZE]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.7} />
      </mesh>
      {/* 右 (+X) */}
      <mesh position={[TABLE_SIZE / 2 + FRAME_THICKNESS / 2, FRAME_HEIGHT / 2, 0]}>
        <boxGeometry args={[FRAME_THICKNESS, FRAME_HEIGHT, TABLE_SIZE]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.7} />
      </mesh>

      {/* 4家の牌配置 — groupでY回転し、牌自体はX回転のみ */}
      {PLAYERS.map((player) => {
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
                  position={[lx, TILE_D / 2, HAND_Z]}
                  rotation={isSelf
                    ? [-Math.PI / 2 + 0.3, 0, 0]
                    : [Math.PI / 2, 0, 0]
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
      })}

      <OrbitControls makeDefault />
    </>
  );
};
