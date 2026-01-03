import type { GameState, TrapType } from '../types/game';
import { Card, DeckBack } from './Card';

// 罠カード画像パス
const getTrapImagePath = (trapType: TrapType): string => {
  return `/boards/images/cards/card_trap_${trapType}.png`;
};

interface GameBoardProps {
  gameState: GameState;
  allDecided?: boolean;
  isIncan?: boolean;
}

export const GameBoard = ({ gameState, allDecided = false, isIncan = false }: GameBoardProps) => {
  const { remainderGems, trapCounts, currentEvent, relicsOnField, turn } = gameState;

  // 配列を安全に取得
  const field = Array.isArray(gameState.field) ? gameState.field : [];
  const deck = Array.isArray(gameState.deck) ? gameState.deck : [];
  const players = Array.isArray(gameState.players) ? gameState.players : [];

  // 探索中のプレイヤー数
  const exploringPlayerCount = players.filter(p => p.isExploring).length;

  // 場に出ている罠の表示
  const activeTrapTypes = (Object.entries(trapCounts || {}) as [TrapType, number][])
    .filter(([, count]) => count > 0);

  // カードを逆順に（新しいものが左に来るように）
  const reversedField = [...field].reverse();

  return (
    <div className="bg-gradient-to-b from-slate-800/90 to-slate-900/90 rounded-xl p-4">
      {/* 上部: ステータス情報 */}
      <div className="flex items-start gap-3 mb-4">
        {/* 山札 */}
        <DeckBack count={deck.length} size="compact" isIncan={isIncan} />

        {/* 山札の右側: 2行構成 */}
        <div className="flex-1 space-y-2">
          {/* 1行目: 端数、遺物、イベント */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 端数宝石 */}
            <div className="bg-emerald-900/50 px-3 py-1 rounded-lg">
              <span className="text-emerald-300 text-sm">端数: </span>
              <span className="text-emerald-400 font-bold">{remainderGems}</span>
            </div>

            {/* 場の遺物数 */}
            {relicsOnField > 0 && (
              <div className="px-3 py-1 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-lg">
                <span className="text-white font-bold text-sm">
                  🏺 遺物: {relicsOnField}個
                </span>
              </div>
            )}

            {/* ターンイベント */}
            {currentEvent && (
              <div className="px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600">
                <span className="text-white font-bold text-sm">
                  {currentEvent === 'combo_chance' && '🔥 コンボチャンス！'}
                  {currentEvent === 'last_survivor' && '👑 ラストサバイバー！'}
                  {currentEvent === 'all_in_time' && '🎰 オールインタイム！'}
                </span>
              </div>
            )}
          </div>

          {/* 2行目: 罠カウント */}
          {activeTrapTypes.length > 0 && (
            <div className="bg-red-900/50 px-3 py-1.5 rounded-lg flex items-center gap-3 w-fit">
              <span className="text-red-300 text-sm">罠:</span>
              {activeTrapTypes.map(([trapType, count]) => (
                <div key={trapType} className="flex items-center gap-1">
                  <img
                    src={getTrapImagePath(trapType)}
                    alt={trapType}
                    className="w-[38px] h-[52px] object-cover rounded"
                  />
                  <span className="text-sm font-bold text-red-400">{count}/{isIncan ? 2 : 3}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 場のカード（新しいカードが左） */}
      <div className="flex flex-wrap gap-3 min-h-[160px] items-start">
        {reversedField.length === 0 ? (
          <div className="text-gray-500 text-center w-full">
            「進む」でカードをめくる
          </div>
        ) : (
          reversedField.map((fieldCard, reversedIndex) => {
            // 逆順なので、最初のカード(reversedIndex=0)が最新
            const isLastCard = reversedIndex === 0;
            const isBeingDrawn = isLastCard && (gameState.phase === 'card_draw' || gameState.phase === 'draw_three');

            return (
              <Card
                key={`${fieldCard.card.id}-${reversedIndex}`}
                card={fieldCard.card}
                isMystery={fieldCard.isMystery}
                isRevealed={fieldCard.isRevealed}
                wasJustRevealed={fieldCard.isMystery && fieldCard.isRevealed && fieldCard.revealedAtTurn === turn && !allDecided}
                remainderGems={fieldCard.remainderGems || 0}
                size="large"
                isBeingDrawn={isBeingDrawn}
                exploringPlayerCount={exploringPlayerCount}
                isIncan={isIncan}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
