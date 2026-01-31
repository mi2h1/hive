import { useState, useMemo, useEffect, useRef } from 'react';
import { FlaskConical } from 'lucide-react';
import { usePlayer } from '../../shared/hooks/usePlayer';
import { useRoom } from './hooks/useRoom';
import { useGame } from './hooks/useGame';
import { GameBoard } from './components/GameBoard';
import { GameControls } from './components/GameControls';
import { PlayerCardGrid } from './components/PlayerInfo';
import { Lobby } from './components/Lobby';
import { ReturnAnimation } from './components/ReturnAnimation';
import { MysteryRevealAnimation } from './components/MysteryRevealAnimation';

interface AoaGameProps {
  onBack: () => void;
}

// URLからルームコードを取得
const getRoomCodeFromUrl = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get('room');
};

// URLからルームコードパラメータを削除
const clearRoomCodeFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  params.delete('room');
  const newSearch = params.toString();
  const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
  window.history.replaceState({}, '', newUrl);
};

export function AoaGame({ onBack }: AoaGameProps) {
  // デバッグモード検出（URLパラメータ ?debug=true）
  const debugMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === 'true';
  }, []);

  // デバッグ用: 確率パネル表示状態
  const [showProbability, setShowProbability] = useState(false);

  const { playerId, playerName, isLoading: isPlayerLoading } = usePlayer();
  const {
    roomCode,
    roomData,
    error,
    isLoading: isRoomLoading,
    isHost,
    createRoom,
    joinRoom,
    leaveRoom,
    updateGameState,
    updatePlayerDecision,
    updateRuleSet,
    addTestPlayer,
    updateAnyPlayerDecision,
  } = useRoom(playerId, playerName);

  // ゲームフック（ルームがある場合のみ）
  const gameState = roomData?.gameState;
  const {
    currentPlayer,
    allDecided,
    startGame,
    startRound,
    nextRound,
    makeDecision,
    declareAllIn,
  } = useGame({
    gameState: gameState ?? {
      phase: 'waiting',
      round: 1,
      turn: 0,
      players: [],
      deck: [],
      field: [],
      remainderGems: 0,
      trapCounts: { shark: 0, light: 0, rope: 0, bombe: 0, pressure: 0, scorpion: 0, zombi: 0, snake: 0, fire: 0, rock: 0 },
      currentEvent: null,
      relicsOnField: 0,
      comboCount: 0,
    },
    playerId,
    isHost,
    ruleSet: roomData?.ruleSet,
    updateGameState,
    updatePlayerDecision,
  });

  // URLパラメータからの自動参加を一度だけ実行
  const hasAutoJoined = useRef(false);

  // ブラウザタブのタイトルを設定
  useEffect(() => {
    const isIncanRule = roomData?.ruleSet?.type === 'incan_gold';
    document.title = isIncanRule ? 'インカの黄金' : 'アトランティスの深淵';
    return () => { document.title = 'Game Board'; };
  }, [roomData?.ruleSet?.type]);

  // URLパラメータからルームに自動参加
  useEffect(() => {
    if (hasAutoJoined.current) return;
    if (roomCode) return; // 既にルームに参加している場合はスキップ
    if (!playerId || !playerName) return; // プレイヤー情報がロードされるまで待つ

    const urlRoomCode = getRoomCodeFromUrl();
    if (urlRoomCode && urlRoomCode.length === 4) {
      hasAutoJoined.current = true;
      clearRoomCodeFromUrl();
      joinRoom(urlRoomCode);
    }
  }, [roomCode, joinRoom, playerId, playerName]);

  // ローディング中
  if (isPlayerLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-900 to-stone-950 flex items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  // ロビー画面（ルーム未参加 or ゲーム開始前）
  if (!roomCode || !gameState || gameState.phase === 'waiting') {
    return (
      <Lobby
        hasName={true}
        playerName={playerName}
        onSetName={() => {}}
        onClearName={() => {}}
        roomCode={roomCode}
        players={gameState?.players ?? []}
        isHost={isHost}
        isLoading={isRoomLoading}
        error={error}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onLeaveRoom={leaveRoom}
        onStartGame={startGame}
        ruleSet={roomData?.ruleSet}
        onUpdateRuleSet={updateRuleSet}
        debugMode={debugMode}
        onAddTestPlayer={addTestPlayer}
        onBack={onBack}
      />
    );
  }

  // 帰還演出の情報（全員分）
  const returningPlayers = gameState.phase === 'return_resolve' && gameState.returnResolve
    ? gameState.returnResolve.returningPlayers
    : [];

  // ミステリーカード公開情報
  const mysteryRevealInfo = gameState.phase === 'mystery_reveal' && gameState.mysteryReveal
    ? {
        fieldCard: gameState.field[gameState.mysteryReveal.mysteryIndices[gameState.mysteryReveal.currentIndex]],
        cardNumber: gameState.mysteryReveal.currentIndex + 1,
        totalCards: gameState.mysteryReveal.mysteryIndices.length,
        isFlipping: gameState.mysteryReveal.isFlipping,
      }
    : null;

  // デバッグ用: デッキ内のカード確率を計算
  const deckStats = gameState ? (() => {
    const deck = gameState.deck;
    const total = deck.length;
    if (total === 0) return null;

    const gems = deck.filter(c => c.type === 'gem');
    const traps = deck.filter(c => c.type === 'trap');
    const specials = deck.filter(c => c.type === 'special');
    const relics = deck.filter(c => c.type === 'relic');

    // 宝石カードの値ごとの集計
    const gemsByValue: Record<number, number> = {};
    gems.forEach(c => {
      const v = c.value ?? 0;
      gemsByValue[v] = (gemsByValue[v] || 0) + 1;
    });

    // 罠カードの種類ごとの集計
    const trapsByType: Record<string, number> = {};
    traps.forEach(c => {
      const t = c.trapType ?? 'unknown';
      trapsByType[t] = (trapsByType[t] || 0) + 1;
    });

    // 特殊カードの種類ごとの集計
    const specialsByEffect: Record<string, number> = {};
    specials.forEach(c => {
      const e = c.specialEffect ?? 'unknown';
      specialsByEffect[e] = (specialsByEffect[e] || 0) + 1;
    });

    return {
      total,
      gems: { count: gems.length, pct: ((gems.length / total) * 100).toFixed(1), byValue: gemsByValue },
      traps: { count: traps.length, pct: ((traps.length / total) * 100).toFixed(1), byType: trapsByType },
      specials: { count: specials.length, pct: ((specials.length / total) * 100).toFixed(1), byEffect: specialsByEffect },
      relics: { count: relics.length, pct: ((relics.length / total) * 100).toFixed(1) },
    };
  })() : null;

  // ルールに応じたテーマ設定
  const isIncan = roomData?.ruleSet?.type === 'incan_gold';
  const bgImage = isIncan ? '/boards/images/bg_incan.png' : '/boards/images/bg_aoa.jpg';
  const logoImage = isIncan ? '/boards/images/vec_logo_incangold.svg' : '/boards/images/vec_logo_aoa_w.svg';
  const overlayClass = isIncan ? 'bg-amber-950/40' : 'bg-blue-950/40';

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed" style={{ backgroundImage: `url(${bgImage})` }}>
      {/* オーバーレイ */}
      <div className={`min-h-screen ${overlayClass} p-4`}>
      {/* 帰還演出オーバーレイ */}
      {returningPlayers.length > 0 && (
        <ReturnAnimation returningPlayers={returningPlayers} isIncan={isIncan} />
      )}

      {/* ミステリーカード公開演出オーバーレイ */}
      {mysteryRevealInfo && mysteryRevealInfo.fieldCard && (
        <MysteryRevealAnimation
          key={`mystery-${mysteryRevealInfo.cardNumber}`}
          fieldCard={mysteryRevealInfo.fieldCard}
          cardNumber={mysteryRevealInfo.cardNumber}
          totalCards={mysteryRevealInfo.totalCards}
          isFlipping={mysteryRevealInfo.isFlipping}
          isIncan={isIncan}
        />
      )}

      <div className="max-w-5xl mx-auto">
        {/* ヘッダー */}
        <header className="text-center mb-4">
          {/* ロゴ（ルールに応じて切り替え） */}
          <img
            src={logoImage}
            alt={isIncan ? 'インカの黄金' : 'アトランティスの深淵'}
            className={`mx-auto mb-1 ${isIncan ? 'h-8' : 'h-12'}`}
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <div className="text-slate-200 text-sm">
            {debugMode && (
              <span className="bg-orange-600 text-white px-2 py-0.5 rounded text-xs mr-2 inline-flex items-center gap-1">
                <FlaskConical className="w-3 h-3" />
                DEBUG
              </span>
            )}
            ラウンド {gameState.round} / 5 | ターン {gameState.turn}
            {roomCode && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(roomCode);
                }}
                className="ml-2 text-slate-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
                title="クリックでコピー"
              >
                ルーム: {roomCode}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}
          </div>
        </header>

        {/* コントロール（上部に配置） */}
        <div className="bg-slate-800/90 rounded-xl p-4 mb-4">
          <GameControls
            phase={gameState.phase}
            currentEvent={gameState.currentEvent}
            isExploring={currentPlayer?.isExploring ?? false}
            isAllIn={currentPlayer?.isAllIn ?? false}
            round={gameState.round}
            decision={currentPlayer?.decision ?? null}
            allDecided={allDecided}
            isHost={isHost}
            players={gameState.players}
            cardDraw={gameState.cardDraw}
            trapCounts={gameState.trapCounts}
            remainderGems={gameState.remainderGems}
            isIncan={isIncan}
            onProceed={() => makeDecision('proceed')}
            onReturn={() => makeDecision('return')}
            onAllIn={declareAllIn}
            onStartRound={startRound}
            onNextRound={nextRound}
            onStartGame={startGame}
          />
        </div>

        {/* プレイヤーカード（6列グリッド） */}
        <div className="bg-slate-800/90 rounded-xl p-3 mb-4">
          <PlayerCardGrid
            players={gameState.players}
            currentPlayerId={currentPlayer?.id}
            allDecided={allDecided}
            showConfirmedGems={gameState.phase === 'game_end'}
            debugMode={debugMode}
            onDebugDecision={updateAnyPlayerDecision}
          />
        </div>

        {/* ゲームボード */}
        <GameBoard gameState={gameState} allDecided={allDecided} isIncan={isIncan} />

        {/* デバッグ: カード確率 */}
        {deckStats && (
          <div className="fixed bottom-2 right-2">
            {showProbability ? (
              <div className="bg-black/90 text-white text-xs p-3 rounded-lg font-mono max-w-xs max-h-96 overflow-y-auto">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">デッキ残り: {deckStats.total}枚</span>
                  <button
                    onClick={() => setShowProbability(false)}
                    className="text-gray-400 hover:text-white ml-2"
                  >✕</button>
                </div>

                {/* カテゴリ別 */}
                <div className="border-b border-gray-600 pb-2 mb-2">
                  <div>💎 宝石: {deckStats.gems.count} ({deckStats.gems.pct}%)</div>
                  <div>🦈 罠: {deckStats.traps.count} ({deckStats.traps.pct}%)</div>
                  <div>⚡ 特殊: {deckStats.specials.count} ({deckStats.specials.pct}%)</div>
                  <div>🏺 遺物: {deckStats.relics.count} ({deckStats.relics.pct}%)</div>
                </div>

                {/* 宝石カード詳細 */}
                <div className="mb-2">
                  <div className="text-emerald-400 mb-1">💎 宝石カード詳細</div>
                  <div className="grid grid-cols-2 gap-x-2">
                    {Object.entries(deckStats.gems.byValue)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([value, count]) => (
                        <div key={value} className="text-gray-300">
                          {value}点: {count}枚 ({((count / deckStats.total) * 100).toFixed(1)}%)
                        </div>
                      ))}
                  </div>
                </div>

                {/* 罠カード詳細 */}
                <div className="mb-2">
                  <div className="text-red-400 mb-1">🦈 罠カード詳細</div>
                  {Object.entries(deckStats.traps.byType).map(([type, count]) => {
                    const emoji: Record<string, string> = { shark: '🦈', light: '💡', rope: '🪢', bombe: '🫧', pressure: '💀' };
                    return (
                      <div key={type} className="text-gray-300">
                        {emoji[type] || '?'} {type}: {count}枚 ({((count / deckStats.total) * 100).toFixed(1)}%)
                      </div>
                    );
                  })}
                </div>

                {/* 特殊カード詳細 */}
                <div>
                  <div className="text-blue-400 mb-1">⚡ 特殊カード詳細</div>
                  {Object.entries(deckStats.specials.byEffect).map(([effect, count]) => {
                    const labels: Record<string, string> = {
                      double_remainder: '端数2倍',
                      bonus_all: '全員+5',
                      draw_three: '3枚ドロー',
                      remove_trap: '罠削除',
                    };
                    return (
                      <div key={effect} className="text-gray-300">
                        {labels[effect] || effect}: {count}枚 ({((count / deckStats.total) * 100).toFixed(1)}%)
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowProbability(true)}
                className="bg-black/70 hover:bg-black/90 text-white text-xs px-3 py-2 rounded-lg transition-colors"
              >
                確率情報表示
              </button>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
