import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import { EffectComposer, SSAO, Bloom } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { TableScene } from './TableScene';
import type { GameState } from '../types/game';
import type { ScoreResult } from '../lib/scoring';
import {
  processDraw,
  processDiscard,
  checkRonCandidates,
  executeTsumo,
  executeRon,
  getNextTurnPlayerId,
} from '../lib/game-flow';

const DEFAULT_TIME_BANK = 300; // デフォルト持ち時間（秒）

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
  const isMyTurn = gameState.currentTurn === playerId;
  const turnPhase = gameState.turnPhase;

  // ローカル状態（Firebase更新の合間に使う一時的な状態）
  const [canTsumo, setCanTsumo] = useState(false);
  const [tsumoScore, setTsumoScore] = useState<ScoreResult | null>(null);
  const [ronInfo, setRonInfo] = useState<{ score: ScoreResult } | null>(null);
  const processingRef = useRef(false);

  // 持ち時間管理（ローカル表示用）
  const timeLimitSeconds = gameState.settings.timeLimitSeconds;
  const hasTimeLimit = timeLimitSeconds > 0;
  const initialTime = timeLimitSeconds || DEFAULT_TIME_BANK;
  const myTimeBank = gameState.timeBank?.[playerId] ?? initialTime;
  const [localTime, setLocalTime] = useState(myTimeBank);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Firebase上の持ち時間が変わったら同期
  useEffect(() => {
    setLocalTime(gameState.timeBank?.[playerId] ?? initialTime);
  }, [gameState.timeBank, playerId, initialTime]);

  // 自分がアクション可能な時（discard / canTsumo / ronInfo）だけタイマーを回す
  const isActionNeeded = hasTimeLimit && ((isMyTurn && turnPhase === 'discard') || canTsumo || ronInfo !== null);

  useEffect(() => {
    if (!isActionNeeded) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setLocalTime((prev) => {
        if (prev <= 1) {
          // 時間切れ → 自動行動
          clearInterval(timerRef.current!);
          timerRef.current = null;
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActionNeeded]);

  // 時間切れ時の自動行動
  const handleTimeOut = useCallback(() => {
    if (ronInfo) {
      // ロン見逃し
      handleSkipRon();
    } else if (canTsumo) {
      // ツモ和了（有利なので自動実行）
      handleTsumo();
    } else if (isMyTurn && turnPhase === 'discard') {
      // 手牌の最後の牌を自動で切る（ツモ切り）
      const me = gameState.players.find((p) => p.id === playerId);
      if (me && me.hand.length === 6) {
        handleDiscard(me.hand[me.hand.length - 1].id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ronInfo, canTsumo, isMyTurn, turnPhase, gameState]);

  // 持ち時間をFirebaseに保存するヘルパー
  const saveTimeBank = useCallback((updates: Partial<GameState>) => {
    if (!hasTimeLimit) return updates;
    const newTimeBank = { ...(gameState.timeBank ?? {}), [playerId]: localTime };
    return { ...updates, timeBank: newTimeBank };
  }, [gameState.timeBank, playerId, localTime, hasTimeLimit]);

  // === ツモ自動処理 ===
  // turnPhase='draw' かつ自分の手番なら processDraw() を自動実行
  useEffect(() => {
    if (!isMyTurn || turnPhase !== 'draw' || processingRef.current) return;
    processingRef.current = true;

    const { newState, canTsumo: ct, tsumoScore: ts } = processDraw(gameState, playerId);
    setCanTsumo(ct);
    setTsumoScore(ts);

    // 持ち時間の初期化（ゲーム開始時にtimeBankがなければ設定）
    const timeBankInit: Record<string, number> = gameState.timeBank ?? {};
    if (!gameState.timeBank && hasTimeLimit) {
      for (const p of gameState.players) {
        timeBankInit[p.id] = initialTime;
      }
    }

    onUpdateGameState({ ...newState, ...(hasTimeLimit ? { timeBank: timeBankInit } : {}) });

    // processingRef を少し遅延してリセット（次のレンダリングサイクルで）
    setTimeout(() => { processingRef.current = false; }, 200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, turnPhase]);

  // === ロンチェック自動処理 ===
  // turnPhase='ron_check' 時に checkRonCandidates() 実行
  useEffect(() => {
    if (turnPhase !== 'ron_check' || processingRef.current) return;

    const candidates = checkRonCandidates(gameState);

    // 自分がロン可能か
    const myCandidate = candidates.find((c) => c.playerId === playerId);
    if (myCandidate) {
      setRonInfo({ score: myCandidate.score });
      return;
    }

    // ロン候補がいない場合は自動で次手番へ
    // (ホスト or 打牌者が処理を担当 — ここでは打牌者)
    if (gameState.lastDiscardPlayerId === playerId && candidates.length === 0) {
      const nextId = getNextTurnPlayerId(gameState.players, gameState.lastDiscardPlayerId);
      onUpdateGameState({
        currentTurn: nextId,
        turnPhase: 'draw',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnPhase, gameState.lastDiscardPlayerId]);

  // === 打牌処理 ===
  const handleDiscard = useCallback((tileId: string) => {
    if (!isMyTurn || turnPhase !== 'discard') return;

    setCanTsumo(false);
    setTsumoScore(null);
    const newState = processDiscard(gameState, playerId, tileId);
    onUpdateGameState(saveTimeBank(newState));
  }, [isMyTurn, turnPhase, gameState, playerId, onUpdateGameState, saveTimeBank]);

  // === ツモ和了 ===
  const handleTsumo = useCallback(() => {
    if (!canTsumo || !tsumoScore) return;

    const me = gameState.players.find((p) => p.id === playerId);
    const resultState = executeTsumo(gameState, playerId, tsumoScore);
    onUpdateGameState(saveTimeBank({
      ...resultState,
      roundResult: {
        type: 'tsumo',
        winnerId: playerId,
        winnerHand: me?.hand,
        score: tsumoScore,
      },
    }));
    setCanTsumo(false);
    setTsumoScore(null);
  }, [canTsumo, tsumoScore, gameState, playerId, onUpdateGameState, saveTimeBank]);

  // === ロン和了 ===
  const handleRon = useCallback(() => {
    if (!ronInfo || !gameState.lastDiscardPlayerId) return;

    const me = gameState.players.find((p) => p.id === playerId);
    const lastDiscard = gameState.lastDiscard;
    const winnerHand = me && lastDiscard ? [...me.hand, lastDiscard] : me?.hand;
    const resultState = executeRon(
      gameState,
      playerId,
      gameState.lastDiscardPlayerId,
      ronInfo.score,
    );
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

  // === ロン見逃し ===
  const handleSkipRon = useCallback(() => {
    setRonInfo(null);
    // 次手番へ
    if (gameState.lastDiscardPlayerId) {
      const nextId = getNextTurnPlayerId(gameState.players, gameState.lastDiscardPlayerId);
      onUpdateGameState(saveTimeBank({
        currentTurn: nextId,
        turnPhase: 'draw',
      }));
    }
  }, [gameState, onUpdateGameState, saveTimeBank]);

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

      {/* 3D Canvas + ローディングオーバーレイ */}
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
            />
          </Suspense>
          <EffectComposer>
            <SSAO
              blendFunction={BlendFunction.MULTIPLY}
              samples={16}
              radius={0.1}
              intensity={15}
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
