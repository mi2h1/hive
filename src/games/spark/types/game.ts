// 宝石の色
export type GemColor = 'blue' | 'yellow' | 'red' | 'white';

// 宝石
export interface Gem {
  id: string;
  color: GemColor;
}

// 宝石台（場）
export interface Platform {
  id: string;
  gems: Gem[];
}

// アクションの種類
export type ActionType = 'point_platform' | 'point_vault' | 'barrier';

// プレイヤーのアクション
export interface PlayerAction {
  type: ActionType;
  targetId?: string; // 宝石台ID or プレイヤーID
}

// プレイヤー
export interface Player {
  id: string;
  name: string;
  vault: Gem[];      // 金庫（奪われる可能性あり）
  secured: Gem[];    // バリアで確定した宝石
  action: PlayerAction | null;
  isResting: boolean; // バリア後の休み状態
  isReady: boolean;   // アクション選択完了
}

// ゲームフェーズ
export type GamePhase =
  | 'waiting'      // ロビー待機
  | 'selecting'    // アクション選択中
  | 'revealing'    // アクション公開
  | 'resolving'    // 解決中
  | 'replenishing' // 宝石補充
  | 'ended';       // ゲーム終了

// ゲーム設定
export interface GameSettings {
  // 将来の拡張用
}

// ゲーム状態
export interface GameState {
  phase: GamePhase;
  round: number;
  bag: Gem[];           // 袋の中の宝石
  platforms: Platform[]; // 宝石台
  players: Player[];
  settings: GameSettings;
  winnerId: string | null;
  // 解決結果の表示用
  lastRoundResults?: RoundResult;
}

// ラウンド結果
export interface RoundResult {
  actions: {
    playerId: string;
    playerName: string;
    action: PlayerAction;
  }[];
  transfers: {
    fromType: 'platform' | 'vault';
    fromId: string;
    toPlayerId: string;
    gems: Gem[];
  }[];
  barriers: {
    playerId: string;
    gems: Gem[];
  }[];
}

// ルームデータ
export interface RoomData {
  hostId: string;
  createdAt: number;
  gameState: GameState;
}

// 人数別設定
export const PLAYER_SETTINGS: Record<number, {
  platforms: number;
  blue: number;
  yellow: number;
  red: number;
  white: number;
}> = {
  2: { platforms: 3, blue: 12, yellow: 12, red: 12, white: 6 },
  3: { platforms: 2, blue: 9, yellow: 9, red: 9, white: 6 },
  4: { platforms: 3, blue: 12, yellow: 12, red: 12, white: 6 },
  5: { platforms: 4, blue: 15, yellow: 15, red: 15, white: 6 },
  6: { platforms: 5, blue: 18, yellow: 18, red: 18, white: 6 },
};

// デフォルト設定
export const DEFAULT_SETTINGS: GameSettings = {};
