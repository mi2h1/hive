// ゲームフェーズ
export type GamePhase = 'waiting' | 'rolling' | 'result' | 'game_end';

// ダイスの出目
export interface DiceResult {
  die1: number; // 1-6
  die2: number; // 1-6
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
