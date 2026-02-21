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

// 座標をY軸回りに回転
const rotateY = (x: number, z: number, angle: number): [number, number] => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [x * cos + z * sin, -x * sin + z * cos];
};

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

      {/* 自家の手牌（少し立てる、表向き） */}
      {HAND_TILES.map((kind, i) => {
        const lx = (i - (HAND_TILES.length - 1) / 2) * TILE_SPACING;
        return (
          <TileModel
            key={`self-hand-${i}`}
            kind={kind}
            position={[lx, TILE_D / 2, HAND_Z]}
            rotation={[-Math.PI / 2 + 0.3, 0, 0]}
          />
        );
      })}

      {/* 他家の手牌（伏せて卓に置く、裏向き） */}
      {PLAYERS.filter((p) => p.name !== 'self').map((player) => (
        <group key={player.name}>
          {HAND_TILES.map((_, i) => {
            const lx = (i - (HAND_TILES.length - 1) / 2) * TILE_SPACING;
            const [wx, wz] = rotateY(lx, HAND_Z, player.rotY);
            return (
              <TileModel
                key={`${player.name}-hand-${i}`}
                kind="1s"
                position={[wx, TILE_D / 2, wz]}
                rotation={[Math.PI / 2, player.rotY, 0]}
              />
            );
          })}
        </group>
      ))}

      {/* 4家の河（寝かせて配置、表向き） */}
      {PLAYERS.map((player) => (
        <group key={`${player.name}-river`}>
          {RIVER_TILES.map((kind, i) => {
            const lx = (i - (RIVER_TILES.length - 1) / 2) * TILE_SPACING;
            const [wx, wz] = rotateY(lx, RIVER_Z, player.rotY);
            return (
              <TileModel
                key={`${player.name}-river-${i}`}
                kind={kind}
                position={[wx, TILE_D / 2, wz]}
                rotation={[-Math.PI / 2, player.rotY, 0]}
              />
            );
          })}
        </group>
      ))}

      {/* 山札風（中央付近、裏向き積み重ね） */}
      {[0, 1, 2].map((layer) => (
        <TileModel
          key={`wall-${layer}`}
          kind="hatsu"
          position={[
            -0.3 + layer * 0.02,
            TILE_D / 2 + layer * TILE_D,
            -0.3 + layer * 0.02,
          ]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      ))}

      <OrbitControls makeDefault />
    </>
  );
};
