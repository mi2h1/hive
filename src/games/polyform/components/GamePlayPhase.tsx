import { useState, useEffect } from 'react';
import { RotateCw, FlipHorizontal } from 'lucide-react';
import { PieceDisplay } from './PieceDisplay';
import { PuzzleCardDisplay } from './PuzzleCardDisplay';
import { DroppablePuzzleCard, isValidPlacement } from './DroppablePuzzleCard';
import { DragOverlay } from './DraggablePiece';
import { ALL_PUZZLES } from '../data/puzzles';
import type { GameState, WorkingPuzzle, PlacedPiece, PuzzleCard } from '../types/game';

interface GamePlayPhaseProps {
  gameState: GameState;
  currentPlayerId: string;
  onLeaveRoom: () => void;
  onUpdatePlayer?: (updates: Partial<GameState['players'][0]>) => void;
}

export const GamePlayPhase = ({
  gameState,
  currentPlayerId,
  onLeaveRoom,
  onUpdatePlayer,
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

    // 親に通知
    if (onUpdatePlayer) {
      onUpdatePlayer({
        pieces: updatedPieces,
        workingPuzzles: updatedWorkingPuzzles,
      });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 to-emerald-900">
      <div className="min-h-screen bg-black/20 p-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-white">
            <span className="font-bold">{currentPlayer.name}</span>
            <span className="text-white/60 ml-2">スコア: {currentPlayer.score}pt</span>
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

        {/* 場のパズル（横長エリア） */}
        <div className="bg-slate-800/50 rounded-lg p-4 mb-4 overflow-x-auto">
          {/* 白パズル */}
          <div className="mb-3">
            <div className="flex gap-2 items-start">
              {whitePuzzles.map((card) => (
                <PuzzleCardDisplay key={card.id} card={card} size="sm" />
              ))}
              {/* 山札（重なったカード風） */}
              <div className="relative w-[130px] h-[165px] flex-shrink-0">
                {/* 背面カード（3枚重ね） */}
                <div className="absolute top-1.5 left-1.5 w-[130px] h-[165px] bg-slate-300 border-2 border-slate-400 rounded-lg" />
                <div className="absolute top-1 left-1 w-[130px] h-[165px] bg-slate-200 border-2 border-slate-400 rounded-lg" />
                {/* 表面カード */}
                <div className="absolute top-0 left-0 w-[130px] h-[165px] bg-slate-100 border-2 border-slate-400 rounded-lg flex flex-col items-center justify-center">
                  <div className="text-slate-500 text-xs mb-1">山札</div>
                  <div className="text-slate-800 text-4xl font-bold">{gameState.whitePuzzleDeck.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 黒パズル */}
          <div>
            <div className="flex gap-2 items-start">
              {blackPuzzles.map((card) => (
                <PuzzleCardDisplay key={card.id} card={card} size="sm" />
              ))}
              {/* 山札（重なったカード風） */}
              <div className="relative w-[130px] h-[165px] flex-shrink-0">
                {/* 背面カード（3枚重ね） */}
                <div className="absolute top-1.5 left-1.5 w-[130px] h-[165px] bg-slate-900 border-2 border-slate-600 rounded-lg" />
                <div className="absolute top-1 left-1 w-[130px] h-[165px] border-2 border-slate-600 rounded-lg" style={{ backgroundColor: '#1e293b' }} />
                {/* 表面カード */}
                <div className="absolute top-0 left-0 w-[130px] h-[165px] bg-slate-800 border-2 border-slate-600 rounded-lg flex flex-col items-center justify-center">
                  <div className="text-slate-400 text-xs mb-1">山札</div>
                  <div className="text-white text-4xl font-bold">{gameState.blackPuzzleDeck.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 下部エリア */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* 中央: 作業中パズル */}
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h2 className="text-white font-bold mb-3">作業中パズル（{workingPuzzles.length}/4）</h2>
            <div className="grid grid-cols-2 gap-3">
              {workingPuzzles.map((wp) => (
                <DroppablePuzzleCard
                  key={wp.cardId}
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
              ))}
              {/* 空きスロット */}
              {Array(4 - workingPuzzles.length)
                .fill(null)
                .map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="border-2 border-dashed border-slate-600 rounded-lg aspect-square flex items-center justify-center text-slate-500"
                  >
                    空き
                  </div>
                ))}
            </div>
          </div>

          {/* 右: 手持ちピース */}
          <div className="bg-slate-800/50 rounded-lg p-4">
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

      {/* ドラッグオーバーレイ */}
      {isDragging && selectedPiece && (
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
