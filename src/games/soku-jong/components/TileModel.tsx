import { useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace, NearestFilter } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
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

// RoundedBoxGeometry のUVを標準BoxGeometry互換のリニアマッピングに上書き
const fixUVs = (geom: RoundedBoxGeometry, w: number, h: number, d: number) => {
  const pos = geom.attributes.position.array as Float32Array;
  const uvs = geom.attributes.uv.array as Float32Array;

  for (const group of geom.groups) {
    const start = group.start!;
    const count = group.count!;
    const face = group.materialIndex!;

    for (let i = 0; i < count; i++) {
      const vi = start + i;
      const px = pos[vi * 3];
      const py = pos[vi * 3 + 1];
      const pz = pos[vi * 3 + 2];

      let u: number, v: number;
      switch (face) {
        case 0: // +X: u=front→back along -Z, v=bottom→top along +Y
          u = (d / 2 - pz) / d;
          v = (py + h / 2) / h;
          break;
        case 1: // -X: u=back→front along +Z, v=bottom→top along +Y
          u = (pz + d / 2) / d;
          v = (py + h / 2) / h;
          break;
        case 2: // +Y: u=left→right along +X, v=front→back along -Z
          u = (px + w / 2) / w;
          v = (d / 2 - pz) / d;
          break;
        case 3: // -Y: u=left→right along +X, v=back→front along +Z
          u = (px + w / 2) / w;
          v = (pz + d / 2) / d;
          break;
        case 4: // +Z (front): u=left→right along +X, v=bottom→top along +Y
          u = (px + w / 2) / w;
          v = (py + h / 2) / h;
          break;
        case 5: // -Z (back): u=right→left along -X, v=bottom→top along +Y
          u = (w / 2 - px) / w;
          v = (py + h / 2) / h;
          break;
        default:
          u = 0; v = 0;
      }

      uvs[vi * 2] = u;
      uvs[vi * 2 + 1] = v;
    }
  }
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
  if (brownEdge === 'bottom') ctx.fillRect(0, size - 1, size, 1);
  if (brownEdge === 'top') ctx.fillRect(0, 0, size, 1);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = NearestFilter;
  return texture;
};

// ジオメトリをモジュールレベルで1つだけ生成（全牌で共有）
const sharedGeometry = new RoundedBoxGeometry(
  TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH, TILE_SEGMENTS, TILE_RADIUS,
);
fixUVs(sharedGeometry, TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH);

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

  // 側面テクスチャ
  const sidePX = useMemo(() => createSideTexture('right'), []);
  const sideNX = useMemo(() => createSideTexture('left'), []);
  const sidePY = useMemo(() => createSideTexture('top'), []);
  const sideNY = useMemo(() => createSideTexture('bottom'), []);

  // material index: 0=+X, 1=-X, 2=+Y, 3=-Y, 4=+Z(表), 5=-Z(裏)
  return (
    <mesh position={position} rotation={rotation} geometry={sharedGeometry}>
      <meshPhysicalMaterial attach="material-0" map={sidePX} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      <meshPhysicalMaterial attach="material-1" map={sideNX} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      <meshPhysicalMaterial attach="material-2" map={sidePY} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      <meshPhysicalMaterial attach="material-3" map={sideNY} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      <meshPhysicalMaterial attach="material-4" map={faceTexture} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      <meshPhysicalMaterial attach="material-5" color={BROWN} clearcoat={0.6} clearcoatRoughness={0.3} roughness={0.4} />
    </mesh>
  );
};
