// ゲームフェーズ
export type GamePhase = 'waiting' | 'rolling' | 'result' | 'game_end';

// ダイスの出目
export interface DiceResult {
  die1: number; // 1-6
  die2: number; // 1-6
}

// ダイスの位置・回転（キーフレーム用）
export interface DiceTransform {
  p: [number, number, number]; // position
  r: [number, number, number, number]; // rotation (quaternion)
}

// キーフレーム（1フレーム分）
export interface DiceKeyframe {
  t: number; // time (ms)
  d1: DiceTransform; // dice1
  d2: DiceTransform; // dice2
}

// ダイスアニメーションデータ
export interface DiceAnimation {
  frames: DiceKeyframe[];
  result: DiceResult;
}

// 出目の種類
export type RollType = 'desperado' | 'doubles' | 'normal';

// 出目のランク（比較用）
export interface RollRank {
  type: RollType;
  value: number; // メキシコ=100, ゾロ目=96-91（6-6→1-1）, バラ=合計値(12-4)
}

// プレイヤー
export interface Player {
  id: string;
  name: string;
  lives: number;
  currentRoll: DiceResult | null;
  hasRolled: boolean;
  isEliminated: boolean;
  rerollsRemaining: number; // 残り振り直し回数（初期値2）
}

// ゲーム状態（Firebase同期）
export interface GameState {
  phase: GamePhase;
  players: Player[];
  currentRound: number;
  desperadoRolledThisRound: boolean;
  turnOrder: string[];
  currentTurnPlayerId: string | null;
  lastLoser: string | null;
  winnerId: string | null;
  // ダイスアニメーション同期用
  rollingPlayerId: string | null; // 現在ダイスを振っているプレイヤーID
  dddiceRoomSlug: string | null; // dddice のルームスラッグ
  dddiceReady?: Record<string, boolean>; // プレイヤーIDごとのdddice接続状態
}

// 部屋データ
export interface RoomData {
  hostId: string;
  gameState: GameState;
  createdAt: number;
}

// ラウンド結果
export interface RoundResult {
  loserId: string;
  loserName: string;
  livesLost: number;
  mexicoBonus: boolean;
  rankings: {
    playerId: string;
    playerName: string;
    roll: DiceResult;
    rank: RollRank;
  }[];
}
