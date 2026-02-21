import { OrbitControls, Environment } from '@react-three/drei';
import { TileModel } from './TileModel';

const TABLE_SIZE = 6;
const FRAME_THICKNESS = 0.15;
const FRAME_HEIGHT = 0.1;
const FRAME_COLOR = '#3d2b1f';
const TABLE_COLOR = '#1a5c2a';

// 牌サイズ（TileModel基準）
const TILE_W = 0.26;
const TILE_H = 0.35;
const TILE_D = 0.18;
const TILE_SPACING = TILE_W + 0.02;

export const TableScene = () => {
  return (
    <>
      {/* ライティング */}
      <Environment preset="studio" />
      <ambientLight intensity={0.4} />
      <directionalLight position={[2, 8, 4]} intensity={1.0} />
      <directionalLight position={[-3, 5, -2]} intensity={0.4} />

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

      {/* サンプル牌: 手牌風（手前、少し立てる） */}
      {(['1s', '3s', '5s', '7s', '9s'] as const).map((kind, i) => (
        <TileModel
          key={`hand-${i}`}
          kind={kind}
          position={[
            (i - 2) * TILE_SPACING,
            TILE_D / 2,
            2.2,
          ]}
          rotation={[-Math.PI / 2 + 0.3, 0, 0]}
        />
      ))}

      {/* サンプル牌: 河風（卓中央付近、寝かせて配置） */}
      {(['2s', '4s', '6s'] as const).map((kind, i) => (
        <TileModel
          key={`river-${i}`}
          kind={kind}
          position={[
            (i - 1) * TILE_SPACING,
            TILE_D / 2,
            0.6,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      ))}

      {/* サンプル牌: 山札風（裏向き、少しずらして積み重ね） */}
      {[0, 1, 2].map((layer) => (
        <TileModel
          key={`wall-${layer}`}
          kind="hatsu"
          position={[
            -1.5 + layer * 0.02,
            TILE_D / 2 + layer * TILE_D,
            -1.0 + layer * 0.02,
          ]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      ))}

      <OrbitControls makeDefault />
    </>
  );
};
