import { Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import { EffectComposer, SSAO, Bloom } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { TableScene } from './TableScene';
import type { GameState, TileKind } from '../types/game';
import type { ScoreResult } from '../lib/scoring';
import { findWaitingTiles } from '../lib/furiten';
import {
  processDraw,
  processDiscard,
  checkRonCandidates,
  executeTsumo,
  executeRon,
  getNextTurnPlayerId,
} from '../lib/game-flow';

const DEFAULT_TIME_BANK = 300; // デフォルト持ち時間（秒）
const BOT_DELAY = 800; // botの自動行動ディレイ（ms）

const isBot = (id: string) => id.startsWith('test-');

interface GameScreenProps {
  gameState: GameState;
  playerId: string;
  onBackToLobby: () => void;
  onUpdateGameState: (newState: Partial<GameState>) => void;
}

const LoadingOverlay = () => {
  const { active, progress } = useProgress();
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!active && progress === 100) {
      const timer = setTimeout(() => setShow(false), 400);
      return () => clearTimeout(timer);
    }
  }, [active, progress]);

  if (!show) return null;

  return (
    <div
      className={`absolute inset-0 bg-[#1a1a2e] flex flex-col items-center justify-center z-10
        transition-opacity duration-300 ${!active && progress === 100 ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="mb-6">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
      <p className="text-slate-400 text-sm font-bold mb-3">対局準備中...</p>
      <div className="w-48 h-1 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

// 持ち時間を mm:ss 形式でフォーマット
const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const GameScreen = ({ gameState, playerId, onBackToLobby, onUpdateGameState }: GameScreenProps) => {
  const currentPlayer = gameState.players.find((p) => p.id === gameState.currentTurn);
  const currentTurnId = gameState.currentTurn;
  const isMyTurn = currentTurnId === playerId;
  const isBotTurn = currentTurnId ? isBot(currentTurnId) : false;
  const turnPhase = gameState.turnPhase;

  // 待ち牌（テンパイ時に手牌の右に表示）
  const waitingTiles: TileKind[] = useMemo(() => {
    const me = gameState.players.find((p) => p.id === playerId);
    if (!me || me.hand.length !== 5) return [];
    return findWaitingTiles(me.hand, gameState.doraTile, me.isDealer);
  }, [gameState.players, gameState.doraTile, playerId]);

  // ローカル状態
  const [canTsumo, setCanTsumo] = useState(false);
  const [tsumoScore, setTsumoScore] = useState<ScoreResult | null>(null);
  const [ronInfo, setRonInfo] = useState<{ score: ScoreResult } | null>(null);
  const processingRef = useRef(false);

  // 持ち時間管理
  const timeLimitSeconds = gameState.settings.timeLimitSeconds;
  const hasTimeLimit = timeLimitSeconds > 0;
  const initialTime = timeLimitSeconds || DEFAULT_TIME_BANK;
  const myTimeBank = gameState.timeBank?.[playerId] ?? initialTime;
  const [localTime, setLocalTime] = useState(myTimeBank);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setLocalTime(gameState.timeBank?.[playerId] ?? initialTime);
  }, [gameState.timeBank, playerId, initialTime]);

  const isActionNeeded = hasTimeLimit && ((isMyTurn && turnPhase === 'discard') || canTsumo || ronInfo !== null);

  useEffect(() => {
    if (!isActionNeeded) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = setInterval(() => {
      setLocalTime((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActionNeeded]);

  const handleTimeOut = useCallback(() => {
    if (ronInfo) {
      handleSkipRon();
    } else if (canTsumo) {
      handleTsumo();
    } else if (isMyTurn && turnPhase === 'discard') {
      const me = gameState.players.find((p) => p.id === playerId);
      if (me && me.hand.length === 6) {
        handleDiscard(me.hand[me.hand.length - 1].id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ronInfo, canTsumo, isMyTurn, turnPhase, gameState]);

  const saveTimeBank = useCallback((updates: Partial<GameState>) => {
    if (!hasTimeLimit) return updates;
    const newTimeBank = { ...(gameState.timeBank ?? {}), [playerId]: localTime };
    return { ...updates, timeBank: newTimeBank };
  }, [gameState.timeBank, playerId, localTime, hasTimeLimit]);

  // ================================================================
  // === Draw phase（自分の手番 or botの手番）===
  // ================================================================
  useEffect(() => {
    if (turnPhase !== 'draw' || processingRef.current) return;
    if (!currentTurnId) return;
    if (!isMyTurn && !isBotTurn) return;

    processingRef.current = true;

    const drawerId = currentTurnId;
    const { newState, canTsumo: ct, tsumoScore: ts } = processDraw(gameState, drawerId);

    // 流局チェック
    if (newState.phase === 'round_result') {
      onUpdateGameState({ ...newState, roundResult: { type: 'draw' } });
      setTimeout(() => { processingRef.current = false; }, 200);
      return;
    }

    if (isBotTurn) {
      // Bot: ツモ和了可能なら即和了
      if (ct && ts) {
        const merged: GameState = { ...gameState, ...newState as GameState };
        const bot = merged.players.find((p) => p.id === drawerId);
        const resultState = executeTsumo(merged, drawerId, ts);
        onUpdateGameState({
          ...newState,
          ...resultState,
          roundResult: { type: 'tsumo', winnerId: drawerId, winnerHand: bot?.hand, score: ts },
        });
      } else {
        // Botはツモだけして discard phase へ（auto-discard は別の effect で）
        onUpdateGameState(newState);
      }
    } else {
      // 自分の手番
      setCanTsumo(ct);
      setTsumoScore(ts);

      const timeBankInit: Record<string, number> = gameState.timeBank ?? {};
      if (!gameState.timeBank && hasTimeLimit) {
        for (const p of gameState.players) timeBankInit[p.id] = initialTime;
      }
      onUpdateGameState({ ...newState, ...(hasTimeLimit ? { timeBank: timeBankInit } : {}) });
    }

    setTimeout(() => { processingRef.current = false; }, 200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, isBotTurn, turnPhase]);

  // ================================================================
  // === Bot auto-discard（botのdiscardフェーズ → ツモ切り）===
  // ================================================================
  useEffect(() => {
    if (!isBotTurn || turnPhase !== 'discard' || processingRef.current) return;
    if (!currentTurnId) return;

    const bot = gameState.players.find((p) => p.id === currentTurnId);
    if (!bot || bot.hand.length !== 6) return;

    processingRef.current = true;

    const timer = setTimeout(() => {
      // ツモ切り（最後の牌 = ツモった牌）
      const lastTile = bot.hand[bot.hand.length - 1];
      const newState = processDiscard(gameState, currentTurnId, lastTile.id);
      onUpdateGameState(newState);
      setTimeout(() => { processingRef.current = false; }, 200);
    }, BOT_DELAY);

    return () => { clearTimeout(timer); processingRef.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBotTurn, turnPhase, currentTurnId]);

  // ================================================================
  // === Ron check（自分・bot・他プレイヤーのロン判定）===
  // ================================================================
  useEffect(() => {
    if (turnPhase !== 'ron_check' || processingRef.current) return;

    const candidates = checkRonCandidates(gameState);
    const discarderId = gameState.lastDiscardPlayerId;

    if (candidates.length > 0) {
      // 頭ハネ: 最優先候補
      const topCandidate = candidates[0];

      // 自分がロン可能
      if (topCandidate.playerId === playerId) {
        setRonInfo({ score: topCandidate.score });
        return;
      }

      // Botがロン可能 → 自動ロン
      if (isBot(topCandidate.playerId)) {
        processingRef.current = true;
        setTimeout(() => {
          const bot = gameState.players.find((p) => p.id === topCandidate.playerId);
          const lastDiscard = gameState.lastDiscard;
          const winnerHand = bot && lastDiscard ? [...bot.hand, lastDiscard] : bot?.hand;
          const resultState = executeRon(gameState, topCandidate.playerId, discarderId!, topCandidate.score);
          onUpdateGameState({
            ...resultState,
            roundResult: {
              type: 'ron',
              winnerId: topCandidate.playerId,
              loserId: discarderId!,
              winnerHand,
              score: topCandidate.score,
            },
          });
          setTimeout(() => { processingRef.current = false; }, 200);
        }, BOT_DELAY);
        return;
      }

      // 他の実プレイヤーがロン候補 → そのプレイヤーの操作を待つ
      return;
    }

    // ロン候補なし → 次の手番へ
    // 自分が打牌者、またはbotが打牌者の場合に進行を担当
    if (discarderId && (discarderId === playerId || isBot(discarderId))) {
      const nextId = getNextTurnPlayerId(gameState.players, discarderId);
      onUpdateGameState({ currentTurn: nextId, turnPhase: 'draw' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnPhase, gameState.lastDiscardPlayerId]);

  // ================================================================
  // === 自分の手動操作 ===
  // ================================================================
  const handleDiscard = useCallback((tileId: string) => {
    if (!isMyTurn || turnPhase !== 'discard') return;
    setCanTsumo(false);
    setTsumoScore(null);
    const newState = processDiscard(gameState, playerId, tileId);
    onUpdateGameState(saveTimeBank(newState));
  }, [isMyTurn, turnPhase, gameState, playerId, onUpdateGameState, saveTimeBank]);

  const handleTsumo = useCallback(() => {
    if (!canTsumo || !tsumoScore) return;
    const me = gameState.players.find((p) => p.id === playerId);
    const resultState = executeTsumo(gameState, playerId, tsumoScore);
    onUpdateGameState(saveTimeBank({
      ...resultState,
      roundResult: { type: 'tsumo', winnerId: playerId, winnerHand: me?.hand, score: tsumoScore },
    }));
    setCanTsumo(false);
    setTsumoScore(null);
  }, [canTsumo, tsumoScore, gameState, playerId, onUpdateGameState, saveTimeBank]);

  const handleRon = useCallback(() => {
    if (!ronInfo || !gameState.lastDiscardPlayerId) return;
    const me = gameState.players.find((p) => p.id === playerId);
    const lastDiscard = gameState.lastDiscard;
    const winnerHand = me && lastDiscard ? [...me.hand, lastDiscard] : me?.hand;
    const resultState = executeRon(gameState, playerId, gameState.lastDiscardPlayerId, ronInfo.score);
    onUpdateGameState(saveTimeBank({
      ...resultState,
      roundResult: {
        type: 'ron',
        winnerId: playerId,
        loserId: gameState.lastDiscardPlayerId,
        winnerHand,
        score: ronInfo.score,
      },
    }));
    setRonInfo(null);
  }, [ronInfo, gameState, playerId, onUpdateGameState, saveTimeBank]);

  const handleSkipRon = useCallback(() => {
    setRonInfo(null);
    if (gameState.lastDiscardPlayerId) {
      const nextId = getNextTurnPlayerId(gameState.players, gameState.lastDiscardPlayerId);
      onUpdateGameState(saveTimeBank({ currentTurn: nextId, turnPhase: 'draw' }));
    }
  }, [gameState, onUpdateGameState, saveTimeBank]);

  // ================================================================
  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-slate-800/90 border-b border-slate-700 px-4 py-2 flex items-center gap-4 shrink-0">
        <button
          onClick={onBackToLobby}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-sm transition-colors"
        >
          ← ロビーに戻る
        </button>
        <h1><img src="/hive/images/vec_logo_soku-jong.svg" alt="速雀" className="h-7" /></h1>
        <div className="ml-auto flex items-center gap-3 text-sm text-slate-400">
          <span>東{gameState.round}局</span>
          <span>手番: {currentPlayer?.name ?? '-'}</span>
          {hasTimeLimit && (
            <span className={`font-mono ${localTime <= 30 ? 'text-red-400' : 'text-slate-400'}`}>
              {formatTime(localTime)}
            </span>
          )}
        </div>
      </header>

      {/* 3D Canvas */}
      <div className="flex-1 min-h-0 relative">
        <LoadingOverlay />
        <Canvas
          camera={{ position: [0, 6, 5], fov: 35 }}
          gl={{ antialias: true }}
          shadows
        >
          <color attach="background" args={['#1a1a2e']} />
          <Suspense fallback={null}>
            <TableScene
              gameState={gameState}
              playerId={playerId}
              onDiscard={handleDiscard}
              canTsumo={canTsumo}
              onTsumo={handleTsumo}
              ronInfo={ronInfo}
              onRon={handleRon}
              onSkipRon={handleSkipRon}
              isMyTurn={isMyTurn}
              turnPhase={turnPhase}
              waitingTiles={waitingTiles}
            />
          </Suspense>
          <EffectComposer>
            <SSAO
              blendFunction={BlendFunction.MULTIPLY}
              samples={8}
              radius={0.08}
              intensity={8}
            />
            <Bloom
              intensity={0.15}
              luminanceThreshold={0.9}
              luminanceSmoothing={0.5}
            />
          </EffectComposer>
        </Canvas>
      </div>
    </div>
  );
};
