// 多角形配置の計算ユーティリティ

export interface Position {
  x: number; // パーセント (0-100)
  y: number; // パーセント (0-100)
}

/**
 * プレイヤー数に応じた多角形頂点の位置を計算
 * @param playerCount プレイヤー数
 * @param radius 中心からの距離（パーセント、デフォルト32）
 * @returns 各プレイヤーの位置（パーセント座標）
 */
export const calculatePolygonPositions = (
  playerCount: number,
  radius: number = 32
): Position[] => {
  // 中心を少し下にずらす（カードの上半分がはみ出ないように）
  const centerY = 52;

  // 2人: 横並び
  if (playerCount === 2) {
    return [
      { x: 30, y: centerY },
      { x: 70, y: centerY },
    ];
  }

  // 3人以上: 正多角形（上から開始、時計回り）
  const startAngle = -Math.PI / 2; // 上から開始
  const angleStep = (2 * Math.PI) / playerCount;

  return Array.from({ length: playerCount }, (_, i) => {
    const angle = startAngle + angleStep * i;
    return {
      x: 50 + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });
};
