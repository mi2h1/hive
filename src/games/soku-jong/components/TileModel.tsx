import { useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace, NearestFilter, type Texture } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { useTexture } from '@react-three/drei';
import type { TileKind } from '../types/game';

// 牌のサイズ
const TILE_WIDTH = 0.24;
const TILE_HEIGHT = 0.30;
const TILE_DEPTH = 0.17;
const TILE_RADIUS = 0.02;
const TILE_SEGMENTS = 4;

// マテリアルカラー
const IVORY = '#f5f0e8';
const BROWN = '#cc9900';

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

// テクスチャの透明背景を白背景に合成 + 縮小して中央配置
const getFaceTextureScale = (kind: TileKind): number => {
  if (kind === '1s') return 0.9;
  if (kind === 'chun') return 0.8;
  return 0.9;
};

const flattenAlpha = (texture: Texture, scale: number): void => {
  if (texture.userData._flattened) return;
  texture.userData._flattened = true;
  const img = texture.image as HTMLImageElement;
  if (!img) return;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const aspect = TILE_WIDTH / TILE_HEIGHT;
  const sw = w * scale;
  const sh = h * scale * aspect;
  ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);
  texture.image = canvas;
  texture.needsUpdate = true;
};

// テクスチャパスの生成
const getTexturePath = (kind: TileKind, isRed: boolean): string => {
  const base = '/hive/images/soku-jong';
  if (kind === 'hatsu') return `${base}/soku_hatsu.png`;
  if (kind === 'chun') return `${base}/soku_chun.png`;
  const num = kind.charAt(0);
  return isRed ? `${base}/soku_r_s${num}.png` : `${base}/soku_s${num}.png`;
};

// 側面テクスチャ生成（アイボリー + ブラウン）
const createSideTexture = (brownEdge: 'left' | 'right' | 'top' | 'bottom'): CanvasTexture => {
  const size = 9;
  const brown = 3;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = IVORY;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = BROWN;
  if (brownEdge === 'right') ctx.fillRect(size - brown, 0, brown, size);
  if (brownEdge === 'left') ctx.fillRect(0, 0, brown, size);
  if (brownEdge === 'bottom') ctx.fillRect(0, size - brown, size, brown);
  if (brownEdge === 'top') ctx.fillRect(0, 0, size, brown);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = NearestFilter;
  return texture;
};

// 側面テクスチャをモジュールレベルで4個だけ生成（全牌で共有）
const sharedSidePX = createSideTexture('right');
const sharedSideNX = createSideTexture('left');
const sharedSidePY = createSideTexture('top');
const sharedSideNY = createSideTexture('bottom');

// バンプテクスチャをモジュールレベルでキャッシュ（kind+isRed → CanvasTexture）
const bumpCache = new Map<string, CanvasTexture>();

// ジオメトリをモジュールレベルで1つだけ生成（全牌で共有）
const sharedGeometry = new RoundedBoxGeometry(
  TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH, TILE_SEGMENTS, TILE_RADIUS,
);
fixUVs(sharedGeometry, TILE_WIDTH, TILE_HEIGHT, TILE_DEPTH);

interface TileModelProps {
  kind: TileKind;
  isRed?: boolean;
  highQuality?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
}

// 全テクスチャをプリロード（ゲーム中のSuspense再発動 → 画面消失を防止）
const ALL_KINDS: TileKind[] = ['1s','2s','3s','4s','5s','6s','7s','8s','9s','hatsu','chun'];
for (const kind of ALL_KINDS) {
  useTexture.preload(getTexturePath(kind, false));
}
for (let n = 1; n <= 9; n++) {
  useTexture.preload(getTexturePath(`${n}s` as TileKind, true));
}

export const TileModel = ({
  kind,
  isRed = false,
  highQuality = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  onClick,
  onPointerOver,
  onPointerOut,
}: TileModelProps) => {
  const faceTexture = useTexture(getTexturePath(kind, isRed));
  faceTexture.anisotropy = 16;
  const scale = getFaceTextureScale(kind);
  useMemo(() => flattenAlpha(faceTexture, scale), [faceTexture, scale]);

  // bumpMap: キャッシュから取得、なければ生成してキャッシュ
  const bumpTexture = useMemo(() => {
    const cacheKey = `${kind}_${isRed}`;
    const cached = bumpCache.get(cacheKey);
    if (cached) return cached;

    const src = faceTexture.image as HTMLCanvasElement | HTMLImageElement;
    if (!src) return null;
    const w = ('naturalWidth' in src ? src.naturalWidth : src.width) || src.width;
    const h = ('naturalHeight' in src ? src.naturalHeight : src.height) || src.height;
    if (!w || !h) return null;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(src, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11);
      data[i] = data[i + 1] = data[i + 2] = gray;
      data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    const tex = new CanvasTexture(canvas);
    tex.anisotropy = 16;
    bumpCache.set(cacheKey, tex);
    return tex;
  }, [faceTexture, kind, isRed]);

  // material index: 0=+X, 1=-X, 2=+Y, 3=-Y, 4=+Z(表), 5=-Z(裏)
  return (
    <mesh
      position={position}
      rotation={rotation}
      geometry={sharedGeometry}
      castShadow
      onClick={onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      onPointerOver={onPointerOver ? (e) => { e.stopPropagation(); onPointerOver(); } : undefined}
      onPointerOut={onPointerOut ? (e) => { e.stopPropagation(); onPointerOut(); } : undefined}
    >
      {highQuality ? (
        <>
          <meshPhysicalMaterial attach="material-0" map={sharedSidePX} roughness={0.15} metalness={0.05} clearcoat={0.6} clearcoatRoughness={0.2} ior={1.5} reflectivity={0.5} />
          <meshPhysicalMaterial attach="material-1" map={sharedSideNX} roughness={0.15} metalness={0.05} clearcoat={0.6} clearcoatRoughness={0.2} ior={1.5} reflectivity={0.5} />
          <meshPhysicalMaterial attach="material-2" map={sharedSidePY} roughness={0.15} metalness={0.05} clearcoat={0.6} clearcoatRoughness={0.2} ior={1.5} reflectivity={0.5} />
          <meshPhysicalMaterial attach="material-3" map={sharedSideNY} roughness={0.15} metalness={0.05} clearcoat={0.6} clearcoatRoughness={0.2} ior={1.5} reflectivity={0.5} />
          <meshPhysicalMaterial attach="material-4" map={faceTexture} bumpMap={bumpTexture} bumpScale={-0.025} roughness={0.8} clearcoat={0.3} clearcoatRoughness={0.4} />
          <meshPhysicalMaterial attach="material-5" color={BROWN} roughness={0.25} metalness={0.05} clearcoat={0.6} clearcoatRoughness={0.2} ior={1.5} reflectivity={0.5} />
        </>
      ) : (
        <>
          <meshStandardMaterial attach="material-0" map={sharedSidePX} roughness={0.15} metalness={0.05} />
          <meshStandardMaterial attach="material-1" map={sharedSideNX} roughness={0.15} metalness={0.05} />
          <meshStandardMaterial attach="material-2" map={sharedSidePY} roughness={0.15} metalness={0.05} />
          <meshStandardMaterial attach="material-3" map={sharedSideNY} roughness={0.15} metalness={0.05} />
          <meshStandardMaterial attach="material-4" map={faceTexture} bumpMap={bumpTexture} bumpScale={-0.025} roughness={0.8} />
          <meshStandardMaterial attach="material-5" color={BROWN} roughness={0.25} metalness={0.05} />
        </>
      )}
    </mesh>
  );
};
