// ピースの形状タイプ（9種類）
export type PieceType =
  // Level 1
  | 'dot'
  // Level 2
  | 'i2'
  // Level 3
  | 'i3' | 'v3'
  // Level 4
  | 'i4' | 'l4' | 't4' | 's4' | 'o4';

// ピースの定義
export interface PieceDefinition {
  type: PieceType;
  level: number;
  shape: [number, number][]; // 相対座標の配列
  color: string; // Tailwind色クラス
}

// プレイヤーが持つピースのインスタンス
export interface PieceInstance {
  id: string;
  type: PieceType;
  rotation: 0 | 90 | 180 | 270;
}

// パズルカードの定義
export interface PuzzleCard {
  id: string;
  type: 'white' | 'black';
  points: number;
  rewardPieceType: PieceType | null; // 報酬ピースの種類（nullは報酬なし）
  shape: boolean[][]; // 2次元配列でマス目を表現
  width: number;
  height: number;
}

// 配置済みピース
export interface PlacedPiece {
  pieceId: string;
  type: PieceType;
  rotation: 0 | 90 | 180 | 270;
  flipped: boolean;
  position: { x: number; y: number }; // パズル内の配置位置（左上基準）
}

// プレイヤーの作業中パズル
export interface WorkingPuzzle {
  cardId: string;
  placedPieces: PlacedPiece[];
}

// 完成したパズル（配置情報付き）
export interface CompletedPuzzle {
  cardId: string;
  placedPieces: PlacedPiece[];
}

// プレイヤー状態
export interface Player {
  id: string;
  name: string;
  pieces: PieceInstance[]; // 手持ちピース
  workingPuzzles: WorkingPuzzle[]; // 作業中パズル（最大4枚）
  completedPuzzles: CompletedPuzzle[]; // 完成パズル（配置情報付き）
  completedPuzzleIds: string[]; // 完成パズルのID一覧（後方互換用）
  completedWhite: number; // 完成した白カードの枚数
  completedBlack: number; // 完成した黒カードの枚数
  score: number;
  remainingActions: number; // 残りアクション数（通常3）
  usedMasterAction: boolean; // マスターアクション使用済みフラグ
  finishingDone: boolean; // 仕上げフェーズ完了フラグ
  finishingPenalty: number; // 仕上げフェーズでの配置ペナルティ（配置数 × -1）
}

// ゲームフェーズ
export type GamePhase =
  | 'waiting' // ロビーで待機中
  | 'playing' // ゲーム中
  | 'finalRound' // 最終ラウンド
  | 'finishing' // 最後の仕上げ
  | 'ended'; // ゲーム終了

// ゲーム設定
export interface GameSettings {
  scoreVisibility: 'public' | 'hidden'; // 他プレイヤーのスコア表示（public: 常に表示、hidden: 終了時まで非表示）
}

// ゲーム状態
export interface GameState {
  phase: GamePhase;
  players: Player[];
  playerOrder: string[]; // プレイヤーの順番
  currentPlayerIndex: number;
  hostId: string;

  // 場の状態
  whitePuzzleDeck: string[]; // 白パズル山札（IDの配列）
  blackPuzzleDeck: string[]; // 黒パズル山札
  whitePuzzleMarket: string[]; // 場の白パズル（4枚）
  blackPuzzleMarket: string[]; // 場の黒パズル（4枚）

  // ピースストック
  pieceStock: Record<PieceType, number>;

  // ゲーム終了関連
  finalRound: boolean;
  finalRoundTurnNumber: number | null; // 最終ラウンドが開始されたターン番号
  currentTurnNumber: number; // 現在のターン番号（全員が1回ずつ手番を行う単位）

  // 設定
  settings: GameSettings;

  // タイムスタンプ
  createdAt: number;
  updatedAt: number;
}

// アクション種別
export type ActionType =
  | 'takePuzzle' // パズル獲得
  | 'takeLevel1Piece' // レベル1ピース獲得
  | 'upgradePiece' // アップグレード
  | 'masterAction' // マスターアクション
  | 'placePiece' // ピース配置
  | 'endTurn'; // ターン終了
