import { useState, useEffect, useRef } from 'react';
import { RotateCw, FlipHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieceDisplay, getTransformedShape } from './PieceDisplay';
import { PuzzleCardDisplay, CARD_SIZES, type CardSizeType } from './PuzzleCardDisplay';
import { DroppablePuzzleCard, isValidPlacement } from './DroppablePuzzleCard';
import { DragOverlay } from './DraggablePiece';
import { ALL_PUZZLES } from '../data/puzzles';
import { PIECE_DEFINITIONS, PIECES_BY_LEVEL } from '../data/pieces';
import type { GameState, WorkingPuzzle, PlacedPiece, PuzzleCard, PieceType } from '../types/game';

// CardSizeType → PieceDisplay用サイズへのマッピング
const toPieceSize = (cardSize: CardSizeType): 'xs' | 'sm' | 'md' | 'lg' => {
  switch (cardSize) {
    case 'xxs':
    case 'xs':
      return 'xs';
    case 'sm':
    case 'md':
      return 'sm';
    case 'lg':
    case 'xl':
      return 'md';
    case 'xxl':
      return 'lg';
  }
};

// 2段ピースが入る最小高さを計算（セルサイズ×2 + gap + padding）
const getMinPieceHeight = (cardSize: CardSizeType): number => {
  const cellSizes = { xs: 8, sm: 12, md: 20, lg: 28 };
  const pieceSize = toPieceSize(cardSize);
  const cellPx = cellSizes[pieceSize];
  // 2段 + gap(1px) + padding(p-1 = 4px each side = 8px)
  return cellPx * 2 + 1 + 8;
};

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

  // パズル完成アニメーション状態
  const [completedPuzzleId, setCompletedPuzzleId] = useState<string | null>(null);
  const [pendingCompletion, setPendingCompletion] = useState<{
    puzzleId: string;
    puzzleType: 'white' | 'black';
    points: number;
    rewardPieceType: PieceType | null;
  } | null>(null);

  // アクションアナウンス
  const [announcement, setAnnouncement] = useState<string | null>(null);

  // レベル変更選択モード
  const [levelChangeMode, setLevelChangeMode] = useState<{
    pieceId: string;
    targetLevel: number;
    direction: 'up' | 'down';
  } | null>(null);

  // マスターアクションモード
  const [masterActionMode, setMasterActionMode] = useState(false);
  const [masterActionPlacedPuzzles, setMasterActionPlacedPuzzles] = useState<Set<string>>(new Set());

  // リサイクルアニメーション状態
  const [recyclingMarket, setRecyclingMarket] = useState<'white' | 'black' | null>(null);
  const [recyclePhase, setRecyclePhase] = useState<'exit' | 'enter' | null>(null);

  // 最終ターン中の黒カード取得カウント
  const [blackCardsTakenInFinalTurn, setBlackCardsTakenInFinalTurn] = useState(0);

  // 選択中のアクションモード
  type ActionMode = 'none' | 'takePuzzle' | 'placePiece' | 'levelChange' | 'recycle' | 'masterAction';
  const [actionMode, setActionMode] = useState<ActionMode>('none');

  // レスポンシブカードサイズ（7段階）
  const [cardSize, setCardSize] = useState<CardSizeType>('md');

  // ゲーム開始時アニメーション
  const [gameStarted, setGameStarted] = useState(false);
  const [dealtCardCount, setDealtCardCount] = useState(0);

  // 結果画面用：パズルオープン演出
  const [revealedCardIndex, setRevealedCardIndex] = useState(-1);
  const [showFinalResults, setShowFinalResults] = useState(false);

  // デバッグ用：操作対象プレイヤー（他プレイヤーの操作を可能にする）
  const [debugControlPlayerId, setDebugControlPlayerId] = useState<string>(currentPlayerId);

  // ウィンドウサイズに応じてカードサイズを変更（7段階）
  useEffect(() => {
    const updateCardSize = () => {
      const width = window.innerWidth;
      if (width >= 1850) {
        setCardSize('xxl');
      } else if (width >= 1650) {
        setCardSize('xl');
      } else if (width >= 1500) {
        setCardSize('lg');
      } else if (width >= 1300) {
        setCardSize('md');
      } else if (width >= 1100) {
        setCardSize('sm');
      } else if (width >= 900) {
        setCardSize('xs');
      } else {
        setCardSize('xxs');
      }
    };

    updateCardSize();
    window.addEventListener('resize', updateCardSize);
    return () => window.removeEventListener('resize', updateCardSize);
  }, []);

  // ゲーム開始時のフェードインとカード配布アニメーション
  useEffect(() => {
    // フェードイン開始
    const fadeTimer = setTimeout(() => {
      setGameStarted(true);
    }, 50);

    // カード配布（0.3秒後から開始、0.3秒間隔で1枚ずつ）
    const dealTimers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < 4; i++) {
      dealTimers.push(
        setTimeout(() => {
          setDealtCardCount(i + 1);
        }, 300 + i * 300)
      );
    }

    return () => {
      clearTimeout(fadeTimer);
      dealTimers.forEach(clearTimeout);
    };
  }, []);

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

  // パズル完成アニメーション処理
  useEffect(() => {
    if (!pendingCompletion || !onUpdateGameState) return;

    // ハイライト表示
    setCompletedPuzzleId(pendingCompletion.puzzleId);

    const timer = setTimeout(() => {
      const { puzzleId, puzzleType, points, rewardPieceType } = pendingCompletion;

      // スコア加算、報酬ピース付与、パズル削除、完成枚数カウント
      const player = gameState.players.find((p) => p.id === debugControlPlayerId);
      if (!player) return;

      // 完成したパズルに配置されていたピースを取得
      const completedPuzzle = player.workingPuzzles.find((wp) => wp.cardId === puzzleId);
      const returnedPieces = completedPuzzle?.placedPieces.map((placed) => ({
        id: `returned-${Date.now()}-${placed.pieceId}`,
        type: placed.type,
        rotation: 0 as const,
      })) || [];

      let updatedPieces = [...player.pieces, ...returnedPieces];
      if (rewardPieceType) {
        updatedPieces.push({
          id: `reward-${Date.now()}-${rewardPieceType}`,
          type: rewardPieceType,
          rotation: 0 as const,
        });
      }

      const updatedPlayers = gameState.players.map((p) => {
        if (p.id === debugControlPlayerId) {
          // 完成パズルを配置情報付きで保存
          const newCompletedPuzzle = completedPuzzle
            ? { cardId: puzzleId, placedPieces: [...completedPuzzle.placedPieces] }
            : { cardId: puzzleId, placedPieces: [] };

          return {
            ...p,
            score: p.score + points,
            pieces: updatedPieces,
            workingPuzzles: p.workingPuzzles.filter((wp) => wp.cardId !== puzzleId),
            completedPuzzles: [...(p.completedPuzzles || []), newCompletedPuzzle],
            completedWhite: puzzleType === 'white' ? (p.completedWhite || 0) + 1 : (p.completedWhite || 0),
            completedBlack: puzzleType === 'black' ? (p.completedBlack || 0) + 1 : (p.completedBlack || 0),
          };
        }
        return p;
      });

      onUpdateGameState({ players: updatedPlayers });
      setCompletedPuzzleId(null);
      setPendingCompletion(null);
      setAnnouncement(`パズル完成！ +${points}pt`);
    }, 800); // ハイライト表示時間

    return () => clearTimeout(timer);
  }, [pendingCompletion]);

  // アナウンス自動消去
  useEffect(() => {
    if (!announcement) return;
    const timer = setTimeout(() => setAnnouncement(null), 2000);
    return () => clearTimeout(timer);
  }, [announcement]);

  // リサイクルアニメーション処理
  useEffect(() => {
    if (!recyclePhase) return;

    if (recyclePhase === 'exit') {
      // 退出アニメーション完了後、状態更新＆入場フェーズへ
      const timer = setTimeout(() => {
        completeRecycleAnimation();
      }, 400); // 右に消えるアニメーション時間
      return () => clearTimeout(timer);
    }

    if (recyclePhase === 'enter') {
      // 入場アニメーション完了後、リセット
      const timer = setTimeout(() => {
        setRecyclingMarket(null);
        setRecyclePhase(null);
      }, 500); // フリップアニメーション時間
      return () => clearTimeout(timer);
    }
  }, [recyclePhase]);

  // 実際のプレイヤーを取得
  const realPlayer = gameState.players.find((p) => p.id === debugControlPlayerId);
  if (!realPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 to-emerald-900 flex items-center justify-center">
        <div className="text-white">プレイヤーが見つかりません</div>
      </div>
    );
  }

  // デバッグ用：操作対象プレイヤーを取得（存在しない場合は実プレイヤーにフォールバック）
  const controlledPlayer = gameState.players.find((p) => p.id === debugControlPlayerId) || realPlayer;
  // 互換性のため currentPlayer は controlledPlayer を参照
  const currentPlayer = controlledPlayer;

  // 自分のターンかどうか（デバッグモードでは操作対象プレイヤーのターンかどうか）
  const activePlayerId = gameState.playerOrder[gameState.currentPlayerIndex];
  const isMyTurn = activePlayerId === debugControlPlayerId;

  // 最終ターンかどうか（最終ラウンド中で、現在のプレイヤーがfinalRoundStartPlayer）
  const isFinalTurn = gameState.finalRound && debugControlPlayerId === gameState.finalRoundStartPlayer;

  // ターン終了処理
  const endTurn = () => {
    if (!onUpdateGameState) return;

    // マスターアクション中なら終了させる
    if (masterActionMode) {
      setMasterActionMode(false);
      setMasterActionPlacedPuzzles(new Set());
    }

    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.playerOrder.length;
    const nextPlayerId = gameState.playerOrder[nextPlayerIndex];

    // 最終ラウンド判定：山札が尽きたか確認
    const isBlackDeckEmpty = gameState.blackPuzzleDeck.length === 0;
    const isWhiteDeckEmpty = gameState.whitePuzzleDeck.length === 0;
    const shouldTriggerFinalRound = !gameState.finalRound && (isBlackDeckEmpty || isWhiteDeckEmpty);

    // 最終ラウンド終了判定：現在のプレイヤーが最終ラウンド開始プレイヤー（=最後の1ターン）なら仕上げフェーズへ
    // ※山札が空になったターンの「次のターン」で終了
    const shouldEndFinalRound = gameState.finalRound && debugControlPlayerId === gameState.finalRoundStartPlayer;

    // 現在のプレイヤーのアクションを0にし、次のプレイヤーのアクションを3にリセット
    // 次のプレイヤーのusedMasterActionもリセット
    const updatedPlayers = gameState.players.map((p) => {
      if (p.id === debugControlPlayerId) {
        return { ...p, remainingActions: 0 };
      }
      if (p.id === nextPlayerId) {
        return { ...p, remainingActions: 3, usedMasterAction: false };
      }
      return p;
    });

    if (shouldEndFinalRound) {
      // 最終ラウンド終了 → 仕上げフェーズへ
      onUpdateGameState({
        players: updatedPlayers,
        phase: 'finishing',
      });
      setAnnouncement('最終ラウンド終了！仕上げフェーズへ');
    } else if (shouldTriggerFinalRound) {
      // 最終ラウンド開始：次のプレイヤーが最後の1ターンをプレイする
      onUpdateGameState({
        players: updatedPlayers,
        currentPlayerIndex: nextPlayerIndex,
        finalRound: true,
        finalRoundStartPlayer: nextPlayerId, // 次のプレイヤー（最後の1ターン）
      });
      setAnnouncement('最終ラウンド！次のプレイヤーで終了');
    } else {
      // 通常のターン終了
      onUpdateGameState({
        players: updatedPlayers,
        currentPlayerIndex: nextPlayerIndex,
      });
      setAnnouncement('ターン終了');
    }
  };

  // 手動でターン終了
  const handleEndTurn = () => {
    if (!isMyTurn || !onUpdateGameState) return;
    endTurn();
  };

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

    // アクションモードがtakePuzzleでない場合は無視
    if (actionMode !== 'takePuzzle') {
      console.log('パズル取得モードではありません');
      return;
    }

    // 自分のターンでない場合は無視
    if (!isMyTurn) {
      console.log('自分のターンではありません');
      return;
    }

    // アクションが残っていない場合は無視
    if (currentPlayer.remainingActions <= 0) {
      console.log('アクションが残っていません');
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

    // 最終ターンで黒カードを既に1枚取得済みなら取得不可
    if (isFinalTurn && puzzleType === 'black' && blackCardsTakenInFinalTurn >= 1) {
      console.log('最終ターンでは黒カードは1枚までです');
      setAnnouncement('最終ターンでは黒カードは1枚まで');
      return;
    }

    // アニメーション開始
    const targetSlotIndex = currentPlayer.workingPuzzles.length;
    setAnimatingCard({ cardId: puzzleId, type: puzzleType, targetSlotIndex });
  };

  // 山札から直接カードを引く
  const handleDrawFromDeck = (deckType: 'white' | 'black') => {
    if (!onUpdateGameState) return;

    // アクションモードがtakePuzzleでない場合は無視
    if (actionMode !== 'takePuzzle') return;

    // 自分のターンでない場合は無視
    if (!isMyTurn) return;

    // アクションが残っていない場合は無視
    if (currentPlayer.remainingActions <= 0) return;

    // 所持パズルが4枚以上なら取得不可
    if (currentPlayer.workingPuzzles.length >= 4) {
      console.log('所持パズルが上限です');
      return;
    }

    // 最終ターンで黒カードを既に1枚取得済みなら取得不可
    if (isFinalTurn && deckType === 'black' && blackCardsTakenInFinalTurn >= 1) {
      console.log('最終ターンでは黒カードは1枚までです');
      setAnnouncement('最終ターンでは黒カードは1枚まで');
      return;
    }

    const deck = deckType === 'white' ? [...gameState.whitePuzzleDeck] : [...gameState.blackPuzzleDeck];

    // 山札が空なら引けない
    if (deck.length === 0) {
      console.log('山札が空です');
      return;
    }

    // 山札の一番上を引く
    const drawnCardId = deck.shift()!;

    // プレイヤーの所持パズルに追加
    const newWorkingPuzzle: WorkingPuzzle = {
      cardId: drawnCardId,
      placedPieces: [],
    };

    const updatedPlayers = gameState.players.map((p) => {
      if (p.id === debugControlPlayerId) {
        return {
          ...p,
          workingPuzzles: [...p.workingPuzzles, newWorkingPuzzle],
          remainingActions: p.remainingActions - 1,
        };
      }
      return p;
    });

    // アクション消費後にターン終了判定
    const newRemainingActions = currentPlayer.remainingActions - 1;
    let finalPlayers = updatedPlayers;
    let nextPlayerIndex = gameState.currentPlayerIndex;

    if (newRemainingActions <= 0) {
      // ターン終了：次のプレイヤーへ
      nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.playerOrder.length;
      const nextPlayerId = gameState.playerOrder[nextPlayerIndex];
      finalPlayers = updatedPlayers.map((p) => {
        if (p.id === nextPlayerId) {
          return { ...p, remainingActions: 3 };
        }
        return p;
      });
    }

    // ゲーム状態を更新
    const updates: Partial<GameState> = {
      players: finalPlayers,
      currentPlayerIndex: nextPlayerIndex,
    };

    if (deckType === 'white') {
      updates.whitePuzzleDeck = deck;
    } else {
      updates.blackPuzzleDeck = deck;
    }

    onUpdateGameState(updates);
    setActionMode('none'); // アクション完了後にリセット
    setAnnouncement('山札からカードを引いた');

    // 最終ターンで黒カードを引いた場合、カウントを増やす
    if (isFinalTurn && deckType === 'black') {
      setBlackCardsTakenInFinalTurn((prev) => prev + 1);
    }

    console.log('山札から取得:', { drawnCardId, deckType });
  };

  // リサイクル開始（アニメーション）
  const handleRecycle = (marketType: 'white' | 'black') => {
    if (!onUpdateGameState || recyclingMarket) return;

    // 自分のターンでない場合は無視
    if (!isMyTurn) return;

    // アクションが残っていない場合は無視
    if (currentPlayer.remainingActions <= 0) return;

    const market = marketType === 'white' ? gameState.whitePuzzleMarket : gameState.blackPuzzleMarket;
    const deck = marketType === 'white' ? gameState.whitePuzzleDeck : gameState.blackPuzzleDeck;

    // 場のカードが4枚未満、または山札が4枚未満ならリサイクル不可
    if (market.length < 4 || deck.length < 4) {
      console.log('リサイクルできません（カードが足りません）');
      return;
    }

    // アニメーション開始（退出フェーズ）
    setRecyclingMarket(marketType);
    setRecyclePhase('exit');
  };

  // リサイクルアニメーション完了処理
  const completeRecycleAnimation = () => {
    if (!recyclingMarket || !onUpdateGameState) return;

    const market = recyclingMarket === 'white' ? [...gameState.whitePuzzleMarket] : [...gameState.blackPuzzleMarket];
    const deck = recyclingMarket === 'white' ? [...gameState.whitePuzzleDeck] : [...gameState.blackPuzzleDeck];

    // 場のカードを山札の下に追加
    deck.push(...market);

    // 山札の上から4枚を新しい場に
    const newMarket = deck.splice(0, 4);

    // アクション消費とターン終了判定
    const newRemainingActions = currentPlayer.remainingActions - 1;
    const nextPlayerIndex = newRemainingActions <= 0
      ? (gameState.currentPlayerIndex + 1) % gameState.playerOrder.length
      : gameState.currentPlayerIndex;
    const nextPlayerId = gameState.playerOrder[nextPlayerIndex];

    const updatedPlayers = gameState.players.map((p) => {
      if (p.id === debugControlPlayerId) {
        return { ...p, remainingActions: newRemainingActions <= 0 ? 0 : newRemainingActions };
      }
      if (newRemainingActions <= 0 && p.id === nextPlayerId) {
        return { ...p, remainingActions: 3 };
      }
      return p;
    });

    // ゲーム状態を更新
    const updates: Partial<GameState> = {
      players: updatedPlayers,
      currentPlayerIndex: nextPlayerIndex,
    };
    if (recyclingMarket === 'white') {
      updates.whitePuzzleMarket = newMarket;
      updates.whitePuzzleDeck = deck;
    } else {
      updates.blackPuzzleMarket = newMarket;
      updates.blackPuzzleDeck = deck;
    }

    onUpdateGameState(updates);
    setAnnouncement('リサイクル');

    // 入場フェーズへ
    setRecyclePhase('enter');
    console.log('リサイクル:', { marketType: recyclingMarket, newMarket });
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

    // プレイヤーの所持パズルに追加＆アクション消費
    const newWorkingPuzzle: WorkingPuzzle = {
      cardId: puzzleId,
      placedPieces: [],
    };

    // アクション消費とターン終了判定
    const newRemainingActions = currentPlayer.remainingActions - 1;
    const nextPlayerIndex = newRemainingActions <= 0
      ? (gameState.currentPlayerIndex + 1) % gameState.playerOrder.length
      : gameState.currentPlayerIndex;
    const nextPlayerId = gameState.playerOrder[nextPlayerIndex];

    const updatedPlayers = gameState.players.map((p) => {
      if (p.id === debugControlPlayerId) {
        return {
          ...p,
          workingPuzzles: [...p.workingPuzzles, newWorkingPuzzle],
          remainingActions: newRemainingActions <= 0 ? 0 : newRemainingActions,
        };
      }
      if (newRemainingActions <= 0 && p.id === nextPlayerId) {
        return { ...p, remainingActions: 3 };
      }
      return p;
    });

    // ゲーム状態を更新
    const updates: Partial<GameState> = {
      players: updatedPlayers,
      currentPlayerIndex: nextPlayerIndex,
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
    setActionMode('none'); // アクション完了後にリセット
    setAnnouncement('カードを取得');

    // 最終ターンで黒カードを取得した場合、カウントを増やす
    if (isFinalTurn && puzzleType === 'black') {
      setBlackCardsTakenInFinalTurn((prev) => prev + 1);
    }

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
    // 仕上げフェーズ中
    const isFinishingPhase = gameState.phase === 'finishing';
    if (isFinishingPhase) {
      // 仕上げ完了済みなら操作不可
      if (currentPlayer.finishingDone) return;
    } else {
      // 通常フェーズ：ピース配置モードまたはマスターアクション中でない場合は無視
      if (actionMode !== 'placePiece' && actionMode !== 'levelChange' && !masterActionMode) return;
    }

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

    // 仕上げフェーズの処理
    const isFinishingPhase = gameState.phase === 'finishing';
    if (isFinishingPhase) {
      // 仕上げ完了済みなら配置不可
      if (currentPlayer.finishingDone) return;
    } else {
      // 通常フェーズの条件チェック
      // ピース配置モードまたはマスターアクション中でない場合は無視
      if (actionMode !== 'placePiece' && !masterActionMode) return;

      // 自分のターンでない場合は無視
      if (!isMyTurn) return;

      // アクションが残っていない場合は無視（マスターアクション中は除く）
      if (currentPlayer.remainingActions <= 0 && !masterActionMode) return;
    }

    const workingPuzzle = currentPlayer.workingPuzzles.find((wp) => wp.cardId === puzzleId);
    if (!workingPuzzle) return;

    const card = ALL_PUZZLES.find((p) => p.id === puzzleId);
    if (!card) return;

    // マスターアクション中：このパズルに既に置いた場合は無視
    if (masterActionMode && masterActionPlacedPuzzles.has(puzzleId)) {
      return;
    }

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

    const newPlacedPieces = [...workingPuzzle.placedPieces, newPlacedPiece];

    // 完成判定
    const totalCells = card.shape.flat().filter(Boolean).length;
    let filledCells = 0;
    newPlacedPieces.forEach((placed) => {
      const shape = getTransformedShape(placed.type, placed.rotation, false);
      filledCells += shape.length;
    });
    const isCompleted = filledCells === totalCells;

    // 手持ちからピースを削除
    const updatedPieces = currentPlayer.pieces.filter((p) => p.id !== selectedPiece.id);

    // 配置を更新
    const updatedWorkingPuzzles = currentPlayer.workingPuzzles.map((wp) => {
      if (wp.cardId === puzzleId) {
        return { ...wp, placedPieces: newPlacedPieces };
      }
      return wp;
    });

    // 選択解除
    setSelectedPieceId(null);
    setRotation(0);
    setFlipped(false);
    setIsDragging(false);

    // マスターアクション中の処理
    if (masterActionMode) {
      // このパズルに配置済みとしてマーク
      setMasterActionPlacedPuzzles((prev) => new Set(prev).add(puzzleId));

      // Firebaseに同期（アクション消費なし）
      if (onUpdateGameState) {
        const updatedPlayers = gameState.players.map((p) => {
          if (p.id === debugControlPlayerId) {
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

      // 完成時は遅延処理をセット
      if (isCompleted) {
        setPendingCompletion({
          puzzleId,
          puzzleType: card.type,
          points: card.points,
          rewardPieceType: card.rewardPieceType || null,
        });
      } else {
        setAnnouncement('マスターアクション中');
      }
      return;
    }

    // 仕上げフェーズのピース配置：ペナルティ付き、アクション消費なし
    if (isFinishingPhase) {
      if (onUpdateGameState) {
        const newPenalty = (currentPlayer.finishingPenalty || 0) + 1;
        const updatedPlayers = gameState.players.map((p) => {
          if (p.id === debugControlPlayerId) {
            return {
              ...p,
              pieces: updatedPieces,
              workingPuzzles: updatedWorkingPuzzles,
              finishingPenalty: newPenalty,
            };
          }
          return p;
        });
        onUpdateGameState({ players: updatedPlayers });
      }

      // 完成時は遅延処理をセット
      if (isCompleted) {
        setPendingCompletion({
          puzzleId,
          puzzleType: card.type,
          points: card.points,
          rewardPieceType: card.rewardPieceType || null,
        });
      } else {
        setAnnouncement(`配置 (-1pt)`);
      }
      return;
    }

    // 通常のピース配置：アクション消費
    const newRemainingActions = currentPlayer.remainingActions - 1;
    const nextPlayerIndex = newRemainingActions <= 0
      ? (gameState.currentPlayerIndex + 1) % gameState.playerOrder.length
      : gameState.currentPlayerIndex;
    const nextPlayerId = gameState.playerOrder[nextPlayerIndex];

    // Firebaseに同期
    if (onUpdateGameState) {
      const updatedPlayers = gameState.players.map((p) => {
        if (p.id === debugControlPlayerId) {
          return {
            ...p,
            pieces: updatedPieces,
            workingPuzzles: updatedWorkingPuzzles,
            remainingActions: newRemainingActions <= 0 ? 0 : newRemainingActions,
          };
        }
        if (newRemainingActions <= 0 && p.id === nextPlayerId) {
          return { ...p, remainingActions: 3 };
        }
        return p;
      });
      onUpdateGameState({ players: updatedPlayers, currentPlayerIndex: nextPlayerIndex });
    }

    // アクション完了後にリセット（マスターアクション以外）
    if (!masterActionMode) {
      setActionMode('none');
    }

    // 完成時は遅延処理をセット
    if (isCompleted) {
      setPendingCompletion({
        puzzleId,
        puzzleType: card.type,
        points: card.points,
        rewardPieceType: card.rewardPieceType || null,
      });
      console.log('パズル完成！', { puzzleId, type: card.type, points: card.points, reward: card.rewardPieceType });
    } else {
      setAnnouncement('ピースを配置');
    }

    console.log('ピース配置:', { puzzleId, position, piece: selectedPiece.type, completed: isCompleted });
  };

  // マスターアクション開始
  const handleStartMasterAction = () => {
    if (!isMyTurn || !onUpdateGameState) return;
    if (currentPlayer.remainingActions <= 0) return;
    if (currentPlayer.usedMasterAction) return;
    if (currentPlayer.workingPuzzles.length === 0) return;

    setMasterActionMode(true);
    setMasterActionPlacedPuzzles(new Set());
    setAnnouncement('マスターアクション開始');
  };

  // マスターアクション完了
  const handleCompleteMasterAction = () => {
    if (!masterActionMode || !onUpdateGameState) return;

    // 1アクション消費＆usedMasterActionをtrueに
    const newRemainingActions = currentPlayer.remainingActions - 1;
    const nextPlayerIndex = newRemainingActions <= 0
      ? (gameState.currentPlayerIndex + 1) % gameState.playerOrder.length
      : gameState.currentPlayerIndex;
    const nextPlayerId = gameState.playerOrder[nextPlayerIndex];

    const updatedPlayers = gameState.players.map((p) => {
      if (p.id === debugControlPlayerId) {
        return {
          ...p,
          remainingActions: newRemainingActions <= 0 ? 0 : newRemainingActions,
          usedMasterAction: true,
        };
      }
      if (newRemainingActions <= 0 && p.id === nextPlayerId) {
        return { ...p, remainingActions: 3, usedMasterAction: false };
      }
      return p;
    });

    onUpdateGameState({ players: updatedPlayers, currentPlayerIndex: nextPlayerIndex });

    setMasterActionMode(false);
    setMasterActionPlacedPuzzles(new Set());
    setAnnouncement(`マスターアクション完了（${masterActionPlacedPuzzles.size}枚に配置）`);
  };

  // マスターアクションキャンセル
  const handleCancelMasterAction = () => {
    setMasterActionMode(false);
    setMasterActionPlacedPuzzles(new Set());
    setAnnouncement('マスターアクション中止');
  };

  // 回転
  const handleRotate = () => {
    setRotation((prev) => ((prev + 90) % 360) as 0 | 90 | 180 | 270);
  };

  // 反転
  const handleFlip = () => {
    setFlipped((prev) => !prev);
  };

  // レベル1ピース獲得
  const handleGetLevel1Piece = () => {
    if (!onUpdateGameState) return;

    // 自分のターンでない場合は無視
    if (!isMyTurn) return;

    // アクションが残っていない場合は無視
    if (currentPlayer.remainingActions <= 0) return;

    const newPiece = {
      id: `piece-${Date.now()}-dot`,
      type: 'dot' as PieceType,
      rotation: 0 as const,
    };

    // アクション消費とターン終了判定
    const newRemainingActions = currentPlayer.remainingActions - 1;
    const nextPlayerIndex = newRemainingActions <= 0
      ? (gameState.currentPlayerIndex + 1) % gameState.playerOrder.length
      : gameState.currentPlayerIndex;
    const nextPlayerId = gameState.playerOrder[nextPlayerIndex];

    const updatedPlayers = gameState.players.map((p) => {
      if (p.id === debugControlPlayerId) {
        return {
          ...p,
          pieces: [...p.pieces, newPiece],
          remainingActions: newRemainingActions <= 0 ? 0 : newRemainingActions,
        };
      }
      if (newRemainingActions <= 0 && p.id === nextPlayerId) {
        return { ...p, remainingActions: 3 };
      }
      return p;
    });

    onUpdateGameState({ players: updatedPlayers, currentPlayerIndex: nextPlayerIndex });
    setAnnouncement('レベル1ピースを獲得');
  };

  // レベルアップ開始
  const handleStartLevelUp = () => {
    if (!selectedPiece) return;
    const currentLevel = PIECE_DEFINITIONS[selectedPiece.type].level;
    if (currentLevel >= 4) return;

    setLevelChangeMode({
      pieceId: selectedPiece.id,
      targetLevel: currentLevel + 1,
      direction: 'up',
    });
  };

  // レベルダウン開始
  const handleStartLevelDown = () => {
    if (!selectedPiece) return;
    const currentLevel = PIECE_DEFINITIONS[selectedPiece.type].level;
    if (currentLevel <= 1) return;

    const targetLevel = currentLevel - 1;
    const targetTypes = PIECES_BY_LEVEL[targetLevel];

    // 選択肢が1つならそのまま確定
    if (targetTypes.length === 1) {
      handleConfirmLevelChange(targetTypes[0]);
    } else {
      setLevelChangeMode({
        pieceId: selectedPiece.id,
        targetLevel,
        direction: 'down',
      });
    }
  };

  // レベル変更確定（新しいピースタイプを選択）
  const handleConfirmLevelChange = (newType: PieceType) => {
    const pieceId = levelChangeMode?.pieceId ?? selectedPiece?.id;
    if (!pieceId || !onUpdateGameState) return;

    // 自分のターンでない場合は無視
    if (!isMyTurn) return;

    // アクションが残っていない場合は無視
    if (currentPlayer.remainingActions <= 0) return;

    const targetLevel = levelChangeMode?.targetLevel ?? PIECE_DEFINITIONS[newType].level;
    const direction = levelChangeMode?.direction ?? 'down';

    const updatedPieces = currentPlayer.pieces
      .filter((p) => p.id !== pieceId)
      .concat({
        id: `piece-${Date.now()}-${newType}`,
        type: newType,
        rotation: 0 as const,
      });

    // アクション消費とターン終了判定
    const newRemainingActions = currentPlayer.remainingActions - 1;
    const nextPlayerIndex = newRemainingActions <= 0
      ? (gameState.currentPlayerIndex + 1) % gameState.playerOrder.length
      : gameState.currentPlayerIndex;
    const nextPlayerId = gameState.playerOrder[nextPlayerIndex];

    const updatedPlayers = gameState.players.map((p) => {
      if (p.id === debugControlPlayerId) {
        return {
          ...p,
          pieces: updatedPieces,
          remainingActions: newRemainingActions <= 0 ? 0 : newRemainingActions,
        };
      }
      if (newRemainingActions <= 0 && p.id === nextPlayerId) {
        return { ...p, remainingActions: 3 };
      }
      return p;
    });

    onUpdateGameState({ players: updatedPlayers, currentPlayerIndex: nextPlayerIndex });
    setLevelChangeMode(null);
    setSelectedPieceId(null);
    setActionMode('none'); // アクション完了後にリセット
    setAnnouncement(`レベル${targetLevel}に${direction === 'up' ? 'アップ' : 'ダウン'}`);
  };

  // ドラッグ中のピース情報
  const draggingPiece = isDragging && selectedPiece
    ? { type: selectedPiece.type, rotation, flipped }
    : null;

  // 他のプレイヤーを取得
  const otherPlayers = gameState.players.filter((p) => p.id !== debugControlPlayerId);

  // 結果画面用：全プレイヤーの完成パズル数の最大値
  const maxCompletedPuzzles = Math.max(
    0,
    ...gameState.players.map((p) => (p.completedPuzzles || []).length)
  );

  // 結果画面用：パズルオープン演出
  useEffect(() => {
    if (gameState.phase !== 'ended') return;

    if (revealedCardIndex < maxCompletedPuzzles) {
      const timer = setTimeout(() => {
        setRevealedCardIndex((prev) => prev + 1);
      }, 1200); // 1.2秒ごとにオープン
      return () => clearTimeout(timer);
    } else if (!showFinalResults && revealedCardIndex >= maxCompletedPuzzles) {
      // 全てオープン後、少し待って結果表示
      const timer = setTimeout(() => {
        setShowFinalResults(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [gameState.phase, revealedCardIndex, maxCompletedPuzzles, showFinalResults]);

  // 最終スコア計算関数
  const calculateFinalScore = (player: typeof currentPlayer) => {
    const completedScore = player.score; // 完成パズルのポイント
    const finishingPenalty = player.finishingPenalty || 0; // 仕上げペナルティ
    // 未完成パズルのペナルティ（各パズルのポイントをマイナス）
    const incompletePenalty = player.workingPuzzles.reduce((sum, wp) => {
      const card = ALL_PUZZLES.find((p) => p.id === wp.cardId);
      return sum + (card?.points || 0);
    }, 0);
    return {
      completedScore,
      finishingPenalty,
      incompletePenalty,
      finalScore: completedScore - finishingPenalty - incompletePenalty,
    };
  };

  // 結果画面（ended フェーズ）
  if (gameState.phase === 'ended') {
    // 全プレイヤーのスコアを計算してソート
    const playerResults = gameState.players
      .map((player) => ({
        player,
        ...calculateFinalScore(player),
      }))
      .sort((a, b) => b.finalScore - a.finalScore);

    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 to-emerald-900">
        <div className="min-h-screen bg-black/20 p-4 flex flex-col items-center">
          {/* タイトル */}
          <div className="text-center my-6 mb-10">
            <img src="/boards/images/vec_logo_polyform.svg" alt="POLYFORM" className="h-8 mx-auto mb-2" style={{ filter: 'brightness(0) invert(1)' }} />
            <h1 className="text-2xl font-bold text-white">結果発表</h1>
          </div>

          {/* 各プレイヤーの完成パズル表示（縦に行で並ぶ） */}
          <div className="w-full max-w-5xl space-y-3 mb-6">
            {gameState.players.map((player) => {
              const result = playerResults.find((r) => r.player.id === player.id);
              // 順位を計算
              const rank = playerResults.findIndex((r) => r.player.id === player.id) + 1;
              const completedPuzzles = player.completedPuzzles || [];

              return (
                <div key={player.id} className="bg-slate-800/60 rounded-lg p-3">
                  {/* プレイヤー名とスコア（左上） */}
                  <div className="flex items-center gap-3 mb-2">
                    <AnimatePresence>
                      {showFinalResults && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm ${
                            rank === 1
                              ? 'bg-yellow-400 text-yellow-900'
                              : rank === 2
                              ? 'bg-slate-300 text-slate-700'
                              : rank === 3
                              ? 'bg-amber-600 text-amber-100'
                              : 'bg-slate-600 text-slate-300'
                          }`}
                        >
                          {rank}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="text-white font-bold">{player.name}</div>
                    <AnimatePresence>
                      {showFinalResults && result && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-amber-300 font-bold"
                        >
                          {result.finalScore}pt
                          <span className="text-slate-400 text-xs ml-1">
                            ({result.completedScore}
                            {result.finishingPenalty > 0 && <span className="text-red-400">-{result.finishingPenalty}</span>}
                            {result.incompletePenalty > 0 && <span className="text-red-400">-{result.incompletePenalty}</span>})
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 完成パズル一覧（横並び） */}
                  <div className="flex flex-wrap gap-3">
                    {completedPuzzles.length === 0 ? (
                      <div className="text-slate-500 text-xs py-2">完成なし</div>
                    ) : (
                      completedPuzzles.map((cp, cardIndex) => {
                        const card = ALL_PUZZLES.find((p) => p.id === cp.cardId);
                        if (!card) return null;

                        const isRevealed = cardIndex <= revealedCardIndex;

                        return (
                          <motion.div
                            key={cp.cardId}
                            initial={{ rotateY: 90, opacity: 0 }}
                            animate={{
                              rotateY: isRevealed ? 0 : 90,
                              opacity: isRevealed ? 1 : 0,
                            }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            style={{ perspective: 1000 }}
                          >
                            {isRevealed && (
                              <PuzzleCardDisplay
                                card={card}
                                size="xxs"
                                placedPieces={cp.placedPieces}
                                showReward={false}
                                compact={true}
                              />
                            )}
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ボタン */}
          {showFinalResults && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6"
            >
              <button
                onClick={onLeaveRoom}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-500 rounded-lg text-white font-bold"
              >
                ロビーに戻る
              </button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-900 to-emerald-900">
      <motion.div
        className="min-h-screen bg-black/20 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: gameStarted ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* ヘッダー（全幅） */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <img src="/boards/images/vec_logo_polyform.svg" alt="POLYFORM" className="h-6" style={{ filter: 'brightness(0) invert(1)' }} />
            <div className="text-white">
              <span className="font-bold">{currentPlayer.name}</span>
              <span className="text-white/60 ml-2">スコア: {currentPlayer.score}pt</span>
            </div>
            {isMyTurn ? (
              <span className="bg-teal-500 text-white text-xs px-2 py-1 rounded font-bold">
                あなたのターン
              </span>
            ) : (
              <span className="bg-slate-600 text-slate-300 text-xs px-2 py-1 rounded">
                {gameState.players.find(p => p.id === activePlayerId)?.name}のターン
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* デバッグ用：操作プレイヤー切り替え */}
            <select
              value={debugControlPlayerId}
              onChange={(e) => {
                setDebugControlPlayerId(e.target.value);
                setSelectedPieceId(null);
                setActionMode('none');
              }}
              className="px-2 py-1 bg-orange-600 text-white text-xs rounded font-medium"
            >
              {gameState.players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}を操作
                </option>
              ))}
            </select>
            {isMyTurn && (
              <span className="text-white/60 text-sm">
                アクション残り: {currentPlayer.remainingActions}
              </span>
            )}
            {isMyTurn && (
              <button
                onClick={handleEndTurn}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-white text-sm font-medium"
              >
                ターン終了
              </button>
            )}
            <button
              onClick={() => {
                if (onUpdateGameState) {
                  onUpdateGameState({ phase: 'finishing' });
                }
              }}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-white text-sm"
            >
              即仕上げ
            </button>
            <button
              onClick={onLeaveRoom}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm"
            >
              退出
            </button>
          </div>
        </div>

        {/* 2カラムレイアウト（1200px以下で縦積み） */}
        <div className="flex flex-col xl:flex-row gap-4 xl:items-start">
          {/* 左カラム: 他プレイヤー情報（1200px以下で全幅・上部配置） */}
          <div className="w-full xl:w-64 flex-shrink-0">
            <div className="relative bg-slate-800/50 border border-slate-600 rounded-lg p-3">
              {/* プレイヤー一覧（全幅時は横並び） */}
              <div className="flex flex-row xl:flex-col gap-3 overflow-x-auto">
                <div className={`rounded-lg p-2 border min-w-[200px] xl:min-w-0 flex-shrink-0 xl:flex-shrink ${
                  isMyTurn
                    ? 'bg-teal-700/50 border-teal-400 ring-2 ring-teal-400/50'
                    : 'bg-teal-700/30 border-teal-500/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="text-white text-sm font-medium truncate">{currentPlayer.name}</div>
                      {isMyTurn && <span className="text-[10px] bg-teal-500 text-white px-1 rounded">ターン中</span>}
                    </div>
                    <div className="text-white/60 text-xs">{currentPlayer.score}pt</div>
                  </div>
                  {/* 所持パズル＆完成枚数 */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex gap-1">
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
                    {/* 完成枚数 */}
                    <div className="flex gap-1 text-[10px]">
                      <div className="bg-slate-200 text-slate-700 px-1 rounded font-bold">{currentPlayer.completedWhite || 0}</div>
                      <div className="bg-slate-700 text-white px-1 rounded font-bold">{currentPlayer.completedBlack || 0}</div>
                    </div>
                  </div>
                  {/* 所持ピース（2段ピースの高さを最小に） */}
                  <div className="flex flex-wrap gap-0.5 items-center min-h-[17px]">
                    {currentPlayer.pieces.map((piece) => (
                      <PieceDisplay key={piece.id} type={piece.type} size="xs" />
                    ))}
                  </div>
                </div>
                {otherPlayers.map((player) => {
                  const isActivePlayer = player.id === activePlayerId;
                  return (
                  <div key={player.id} className={`rounded-lg p-2 border min-w-[200px] xl:min-w-0 flex-shrink-0 xl:flex-shrink ${
                    isActivePlayer
                      ? 'bg-amber-700/50 border-amber-400 ring-2 ring-amber-400/50'
                      : 'bg-slate-700/50 border-slate-600'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="text-white text-sm font-medium truncate">{player.name}</div>
                        {isActivePlayer && <span className="text-[10px] bg-amber-500 text-white px-1 rounded">ターン中</span>}
                      </div>
                      <div className="text-white/60 text-xs">
                        {gameState.settings?.scoreVisibility === 'hidden' ? '???pt' : `${player.score}pt`}
                      </div>
                    </div>
                    {/* 所持パズル＆完成枚数 */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-1">
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
                      {/* 完成枚数 */}
                      <div className="flex gap-1 text-[10px]">
                        <div className="bg-slate-200 text-slate-700 px-1 rounded font-bold">{player.completedWhite || 0}</div>
                        <div className="bg-slate-700 text-white px-1 rounded font-bold">{player.completedBlack || 0}</div>
                      </div>
                    </div>
                    {/* 所持ピース（2段ピースの高さを最小に） */}
                    <div className="flex flex-wrap gap-0.5 items-center min-h-[17px]">
                      {player.pieces.map((piece) => (
                        <PieceDisplay key={piece.id} type={piece.type} size="xs" />
                      ))}
                    </div>
                  </div>
                  );
                })}
                {otherPlayers.length === 0 && (
                  <div className="text-slate-500 text-xs">他のプレイヤーはいません</div>
                )}
              </div>
            </div>
          </div>

          {/* 右カラム: メインコンテンツ */}
          <div className="flex-1 min-w-0">
            {/* インフォボード（高さ固定） */}
            <div className="bg-slate-800/50 rounded-lg p-3 mb-4 h-[100px]">
              {gameState.phase === 'finishing' ? (
                /* 仕上げフェーズ用のUI */
                <>
                  {/* 上段：フェーズ名＋ペナルティ表示 */}
                  <div className="flex items-center justify-center gap-4 mb-3 h-8">
                    <span className="text-amber-400 text-sm font-bold">仕上げフェーズ</span>
                    {currentPlayer.finishingPenalty > 0 && (
                      <span className="text-red-400 text-sm">
                        配置ペナルティ: -{currentPlayer.finishingPenalty}pt
                      </span>
                    )}
                    <AnimatePresence mode="wait">
                      {announcement && (
                        <motion.div
                          key={announcement}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="bg-amber-600 text-white px-3 py-1 rounded-full text-sm font-medium"
                        >
                          {announcement}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 下段：配置 or 完了表示 */}
                  {currentPlayer.finishingDone ? (
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-slate-400 text-sm">仕上げ完了！他のプレイヤーを待っています...</span>
                      <div className="flex gap-1">
                        {gameState.players.map((p) => (
                          <span
                            key={p.id}
                            className={`text-xs px-2 py-0.5 rounded ${
                              p.finishingDone
                                ? 'bg-green-600 text-white'
                                : 'bg-slate-600 text-slate-300'
                            }`}
                          >
                            {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-amber-300 text-sm">
                        ピースをパズルに配置（1つ配置につき -1pt）。終わったら「仕上げ完了」を押してください
                      </span>
                      <button
                        onClick={() => {
                          if (!onUpdateGameState) return;
                          const updatedPlayers = gameState.players.map((p) => {
                            if (p.id === debugControlPlayerId) {
                              return { ...p, finishingDone: true };
                            }
                            return p;
                          });
                          // 全員完了したかチェック
                          const allDone = updatedPlayers.every((p) => p.finishingDone);
                          if (allDone) {
                            onUpdateGameState({ players: updatedPlayers, phase: 'ended' });
                          } else {
                            onUpdateGameState({ players: updatedPlayers });
                          }
                          setAnnouncement('仕上げ完了！');
                        }}
                        className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 rounded text-white text-sm font-medium"
                      >
                        仕上げ完了
                      </button>
                    </div>
                  )}
                </>
              ) : (
                /* 通常フェーズ用のUI */
                <>
              {/* 上段：ターン情報＋アナウンス（高さ固定） */}
              <div className="flex items-center justify-center gap-4 mb-3 h-8">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${isMyTurn ? 'text-teal-400' : 'text-slate-400'}`}>
                    {isMyTurn ? 'あなたのターン' : `${gameState.players.find(p => p.id === activePlayerId)?.name}のターン`}
                  </span>
                  <span className="text-slate-500 text-sm">
                    残りアクション: <span className={`font-bold ${
                      gameState.players.find(p => p.id === activePlayerId)?.remainingActions === 0 ? 'text-slate-500' : 'text-white'
                    }`}>{gameState.players.find(p => p.id === activePlayerId)?.remainingActions ?? 0}</span>
                  </span>
                </div>
                {/* 自分のターン時のみ上段にアナウンス表示 */}
                {isMyTurn && (
                  <AnimatePresence mode="wait">
                    {announcement && (
                      <motion.div
                        key={announcement}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="bg-teal-600 text-white px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {announcement}
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>

              {/* 下段：アクション選択 or ガイド表示 */}
              {isMyTurn && currentPlayer.remainingActions > 0 && !masterActionMode && (
                <>
                  {/* アクション未選択時：ボタン一覧 */}
                  {actionMode === 'none' && (
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button
                        onClick={() => setActionMode('takePuzzle')}
                        disabled={currentPlayer.workingPuzzles.length >= 4}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                          currentPlayer.workingPuzzles.length >= 4
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-700 text-white hover:bg-slate-600'
                        }`}
                      >
                        パズル取得
                      </button>
                      <button
                        onClick={handleGetLevel1Piece}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm font-medium transition-all flex items-center gap-1"
                      >
                        <PieceDisplay type="dot" size="xs" />
                        <span>ピース獲得</span>
                      </button>
                      <button
                        onClick={() => setActionMode('placePiece')}
                        disabled={currentPlayer.pieces.length === 0 || currentPlayer.workingPuzzles.length === 0}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                          currentPlayer.pieces.length === 0 || currentPlayer.workingPuzzles.length === 0
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-700 text-white hover:bg-slate-600'
                        }`}
                      >
                        ピース配置
                      </button>
                      <button
                        onClick={() => setActionMode('levelChange')}
                        disabled={currentPlayer.pieces.length === 0}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                          currentPlayer.pieces.length === 0
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-700 text-white hover:bg-slate-600'
                        }`}
                      >
                        レベル変更
                      </button>
                      <button
                        onClick={() => setActionMode('recycle')}
                        className="px-3 py-1.5 bg-slate-700 text-white hover:bg-slate-600 rounded text-sm font-medium transition-all"
                      >
                        リサイクル
                      </button>
                      {!currentPlayer.usedMasterAction && currentPlayer.workingPuzzles.length > 0 && (
                        <button
                          onClick={handleStartMasterAction}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-white text-sm font-medium transition-all"
                        >
                          マスター
                        </button>
                      )}
                    </div>
                  )}

                  {/* アクション選択後：ガイド表示 */}
                  {actionMode === 'takePuzzle' && (
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-teal-300 text-sm">場からカードを取得してください（カードまたは山札をクリック）</span>
                      <button
                        onClick={() => setActionMode('none')}
                        className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm"
                      >
                        キャンセル
                      </button>
                    </div>
                  )}

                  {actionMode === 'placePiece' && (
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-teal-300 text-sm">ピースを選んでパズルにドラッグしてください</span>
                      <button
                        onClick={() => setActionMode('none')}
                        className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm"
                      >
                        キャンセル
                      </button>
                    </div>
                  )}

                  {actionMode === 'levelChange' && (
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-teal-300 text-sm">ピースを選んでUP/DOWNボタンを押してください</span>
                      <button
                        onClick={() => setActionMode('none')}
                        className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm"
                      >
                        キャンセル
                      </button>
                    </div>
                  )}

                  {actionMode === 'recycle' && (
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-teal-300 text-sm">リサイクルする色を選択:</span>
                      <button
                        onClick={() => {
                          handleRecycle('white');
                          setActionMode('none');
                        }}
                        disabled={gameState.whitePuzzleMarket.length < 4 || gameState.whitePuzzleDeck.length < 4}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded text-slate-700 text-sm font-medium"
                      >
                        白
                      </button>
                      <button
                        onClick={() => {
                          handleRecycle('black');
                          setActionMode('none');
                        }}
                        disabled={gameState.blackPuzzleMarket.length < 4 || gameState.blackPuzzleDeck.length < 4}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm font-medium border border-slate-500"
                      >
                        黒
                      </button>
                      <button
                        onClick={() => setActionMode('none')}
                        className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm"
                      >
                        キャンセル
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* マスターアクション中の表示 */}
              {masterActionMode && (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-purple-300 text-sm">
                    マスターアクション中（{masterActionPlacedPuzzles.size}/{currentPlayer.workingPuzzles.length}枚配置）- 各パズルに1つずつ配置可能
                  </span>
                  <button
                    onClick={handleCompleteMasterAction}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-white text-sm font-medium"
                  >
                    完了
                  </button>
                  <button
                    onClick={handleCancelMasterAction}
                    className="px-2 py-1.5 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm"
                  >
                    中止
                  </button>
                </div>
              )}

              {/* ターン外 or アクション無しの表示 */}
              {(!isMyTurn || currentPlayer.remainingActions <= 0) && !masterActionMode && (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-slate-500 text-sm">
                    {currentPlayer.remainingActions <= 0 && isMyTurn ? 'アクションを使い切りました' : '相手のアクションを待っています...'}
                  </span>
                  {/* 他人のターン時は下段にアナウンス表示 */}
                  {!isMyTurn && (
                    <AnimatePresence mode="wait">
                      {announcement && (
                        <motion.div
                          key={announcement}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="bg-amber-600 text-white px-3 py-1 rounded-full text-sm font-medium"
                        >
                          {announcement}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              )}
                </>
              )}
            </div>

            {/* 場のパズル＆ピース一覧（横並び） */}
            <div className="flex gap-4 mb-4">
              {/* 場 */}
              <div className={`relative flex-1 min-w-0 rounded-lg p-4 overflow-x-auto transition-all border ${
                actionMode === 'takePuzzle'
                  ? 'bg-teal-800/30 border-teal-400 ring-2 ring-teal-400/30'
                  : 'bg-slate-800/50 border-slate-600'
              }`}>
          {/* 白パズル */}
          <div className="mb-3">
            <div className="flex gap-2 items-start justify-center">
              {whitePuzzles.map((card, index) => {
                const isAnimating = animatingCard?.cardId === card.id;
                const isNewCard = newCardId === card.id;
                const isRecyclingExit = recyclingMarket === 'white' && recyclePhase === 'exit';
                const isRecyclingEnter = recyclingMarket === 'white' && recyclePhase === 'enter';
                const isDealt = index < dealtCardCount;

                return (
                  <motion.div
                    key={card.id}
                    initial={{ rotateY: 90, opacity: 0, scale: 0.8 }}
                    animate={{
                      rotateY: isDealt || isNewCard || isRecyclingEnter ? 0 : 90,
                      opacity: !isDealt ? 0 : isAnimating || isRecyclingExit ? 0 : 1,
                      scale: isDealt ? 1 : 0.8,
                      y: isRecyclingExit ? 100 : 0,
                    }}
                    transition={{
                      rotateY: { duration: 0.4, ease: 'easeOut' },
                      opacity: { duration: 0.25, delay: isRecyclingExit ? index * 0.05 : 0 },
                      scale: { duration: 0.3 },
                      y: { duration: 0.3, delay: index * 0.05, ease: 'easeIn' },
                    }}
                    style={{ perspective: 1000 }}
                  >
                    <PuzzleCardDisplay
                      card={card}
                      size={cardSize}
                      onClick={actionMode === 'takePuzzle' && !isRecyclingExit && !isRecyclingEnter ? () => handleTakePuzzle(card.id, 'white') : undefined}
                    />
                  </motion.div>
                );
              })}
              {/* 山札（重なったカード風） */}
              {(() => {
                const canDraw = actionMode === 'takePuzzle' && currentPlayer.workingPuzzles.length < 4 && gameState.whitePuzzleDeck.length > 0 && !animatingCard;
                const deckSize = { width: CARD_SIZES[cardSize].width, height: CARD_SIZES[cardSize].height };
                return (
                  <div
                    className={`relative flex-shrink-0 ${canDraw ? 'cursor-pointer' : ''} ${gameState.whitePuzzleDeck.length === 0 ? 'opacity-60' : ''}`}
                    style={deckSize}
                    onClick={() => canDraw && handleDrawFromDeck('white')}
                  >
                    {/* 背面カード（3枚重ね） */}
                    <div
                      className="absolute top-1.5 left-1.5 rounded-lg bg-cover bg-center"
                      style={{ ...deckSize, backgroundImage: 'url(/boards/images/cards/card_pf_back_w.png)' }}
                    />
                    <div
                      className="absolute top-1 left-1 rounded-lg bg-cover bg-center"
                      style={{ ...deckSize, backgroundImage: 'url(/boards/images/cards/card_pf_back_w.png)' }}
                    />
                    {/* 表面カード */}
                    <div
                      className={`absolute top-0 left-0 rounded-lg bg-cover bg-center flex flex-col items-center justify-center transition-all ${canDraw ? 'hover:shadow-lg hover:shadow-teal-400/30' : ''}`}
                      style={{ ...deckSize, backgroundImage: 'url(/boards/images/cards/card_pf_back_w.png)' }}
                    >
                      <div className="text-slate-600 text-xs mb-1 font-medium">山札</div>
                      <div className={`text-slate-800 font-bold ${CARD_SIZES[cardSize].width < 130 ? 'text-xl' : 'text-3xl'}`}>{gameState.whitePuzzleDeck.length}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 黒パズル */}
          <div>
            <div className="flex gap-2 items-start justify-center">
              {blackPuzzles.map((card, index) => {
                const isAnimating = animatingCard?.cardId === card.id;
                const isNewCard = newCardId === card.id;
                const isRecyclingExit = recyclingMarket === 'black' && recyclePhase === 'exit';
                const isRecyclingEnter = recyclingMarket === 'black' && recyclePhase === 'enter';
                const isDealt = index < dealtCardCount;

                return (
                  <motion.div
                    key={card.id}
                    initial={{ rotateY: 90, opacity: 0, scale: 0.8 }}
                    animate={{
                      rotateY: isDealt || isNewCard || isRecyclingEnter ? 0 : 90,
                      opacity: !isDealt ? 0 : isAnimating || isRecyclingExit ? 0 : 1,
                      scale: isDealt ? 1 : 0.8,
                      y: isRecyclingExit ? 100 : 0,
                    }}
                    transition={{
                      rotateY: { duration: 0.4, ease: 'easeOut' },
                      opacity: { duration: 0.25, delay: isRecyclingExit ? index * 0.05 : 0 },
                      scale: { duration: 0.3 },
                      y: { duration: 0.3, delay: index * 0.05, ease: 'easeIn' },
                    }}
                    style={{ perspective: 1000 }}
                  >
                    <PuzzleCardDisplay
                      card={card}
                      size={cardSize}
                      onClick={actionMode === 'takePuzzle' && !isRecyclingExit && !isRecyclingEnter ? () => handleTakePuzzle(card.id, 'black') : undefined}
                    />
                  </motion.div>
                );
              })}
              {/* 山札（重なったカード風） */}
              {(() => {
                const canDraw = actionMode === 'takePuzzle' && currentPlayer.workingPuzzles.length < 4 && gameState.blackPuzzleDeck.length > 0 && !animatingCard;
                const deckSize = { width: CARD_SIZES[cardSize].width, height: CARD_SIZES[cardSize].height };
                return (
                  <div
                    className={`relative flex-shrink-0 ${canDraw ? 'cursor-pointer' : ''} ${gameState.blackPuzzleDeck.length === 0 ? 'opacity-60' : ''}`}
                    style={deckSize}
                    onClick={() => canDraw && handleDrawFromDeck('black')}
                  >
                    {/* 背面カード（3枚重ね） */}
                    <div
                      className="absolute top-1.5 left-1.5 rounded-lg bg-cover bg-center"
                      style={{ ...deckSize, backgroundImage: 'url(/boards/images/cards/card_pf_back_b.png)' }}
                    />
                    <div
                      className="absolute top-1 left-1 rounded-lg bg-cover bg-center"
                      style={{ ...deckSize, backgroundImage: 'url(/boards/images/cards/card_pf_back_b.png)' }}
                    />
                    {/* 表面カード */}
                    <div
                      className={`absolute top-0 left-0 rounded-lg bg-cover bg-center flex flex-col items-center justify-center transition-all ${canDraw ? 'hover:shadow-lg hover:shadow-teal-400/30' : ''}`}
                      style={{ ...deckSize, backgroundImage: 'url(/boards/images/cards/card_pf_back_b.png)' }}
                    >
                      <div className="text-slate-300 text-xs mb-1 font-medium">山札</div>
                      <div className={`text-white font-bold ${CARD_SIZES[cardSize].width < 130 ? 'text-xl' : 'text-3xl'}`}>{gameState.blackPuzzleDeck.length}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
              </div>

              {/* ピース一覧（1200px以下で非表示・1列表示） */}
              <div className="relative flex-shrink-0 w-24 bg-slate-800/50 border border-slate-600 rounded-lg p-3 hidden xl:block">
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((level) => (
                    <div key={level} className="space-y-1">
                      <div className="text-slate-400 text-xs">Lv.{level}</div>
                      <div className="flex flex-col gap-1 items-center">
                        {PIECES_BY_LEVEL[level].map((type) => (
                          <PieceDisplay key={type} type={type} size="sm" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

        {/* 下部エリア */}
        <div className="flex flex-col lg:flex-row gap-4">

          {/* 手持ちパズル（4枚並ぶ幅で固定） */}
          <div
            className={`relative rounded-lg p-4 flex-shrink-0 transition-all border ${
              actionMode === 'placePiece' || masterActionMode || (gameState.phase === 'finishing' && !currentPlayer.finishingDone)
                ? 'bg-teal-800/30 border-teal-400 ring-2 ring-teal-400/30'
                : 'bg-slate-800/50 border-slate-600'
            }`}
            style={{ width: CARD_SIZES[cardSize].width * 4 + 56 }}
          >
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
                      size={cardSize}
                      completed={completedPuzzleId === wp.cardId}
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
                    className="border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center text-slate-500"
                    style={{
                      width: CARD_SIZES[cardSize].width,
                      height: CARD_SIZES[cardSize].height,
                    }}
                  >
                    空き
                  </div>
                ))}
            </div>
          </div>

          {/* 右: 手持ちピース */}
          <div className={`relative rounded-lg p-4 flex-1 min-w-0 transition-all border ${
            actionMode === 'placePiece' || actionMode === 'levelChange' || masterActionMode || (gameState.phase === 'finishing' && !currentPlayer.finishingDone)
              ? 'bg-teal-800/30 border-teal-400 ring-2 ring-teal-400/30'
              : 'bg-slate-800/50 border-slate-600'
          }`}>
            {/* レベル変更選択モード */}
            {levelChangeMode && (
              <div className={`rounded-lg p-3 mb-4 border ${
                levelChangeMode.direction === 'up'
                  ? 'bg-green-900/50 border-green-400'
                  : 'bg-red-900/50 border-red-400'
              }`}>
                <div className="text-white text-sm mb-2">
                  レベル{levelChangeMode.targetLevel}のピースを選択：
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PIECES_BY_LEVEL[levelChangeMode.targetLevel].map((type) => (
                    <button
                      key={type}
                      onClick={() => handleConfirmLevelChange(type)}
                      className={`p-1.5 rounded ${
                        levelChangeMode.direction === 'up'
                          ? 'bg-green-700 hover:bg-green-600'
                          : 'bg-red-700 hover:bg-red-600'
                      }`}
                    >
                      <PieceDisplay type={type} size="xs" />
                    </button>
                  ))}
                  <button
                    onClick={() => setLevelChangeMode(null)}
                    className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white text-xs"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            {/* 選択中のピースのコントロール */}
            {selectedPiece && !levelChangeMode && (
              <div className="bg-slate-700/50 rounded-lg p-3 mb-4">
                <div className="text-white/60 text-sm mb-2">
                  Lv.{PIECE_DEFINITIONS[selectedPiece.type].level}
                  {actionMode === 'levelChange' ? ' UP/DOWNでレベル変更' : ' ドラッグして配置'}
                </div>
                <div className="flex items-center justify-between">
                  <PieceDisplay
                    type={selectedPiece.type}
                    rotation={rotation}
                    flipped={flipped}
                    size={toPieceSize(cardSize)}
                  />
                  <div className="flex gap-2">
                    {/* 回転・反転ボタン：ピース配置モード、マスターアクション中、または仕上げフェーズで表示 */}
                    {(actionMode === 'placePiece' || masterActionMode || (gameState.phase === 'finishing' && !currentPlayer.finishingDone)) && (
                      <>
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
                      </>
                    )}
                    {/* UP/DOWNボタン：レベル変更モードのみ表示 */}
                    {actionMode === 'levelChange' && (
                      <>
                        {PIECE_DEFINITIONS[selectedPiece.type].level < 4 && (
                          <button
                            onClick={handleStartLevelUp}
                            className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-white text-xs"
                          >
                            UP
                          </button>
                        )}
                        {PIECE_DEFINITIONS[selectedPiece.type].level > 1 && (
                          <button
                            onClick={handleStartLevelDown}
                            className="px-2 py-1 bg-red-600 hover:bg-red-500 rounded text-white text-xs"
                          >
                            DOWN
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ピース一覧（2段ピースの高さを最小に） */}
            <div className="flex flex-wrap gap-2 items-center" style={{ minHeight: getMinPieceHeight(cardSize) }}>
              {(() => {
                const isFinishingPhase = gameState.phase === 'finishing';
                const canInteract = isFinishingPhase
                  ? !currentPlayer.finishingDone // 仕上げフェーズ：完了していなければ操作可能
                  : (actionMode === 'placePiece' || actionMode === 'levelChange' || masterActionMode);
                return currentPlayer.pieces.map((piece) => (
                  <div
                    key={piece.id}
                    onMouseDown={canInteract ? (e) => handleDragStart(piece.id, e) : undefined}
                    onTouchStart={canInteract ? (e) => handleDragStart(piece.id, e) : undefined}
                    className={`inline-block p-1 rounded transition-all select-none ${
                      canInteract ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${
                      selectedPieceId === piece.id
                        ? 'ring-2 ring-white bg-white/20'
                        : canInteract ? 'hover:bg-white/10' : ''
                    }`}
                    style={{ touchAction: 'none' }}
                  >
                    <PieceDisplay
                      type={piece.type}
                      rotation={selectedPieceId === piece.id ? rotation : 0}
                      flipped={selectedPieceId === piece.id ? flipped : false}
                      size={toPieceSize(cardSize)}
                    />
                  </div>
                ));
              })()}
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
                        if (p.id === debugControlPlayerId) {
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

        {/* ドラッグオーバーレイ（パズル上でプレビュー中は非表示） */}
        {isDragging && selectedPiece && !hoverPuzzleId && (
          <DragOverlay
            type={selectedPiece.type}
            rotation={rotation}
            flipped={flipped}
            position={dragPosition}
          />
        )}
      </motion.div>
    </div>
  );
};
