// ゲームフェーズ
export type GamePhase = 'waiting' | 'word_input' | 'playing' | 'game_end';

// お題カテゴリ
export type TopicCategory = 'free' | 'animal' | 'food' | 'place' | 'character';

export const TOPIC_LABELS: Record<TopicCategory, string> = {
  free: '自由',
  animal: '動物',
  food: '食べ物',
  place: '場所',
  character: 'キャラクター',
};

// プレイヤー状態（Firebase同期対象）
export interface Player {
  id: string;
  name: string;
  wordLength: number; // 言葉の文字数（他プレイヤーに見える）
  revealedPositions: boolean[]; // 各位置が公開されているか
  revealedCharacters: string[]; // 公開された文字（位置に対応）
  isEliminated: boolean; // 脱落したか
  isReady: boolean; // 言葉入力完了したか
  eliminatedAt?: number; // 脱落した順番（1から）
}

// ローカル専用のプレイヤー状態（Firebaseには保存しない）
export interface LocalPlayerState {
  originalWord: string; // 入力時の元の言葉
  normalizedWord: string; // 正規化後の言葉
}

// 攻撃のヒット情報
export interface AttackHit {
  playerId: string;
  playerName: string;
  positions: number[]; // ヒットした位置（0-indexed）
  characters: string[]; // ヒットした文字
}

// 攻撃結果
export interface AttackResult {
  attackerId: string;
  attackerName: string;
  targetChar: string;
  hits: AttackHit[];
  timestamp: number;
}

// ゲーム設定
export interface GameSettings {
  minWordLength: number;
  maxWordLength: number;
  topic: TopicCategory;
}

// ゲーム状態（Firebase同期対象）
export interface GameState {
  phase: GamePhase;
  settings: GameSettings;
  players: Player[];
  currentTurnPlayerId: string | null;
  turnOrder: string[]; // プレイヤーIDの順番
  usedCharacters: string[]; // 使用済みの文字
  attackHistory: AttackResult[];
  lastAttackHadHit: boolean; // 最後の攻撃がヒットしたか（連続攻撃判定用）
  winnerId: string | null;
}

// ルームデータ
export interface RoomData {
  hostId: string;
  gameState: GameState;
  createdAt: number;
}

// デフォルト設定
export const DEFAULT_SETTINGS: GameSettings = {
  minWordLength: 2,
  maxWordLength: 7,
  topic: 'free',
};

// 初期プレイヤー状態を作成
export const createInitialPlayer = (id: string, name: string): Player => ({
  id,
  name,
  wordLength: 0,
  revealedPositions: [],
  revealedCharacters: [],
  isEliminated: false,
  isReady: false,
});

// 初期ゲーム状態を作成
export const createInitialGameState = (): Omit<GameState, 'players'> => ({
  phase: 'waiting',
  settings: { ...DEFAULT_SETTINGS },
  currentTurnPlayerId: null,
  turnOrder: [],
  usedCharacters: [],
  attackHistory: [],
  lastAttackHadHit: false,
  winnerId: null,
});
