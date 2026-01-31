// 多角形配置の計算ユーティリティ

export interface Position {
  x: number; // パーセント (0-100)
  y: number; // パーセント (0-100)
}

/**
 * プレイヤー数に応じた多角形頂点の位置を計算
 * @param playerCount プレイヤー数
 * @param radius 中心からの距離（パーセント、デフォルト40）
 * @returns 各プレイヤーの位置（パーセント座標）
 */
export const calculatePolygonPositions = (
  playerCount: number,
  radius: number = 40
): Position[] => {
  // 2人: 横並び
  if (playerCount === 2) {
    return [
      { x: 30, y: 50 },
      { x: 70, y: 50 },
    ];
  }

  // 3人以上: 正多角形（上から開始、時計回り）
  const startAngle = -Math.PI / 2; // 上から開始
  const angleStep = (2 * Math.PI) / playerCount;

  return Array.from({ length: playerCount }, (_, i) => {
    const angle = startAngle + angleStep * i;
    return {
      x: 50 + radius * Math.cos(angle),
      y: 50 + radius * Math.sin(angle),
    };
  });
};
