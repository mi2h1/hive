import { useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { RoundedBox } from '@react-three/drei';
import type { TileKind } from '../types/game';

// 牌のサイズ
const TILE_WIDTH = 0.26;
const TILE_HEIGHT = 0.35;
const TILE_DEPTH = 0.18;
const TILE_RADIUS = 0.015;
const TILE_SMOOTHNESS = 4;

// マテリアルカラー
const IVORY = '#f5f0e8';
const BROWN = '#5c3a1e';

// 牌の表示名
const tileLabel: Record<TileKind, string> = {
  '1s': '一索',
  '2s': '二索',
  '3s': '三索',
  '4s': '四索',
  '5s': '五索',
  '6s': '六索',
  '7s': '七索',
  '8s': '八索',
  '9s': '九索',
  hatsu: '發',
  chun: '中',
};

// Canvas API でプレースホルダーテクスチャを生成
const createTileTexture = (kind: TileKind, isRed: boolean): CanvasTexture => {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // 背景: アイボリー
  ctx.fillStyle = IVORY;
  ctx.fillRect(0, 0, size, size);

  // テキスト色の決定
  if (kind === 'hatsu') {
    ctx.fillStyle = '#228B22';
  } else if (kind === 'chun') {
    ctx.fillStyle = '#cc0000';
  } else if (isRed) {
    ctx.fillStyle = '#cc0000';
  } else {
    ctx.fillStyle = '#1a1a2e';
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (kind === 'hatsu' || kind === 'chun') {
    // 字牌: 大きく1文字
    ctx.font = 'bold 120px serif';
    ctx.fillText(kind === 'hatsu' ? '發' : '中', size / 2, size / 2);
  } else {
    // 索子: 数字 + 「索」
    const num = kind.charAt(0);
    ctx.font = 'bold 100px serif';
    ctx.fillText(num, size / 2, size / 2 - 30);
    ctx.font = 'bold 60px serif';
    ctx.fillText('索', size / 2, size / 2 + 60);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
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
  const faceTexture = useMemo(() => createTileTexture(kind, isRed), [kind, isRed]);

  return (
    <RoundedBox
      args={[TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH]}
      radius={TILE_RADIUS}
      smoothness={TILE_SMOOTHNESS}
      position={position}
      rotation={rotation}
    >
      {/* index 0: +X 側面 */}
      <meshPhysicalMaterial attach="material-0" color={IVORY} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      {/* index 1: -X 側面 */}
      <meshPhysicalMaterial attach="material-1" color={IVORY} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      {/* index 2: +Y 側面（上） */}
      <meshPhysicalMaterial attach="material-2" color={IVORY} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      {/* index 3: -Y 側面（下） */}
      <meshPhysicalMaterial attach="material-3" color={IVORY} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      {/* index 4: +Z 前面（表）テクスチャ付き */}
      <meshPhysicalMaterial attach="material-4" map={faceTexture} clearcoat={0.8} clearcoatRoughness={0.2} roughness={0.3} />
      {/* index 5: -Z 背面（裏）ブラウン */}
      <meshPhysicalMaterial attach="material-5" color={BROWN} clearcoat={0.6} clearcoatRoughness={0.3} roughness={0.4} />
    </RoundedBox>
  );
};
