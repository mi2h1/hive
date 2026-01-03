// ジャッカル ゲーム状態の型定義

// カードの種類
export type CardType = 'number' | 'double' | 'max_zero' | 'mystery' | 'special';

// カード
export interface Card {
  id: string;
  type: CardType;
  value: number | null; // 数字カードの場合の値、特殊カードはnull
  label: string; // 表示用ラベル
}

// プレイヤー状態
export interface Player {
  id: string;
  name: string;
  life: number;
  isEliminated: boolean;
  eliminatedAt?: number; // 脱落順
  cardId: string | null; // 現在持っているカードのID
}

// ゲームフェーズ
export type GamePhase =
  | 'waiting'      // ロビー待機中
  | 'round_start'  // ラウンド開始（カード配布）
  | 'declaring'    // 数字宣言中
  | 'judging'      // ジャッカル判定中
  | 'round_end'    // ラウンド終了
  | 'game_end';    // ゲーム終了

// ジャッカル判定結果
export interface JudgmentResult {
  declaredValue: number;
  totalValue: number;
  loserId: string;
  loserName: string;
  reason: 'over' | 'jackal'; // 宣言オーバー or ジャッカル負け
  cardDetails: {
    playerId: string;
    playerName: string;
    card: Card;
    resolvedValue: number; // 特殊カード効果適用後の値
  }[];
  mysteryCard?: Card; // ?カードで引いたカード
  hasDouble: boolean;
  hasMaxZero: boolean;
  maxValue: number;
}

// ゲーム設定
export interface GameSettings {
  initialLife: number; // 初期ライフ（2 or 3）
  useSpecialCards: boolean; // スペシャルカード使用
  turnTimeLimit: number | null; // ターン制限時間（秒）、nullは無制限
}

// ゲーム状態
export interface GameState {
  phase: GamePhase;
  settings: GameSettings;
  players: Player[];
  // カード関連
  deck: Card[]; // 山札
  dealtCards: Record<string, Card>; // プレイヤーID -> カード
  // ラウンド状態
  round: number;
  currentTurnPlayerId: string | null;
  turnOrder: string[]; // ターン順（時計回り）
  currentDeclaredValue: number | null; // 現在の宣言値
  lastDeclarerId: string | null; // 最後に宣言したプレイヤー
  // 判定
  judgmentResult: JudgmentResult | null;
  // 勝者
  winnerId: string | null;
}

// ローカル状態（他プレイヤーのカードのみ保持）
export interface LocalGameView {
  myCardHidden: boolean; // 自分のカードは見えない
  otherPlayersCards: Record<string, Card>; // 他プレイヤーのカードは見える
}

// デフォルト設定
export const DEFAULT_SETTINGS: GameSettings = {
  initialLife: 3,
  useSpecialCards: false,
  turnTimeLimit: null,
};
