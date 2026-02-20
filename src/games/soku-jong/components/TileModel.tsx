import { useMemo } from 'react';
import { BoxGeometry, CanvasTexture, SRGBColorSpace, NearestFilter, Vector3 } from 'three';
import { useTexture } from '@react-three/drei';
import type { TileKind } from '../types/game';

// 牌のサイズ
const TILE_WIDTH = 0.26;
const TILE_HEIGHT = 0.35;
const TILE_DEPTH = 0.18;
const TILE_RADIUS = 0.015;
const TILE_SEGMENTS = 4;

// マテリアルカラー
const IVORY = '#f5f0e8';
const BROWN = '#5c3a1e';

// 角丸BoxGeometry生成（6マテリアルグループ維持）
const createRoundedBoxGeometry = (
  width: number, height: number, depth: number,
  radius: number, segments: number,
): BoxGeometry => {
  const geometry = new BoxGeometry(width, height, depth, segments, segments, segments);
  const pos = geometry.attributes.position;
  const innerW = width / 2 - radius;
  const innerH = height / 2 - radius;
  const innerD = depth / 2 - radius;
  const v = new Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i));

    // 内側ボックスからのはみ出し量を計算
    const dx = Math.max(0, Math.abs(v.x) - innerW);
    const dy = Math.max(0, Math.abs(v.y) - innerH);
    const dz = Math.max(0, Math.abs(v.z) - innerD);
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist > 0) {
      const cx = Math.sign(v.x) * Math.min(Math.abs(v.x), innerW);
      const cy = Math.sign(v.y) * Math.min(Math.abs(v.y), innerH);
      const cz = Math.sign(v.z) * Math.min(Math.abs(v.z), innerD);
      const scale = radius / dist;
      pos.setXYZ(i, cx + (v.x - cx) * scale, cy + (v.y - cy) * scale, cz + (v.z - cz) * scale);
    }
  }

  geometry.computeVertexNormals();
  return geometry;
};

// テクスチャパスの生成
const getTexturePath = (kind: TileKind, isRed: boolean): string => {
  const base = '/hive/images/soku-jong';
  if (kind === 'hatsu') return `${base}/soku_hatsu.png`;
  if (kind === 'chun') return `${base}/soku_chun.png`;
  const num = kind.charAt(0);
  return isRed ? `${base}/soku_r_s${num}.png` : `${base}/soku_s${num}.png`;
};

// 側面テクスチャ生成（5/6アイボリー + 1/6ブラウン）
const createSideTexture = (brownEdge: 'left' | 'right' | 'top' | 'bottom'): CanvasTexture => {
  const size = 6;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = IVORY;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = BROWN;
  if (brownEdge === 'right') ctx.fillRect(size - 1, 0, 1, size);
  if (brownEdge === 'left') ctx.fillRect(0, 0, 1, size);
  // Canvas Y軸はUV V軸と反転（flipY=true）
  if (brownEdge === 'bottom') ctx.fillRect(0, size - 1, size, 1);
  if (brownEdge === 'top') ctx.fillRect(0, 0, size, 1);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = NearestFilter;
  return texture;
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
  const geometry = useMemo(
    () => createRoundedBoxGeometry(TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH, TILE_RADIUS, TILE_SEGMENTS),
    [],
  );

  // 側面テクスチャ（UV方向に合わせてブラウン帯の位置を指定）
  const sidePX = useMemo(() => createSideTexture('right'), []);
  const sideNX = useMemo(() => createSideTexture('left'), []);
  const sidePY = useMemo(() => createSideTexture('bottom'), []);
  const sideNY = useMemo(() => createSideTexture('top'), []);

  // material index: 0=+X, 1=-X, 2=+Y, 3=-Y, 4=+Z(表), 5=-Z(裏)
  return (
    <mesh position={position} rotation={rotation} geometry={geometry}>
      <meshPhysicalMaterial attach="material-0" map={sidePX} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      <meshPhysicalMaterial attach="material-1" map={sideNX} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      <meshPhysicalMaterial attach="material-2" map={sidePY} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      <meshPhysicalMaterial attach="material-3" map={sideNY} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      <meshPhysicalMaterial attach="material-4" map={faceTexture} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      <meshPhysicalMaterial attach="material-5" color={BROWN} clearcoat={0.6} clearcoatRoughness={0.3} roughness={0.4} />
    </mesh>
  );
};
