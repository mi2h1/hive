// 牌の種類
export type TileKind = '1s' | '2s' | '3s' | '4s' | '5s' | '6s' | '7s' | '8s' | '9s' | 'hatsu' | 'chun';

// 牌
export interface Tile {
  id: string;       // 一意ID: "3s_r" (赤3索), "3s_2" (2枚目の3索)
  kind: TileKind;
  isRed: boolean;
}

// 面子の種類
export type MentsuType = 'shuntsu' | 'koutsu'; // 順子 | 刻子

// 面子
export interface Mentsu {
  type: MentsuType;
  tiles: [Tile, Tile, Tile];
}

// プレイヤー
export interface Player {
  id: string;
  name: string;
  hand: Tile[];        // 手牌（通常5枚, ツモ後6枚）
  discards: Tile[];    // 捨て牌（フリテン判定用）
  score: number;       // 持ち点
  isDealer: boolean;   // 親フラグ
  seatOrder: number;   // 座席順（0-3, 上家判定用）
}

// ゲームフェーズ
export type GamePhase = 'waiting' | 'playing' | 'round_result' | 'finished';

// ゲーム設定
export interface GameSettings {
  initialScore: number;   // 初期持ち点（デフォルト40）
  totalRounds: number;    // 東風戦の局数（デフォルト4）
}

// ゲーム状態（Firebase同期）
export interface GameState {
  phase: GamePhase;
  players: Player[];
  round: number;                        // 1〜4 (東1〜東4局)
  currentTurn: string | null;           // 現在の手番プレイヤーID
  deck: Tile[];                         // 残り山札
  doraTile: Tile | null;                // ドラ表示牌
  lastDiscard: Tile | null;             // 直前の打牌
  lastDiscardPlayerId: string | null;
  settings: GameSettings;
}

// 部屋データ
export interface RoomData {
  hostId: string;
  gameState: GameState;
  createdAt: number;
}

// デフォルト設定
export const DEFAULT_SETTINGS: GameSettings = {
  initialScore: 40,
  totalRounds: 4,
};

// 初期プレイヤーを作成
export const createInitialPlayer = (id: string, name: string): Player => ({
  id,
  name,
  hand: [],
  discards: [],
  score: DEFAULT_SETTINGS.initialScore,
  isDealer: false,
  seatOrder: 0,
});

// 初期ゲーム状態を作成
export const createInitialGameState = (): GameState => ({
  phase: 'waiting',
  players: [],
  round: 0,
  currentTurn: null,
  deck: [],
  doraTile: null,
  lastDiscard: null,
  lastDiscardPlayerId: null,
  settings: DEFAULT_SETTINGS,
});
