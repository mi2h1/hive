// ゲームフェーズ
export type GamePhase = 'waiting' | 'word_input' | 'playing' | 'game_end';

// お題リスト
export const TOPICS = [
  '飲みもの',
  'のりもの',
  '文房具',
  '動物',
  '職業',
  '食べもの',
  '音の出るもの',
  'スポーツ',
  'キャラクター',
  '学校にあるもの',
  'いま部屋にあるもの',
  'コンビニにあるもの',
  '行きたい場所',
  '最近出かけた場所',
  '公園にあるもの',
  '最近買ったもの',
  '家にあるもの',
  'この近所にあるもの',
  '楽器',
  '野菜',
  'くだもの',
  'お菓子',
  'キッチン用品',
  '電子機器',
  '架空の生き物',
  'いま食べたいもの',
  '名称',
  '年間行事',
  '春といえば',
  '夏といえば',
  '秋といえば',
  '冬といえば',
  'お正月',
  '夏休み',
  '海といえば',
  '山といえば',
  '常に持っていくもの',
  '本のタイトル',
  'ゲームのタイトル',
  'マンガのタイトル',
  '有名人の名前',
  'バンド・グループの名前',
  '会社の名前',
  'チェーン店の名前',
  '武器の名前',
  '技の名前',
  '日本の観光地',
  '海外の観光地',
  'あいさつ',
  '宇宙といえば',
  'お弁当のおかず',
  'めん類',
  '中華料理',
  'パンといえば',
  '植物',
  '虫',
  '生き物',
  '寿司ネタ',
  'おいしいもの',
  'なつかしいもの',
  '大好きなもの',
  '嫌いなもの',
  'あまいもの',
  'にがいもの',
  '禁止されてるもの',
  'あたたかいもの',
  'つめたいもの',
  '赤いもの',
  '丸いもの',
  '長いもの',
  '大きいもの',
  'やわらかいもの',
  'とぶもの',
  'まわるもの',
  '苦手だった人の名前',
  '好きなタイプ',
  '自分を動物に例えると',
  '自分を一言で表すと',
  '自分の一番大切なもの',
  'ドキドキするもの',
  '気になるもの',
  '災害時に必要なもの',
] as const;

// ランダムにお題を選ぶ
export const getRandomTopic = (): string => {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)];
};

// プレイヤー状態（Firebase同期対象）
export interface Player {
  id: string;
  name: string;
  wordLength: number; // 言葉の文字数（他プレイヤーに見える）
  normalizedWord: string; // 正規化後の言葉（ヒット判定用、Firebase保存）
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

// 現在の攻撃フェーズ（Firebase同期して全員に見せる）
export interface CurrentAttack {
  attackerName: string;
  targetChar: string;
  phase: 'selecting' | 'revealing';
  hits: AttackHit[];
  timestamp: number; // 攻撃開始時刻（古い攻撃を自動クリア用）
}

// ゲーム設定
export interface GameSettings {
  minWordLength: number;
  maxWordLength: number;
}

// ゲーム状態（Firebase同期対象）
export interface GameState {
  phase: GamePhase;
  settings: GameSettings;
  currentTopic: string; // ゲーム開始時にランダム選出されたお題
  players: Player[];
  currentTurnPlayerId: string | null;
  turnOrder: string[]; // プレイヤーIDの順番
  usedCharacters: string[]; // 使用済みの文字
  attackHistory: AttackResult[];
  lastAttackHadHit: boolean; // 最後の攻撃がヒットしたか（連続攻撃判定用）
  winnerId: string | null;
  currentAttack?: CurrentAttack | null; // 現在の攻撃演出（全員に表示）
  topicChangeVotes: string[]; // お題チェンジに投票したプレイヤーID
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
};

// 初期プレイヤー状態を作成
export const createInitialPlayer = (id: string, name: string): Player => ({
  id,
  name,
  wordLength: 0,
  normalizedWord: '',
  revealedPositions: [],
  revealedCharacters: [],
  isEliminated: false,
  isReady: false,
});

// 初期ゲーム状態を作成
export const createInitialGameState = (): Omit<GameState, 'players'> => ({
  phase: 'waiting',
  settings: { ...DEFAULT_SETTINGS },
  currentTopic: '', // ゲーム開始時に設定される
  currentTurnPlayerId: null,
  turnOrder: [],
  usedCharacters: [],
  attackHistory: [],
  lastAttackHadHit: false,
  winnerId: null,
  topicChangeVotes: [],
});
