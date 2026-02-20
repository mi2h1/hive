import { useTexture } from '@react-three/drei';
import type { TileKind } from '../types/game';

// 牌のサイズ
const TILE_WIDTH = 0.26;
const TILE_HEIGHT = 0.35;
const TILE_DEPTH = 0.18;

// マテリアルカラー
const IVORY = '#f5f0e8';
const BROWN = '#5c3a1e';

// テクスチャパスの生成
const getTexturePath = (kind: TileKind, isRed: boolean): string => {
  const base = '/hive/images/soku-jong';
  if (kind === 'hatsu') return `${base}/soku_hatsu.png`;
  if (kind === 'chun') return `${base}/soku_chun.png`;
  const num = kind.charAt(0);
  return isRed ? `${base}/soku_r_s${num}.png` : `${base}/soku_s${num}.png`;
};

interface TileModelProps {
  kind: TileKind;
  isRed?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export const TileModel = ({
  kind,
  isRed = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}: TileModelProps) => {
  const faceTexture = useTexture(getTexturePath(kind, isRed));

  // boxGeometry の material index: 0=+X, 1=-X, 2=+Y, 3=-Y, 4=+Z(表), 5=-Z(裏)
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH]} />
      {/* index 0: +X 側面 */}
      <meshPhysicalMaterial attach="material-0" color={IVORY} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      {/* index 1: -X 側面 */}
      <meshPhysicalMaterial attach="material-1" color={IVORY} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      {/* index 2: +Y 側面（上） */}
      <meshPhysicalMaterial attach="material-2" color={IVORY} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      {/* index 3: -Y 側面（下） */}
      <meshPhysicalMaterial attach="material-3" color={IVORY} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      {/* index 4: +Z 前面（表）テクスチャ */}
      <meshPhysicalMaterial attach="material-4" map={faceTexture} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      {/* index 5: -Z 背面（裏）ブラウン */}
      <meshPhysicalMaterial attach="material-5" color={BROWN} clearcoat={0.6} clearcoatRoughness={0.3} roughness={0.4} />
    </mesh>
  );
};
