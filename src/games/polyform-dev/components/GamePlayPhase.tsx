import { useState, useEffect, useRef } from 'react';
import { RotateCw, FlipHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieceDisplay } from './PieceDisplay';
import { PuzzleCardDisplay } from './PuzzleCardDisplay';
import { DroppablePuzzleCard, isValidPlacement } from './DroppablePuzzleCard';
import { DragOverlay } from './DraggablePiece';
import { ALL_PUZZLES } from '../data/puzzles';
import { PIECE_DEFINITIONS } from '../data/pieces';
import type { GameState, WorkingPuzzle, PlacedPiece, PuzzleCard, PieceType } from '../types/game';

interface GamePlayPhaseProps {
  gameState: GameState;
  currentPlayerId: string;
  onLeaveRoom: () => void;
  onUpdateGameState?: (updates: Partial<GameState>) => void;
}

export const GamePlayPhase = ({
  gameState,
  currentPlayerId,
  onLeaveRoom,
  onUpdateGameState,
}: GamePlayPhaseProps) => {
  // 選択状態
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [flipped, setFlipped] = useState(false);

  // ドラッグ状態
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [hoverPuzzleId, setHoverPuzzleId] = useState<string | null>(null);
  const [hoverGridPosition, setHoverGridPosition] = useState<{ x: number; y: number } | null>(null);

  // カードアニメーション状態
  const [animatingCard, setAnimatingCard] = useState<{
    cardId: string;
    type: 'white' | 'black';
    targetSlotIndex: number;
  } | null>(null);
  const [newCardId, setNewCardId] = useState<string | null>(null);

  // アニメーション用のRef
  const workingPuzzleSlotRefs = useRef<(HTMLDivElement | null)[]>([]);

  // カードアニメーション完了タイマー
  useEffect(() => {
    if (!animatingCard) return;

    const timer = setTimeout(() => {
      completeCardAnimation();
    }, 250); // フェードアウト時間

    return () => clearTimeout(timer);
  }, [animatingCard]);

  // 現在のプレイヤーを取得
  const currentPlayer = gameState.players.find((p) => p.id === currentPlayerId);
  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 to-emerald-900 flex items-center justify-center">
        <div className="text-white">プレイヤーが見つかりません</div>
      </div>
    );
  }

  // 場のパズルカードを取得
  const whitePuzzles = gameState.whitePuzzleMarket
    .map((id) => ALL_PUZZLES.find((p) => p.id === id))
    .filter((p): p is PuzzleCard => p !== undefined);

  const blackPuzzles = gameState.blackPuzzleMarket
    .map((id) => ALL_PUZZLES.find((p) => p.id === id))
    .filter((p): p is PuzzleCard => p !== undefined);

  // 作業中パズルを取得
  const workingPuzzles = currentPlayer.workingPuzzles
    .map((wp) => {
      const card = ALL_PUZZLES.find((p) => p.id === wp.cardId);
      return card ? { ...wp, card } : null;
    })
    .filter((wp): wp is WorkingPuzzle & { card: PuzzleCard } => wp !== null);

  // 選択中のピース
  const selectedPiece = currentPlayer.pieces.find((p) => p.id === selectedPieceId);

  // パズルを場から取得（アニメーション開始）
  const handleTakePuzzle = (puzzleId: string, puzzleType: 'white' | 'black') => {
    console.log('handleTakePuzzle called:', { puzzleId, puzzleType, hasCallback: !!onUpdateGameState });

    if (!onUpdateGameState) {
      console.log('onUpdateGameState is undefined');
      return;
    }

    // アニメーション中は無視
    if (animatingCard) {
      console.log('アニメーション中です');
      return;
    }

    // 所持パズルが4枚以上なら取得不可
    if (currentPlayer.workingPuzzles.length >= 4) {
      console.log('所持パズルが上限です');
      return;
    }

    // アニメーション開始
    const targetSlotIndex = currentPlayer.workingPuzzles.length;
    setAnimatingCard({ cardId: puzzleId, type: puzzleType, targetSlotIndex });
  };

  // アニメーション完了時の実際の状態更新
  const completeCardAnimation = () => {
    if (!animatingCard || !onUpdateGameState) return;

    const { cardId: puzzleId, type: puzzleType } = animatingCard;

    // マーケットと山札を取得
    const market = puzzleType === 'white' ? [...gameState.whitePuzzleMarket] : [...gameState.blackPuzzleMarket];
    const deck = puzzleType === 'white' ? [...gameState.whitePuzzleDeck] : [...gameState.blackPuzzleDeck];

    // マーケットからパズルを削除
    const puzzleIndex = market.indexOf(puzzleId);
    if (puzzleIndex === -1) {
      setAnimatingCard(null);
      return;
    }
    market.splice(puzzleIndex, 1);

    // 山札から補充（あれば）
    let addedCardId: string | null = null;
    if (deck.length > 0) {
      const newPuzzle = deck.shift();
      if (newPuzzle) {
        market.push(newPuzzle);
        addedCardId = newPuzzle;
      }
    }

    // プレイヤーの所持パズルに追加
    const newWorkingPuzzle: WorkingPuzzle = {
      cardId: puzzleId,
      placedPieces: [],
    };

    const updatedPlayers = gameState.players.map((p) => {
      if (p.id === currentPlayerId) {
        return {
          ...p,
          workingPuzzles: [...p.workingPuzzles, newWorkingPuzzle],
        };
      }
      return p;
    });

    // ゲーム状態を更新
    const updates: Partial<GameState> = {
      players: updatedPlayers,
    };

    if (puzzleType === 'white') {
      updates.whitePuzzleMarket = market;
      updates.whitePuzzleDeck = deck;
    } else {
      updates.blackPuzzleMarket = market;
      updates.blackPuzzleDeck = deck;
    }

    // 新しいカードのIDを設定（フリップアニメーション用）
    setNewCardId(addedCardId);
    onUpdateGameState(updates);
    setAnimatingCard(null);

    // 新カードのフリップアニメーション終了後にnewCardIdをリセット
    if (addedCardId) {
      setTimeout(() => setNewCardId(null), 500);
    }

    console.log('パズル取得完了:', { puzzleId, puzzleType });
  };

  // マウス移動の追跡
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setHoverPuzzleId(null);
      setHoverGridPosition(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // タッチ移動の追跡
  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        setDragPosition({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      setHoverPuzzleId(null);
      setHoverGridPosition(null);
    };

    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  // ドラッグ開始
  const handleDragStart = (pieceId: string, e: React.MouseEvent | React.TouchEvent) => {
    setSelectedPieceId(pieceId);
    setIsDragging(true);

    if ('touches' in e && e.touches.length > 0) {
      setDragPosition({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    } else if ('clientX' in e) {
      setDragPosition({ x: e.clientX, y: e.clientY });
    }
  };

  // パズルへのドロップ
  const handleDrop = (puzzleId: string, position: { x: number; y: number }) => {
    if (!selectedPiece) return;

    const workingPuzzle = currentPlayer.workingPuzzles.find((wp) => wp.cardId === puzzleId);
    if (!workingPuzzle) return;

    const card = ALL_PUZZLES.find((p) => p.id === puzzleId);
    if (!card) return;

    // 配置が有効かチェック
    if (!isValidPlacement(card, workingPuzzle.placedPieces, selectedPiece.type, rotation, flipped, position)) {
      return;
    }

    // 新しい配置ピース
    const newPlacedPiece: PlacedPiece = {
      pieceId: selectedPiece.id,
      type: selectedPiece.type,
      rotation,
      position,
    };

    // 状態を更新（ローカルのみ、Firebaseへの同期は後で実装）
    const updatedWorkingPuzzles = currentPlayer.workingPuzzles.map((wp) => {
      if (wp.cardId === puzzleId) {
        return {
          ...wp,
          placedPieces: [...wp.placedPieces, newPlacedPiece],
        };
      }
      return wp;
    });

    // 手持ちからピースを削除
    const updatedPieces = currentPlayer.pieces.filter((p) => p.id !== selectedPiece.id);

    // 選択解除
    setSelectedPieceId(null);
    setRotation(0);
    setFlipped(false);
    setIsDragging(false);

    // Firebaseに同期
    if (onUpdateGameState) {
      const updatedPlayers = gameState.players.map((p) => {
        if (p.id === currentPlayerId) {
          return {
            ...p,
            pieces: updatedPieces,
            workingPuzzles: updatedWorkingPuzzles,
          };
        }
        return p;
      });
      onUpdateGameState({ players: updatedPlayers });
    }

    console.log('ピース配置:', { puzzleId, position, piece: selectedPiece.type });
  };

  // 回転
  const handleRotate = () => {
    setRotation((prev) => ((prev + 90) % 360) as 0 | 90 | 180 | 270);
  };

  // 反転
  const handleFlip = () => {
    setFlipped((prev) => !prev);
  };

  // ドラッグ中のピース情報
  const draggingPiece = isDragging && selectedPiece
    ? { type: selectedPiece.type, rotation, flipped }
    : null;

  // 他のプレイヤーを取得
  const otherPlayers = gameState.players.filter((p) => p.id !== currentPlayerId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 to-emerald-900">
      <div className="min-h-screen bg-black/20 p-4">
        {/* ヘッダー（全幅） */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <img src="/boards/images/vec_logo_polyform.svg" alt="POLYFORM" className="h-6" style={{ filter: 'brightness(0) invert(1)' }} />
            <div className="text-white">
              <span className="font-bold">{currentPlayer.name}</span>
              <span className="text-white/60 ml-2">スコア: {currentPlayer.score}pt</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">
              アクション残り: {currentPlayer.remainingActions}
            </span>
            <button
              onClick={onLeaveRoom}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm"
            >
              退出
            </button>
          </div>
        </div>

        {/* 2カラムレイアウト */}
        <div className="flex gap-4 items-start">
          {/* 左カラム: 他プレイヤー情報 */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <h3 className="text-white font-bold text-sm mb-3">プレイヤー</h3>
              {/* デバッグ: 自分の情報も表示 */}
              <div className="space-y-3">
                <div className="bg-teal-700/50 rounded-lg p-2 border border-teal-500/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white text-sm font-medium truncate">{currentPlayer.name}</div>
                    <div className="text-white/60 text-xs">{currentPlayer.score}pt</div>
                  </div>
                  {/* 所持パズル */}
                  <div className="flex gap-1 mb-2">
                    {currentPlayer.workingPuzzles.map((wp) => {
                      const card = ALL_PUZZLES.find((p) => p.id === wp.cardId);
                      return (
                        <div
                          key={wp.cardId}
                          className={`w-6 h-8 rounded text-[8px] flex items-center justify-center font-bold ${
                            card?.type === 'white'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-slate-700 text-white'
                          }`}
                        >
                          {card?.points}
                        </div>
                      );
                    })}
                    {Array(4 - currentPlayer.workingPuzzles.length).fill(null).map((_, i) => (
                      <div key={`empty-${i}`} className="w-6 h-8 rounded border border-dashed border-slate-500" />
                    ))}
                  </div>
                  {/* 所持ピース */}
                  <div className="flex flex-wrap gap-0.5">
                    {currentPlayer.pieces.map((piece) => (
                      <PieceDisplay key={piece.id} type={piece.type} size="xs" />
                    ))}
                  </div>
                </div>
                {otherPlayers.map((player) => (
                  <div key={player.id} className="bg-slate-700/50 rounded-lg p-2">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-white text-sm font-medium truncate">{player.name}</div>
                      <div className="text-white/60 text-xs">{player.score}pt</div>
                    </div>
                    {/* 所持パズル */}
                    <div className="flex gap-1 mb-2">
                      {player.workingPuzzles.map((wp) => {
                        const card = ALL_PUZZLES.find((p) => p.id === wp.cardId);
                        return (
                          <div
                            key={wp.cardId}
                            className={`w-6 h-8 rounded text-[8px] flex items-center justify-center font-bold ${
                              card?.type === 'white'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-slate-700 text-white'
                            }`}
                          >
                            {card?.points}
                          </div>
                        );
                      })}
                      {Array(4 - player.workingPuzzles.length).fill(null).map((_, i) => (
                        <div key={`empty-${i}`} className="w-6 h-8 rounded border border-dashed border-slate-500" />
                      ))}
                    </div>
                    {/* 所持ピース */}
                    <div className="flex flex-wrap gap-0.5">
                      {player.pieces.map((piece) => (
                        <PieceDisplay key={piece.id} type={piece.type} size="xs" />
                      ))}
                    </div>
                  </div>
                ))}
                {otherPlayers.length === 0 && (
                  <div className="text-slate-500 text-xs">他のプレイヤーはいません</div>
                )}
              </div>
            </div>
          </div>

          {/* 右カラム: メインコンテンツ */}
          <div className="flex-1 min-w-0">
            {/* 場のパズル（横長エリア） */}
            <div className="bg-slate-800/50 rounded-lg p-4 mb-4 overflow-x-auto">
          {/* 白パズル */}
          <div className="mb-3">
            <div className="flex gap-2 items-start">
              {whitePuzzles.map((card) => {
                const isAnimating = animatingCard?.cardId === card.id;
                const isNewCard = newCardId === card.id;

                return (
                  <motion.div
                    key={card.id}
                    initial={isNewCard ? { rotateY: 90, opacity: 0 } : false}
                    animate={{
                      rotateY: 0,
                      opacity: isAnimating ? 0 : 1,
                    }}
                    transition={{
                      rotateY: { duration: 0.3, ease: 'easeOut' },
                      opacity: { duration: 0.2 }
                    }}
                    style={{ perspective: 1000 }}
                  >
                    <PuzzleCardDisplay
                      card={card}
                      size="md"
                      onClick={() => handleTakePuzzle(card.id, 'white')}
                    />
                  </motion.div>
                );
              })}
              {/* 山札（重なったカード風） */}
              <div className="relative w-[180px] h-[225px] flex-shrink-0">
                {/* 背面カード（3枚重ね） */}
                <div className="absolute top-1.5 left-1.5 w-[180px] h-[225px] bg-slate-300 border-2 border-slate-400 rounded-lg" />
                <div className="absolute top-1 left-1 w-[180px] h-[225px] bg-slate-200 border-2 border-slate-400 rounded-lg" />
                {/* 表面カード */}
                <div className="absolute top-0 left-0 w-[180px] h-[225px] bg-slate-100 border-2 border-slate-400 rounded-lg flex flex-col items-center justify-center">
                  <div className="text-slate-500 text-xs mb-1">山札</div>
                  <div className="text-slate-800 text-4xl font-bold">{gameState.whitePuzzleDeck.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 黒パズル */}
          <div>
            <div className="flex gap-2 items-start">
              {blackPuzzles.map((card) => {
                const isAnimating = animatingCard?.cardId === card.id;
                const isNewCard = newCardId === card.id;

                return (
                  <motion.div
                    key={card.id}
                    initial={isNewCard ? { rotateY: 90, opacity: 0 } : false}
                    animate={{
                      rotateY: 0,
                      opacity: isAnimating ? 0 : 1,
                    }}
                    transition={{
                      rotateY: { duration: 0.3, ease: 'easeOut' },
                      opacity: { duration: 0.2 }
                    }}
                    style={{ perspective: 1000 }}
                  >
                    <PuzzleCardDisplay
                      card={card}
                      size="md"
                      onClick={() => handleTakePuzzle(card.id, 'black')}
                    />
                  </motion.div>
                );
              })}
              {/* 山札（重なったカード風） */}
              <div className="relative w-[180px] h-[225px] flex-shrink-0">
                {/* 背面カード（3枚重ね） */}
                <div className="absolute top-1.5 left-1.5 w-[180px] h-[225px] bg-slate-900 border-2 border-slate-600 rounded-lg" />
                <div className="absolute top-1 left-1 w-[180px] h-[225px] border-2 border-slate-600 rounded-lg" style={{ backgroundColor: '#1e293b' }} />
                {/* 表面カード */}
                <div className="absolute top-0 left-0 w-[180px] h-[225px] bg-slate-800 border-2 border-slate-600 rounded-lg flex flex-col items-center justify-center">
                  <div className="text-slate-400 text-xs mb-1">山札</div>
                  <div className="text-white text-4xl font-bold">{gameState.blackPuzzleDeck.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 下部エリア */}
        <div className="flex flex-col lg:flex-row gap-4">

          {/* 所持パズル（4枚並ぶ幅で固定） */}
          <div className="bg-slate-800/50 rounded-lg p-4 flex-shrink-0 w-[776px]">
            <h2 className="text-white font-bold mb-3">所持パズル（{workingPuzzles.length}/4）</h2>
            <div className="flex gap-2">
              <AnimatePresence mode="popLayout">
                {workingPuzzles.map((wp, index) => (
                  <motion.div
                    key={wp.cardId}
                    ref={(el) => {
                      workingPuzzleSlotRefs.current[index] = el;
                    }}
                    layout
                    initial={{ y: -200, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 25,
                      layout: { duration: 0.3 }
                    }}
                  >
                    <DroppablePuzzleCard
                      card={wp.card}
                      placedPieces={wp.placedPieces}
                      size="md"
                      draggingPiece={draggingPiece}
                      hoverPosition={hoverPuzzleId === wp.cardId ? hoverGridPosition : null}
                      onHover={(pos) => {
                        setHoverPuzzleId(pos ? wp.cardId : null);
                        setHoverGridPosition(pos);
                      }}
                      onDrop={(pos) => handleDrop(wp.cardId, pos)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              {/* 空きスロット */}
              {Array(4 - workingPuzzles.length)
                .fill(null)
                .map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    ref={(el) => {
                      workingPuzzleSlotRefs.current[workingPuzzles.length + i] = el;
                    }}
                    className="w-[180px] h-[225px] border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center text-slate-500"
                  >
                    空き
                  </div>
                ))}
            </div>
          </div>

          {/* 右: 手持ちピース */}
          <div className="bg-slate-800/50 rounded-lg p-4 flex-1 min-w-0">
            <h2 className="text-white font-bold mb-3">手持ちピース（{currentPlayer.pieces.length}）</h2>

            {/* 選択中のピースのコントロール */}
            {selectedPiece && (
              <div className="bg-slate-700/50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PieceDisplay
                      type={selectedPiece.type}
                      rotation={rotation}
                      flipped={flipped}
                      size="md"
                    />
                    <span className="text-white/60 text-sm">
                      ドラッグして配置
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRotate}
                      className="p-2 bg-slate-600 hover:bg-slate-500 rounded text-white"
                      title="回転"
                    >
                      <RotateCw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleFlip}
                      className={`p-2 rounded text-white ${
                        flipped ? 'bg-teal-600' : 'bg-slate-600 hover:bg-slate-500'
                      }`}
                      title="反転"
                    >
                      <FlipHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ピース一覧 */}
            <div className="flex flex-wrap gap-2">
              {currentPlayer.pieces.map((piece) => (
                <div
                  key={piece.id}
                  onMouseDown={(e) => handleDragStart(piece.id, e)}
                  onTouchStart={(e) => handleDragStart(piece.id, e)}
                  className={`inline-block p-1 rounded transition-all cursor-grab active:cursor-grabbing select-none ${
                    selectedPieceId === piece.id
                      ? 'ring-2 ring-white bg-white/20'
                      : 'hover:bg-white/10'
                  }`}
                  style={{ touchAction: 'none' }}
                >
                  <PieceDisplay
                    type={piece.type}
                    rotation={selectedPieceId === piece.id ? rotation : 0}
                    flipped={selectedPieceId === piece.id ? flipped : false}
                    size="md"
                  />
                </div>
              ))}
              {currentPlayer.pieces.length === 0 && (
                <div className="text-slate-500">ピースがありません</div>
              )}
            </div>

            {/* デバッグ: 全ピース追加 */}
            <div className="mt-4 pt-4 border-t border-slate-600">
              <h3 className="text-white/60 text-sm mb-2">デバッグ: ピース追加</h3>
              <div className="flex flex-wrap gap-1">
                {Object.keys(PIECE_DEFINITIONS).map((pieceType) => (
                  <button
                    key={pieceType}
                    onClick={() => {
                      if (!onUpdateGameState) return;
                      const newPiece = {
                        id: `debug-${Date.now()}-${pieceType}`,
                        type: pieceType as PieceType,
                        rotation: 0 as const,
                      };
                      const updatedPlayers = gameState.players.map((p) => {
                        if (p.id === currentPlayerId) {
                          return { ...p, pieces: [...p.pieces, newPiece] };
                        }
                        return p;
                      });
                      onUpdateGameState({ players: updatedPlayers });
                    }}
                    className="p-1 bg-slate-700/50 hover:bg-slate-600/50 rounded"
                    title={`${pieceType}を追加`}
                  >
                    <PieceDisplay type={pieceType as PieceType} size="sm" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

            {/* デバッグ情報 */}
            <div className="mt-4 bg-slate-800/50 rounded-lg p-4">
              <h2 className="text-white font-bold mb-2">ゲーム情報</h2>
              <div className="text-slate-400 text-sm grid grid-cols-2 md:grid-cols-4 gap-2">
                <div>フェーズ: {gameState.phase}</div>
                <div>プレイヤー数: {gameState.players.length}</div>
                <div>現在のターン: {gameState.players[gameState.currentPlayerIndex]?.name}</div>
                <div>最終ラウンド: {gameState.finalRound ? 'はい' : 'いいえ'}</div>
              </div>
            </div>
          </div>
          {/* 右カラム終了 */}
        </div>
        {/* 2カラムレイアウト終了 */}
      </div>

      {/* ドラッグオーバーレイ（パズル上でプレビュー中は非表示） */}
      {isDragging && selectedPiece && !hoverPuzzleId && (
        <DragOverlay
          type={selectedPiece.type}
          rotation={rotation}
          flipped={flipped}
          position={dragPosition}
        />
      )}
    </div>
  );
};
