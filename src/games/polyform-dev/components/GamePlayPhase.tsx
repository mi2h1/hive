import { useState, useEffect, useRef } from 'react';
import { RotateCw, FlipHorizontal, RotateCcw, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieceDisplay, getTransformedShape } from './PieceDisplay';
import { PuzzleCardDisplay, CARD_SIZES, type CardSizeType } from './PuzzleCardDisplay';
import { DroppablePuzzleCard, isValidPlacement } from './DroppablePuzzleCard';
import { DragOverlay } from './DraggablePiece';
import { ALL_PUZZLES } from '../data/puzzles';
import { PIECE_DEFINITIONS, PIECES_BY_LEVEL } from '../data/pieces';
import type { GameState, WorkingPuzzle, PlacedPiece, PuzzleCard, PieceType, PieceInstance, ActionLog } from '../types/game';

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
  isHost: boolean;
  onLeaveRoom: () => void;
  onUpdateGameState?: (updates: Partial<GameState>) => void;
  onPlayAgain?: () => void;
}

export const GamePlayPhase = ({
  gameState,
  currentPlayerId,
  isHost,
  onLeaveRoom,
  onUpdateGameState,
  onPlayAgain,
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

  // ピース変更選択モード（選択中のピースID）
  const [pieceChangeMode, setPieceChangeMode] = useState<string | null>(null);

  // ピース配置の仮状態（確定前）
  const [pendingPlacement, setPendingPlacement] = useState<{
    puzzleId: string;
    piece: PieceInstance;
    placedPiece: PlacedPiece;
  } | null>(null);

  // アクションログを追加するヘルパー関数（最新20件を保持）
  const createActionLog = (message: string): ActionLog[] => {
    const newLog: ActionLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message,
      timestamp: Date.now(),
    };
    const currentLogs = gameState.actionLogs || [];
    const updatedLogs = [...currentLogs, newLog].slice(-20); // 最新20件を保持
    return updatedLogs;
  };

  // 変更可能なピース一覧を取得
  const getAvailablePieceChanges = (pieceType: PieceType): { type: PieceType; category: 'up' | 'down' | 'same' }[] => {
    const currentLevel = PIECE_DEFINITIONS[pieceType].level;
    const result: { type: PieceType; category: 'up' | 'down' | 'same' }[] = [];

    // レベルアップ（現在レベルが4未満の場合）
    // 1つ上のレベルが全て在庫切れの場合、さらに上のレベルも選択肢に追加
    if (currentLevel < 4) {
      let targetLevel = currentLevel + 1;
      while (targetLevel <= 4) {
        const piecesAtLevel = PIECES_BY_LEVEL[targetLevel];
        const hasAnyInStock = piecesAtLevel.some((type) => gameState.pieceStock[type] > 0);

        // このレベルのピースを選択肢に追加
        piecesAtLevel.forEach((type) => {
          result.push({ type, category: 'up' });
        });

        // このレベルに在庫があるピースがあれば、これ以上上は見ない
        if (hasAnyInStock) {
          break;
        }
        // 全て在庫切れなら、さらに上のレベルも選択肢に追加
        targetLevel++;
      }
    }

    // 同レベル交換（自分以外）
    PIECES_BY_LEVEL[currentLevel].forEach((type) => {
      if (type !== pieceType) {
        result.push({ type, category: 'same' });
      }
    });

    // レベルダウン（現在レベルが1より大きい場合）
    // 1つ下のレベルが全て在庫切れの場合、さらに下のレベルも選択肢に追加
    if (currentLevel > 1) {
      let targetLevel = currentLevel - 1;
      while (targetLevel >= 1) {
        const piecesAtLevel = PIECES_BY_LEVEL[targetLevel];
        const hasAnyInStock = piecesAtLevel.some((type) => gameState.pieceStock[type] > 0);

        // このレベルのピースを選択肢に追加
        piecesAtLevel.forEach((type) => {
          result.push({ type, category: 'down' });
        });

        // このレベルに在庫があるピースがあれば、これ以上下は見ない
        if (hasAnyInStock) {
          break;
        }
        // 全て在庫切れなら、さらに下のレベルも選択肢に追加
        targetLevel--;
      }
    }

    return result;
  };

  // マスターアクションモード
  const [masterActionMode, setMasterActionMode] = useState(false);
  const [masterActionPlacedPuzzles, setMasterActionPlacedPuzzles] = useState<Set<string>>(new Set());
  // マスターアクション開始時のプレイヤー状態（キャンセル用）
  const [masterActionSnapshot, setMasterActionSnapshot] = useState<{
    pieces: PieceInstance[];
    workingPuzzles: WorkingPuzzle[];
  } | null>(null);
  // マスターアクション中の完成保留リスト
  const [masterActionPendingCompletions, setMasterActionPendingCompletions] = useState<{
    puzzleId: string;
    puzzleType: 'white' | 'black';
    points: number;
    rewardPieceType: PieceType | null;
  }[]>([]);
  // マスターアクション完了後の完成処理中フラグ
  const [isProcessingMasterCompletions, setIsProcessingMasterCompletions] = useState(false);
  // マスターアクション処理中に保持するプレイヤー状態（Firebase反映前に上書きされないように）
  const masterCompletionPreservedState = useRef<{
    remainingActions: number;
    usedMasterAction: boolean;
  } | null>(null);
  // マスターアクション完了後のターン遷移情報（完成処理後に適用）
  const [pendingTurnTransition, setPendingTurnTransition] = useState<{
    nextPlayerIndex: number;
    nextTurnNumber: number;
    shouldEndFinalRound: boolean;
  } | null>(null);

  // ターン開始時の状態（リセット用）
  const [turnStartSnapshot, setTurnStartSnapshot] = useState<{
    players: typeof gameState.players;
    whitePuzzleMarket: string[];
    blackPuzzleMarket: string[];
    whitePuzzleDeck: string[];
    blackPuzzleDeck: string[];
    pieceStock: typeof gameState.pieceStock;
  } | null>(null);

  // リサイクルアニメーション状態
  const [recyclingMarket, setRecyclingMarket] = useState<'white' | 'black' | null>(null);
  const [recyclePhase, setRecyclePhase] = useState<'exit' | 'enter' | null>(null);

  // 最終ターン中の黒カード取得カウント
  const [blackCardsTakenInFinalTurn, setBlackCardsTakenInFinalTurn] = useState(0);

  // 選択中のアクションモード
  type ActionMode = 'none' | 'takePuzzle' | 'placePiece' | 'pieceChange' | 'recycle' | 'masterAction';
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
      // マスターアクション処理中の場合、refから保持した値を取得
      const preservedState = masterCompletionPreservedState.current;

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
      let updatedPieceStock = { ...gameState.pieceStock };

      // 報酬ピースをストックから取得（在庫がある場合のみ）
      let rewardGiven = false;
      if (rewardPieceType && updatedPieceStock[rewardPieceType] > 0) {
        updatedPieces.push({
          id: `reward-${Date.now()}-${rewardPieceType}`,
          type: rewardPieceType,
          rotation: 0 as const,
        });
        updatedPieceStock[rewardPieceType] -= 1;
        rewardGiven = true;
      }

      const updatedPlayers = gameState.players.map((p) => {
        if (p.id === debugControlPlayerId) {
          // 完成パズルを配置情報付きで保存
          const newCompletedPuzzle = completedPuzzle
            ? { cardId: puzzleId, placedPieces: [...completedPuzzle.placedPieces] }
            : { cardId: puzzleId, placedPieces: [] };

          // マスターアクション処理中の場合、保持された値を使用
          // （handleCompleteMasterActionで設定された値がFirebase反映前に上書きされないように）
          return {
            ...p,
            // 保持された値があればそれを使用、なければ現在値を維持
            remainingActions: preservedState ? preservedState.remainingActions : p.remainingActions,
            usedMasterAction: preservedState ? preservedState.usedMasterAction : p.usedMasterAction,
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

      onUpdateGameState({ players: updatedPlayers, pieceStock: updatedPieceStock });
      setCompletedPuzzleId(null);
      setPendingCompletion(null);

      // 報酬ピースが在庫切れの場合は別メッセージ
      if (rewardPieceType && !rewardGiven) {
        setAnnouncement(`パズル完成！ +${points}pt（報酬ピース在庫切れ）`);
      } else {
        setAnnouncement(`パズル完成！ +${points}pt`);
      }
    }, 800); // ハイライト表示時間

    return () => clearTimeout(timer);
  }, [pendingCompletion]);

  // マスターアクション完成の連続処理
  useEffect(() => {
    // pendingCompletionがnullになったら次を処理
    if (pendingCompletion !== null) return;
    if (!isProcessingMasterCompletions) return;

    if (masterActionPendingCompletions.length > 0) {
      // 次の完成を処理
      const nextCompletion = masterActionPendingCompletions[0];
      // 少し遅延を入れて連続処理
      const timer = setTimeout(() => {
        setPendingCompletion(nextCompletion);
        setMasterActionPendingCompletions((prev) => prev.slice(1));
      }, 300);
      return () => clearTimeout(timer);
    } else {
      // 全て処理完了 - ターン遷移を適用
      setIsProcessingMasterCompletions(false);
      // 保持した状態を取得してからクリア（ターン遷移で使用）
      const preservedState = masterCompletionPreservedState.current;
      masterCompletionPreservedState.current = null;

      if (pendingTurnTransition && onUpdateGameState) {
        const { nextPlayerIndex, nextTurnNumber, shouldEndFinalRound } = pendingTurnTransition;
        const nextPlayerId = gameState.playerOrder[nextPlayerIndex];

        // 次のプレイヤーのアクションを3に設定、現在のプレイヤーの状態も保持
        const updatedPlayers = gameState.players.map((p) => {
          if (p.id === nextPlayerId) {
            return { ...p, remainingActions: 3, usedMasterAction: false };
          }
          // 現在のプレイヤーの場合、保持した状態を使用（Firebase反映前の上書き防止）
          if (p.id === debugControlPlayerId && preservedState) {
            return { ...p, remainingActions: preservedState.remainingActions, usedMasterAction: preservedState.usedMasterAction };
          }
          return p;
        });

        const updates: Partial<GameState> = {
          players: updatedPlayers,
          currentPlayerIndex: nextPlayerIndex,
          currentTurnNumber: nextTurnNumber,
          turnTransitionTimestamp: Date.now(),
        };

        if (shouldEndFinalRound) {
          updates.phase = 'finishing';
          setAnnouncement('最終ラウンド終了！仕上げフェーズへ');
        }

        onUpdateGameState(updates);
        setPendingTurnTransition(null);
      }
    }
  }, [pendingCompletion, isProcessingMasterCompletions, masterActionPendingCompletions, pendingTurnTransition, gameState.playerOrder, gameState.players, onUpdateGameState]);

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
        <div className="bg-slate-800/95 rounded-xl p-6 text-center">
          <div className="text-white mb-4">プレイヤーが見つかりません</div>
          <div className="text-slate-400 text-sm mb-6">
            ホストが退出した可能性があります
          </div>
          <button
            onClick={onLeaveRoom}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold transition-colors"
          >
            ロビーに戻る
          </button>
        </div>
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

  // ターン遷移中かどうか（1秒間の待機）
  const [isTurnTransitioning, setIsTurnTransitioning] = useState(false);
  useEffect(() => {
    const checkTransition = () => {
      if (gameState.turnTransitionTimestamp) {
        const elapsed = Date.now() - gameState.turnTransitionTimestamp;
        setIsTurnTransitioning(elapsed < 1000);
      } else {
        setIsTurnTransitioning(false);
      }
    };
    checkTransition();
    // 100msごとにチェックして遷移終了を検知
    const interval = setInterval(checkTransition, 100);
    return () => clearInterval(interval);
  }, [gameState.turnTransitionTimestamp]);

  // アクション可能かどうか（自分のターンで、遷移中でない）
  const canAct = isMyTurn && !isTurnTransitioning;

  // 最終ラウンド中かどうか
  const isFinalRound = gameState.finalRound;

  // ターン開始時にスナップショットを保存（リセット用）
  useEffect(() => {
    // 自分のターンで残りアクション3の時にスナップショットを保存
    if (isMyTurn && currentPlayer.remainingActions === 3 && !turnStartSnapshot) {
      setTurnStartSnapshot({
        players: JSON.parse(JSON.stringify(gameState.players)),
        whitePuzzleMarket: [...gameState.whitePuzzleMarket],
        blackPuzzleMarket: [...gameState.blackPuzzleMarket],
        whitePuzzleDeck: [...gameState.whitePuzzleDeck],
        blackPuzzleDeck: [...gameState.blackPuzzleDeck],
        pieceStock: { ...gameState.pieceStock },
      });
    }
    // ターンが終わったらスナップショットをクリア
    if (!isMyTurn && turnStartSnapshot) {
      setTurnStartSnapshot(null);
    }
  }, [isMyTurn, currentPlayer.remainingActions, gameState, turnStartSnapshot]);

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

    // ターン番号の更新（全員が1手番ずつ行う単位）
    // player index が 0 に戻るときに次のターンへ
    const isEndOfFullTurn = nextPlayerIndex === 0;
    const nextTurnNumber = isEndOfFullTurn ? gameState.currentTurnNumber + 1 : gameState.currentTurnNumber;

    // 最終ラウンド判定：黒パズルの山札が尽きたか確認
    const isBlackDeckEmpty = gameState.blackPuzzleDeck.length === 0;
    const shouldTriggerFinalRound = !gameState.finalRound && isBlackDeckEmpty;

    // 最終ラウンド終了判定：
    // 最終ラウンドフラグが立ったターンの「次のターン」が終わったら仕上げへ
    // 例: 10ターン目にフラグON → 11ターン目終了後 → 仕上げ
    const shouldEndFinalRound =
      gameState.finalRound &&
      isEndOfFullTurn &&
      gameState.finalRoundTurnNumber !== null &&
      nextTurnNumber > gameState.finalRoundTurnNumber + 1;

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
        currentTurnNumber: nextTurnNumber,
      });
      setAnnouncement('最終ラウンド終了！仕上げフェーズへ');
    } else if (shouldTriggerFinalRound) {
      // 最終ラウンド開始：現在のターン番号を記録
      onUpdateGameState({
        players: updatedPlayers,
        currentPlayerIndex: nextPlayerIndex,
        currentTurnNumber: nextTurnNumber,
        finalRound: true,
        finalRoundTurnNumber: gameState.currentTurnNumber, // フラグが立ったターン番号を記録
      });
      setAnnouncement('最終ラウンド開始！次のターン終了後に仕上げへ');
    } else {
      // 通常のターン終了
      onUpdateGameState({
        players: updatedPlayers,
        currentPlayerIndex: nextPlayerIndex,
        currentTurnNumber: nextTurnNumber,
      });
      setAnnouncement('');
    }
  };

  // 手動でターン終了
  const handleEndTurn = () => {
    if (!canAct || !onUpdateGameState) return;
    endTurn();
  };

  // ターンをリセット（スナップショットに復元）
  const handleResetTurn = () => {
    if (!turnStartSnapshot || !onUpdateGameState) return;

    // スナップショットから状態を復元
    onUpdateGameState({
      players: JSON.parse(JSON.stringify(turnStartSnapshot.players)),
      whitePuzzleMarket: [...turnStartSnapshot.whitePuzzleMarket],
      blackPuzzleMarket: [...turnStartSnapshot.blackPuzzleMarket],
      whitePuzzleDeck: [...turnStartSnapshot.whitePuzzleDeck],
      blackPuzzleDeck: [...turnStartSnapshot.blackPuzzleDeck],
      pieceStock: { ...turnStartSnapshot.pieceStock },
    });

    // ローカル状態もリセット
    setActionMode('none');
    setSelectedPieceId(null);
    setMasterActionMode(false);
    setMasterActionPlacedPuzzles(new Set());
    setMasterActionSnapshot(null);
    setAnnouncement('ターンをリセットしました');

    // スナップショットはクリアしない（次のリセットのために保持）
  };

  // ターンを確定（アクション消費後）
  const handleConfirmTurn = () => {
    // スナップショットをクリアしてターン終了
    setTurnStartSnapshot(null);
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

    // 自分のターンでない場合（遷移中含む）は無視
    if (!canAct) {
      console.log('自分のターンではありません（または遷移中）');
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
    if (isFinalRound && puzzleType === 'black' && blackCardsTakenInFinalTurn >= 1) {
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

    // 自分のターンでない場合（遷移中含む）は無視
    if (!canAct) return;

    // アクションが残っていない場合は無視
    if (currentPlayer.remainingActions <= 0) return;

    // 所持パズルが4枚以上なら取得不可
    if (currentPlayer.workingPuzzles.length >= 4) {
      console.log('所持パズルが上限です');
      return;
    }

    // 最終ターンで黒カードを既に1枚取得済みなら取得不可
    if (isFinalRound && deckType === 'black' && blackCardsTakenInFinalTurn >= 1) {
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
    let turnEnded = false;

    if (newRemainingActions <= 0) {
      // ターン終了：次のプレイヤーへ
      turnEnded = true;
      nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.playerOrder.length;
      const nextPlayerId = gameState.playerOrder[nextPlayerIndex];
      finalPlayers = updatedPlayers.map((p) => {
        if (p.id === nextPlayerId) {
          return { ...p, remainingActions: 3, usedMasterAction: false };
        }
        return p;
      });
    }

    // ターン番号の計算
    const isEndOfFullTurn = turnEnded && nextPlayerIndex === 0;
    const nextTurnNumber = isEndOfFullTurn ? gameState.currentTurnNumber + 1 : gameState.currentTurnNumber;

    // ゲーム状態を更新
    const updates: Partial<GameState> = {
      players: finalPlayers,
      currentPlayerIndex: nextPlayerIndex,
      currentTurnNumber: nextTurnNumber,
      turnTransitionTimestamp: turnEnded ? Date.now() : undefined,
    };

    if (deckType === 'white') {
      updates.whitePuzzleDeck = deck;
    } else {
      updates.blackPuzzleDeck = deck;
    }

    // 最終ラウンド終了チェック（フルターン終了時に判定）
    const shouldEndFinalRound =
      gameState.finalRound &&
      isEndOfFullTurn &&
      gameState.finalRoundTurnNumber !== null &&
      nextTurnNumber > gameState.finalRoundTurnNumber + 1;

    if (shouldEndFinalRound) {
      updates.phase = 'finishing';
      setAnnouncement('最終ラウンド終了！仕上げフェーズへ');
    }
    // 最終ラウンド開始チェック（黒パズルの山札が空になったら）
    else if (!gameState.finalRound && deckType === 'black' && deck.length === 0) {
      updates.finalRound = true;
      updates.finalRoundTurnNumber = gameState.currentTurnNumber;
      setAnnouncement('最終ラウンド開始！');
    } else {
      setAnnouncement('山札からカードを引いた');
    }

    onUpdateGameState(updates);
    setActionMode('none'); // アクション完了後にリセット

    // 最終ラウンド中で黒カードを引いた場合、カウントを増やす
    if (isFinalRound && deckType === 'black') {
      setBlackCardsTakenInFinalTurn((prev) => prev + 1);
    }

    console.log('山札から取得:', { drawnCardId, deckType });
  };

  // リサイクル開始（アニメーション）
  const handleRecycle = (marketType: 'white' | 'black') => {
    if (!onUpdateGameState || recyclingMarket) return;

    // 自分のターンでない場合（遷移中含む）は無視
    if (!canAct) return;

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
    // マスターアクション処理後にFirebase反映前の場合、保持した値を使用
    const currentRemainingActions = masterCompletionPreservedState.current
      ? masterCompletionPreservedState.current.remainingActions
      : currentPlayer.remainingActions;
    const newRemainingActions = currentRemainingActions - 1;
    const nextPlayerIndex = newRemainingActions <= 0
      ? (gameState.currentPlayerIndex + 1) % gameState.playerOrder.length
      : gameState.currentPlayerIndex;
    const nextPlayerId = gameState.playerOrder[nextPlayerIndex];

    const updatedPlayers = gameState.players.map((p) => {
      if (p.id === debugControlPlayerId) {
        // マスターアクション処理後の場合、usedMasterActionも保持
        const currentUsedMasterAction = masterCompletionPreservedState.current
          ? masterCompletionPreservedState.current.usedMasterAction
          : p.usedMasterAction;
        return { ...p, remainingActions: newRemainingActions <= 0 ? 0 : newRemainingActions, usedMasterAction: currentUsedMasterAction };
      }
      if (newRemainingActions <= 0 && p.id === nextPlayerId) {
        return { ...p, remainingActions: 3, usedMasterAction: false };
      }
      return p;
    });

    // ゲーム状態を更新
    const turnEnded = newRemainingActions <= 0;
    const logMessage = `${currentPlayer.name}がリサイクル`;
    const updates: Partial<GameState> = {
      players: updatedPlayers,
      currentPlayerIndex: nextPlayerIndex,
      announcement: logMessage,
      actionLogs: createActionLog(logMessage),
      turnTransitionTimestamp: turnEnded ? Date.now() : undefined,
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
    // マスターアクション処理後にFirebase反映前の場合、保持した値を使用
    const currentRemainingActions = masterCompletionPreservedState.current
      ? masterCompletionPreservedState.current.remainingActions
      : currentPlayer.remainingActions;
    const newRemainingActions = currentRemainingActions - 1;
    const turnEnded = newRemainingActions <= 0;
    const nextPlayerIndex = turnEnded
      ? (gameState.currentPlayerIndex + 1) % gameState.playerOrder.length
      : gameState.currentPlayerIndex;
    const nextPlayerId = gameState.playerOrder[nextPlayerIndex];

    // ターン番号の計算
    const isEndOfFullTurn = turnEnded && nextPlayerIndex === 0;
    const nextTurnNumber = isEndOfFullTurn ? gameState.currentTurnNumber + 1 : gameState.currentTurnNumber;

    const updatedPlayers = gameState.players.map((p) => {
      if (p.id === debugControlPlayerId) {
        // マスターアクション処理後の場合、usedMasterActionも保持
        const currentUsedMasterAction = masterCompletionPreservedState.current
          ? masterCompletionPreservedState.current.usedMasterAction
          : p.usedMasterAction;
        return {
          ...p,
          workingPuzzles: [...p.workingPuzzles, newWorkingPuzzle],
          remainingActions: turnEnded ? 0 : newRemainingActions,
          usedMasterAction: currentUsedMasterAction,
        };
      }
      if (turnEnded && p.id === nextPlayerId) {
        return { ...p, remainingActions: 3, usedMasterAction: false };
      }
      return p;
    });

    // ゲーム状態を更新
    const updates: Partial<GameState> = {
      players: updatedPlayers,
      currentPlayerIndex: nextPlayerIndex,
      currentTurnNumber: nextTurnNumber,
      turnTransitionTimestamp: turnEnded ? Date.now() : undefined,
    };

    if (puzzleType === 'white') {
      updates.whitePuzzleMarket = market;
      updates.whitePuzzleDeck = deck;
    } else {
      updates.blackPuzzleMarket = market;
      updates.blackPuzzleDeck = deck;
    }

    // 最終ラウンド終了チェック（フルターン終了時に判定）
    const shouldEndFinalRound =
      gameState.finalRound &&
      isEndOfFullTurn &&
      gameState.finalRoundTurnNumber !== null &&
      nextTurnNumber > gameState.finalRoundTurnNumber + 1;

    let logMessage: string;
    if (shouldEndFinalRound) {
      updates.phase = 'finishing';
      logMessage = '最終ラウンド終了！仕上げフェーズへ';
      updates.announcement = logMessage;
      setAnnouncement(logMessage);
    }
    // 最終ラウンド開始チェック（黒パズルの山札が空になったら）
    else if (!gameState.finalRound && puzzleType === 'black' && deck.length === 0) {
      updates.finalRound = true;
      updates.finalRoundTurnNumber = gameState.currentTurnNumber;
      logMessage = '最終ラウンド開始！';
      updates.announcement = logMessage;
      setAnnouncement(logMessage);
    } else {
      logMessage = `${currentPlayer.name}がカードを取得`;
      updates.announcement = logMessage;
      setAnnouncement('カードを取得');
    }
    updates.actionLogs = createActionLog(logMessage);

    // 新しいカードのIDを設定（フリップアニメーション用）
    setNewCardId(addedCardId);
    onUpdateGameState(updates);
    setAnimatingCard(null);
    setActionMode('none'); // アクション完了後にリセット

    // 最終ラウンド中で黒カードを取得した場合、カウントを増やす
    if (isFinalRound && puzzleType === 'black') {
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
      if (actionMode !== 'placePiece' && actionMode !== 'pieceChange' && !masterActionMode) return;
    }

    // ピース変更モードの場合：選択して変更先一覧を表示
    if (actionMode === 'pieceChange') {
      setSelectedPieceId(pieceId);
      setPieceChangeMode(pieceId);
      return;
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

      // 自分のターンでない場合（遷移中含む）は無視
      if (!canAct) return;

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
      flipped,
      position,
    };

    const newPlacedPieces = [...workingPuzzle.placedPieces, newPlacedPiece];

    // 完成判定
    const totalCells = card.shape.flat().filter(Boolean).length;
    let filledCells = 0;
    newPlacedPieces.forEach((placed) => {
      const shape = getTransformedShape(placed.type, placed.rotation, placed.flipped);
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

      // 完成時はキューに追加（確定時にまとめて処理）
      if (isCompleted) {
        setMasterActionPendingCompletions((prev) => [
          ...prev,
          {
            puzzleId,
            puzzleType: card.type,
            points: card.points,
            rewardPieceType: card.rewardPieceType || null,
          },
        ]);
        setAnnouncement(`パズル完成！（確定時に処理）`);
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

    // 通常のピース配置：仮配置状態にして確定を待つ
    setPendingPlacement({
      puzzleId,
      piece: selectedPiece,
      placedPiece: newPlacedPiece,
    });
    setAnnouncement('配置を確定してください');
    console.log('ピース仮配置:', { puzzleId, position, piece: selectedPiece.type });
  };

  // ピース配置を確定
  const handleConfirmPlacement = () => {
    if (!pendingPlacement || !onUpdateGameState) return;

    const { puzzleId, piece, placedPiece } = pendingPlacement;

    const workingPuzzle = currentPlayer.workingPuzzles.find((wp) => wp.cardId === puzzleId);
    if (!workingPuzzle) return;

    const card = ALL_PUZZLES.find((p) => p.id === puzzleId);
    if (!card) return;

    const newPlacedPieces = [...workingPuzzle.placedPieces, placedPiece];

    // 完成判定
    const totalCells = card.shape.flat().filter(Boolean).length;
    let filledCells = 0;
    newPlacedPieces.forEach((placed) => {
      const shape = getTransformedShape(placed.type, placed.rotation, placed.flipped);
      filledCells += shape.length;
    });
    const isCompleted = filledCells === totalCells;

    // 手持ちからピースを削除
    let updatedPieces = currentPlayer.pieces.filter((p) => p.id !== piece.id);

    // 配置を更新
    let updatedWorkingPuzzles = currentPlayer.workingPuzzles.map((wp) => {
      if (wp.cardId === puzzleId) {
        return { ...wp, placedPieces: newPlacedPieces };
      }
      return wp;
    });

    // アクション消費
    const newRemainingActions = currentPlayer.remainingActions - 1;
    const turnEnded = newRemainingActions <= 0;
    const nextPlayerIndex = turnEnded
      ? (gameState.currentPlayerIndex + 1) % gameState.playerOrder.length
      : gameState.currentPlayerIndex;
    const nextPlayerId = gameState.playerOrder[nextPlayerIndex];

    // ターン番号の計算
    const isEndOfFullTurn = turnEnded && nextPlayerIndex === 0;
    const nextTurnNumber = isEndOfFullTurn ? gameState.currentTurnNumber + 1 : gameState.currentTurnNumber;

    // 完成時の追加処理
    let completedPuzzleData: { cardId: string; placedPieces: PlacedPiece[] } | null = null;
    let scoreToAdd = 0;
    let updatedPieceStock = { ...gameState.pieceStock };

    if (isCompleted) {
      // 完成したパズルに配置されていたピースを手元に戻す
      const returnedPieces = newPlacedPieces.map((placed) => ({
        id: `returned-${Date.now()}-${placed.pieceId}`,
        type: placed.type,
        rotation: 0 as const,
      }));
      updatedPieces = [...updatedPieces, ...returnedPieces];

      // 報酬ピースをストックから取得（在庫があれば）
      if (card.rewardPieceType && updatedPieceStock[card.rewardPieceType] > 0) {
        updatedPieces.push({
          id: `reward-${Date.now()}-${card.rewardPieceType}`,
          type: card.rewardPieceType,
          rotation: 0 as const,
        });
        updatedPieceStock[card.rewardPieceType]--;
      }

      // 完成パズルデータ
      completedPuzzleData = { cardId: puzzleId, placedPieces: [...newPlacedPieces] };
      scoreToAdd = card.points;

      // 作業中パズルから削除
      updatedWorkingPuzzles = updatedWorkingPuzzles.filter((wp) => wp.cardId !== puzzleId);
    }

    // Firebaseに同期
    const updatedPlayers = gameState.players.map((p) => {
      if (p.id === debugControlPlayerId) {
        const playerUpdate: typeof p = {
          ...p,
          pieces: updatedPieces,
          workingPuzzles: updatedWorkingPuzzles,
          remainingActions: turnEnded ? 0 : newRemainingActions,
        };
        if (isCompleted && completedPuzzleData) {
          playerUpdate.score = p.score + scoreToAdd;
          playerUpdate.completedPuzzles = [...(p.completedPuzzles || []), completedPuzzleData];
          playerUpdate.completedWhite = card.type === 'white' ? (p.completedWhite || 0) + 1 : (p.completedWhite || 0);
          playerUpdate.completedBlack = card.type === 'black' ? (p.completedBlack || 0) + 1 : (p.completedBlack || 0);
        }
        return playerUpdate;
      }
      if (turnEnded && p.id === nextPlayerId) {
        return { ...p, remainingActions: 3, usedMasterAction: false };
      }
      return p;
    });

    const updates: Partial<GameState> = {
      players: updatedPlayers,
      currentPlayerIndex: nextPlayerIndex,
      currentTurnNumber: nextTurnNumber,
      turnTransitionTimestamp: turnEnded ? Date.now() : undefined,
    };

    if (isCompleted) {
      updates.pieceStock = updatedPieceStock;
    }

    // 最終ラウンド終了チェック（フルターン終了時に判定）
    const shouldEndFinalRound =
      gameState.finalRound &&
      isEndOfFullTurn &&
      gameState.finalRoundTurnNumber !== null &&
      nextTurnNumber > gameState.finalRoundTurnNumber + 1;

    let logMessage: string;
    if (shouldEndFinalRound) {
      updates.phase = 'finishing';
      logMessage = '最終ラウンド終了！仕上げフェーズへ';
      updates.announcement = logMessage;
      setAnnouncement(logMessage);
    } else if (isCompleted) {
      logMessage = `${currentPlayer.name}がパズル完成！ +${card.points}pt`;
      updates.announcement = logMessage;
      // setAnnouncementは下で実行
    } else {
      logMessage = `${currentPlayer.name}がピースを配置`;
      updates.announcement = logMessage;
      // setAnnouncementは下で実行
    }
    updates.actionLogs = createActionLog(logMessage);

    onUpdateGameState(updates);

    // 状態をリセット
    setPendingPlacement(null);
    setActionMode('none');

    // 完成時はアニメーション表示（ただしFirebase更新は既に完了）
    if (isCompleted) {
      setCompletedPuzzleId(puzzleId);
      setAnnouncement(`パズル完成！ +${card.points}pt`);
      // アニメーション後にハイライトをクリア
      setTimeout(() => {
        setCompletedPuzzleId(null);
      }, 800);
      console.log('パズル完成！', { puzzleId, type: card.type, points: card.points, reward: card.rewardPieceType });
    } else {
      setAnnouncement('ピースを配置');
    }
  };

  // ピース配置をキャンセル
  const handleCancelPlacement = () => {
    setPendingPlacement(null);
    setSelectedPieceId(null);
    setRotation(0);
    setFlipped(false);
    setAnnouncement(null);
    setActionMode('none'); // アクション選択に戻る
  };

  // マスターアクション開始
  const handleStartMasterAction = () => {
    if (!canAct || !onUpdateGameState) return;
    if (currentPlayer.remainingActions <= 0) return;
    if (currentPlayer.usedMasterAction) return;
    if (currentPlayer.workingPuzzles.length === 0) return;

    // キャンセル用にプレイヤーの現在状態を保存（ディープコピー）
    setMasterActionSnapshot({
      pieces: JSON.parse(JSON.stringify(currentPlayer.pieces)),
      workingPuzzles: JSON.parse(JSON.stringify(currentPlayer.workingPuzzles)),
    });

    setMasterActionMode(true);
    setMasterActionPlacedPuzzles(new Set());
    setMasterActionPendingCompletions([]);
    setAnnouncement('マスターアクション開始');
  };

  // マスターアクション完了
  const handleCompleteMasterAction = () => {
    if (!masterActionMode || !onUpdateGameState) return;

    // 1アクション消費＆usedMasterActionをtrueに
    const newRemainingActions = currentPlayer.remainingActions - 1;
    const turnEnded = newRemainingActions <= 0;
    const nextPlayerIndex = turnEnded
      ? (gameState.currentPlayerIndex + 1) % gameState.playerOrder.length
      : gameState.currentPlayerIndex;
    const nextPlayerId = gameState.playerOrder[nextPlayerIndex];

    // ターン番号の計算
    const isEndOfFullTurn = turnEnded && nextPlayerIndex === 0;
    const nextTurnNumber = isEndOfFullTurn ? gameState.currentTurnNumber + 1 : gameState.currentTurnNumber;

    // 最終ラウンド終了チェック（フルターン終了時に判定）
    const shouldEndFinalRound =
      gameState.finalRound &&
      isEndOfFullTurn &&
      gameState.finalRoundTurnNumber !== null &&
      nextTurnNumber > gameState.finalRoundTurnNumber + 1;

    setMasterActionMode(false);
    setMasterActionPlacedPuzzles(new Set());
    setMasterActionSnapshot(null);

    // 完成保留リストがある場合は、ターン遷移を遅延して完成処理を先に行う
    if (masterActionPendingCompletions.length > 0) {
      // 現在のプレイヤーのアクション消費とusedMasterActionのみ更新
      const updatedPlayers = gameState.players.map((p) => {
        if (p.id === debugControlPlayerId) {
          return {
            ...p,
            remainingActions: turnEnded ? 0 : newRemainingActions,
            usedMasterAction: true,
          };
        }
        return p;
      });
      const logMessage = `${currentPlayer.name}がマスターアクション（${masterActionPendingCompletions.length}枚完成）`;
      onUpdateGameState({
        players: updatedPlayers,
        announcement: logMessage,
        actionLogs: createActionLog(logMessage),
      });

      // ターン遷移情報を保存（完成処理後に適用）
      if (turnEnded) {
        setPendingTurnTransition({
          nextPlayerIndex,
          nextTurnNumber,
          shouldEndFinalRound,
        });
      }

      // マスターアクション処理中の状態を保持（全completionで共有）
      masterCompletionPreservedState.current = {
        remainingActions: turnEnded ? 0 : newRemainingActions,
        usedMasterAction: true,
      };
      setIsProcessingMasterCompletions(true);
      // 最初の完成を処理開始
      const firstCompletion = masterActionPendingCompletions[0];
      setPendingCompletion(firstCompletion);
      setMasterActionPendingCompletions((prev) => prev.slice(1));
      setAnnouncement(`パズル完成処理中... (1/${masterActionPendingCompletions.length})`);
    } else {
      // 完成保留がない場合は即座にターン遷移
      const updatedPlayers = gameState.players.map((p) => {
        if (p.id === debugControlPlayerId) {
          return {
            ...p,
            remainingActions: turnEnded ? 0 : newRemainingActions,
            usedMasterAction: true,
          };
        }
        if (turnEnded && p.id === nextPlayerId) {
          return { ...p, remainingActions: 3, usedMasterAction: false };
        }
        return p;
      });

      const updates: Partial<GameState> = {
        players: updatedPlayers,
        currentPlayerIndex: nextPlayerIndex,
        currentTurnNumber: nextTurnNumber,
        turnTransitionTimestamp: turnEnded ? Date.now() : undefined,
      };

      let logMessage: string;
      if (shouldEndFinalRound) {
        updates.phase = 'finishing';
        logMessage = '最終ラウンド終了！仕上げフェーズへ';
        updates.announcement = logMessage;
        setAnnouncement(logMessage);
      } else {
        logMessage = `${currentPlayer.name}がマスターアクション（${masterActionPlacedPuzzles.size}枚に配置）`;
        updates.announcement = logMessage;
        setAnnouncement(`マスターアクション完了（${masterActionPlacedPuzzles.size}枚に配置）`);
      }
      updates.actionLogs = createActionLog(logMessage);

      onUpdateGameState(updates);
    }
  };

  // マスターアクションキャンセル
  const handleCancelMasterAction = () => {
    // スナップショットがあれば、プレイヤーの状態を復元
    if (masterActionSnapshot && onUpdateGameState) {
      const updatedPlayers = gameState.players.map((p) => {
        if (p.id === debugControlPlayerId) {
          return {
            ...p,
            pieces: masterActionSnapshot.pieces,
            workingPuzzles: masterActionSnapshot.workingPuzzles,
          };
        }
        return p;
      });
      onUpdateGameState({ players: updatedPlayers });
    }

    setMasterActionMode(false);
    setMasterActionPlacedPuzzles(new Set());
    setMasterActionSnapshot(null);
    setMasterActionPendingCompletions([]);
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

    // 自分のターンでない場合（遷移中含む）は無視
    if (!canAct) return;

    // アクションが残っていない場合は無視
    if (currentPlayer.remainingActions <= 0) return;

    // 在庫確認
    if (gameState.pieceStock.dot <= 0) {
      setAnnouncement('レベル1ピースは在庫切れです');
      return;
    }

    const newPiece = {
      id: `piece-${Date.now()}-dot`,
      type: 'dot' as PieceType,
      rotation: 0 as const,
    };

    // ストック更新
    const updatedPieceStock = { ...gameState.pieceStock };
    updatedPieceStock.dot -= 1;

    // アクション消費とターン終了判定
    // マスターアクション処理後にFirebase反映前の場合、保持した値を使用
    const currentRemainingActions = masterCompletionPreservedState.current
      ? masterCompletionPreservedState.current.remainingActions
      : currentPlayer.remainingActions;
    const newRemainingActions = currentRemainingActions - 1;
    const turnEnded = newRemainingActions <= 0;
    const nextPlayerIndex = turnEnded
      ? (gameState.currentPlayerIndex + 1) % gameState.playerOrder.length
      : gameState.currentPlayerIndex;
    const nextPlayerId = gameState.playerOrder[nextPlayerIndex];

    // ターン番号の計算
    const isEndOfFullTurn = turnEnded && nextPlayerIndex === 0;
    const nextTurnNumber = isEndOfFullTurn ? gameState.currentTurnNumber + 1 : gameState.currentTurnNumber;

    const updatedPlayers = gameState.players.map((p) => {
      if (p.id === debugControlPlayerId) {
        // マスターアクション処理後の場合、usedMasterActionも保持
        const currentUsedMasterAction = masterCompletionPreservedState.current
          ? masterCompletionPreservedState.current.usedMasterAction
          : p.usedMasterAction;
        return {
          ...p,
          pieces: [...p.pieces, newPiece],
          remainingActions: turnEnded ? 0 : newRemainingActions,
          usedMasterAction: currentUsedMasterAction,
        };
      }
      if (turnEnded && p.id === nextPlayerId) {
        return { ...p, remainingActions: 3, usedMasterAction: false };
      }
      return p;
    });

    const updates: Partial<GameState> = {
      players: updatedPlayers,
      currentPlayerIndex: nextPlayerIndex,
      currentTurnNumber: nextTurnNumber,
      pieceStock: updatedPieceStock,
      turnTransitionTimestamp: turnEnded ? Date.now() : undefined,
    };

    // 最終ラウンド終了チェック（フルターン終了時に判定）
    const shouldEndFinalRound =
      gameState.finalRound &&
      isEndOfFullTurn &&
      gameState.finalRoundTurnNumber !== null &&
      nextTurnNumber > gameState.finalRoundTurnNumber + 1;

    let logMessage: string;
    if (shouldEndFinalRound) {
      updates.phase = 'finishing';
      logMessage = '最終ラウンド終了！仕上げフェーズへ';
      updates.announcement = logMessage;
      setAnnouncement(logMessage);
    } else {
      logMessage = `${currentPlayer.name}がレベル1ピースを獲得`;
      updates.announcement = logMessage;
      setAnnouncement('レベル1ピースを獲得');
    }
    updates.actionLogs = createActionLog(logMessage);

    onUpdateGameState(updates);
  };

  // ピース変更確定（新しいピースタイプを選択）
  const handleConfirmPieceChange = (newType: PieceType, _category: 'up' | 'down' | 'same') => {
    if (!pieceChangeMode || !onUpdateGameState) return;

    // 自分のターンでない場合（遷移中含む）は無視
    if (!canAct) return;

    // アクションが残っていない場合は無視
    if (currentPlayer.remainingActions <= 0) return;

    // 新しいピースの在庫確認
    if (gameState.pieceStock[newType] <= 0) {
      setAnnouncement('そのピースは在庫切れです');
      return;
    }

    // 元のピースのタイプを取得
    const oldPiece = currentPlayer.pieces.find((p) => p.id === pieceChangeMode);
    const oldPieceType = oldPiece?.type;

    const updatedPieces = currentPlayer.pieces
      .filter((p) => p.id !== pieceChangeMode)
      .concat({
        id: `piece-${Date.now()}-${newType}`,
        type: newType,
        rotation: 0 as const,
      });

    // ストック更新：元のピースを戻し、新しいピースを取る
    const updatedPieceStock = { ...gameState.pieceStock };
    if (oldPieceType) {
      updatedPieceStock[oldPieceType] += 1;
    }
    updatedPieceStock[newType] -= 1;

    // アクション消費とターン終了判定
    // マスターアクション処理後にFirebase反映前の場合、保持した値を使用
    const currentRemainingActions = masterCompletionPreservedState.current
      ? masterCompletionPreservedState.current.remainingActions
      : currentPlayer.remainingActions;
    const newRemainingActions = currentRemainingActions - 1;
    const turnEnded = newRemainingActions <= 0;
    const nextPlayerIndex = turnEnded
      ? (gameState.currentPlayerIndex + 1) % gameState.playerOrder.length
      : gameState.currentPlayerIndex;
    const nextPlayerId = gameState.playerOrder[nextPlayerIndex];

    // ターン番号の計算
    const isEndOfFullTurn = turnEnded && nextPlayerIndex === 0;
    const nextTurnNumber = isEndOfFullTurn ? gameState.currentTurnNumber + 1 : gameState.currentTurnNumber;

    const updatedPlayers = gameState.players.map((p) => {
      if (p.id === debugControlPlayerId) {
        // マスターアクション処理後の場合、usedMasterActionも保持
        const currentUsedMasterAction = masterCompletionPreservedState.current
          ? masterCompletionPreservedState.current.usedMasterAction
          : p.usedMasterAction;
        return {
          ...p,
          pieces: updatedPieces,
          remainingActions: turnEnded ? 0 : newRemainingActions,
          usedMasterAction: currentUsedMasterAction,
        };
      }
      if (turnEnded && p.id === nextPlayerId) {
        return { ...p, remainingActions: 3, usedMasterAction: false };
      }
      return p;
    });

    const updates: Partial<GameState> = {
      players: updatedPlayers,
      currentPlayerIndex: nextPlayerIndex,
      currentTurnNumber: nextTurnNumber,
      pieceStock: updatedPieceStock,
      turnTransitionTimestamp: turnEnded ? Date.now() : undefined,
    };

    // 最終ラウンド終了チェック（フルターン終了時に判定）
    const shouldEndFinalRound =
      gameState.finalRound &&
      isEndOfFullTurn &&
      gameState.finalRoundTurnNumber !== null &&
      nextTurnNumber > gameState.finalRoundTurnNumber + 1;

    let logMessage: string;
    if (shouldEndFinalRound) {
      updates.phase = 'finishing';
      logMessage = '最終ラウンド終了！仕上げフェーズへ';
      updates.announcement = logMessage;
      setAnnouncement(logMessage);
    } else {
      logMessage = `${currentPlayer.name}がピースを交換`;
      updates.announcement = logMessage;
      setAnnouncement('ピースを交換');
    }
    updates.actionLogs = createActionLog(logMessage);

    onUpdateGameState(updates);
    setPieceChangeMode(null);
    setSelectedPieceId(null);
    setActionMode('none'); // アクション完了後にリセット
  };

  // ドラッグ中のピース情報
  const draggingPiece = isDragging && selectedPiece
    ? { type: selectedPiece.type, rotation, flipped }
    : null;

  // 全プレイヤーをプレイ順にソート（自分も含む）
  const allPlayersSorted = gameState.players
    .slice()
    .sort((a, b) => {
      const aIndex = gameState.playerOrder.indexOf(a.id);
      const bIndex = gameState.playerOrder.indexOf(b.id);
      return aIndex - bIndex;
    });

  // 結果画面用：全プレイヤーの完成パズル数の最大値
  const maxCompletedPuzzles = Math.max(
    0,
    ...gameState.players.map((p) => (p.completedPuzzles || []).length)
  );

  // 結果画面用：全プレイヤーの未完成パズル数の最大値
  const maxIncompletePuzzles = Math.max(
    0,
    ...gameState.players.map((p) => (p.workingPuzzles || []).length)
  );

  // 結果画面用：未完成パズル公開状態
  const [showIncompletePuzzles, setShowIncompletePuzzles] = useState(false);
  const [revealedIncompleteIndex, setRevealedIncompleteIndex] = useState(-1);

  // 結果画面用：パズルオープン演出
  useEffect(() => {
    if (gameState.phase !== 'ended') return;

    // まず完成パズルを公開
    if (revealedCardIndex < maxCompletedPuzzles) {
      const timer = setTimeout(() => {
        setRevealedCardIndex((prev) => prev + 1);
      }, 1200); // 1.2秒ごとにオープン
      return () => clearTimeout(timer);
    }

    // 完成パズル公開後、未完成パズル公開フェーズへ
    if (!showIncompletePuzzles && revealedCardIndex >= maxCompletedPuzzles && maxIncompletePuzzles > 0) {
      const timer = setTimeout(() => {
        setShowIncompletePuzzles(true);
      }, 800);
      return () => clearTimeout(timer);
    }

    // 未完成パズルを公開
    if (showIncompletePuzzles && revealedIncompleteIndex < maxIncompletePuzzles) {
      const timer = setTimeout(() => {
        setRevealedIncompleteIndex((prev) => prev + 1);
      }, 1200);
      return () => clearTimeout(timer);
    }

    // 全て公開後、結果表示
    const allRevealed = revealedCardIndex >= maxCompletedPuzzles &&
      (maxIncompletePuzzles === 0 || revealedIncompleteIndex >= maxIncompletePuzzles);
    if (!showFinalResults && allRevealed) {
      const timer = setTimeout(() => {
        setShowFinalResults(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [gameState.phase, revealedCardIndex, maxCompletedPuzzles, showIncompletePuzzles, revealedIncompleteIndex, maxIncompletePuzzles, showFinalResults]);

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
    // 全プレイヤーのスコアを計算
    const playerResults = gameState.players
      .map((player) => ({
        player,
        ...calculateFinalScore(player),
      }))
      .sort((a, b) => b.finalScore - a.finalScore);

    // 表示順序：最初は元の順番、showFinalResults後は順位順
    const displayPlayers = showFinalResults
      ? playerResults.map((r) => r.player)
      : gameState.players;

    // カードの最小高さ（xxsカード: 125px）
    const minRowHeight = 125;

    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 to-emerald-900">
        <div className="min-h-screen bg-black/20 p-4 flex flex-col items-center">
          {/* タイトル */}
          <div className="text-center my-6 mb-4">
            <img src="/boards/images/vec_logo_polyform.svg" alt="POLYFORM" className="h-8 mx-auto mb-2" style={{ filter: 'brightness(0) invert(1)' }} />
            <h1 className="text-2xl font-bold text-white">結果発表</h1>
          </div>

          {/* インフォエリア */}
          <div className="h-12 flex items-center justify-center mb-6">
            <AnimatePresence mode="wait">
              {showFinalResults ? (
                <motion.div
                  key="winner"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3"
                >
                  <Trophy className="w-8 h-8 text-yellow-400" />
                  <span className="text-xl font-bold text-yellow-300">
                    {playerResults[0]?.player.name}の勝利！
                  </span>
                </motion.div>
              ) : showIncompletePuzzles ? (
                <motion.div
                  key="incomplete"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="text-lg font-medium text-red-400">未完成パズル公開</span>
                </motion.div>
              ) : (
                <motion.div
                  key="completed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="text-lg font-medium text-white">完成パズル 公開</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 各プレイヤーの完成パズル表示（縦に行で並ぶ） */}
          <div className="w-full max-w-5xl space-y-3 mb-6">
            {displayPlayers.map((player) => {
              const result = playerResults.find((r) => r.player.id === player.id);
              const rank = playerResults.findIndex((r) => r.player.id === player.id) + 1;
              const completedPuzzles = player.completedPuzzles || [];

              return (
                <motion.div
                  key={player.id}
                  layout
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                  className="bg-slate-800/60 rounded-lg p-3 flex gap-4"
                  style={{ minHeight: minRowHeight + 24 }} // カード高さ + padding
                >
                  {/* 左側：順位バッジ + 名前 + ポイント（縦中央揃え） */}
                  <div className="w-28 flex-shrink-0 flex flex-col items-center justify-center">
                    {/* 順位バッジ（名前の上に表示） */}
                    <AnimatePresence>
                      {showFinalResults && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.5, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-1 ${
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

                    {/* プレイヤー名 */}
                    <div className="text-white font-bold text-center">{player.name}</div>

                    {/* ポイント（名前の下に表示） */}
                    <AnimatePresence>
                      {showFinalResults && result && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="text-center mt-1"
                        >
                          <div className="text-amber-300 font-bold">{result.finalScore}pt</div>
                          <div className="text-slate-400 text-xs">
                            ({result.completedScore}
                            {result.finishingPenalty > 0 && <span className="text-red-400">-{result.finishingPenalty}</span>}
                            {result.incompletePenalty > 0 && <span className="text-red-400">-{result.incompletePenalty}</span>})
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 右側：完成パズル一覧（横並び、縦中央揃え） */}
                  <div className="flex-1 flex items-center">
                    <div className="flex flex-wrap gap-3">
                      {completedPuzzles.length === 0 ? (
                        <div className="text-slate-500 text-xs">完成なし</div>
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

                      {/* 未完成パズル（赤ハイライト） */}
                      {showIncompletePuzzles && (player.workingPuzzles || []).map((wp, cardIndex) => {
                        const card = ALL_PUZZLES.find((p) => p.id === wp.cardId);
                        if (!card) return null;

                        const isRevealed = cardIndex <= revealedIncompleteIndex;

                        return (
                          <motion.div
                            key={`incomplete-${wp.cardId}`}
                            initial={{ rotateY: 90, opacity: 0 }}
                            animate={{
                              rotateY: isRevealed ? 0 : 90,
                              opacity: isRevealed ? 1 : 0,
                            }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                            style={{ perspective: 1000 }}
                            className="relative"
                          >
                            {isRevealed && (
                              <>
                                <div className="ring-2 ring-red-500 rounded-lg">
                                  <PuzzleCardDisplay
                                    card={card}
                                    size="xxs"
                                    placedPieces={wp.placedPieces}
                                    showReward={false}
                                    compact={true}
                                  />
                                </div>
                                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-1 rounded font-bold">
                                  未完成
                                </div>
                              </>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
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
              {isHost ? (
                <div className="flex gap-3">
                  <button
                    onClick={onLeaveRoom}
                    className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold transition-colors"
                  >
                    退出
                  </button>
                  <button
                    onClick={onPlayAgain}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 rounded-lg text-white font-bold transition-all"
                  >
                    もう一度プレイ
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-slate-400 animate-pulse mb-4">
                    ホストの選択を待っています...
                  </div>
                  <button
                    onClick={onLeaveRoom}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-bold transition-colors"
                  >
                    退出
                  </button>
                </div>
              )}
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
            </div>
            {isTurnTransitioning ? (
              <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded font-bold animate-pulse">
                遷移中...
              </span>
            ) : isMyTurn ? (
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
            {canAct && (
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
              {/* プレイヤー一覧（全幅時は横並び、プレイ順に表示） */}
              <div className="flex flex-row xl:flex-col gap-3 overflow-x-auto">
                {allPlayersSorted.map((player) => {
                  const isMe = player.id === debugControlPlayerId;
                  const isActivePlayer = player.id === activePlayerId;
                  return (
                    <div key={player.id} className={`rounded-lg p-2 border min-w-[200px] xl:min-w-0 flex-shrink-0 xl:flex-shrink ${
                      isMe
                        ? isActivePlayer
                          ? 'bg-teal-700/50 border-teal-400 ring-2 ring-teal-400/50'
                          : 'bg-teal-700/30 border-teal-500/50'
                        : isActivePlayer
                          ? 'bg-amber-700/50 border-amber-400 ring-2 ring-amber-400/50'
                          : 'bg-slate-700/50 border-slate-600'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="text-white text-sm font-medium truncate">
                            {player.name}{isMe && ' (自分)'}
                          </div>
                          {isActivePlayer && (
                            <span className={`text-[10px] text-white px-1 rounded ${isMe ? 'bg-teal-500' : 'bg-amber-500'}`}>
                              ターン中
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* 完成枚数 */}
                          <div className="flex gap-1 text-[10px]">
                            <div className="bg-slate-200 text-slate-700 px-1 rounded font-bold">{player.completedWhite || 0}</div>
                            <div className="bg-slate-700 text-white px-1 rounded font-bold">{player.completedBlack || 0}</div>
                          </div>
                          <div className="text-white/60 text-xs">
                            {isMe ? `${player.score}pt` : (gameState.settings?.scoreVisibility === 'hidden' ? '???pt' : `${player.score}pt`)}
                          </div>
                        </div>
                      </div>
                      {/* 所持パズル（全幅） */}
                      <div className="flex gap-1 mb-2">
                        {player.workingPuzzles.map((wp) => {
                          const card = ALL_PUZZLES.find((p) => p.id === wp.cardId);
                          if (!card) return null;
                          return (
                            <div
                              key={wp.cardId}
                              className="w-[50px] h-[63px] overflow-hidden"
                            >
                              <div className="origin-top-left scale-[0.5]">
                                <PuzzleCardDisplay
                                  card={card}
                                  size="xxs"
                                  placedPieces={wp.placedPieces}
                                  showReward={false}
                                  compact={true}
                                />
                              </div>
                            </div>
                          );
                        })}
                        {Array(4 - player.workingPuzzles.length).fill(null).map((_, i) => (
                          <div key={`empty-${i}`} className="w-[50px] h-[63px] rounded border border-dashed border-slate-500" />
                        ))}
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
              </div>

              {/* アクションログ */}
              <div className="mt-3 bg-slate-800/50 border border-slate-600 rounded-lg p-2">
                <div className="text-slate-400 text-xs mb-1">アクションログ</div>
                <div className="h-24 overflow-y-auto text-xs space-y-0.5 scrollbar-thin scrollbar-thumb-slate-600">
                  {(gameState.actionLogs || []).slice().reverse().map((log) => (
                    <div key={log.id} className="text-slate-300 leading-tight">
                      {log.message}
                    </div>
                  ))}
                  {(!gameState.actionLogs || gameState.actionLogs.length === 0) && (
                    <div className="text-slate-500 italic">まだログがありません</div>
                  )}
                </div>
              </div>
          </div>

          {/* 右カラム: メインコンテンツ */}
          <div className="flex-1 min-w-0">
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
              {/* インフォパネル */}
              <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-3 mb-3">
                  <div className="flex flex-col gap-1">
                    {/* 1段目: ラウンド｜ターン */}
                    <div className="flex items-center justify-center gap-2 h-7">
                    <span className="text-slate-400 text-sm">
                      ラウンド {gameState.currentTurnNumber}
                    </span>
                    {gameState.finalRound && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        gameState.finalRoundTurnNumber !== null && gameState.currentTurnNumber > gameState.finalRoundTurnNumber
                          ? 'bg-red-600 text-white'
                          : 'bg-yellow-600 text-white'
                      }`}>
                        {gameState.finalRoundTurnNumber !== null && gameState.currentTurnNumber > gameState.finalRoundTurnNumber
                          ? '最終ラウンド！'
                          : '次が最終ラウンド！'}
                      </span>
                    )}
                    <span className="text-slate-600">|</span>
                    <span className={`text-sm font-medium ${
                      isTurnTransitioning ? 'text-amber-400' : isMyTurn ? 'text-teal-400' : 'text-slate-400'
                    }`}>
                      {isTurnTransitioning
                        ? 'ターン遷移中...'
                        : isMyTurn
                          ? 'あなたのターン'
                          : `${gameState.players.find(p => p.id === activePlayerId)?.name}のターン`}
                    </span>
                  </div>

                  {/* 2段目: 残りアクション＋アナウンス */}
                  <div className="flex items-center justify-center gap-3 h-7">
                    {/* リセットボタン（非表示） */}
                    {false && canAct && currentPlayer.remainingActions < 3 && turnStartSnapshot && (
                      <button
                        onClick={handleResetTurn}
                        className="flex items-center gap-1 px-2 py-0.5 bg-slate-600 hover:bg-slate-500 rounded text-slate-300 text-xs transition-all"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>リセット</span>
                      </button>
                    )}
                    <span className="text-slate-500 text-sm">
                      残りアクション: <span className={`font-bold ${
                        gameState.players.find(p => p.id === activePlayerId)?.remainingActions === 0 ? 'text-slate-500' : 'text-white'
                      }`}>{gameState.players.find(p => p.id === activePlayerId)?.remainingActions ?? 0}</span>
                    </span>
                    <AnimatePresence mode="wait">
                      {announcement && (
                        <motion.div
                          key={announcement}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className={`px-3 py-0.5 rounded-full text-sm font-medium ${
                            isMyTurn ? 'bg-teal-600 text-white' : 'bg-amber-600 text-white'
                          }`}
                        >
                          {announcement}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 3段目: ボタン群 */}
                  <div className="flex items-center justify-center gap-2 h-8">
                  {/* 自分のターン＆アクション残り＆マスターでない＆遷移中でない */}
                  {canAct && currentPlayer.remainingActions > 0 && !masterActionMode && (
                    <>
                      {actionMode === 'none' && (
                        <>
                          <button
                            onClick={() => setActionMode('takePuzzle')}
                            disabled={currentPlayer.workingPuzzles.length >= 4}
                            className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                              currentPlayer.workingPuzzles.length >= 4
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                : 'bg-slate-700 text-white hover:bg-slate-600'
                            }`}
                          >
                            パズル取得
                          </button>
                          <button
                            onClick={handleGetLevel1Piece}
                            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm font-medium transition-all flex items-center gap-1"
                          >
                            <PieceDisplay type="dot" size="xs" />
                            <span>ピース獲得</span>
                          </button>
                          <button
                            onClick={() => setActionMode('placePiece')}
                            disabled={currentPlayer.pieces.length === 0 || currentPlayer.workingPuzzles.length === 0}
                            className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                              currentPlayer.pieces.length === 0 || currentPlayer.workingPuzzles.length === 0
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                : 'bg-slate-700 text-white hover:bg-slate-600'
                            }`}
                          >
                            ピース配置
                          </button>
                          <button
                            onClick={() => setActionMode('pieceChange')}
                            disabled={currentPlayer.pieces.length === 0}
                            className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                              currentPlayer.pieces.length === 0
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                : 'bg-slate-700 text-white hover:bg-slate-600'
                            }`}
                          >
                            ピース変更
                          </button>
                          <button
                            onClick={() => setActionMode('recycle')}
                            className="px-3 py-1 bg-slate-700 text-white hover:bg-slate-600 rounded text-sm font-medium transition-all"
                          >
                            リサイクル
                          </button>
                          {!currentPlayer.usedMasterAction && !isProcessingMasterCompletions && currentPlayer.workingPuzzles.length > 0 && (
                            <button
                              onClick={handleStartMasterAction}
                              className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-white text-sm font-medium transition-all"
                            >
                              マスター
                            </button>
                          )}
                        </>
                      )}
                      {actionMode === 'takePuzzle' && (
                        <>
                          <span className="text-teal-300 text-sm">場からカードを取得してください</span>
                          <button onClick={() => setActionMode('none')} className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm">キャンセル</button>
                        </>
                      )}
                      {actionMode === 'placePiece' && !pendingPlacement && (
                        <>
                          <span className="text-teal-300 text-sm">ピースを選んでパズルにドラッグ</span>
                          <button onClick={() => setActionMode('none')} className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm">キャンセル</button>
                        </>
                      )}
                      {actionMode === 'placePiece' && pendingPlacement && (
                        <>
                          <span className="text-teal-300 text-sm">配置を確定しますか？</span>
                          <button onClick={handleConfirmPlacement} className="px-3 py-1 bg-teal-600 hover:bg-teal-500 rounded text-white text-sm font-medium">確定</button>
                          <button onClick={handleCancelPlacement} className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm">キャンセル</button>
                        </>
                      )}
                      {actionMode === 'pieceChange' && (
                        <>
                          <span className="text-teal-300 text-sm">変更するピースを選択</span>
                          <button onClick={() => { setActionMode('none'); setPieceChangeMode(null); setSelectedPieceId(null); }} className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm">キャンセル</button>
                        </>
                      )}
                      {actionMode === 'recycle' && (
                        <>
                          <span className="text-teal-300 text-sm">リサイクルする色:</span>
                          <button onClick={() => { handleRecycle('white'); setActionMode('none'); }} disabled={gameState.whitePuzzleMarket.length < 4 || gameState.whitePuzzleDeck.length < 4} className="px-3 py-1 bg-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded text-slate-700 text-sm font-medium">白</button>
                          <button onClick={() => { handleRecycle('black'); setActionMode('none'); }} disabled={gameState.blackPuzzleMarket.length < 4 || gameState.blackPuzzleDeck.length < 4} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-sm font-medium border border-slate-500">黒</button>
                          <button onClick={() => setActionMode('none')} className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm">キャンセル</button>
                        </>
                      )}
                    </>
                  )}

                  {/* マスターアクション中 */}
                  {masterActionMode && (
                    <>
                      <span className="text-purple-300 text-sm">
                        マスターアクション（{masterActionPlacedPuzzles.size}/{currentPlayer.workingPuzzles.length}枚
                        {masterActionPendingCompletions.length > 0 && `、${masterActionPendingCompletions.length}完成`}）
                      </span>
                      <button onClick={handleCompleteMasterAction} className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-white text-sm font-medium">完了</button>
                      <button onClick={handleCancelMasterAction} className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm">中止</button>
                    </>
                  )}

                  {/* アクション使い切り */}
                  {isMyTurn && currentPlayer.remainingActions <= 0 && !masterActionMode && (
                    <>
                      <span className="text-slate-400 text-sm">アクションを使い切りました</span>
                      <button onClick={handleConfirmTurn} className="px-3 py-1 bg-teal-600 hover:bg-teal-500 rounded text-white text-sm font-medium">ターン確定</button>
                      {turnStartSnapshot && (
                        <button onClick={handleResetTurn} className="flex items-center gap-1 px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white text-sm">
                          <RotateCcw className="w-3 h-3" />
                          <span>やり直す</span>
                        </button>
                      )}
                    </>
                  )}

                    {/* 相手のターン */}
                    {!isMyTurn && !masterActionMode && (
                      <span className={`text-sm ${gameState.announcement ? 'text-teal-300' : 'text-slate-500'}`}>
                        {gameState.announcement || '相手のアクションを待っています...'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
                </>
              )}

            {/* 場のパズル（全幅） */}
            <div className="mb-4">
              <div className={`relative rounded-lg p-4 overflow-x-auto transition-all border ${
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
            </div>

        {/* 下部エリア */}
        <div className="flex flex-col lg:flex-row gap-4">

          {/* 手持ちパズル（4枚並ぶ幅で固定） */}
          <div
            className={`relative rounded-lg p-4 flex-shrink-0 transition-all border h-fit ${
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
                      placedPieces={
                        pendingPlacement?.puzzleId === wp.cardId
                          ? [...wp.placedPieces, pendingPlacement.placedPiece]
                          : wp.placedPieces
                      }
                      size={cardSize}
                      completed={completedPuzzleId === wp.cardId}
                      disabled={masterActionMode && masterActionPlacedPuzzles.has(wp.cardId)}
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

          {/* 右カラム: 手持ちピース + ピースストック */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {/* 手持ちピース */}
            <div className={`relative rounded-lg p-4 transition-all border ${
              actionMode === 'placePiece' || actionMode === 'pieceChange' || masterActionMode || (gameState.phase === 'finishing' && !currentPlayer.finishingDone)
                ? 'bg-teal-800/30 border-teal-400 ring-2 ring-teal-400/30'
                : 'bg-slate-800/50 border-slate-600'
            }`}>
            {/* ピース変更選択モード：選択したピースの変更先一覧 */}
            {pieceChangeMode && selectedPiece && (
              <div className="rounded-lg p-3 mb-4 border bg-slate-700/50 border-teal-400">
                <div className="text-white text-sm mb-2">
                  Lv.{PIECE_DEFINITIONS[selectedPiece.type].level} → 変更先を選択：
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {getAvailablePieceChanges(selectedPiece.type).map(({ type, category }) => (
                    <button
                      key={type}
                      onClick={() => handleConfirmPieceChange(type, category)}
                      className={`p-1.5 rounded ${
                        category === 'up'
                          ? 'bg-green-700 hover:bg-green-600'
                          : category === 'same'
                          ? 'bg-blue-700 hover:bg-blue-600'
                          : 'bg-red-700 hover:bg-red-600'
                      }`}
                      title={category === 'up' ? 'アップグレード' : category === 'same' ? '同レベル交換' : 'ダウングレード'}
                    >
                      <PieceDisplay type={type} size="xs" />
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setPieceChangeMode(null);
                      setSelectedPieceId(null);
                    }}
                    className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white text-xs"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            {/* ピース一覧（2段ピースの高さを最小に） */}
            <div className="flex flex-wrap gap-2 items-center" style={{ minHeight: getMinPieceHeight(cardSize) }}>
              {(() => {
                const isFinishingPhase = gameState.phase === 'finishing';
                const canInteract = isFinishingPhase
                  ? !currentPlayer.finishingDone // 仕上げフェーズ：完了していなければ操作可能
                  : (actionMode === 'placePiece' || actionMode === 'pieceChange' || masterActionMode);
                // 仮配置中のピースは非表示
                const displayPieces = pendingPlacement
                  ? currentPlayer.pieces.filter((p) => p.id !== pendingPlacement.piece.id)
                  : currentPlayer.pieces;
                return displayPieces.map((piece) => (
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

            {/* 選択中のピースのコントロール（ピース一覧の下に表示） */}
            {selectedPiece && !pieceChangeMode && (actionMode === 'placePiece' || masterActionMode || (gameState.phase === 'finishing' && !currentPlayer.finishingDone)) && (
              <div className="flex items-center gap-3 mt-2">
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
                <span className="text-white/60 text-sm">
                  Lv.{PIECE_DEFINITIONS[selectedPiece.type].level} ドラッグして配置
                </span>
              </div>
            )}

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

            {/* ピースストック一覧（2段レイアウト） */}
            <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-3">
              <div className="flex flex-col gap-2">
                {/* 1段目: Lv1 | Lv2 | Lv3 */}
                <div className="flex gap-4 items-center justify-center">
                  {[1, 2, 3].map((level, index) => (
                    <div key={level} className="flex items-center gap-4">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-slate-400 text-xs font-medium">Lv.{level}</span>
                        <div className="flex gap-1 items-end">
                          {PIECES_BY_LEVEL[level].map((type) => (
                            <div key={type} className="flex flex-col items-center">
                              <div className="h-4 flex items-end">
                                <PieceDisplay type={type} size="xs" />
                              </div>
                              <span className={`text-xs leading-tight ${
                                gameState.pieceStock[type] === 0 ? 'text-red-400' : 'text-slate-400'
                              }`}>
                                {gameState.pieceStock[type]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {index < 2 && <div className="w-px h-10 bg-slate-600" />}
                    </div>
                  ))}
                </div>
                {/* 2段目: Lv4 */}
                <div className="flex justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-slate-400 text-xs font-medium">Lv.4</span>
                    <div className="flex gap-1 items-end">
                      {PIECES_BY_LEVEL[4].map((type) => (
                        <div key={type} className="flex flex-col items-center">
                          <div className="h-4 flex items-end">
                            <PieceDisplay type={type} size="xs" />
                          </div>
                          <span className={`text-xs leading-tight ${
                            gameState.pieceStock[type] === 0 ? 'text-red-400' : 'text-slate-400'
                          }`}>
                            {gameState.pieceStock[type]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
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
