import { useEffect, useRef } from 'react';
import { usePlayer } from '../../shared/hooks/usePlayer';
import { useRoom } from './hooks/useRoom';
import { Lobby } from './components/Lobby';
import { TileTestPage } from './components/TileTestPage';
import { GameScreen } from './components/GameScreen';
import { initializeRound, isGameOver } from './lib/game-flow';
import type { RoundResult } from './types/game';

interface SokuJongGameProps {
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

// 役満名
const YAKUMAN_NAMES: Record<string, string> = {
  'all-green': 'オールグリーン',
  'chinroto': 'チンヤオ',
  'super-red': 'スーパーレッド',
};

// 内訳名
const BREAKDOWN_NAMES: Record<string, string> = {
  mentsu: '面子点',
  red: '赤牌',
  dora: 'ドラ',
  dealer: '親ボーナス',
  tanyao: 'タンヤオ',
  chanta: 'チャンタ',
};

export const SokuJongGame = ({ onBack }: SokuJongGameProps) => {
  const { playerId, playerName } = usePlayer();
  const {
    roomCode,
    roomData,
    error,
    isLoading,
    isHost,
    createRoom,
    joinRoom,
    leaveRoom,
    updateGameState,
    addTestPlayer,
  } = useRoom(playerId, playerName);

  // URLパラメータからの自動参加を一度だけ実行
  const hasAutoJoined = useRef(false);

  // ブラウザタイトルを設定
  useEffect(() => {
    document.title = '速雀';
    return () => {
      document.title = 'HIVE';
    };
  }, []);

  // URLパラメータからルームに自動参加
  useEffect(() => {
    if (hasAutoJoined.current) return;
    if (roomCode) return;
    if (!playerId || !playerName) return;

    const urlRoomCode = getRoomCodeFromUrl();
    if (urlRoomCode && urlRoomCode.length === 4) {
      hasAutoJoined.current = true;
      clearRoomCodeFromUrl();
      joinRoom(urlRoomCode);
    }
  }, [roomCode, joinRoom, playerId, playerName]);

  // /test サブルートの検出
  const subPath = window.location.pathname.replace('/hive/soku-jong', '').replace(/^\//, '');
  if (subPath === 'test') {
    return <TileTestPage onBack={onBack} />;
  }

  const gameState = roomData?.gameState;
  const phase = gameState?.phase ?? 'waiting';
  const players = gameState?.players ?? [];

  // ゲーム開始
  const handleStartGame = () => {
    if (!gameState || players.length < 2) return;

    const roundState = initializeRound(players, 1);
    updateGameState({
      ...roundState,
      settings: gameState.settings,
    });
  };

  // 退出
  const handleLeaveToGameTop = () => {
    leaveRoom();
  };

  // ロビー画面（waiting フェーズ）
  if (phase === 'waiting') {
    return (
      <Lobby
        roomCode={roomCode}
        players={players}
        isHost={isHost}
        isLoading={isLoading}
        error={error}
        hostId={roomData?.hostId ?? ''}
        playerName={playerName}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onLeaveRoom={handleLeaveToGameTop}
        onStartGame={handleStartGame}
        onBack={onBack}
        debugMode={false}
        onAddTestPlayer={addTestPlayer}
        settings={gameState?.settings}
        onUpdateSettings={(s) => updateGameState({ settings: { ...gameState!.settings, ...s } })}
      />
    );
  }

  // ロビーに戻る
  const handleBackToLobby = () => {
    updateGameState({ phase: 'waiting', round: 0, roundResult: undefined });
  };

  // playing フェーズ — ゲーム画面
  if (phase === 'playing' && gameState) {
    return (
      <GameScreen
        gameState={gameState}
        playerId={playerId ?? ''}
        onBackToLobby={handleBackToLobby}
        onUpdateGameState={updateGameState}
      />
    );
  }

  // round_result フェーズ — 局結果画面
  if (phase === 'round_result' && gameState) {
    const result: RoundResult | undefined = gameState.roundResult;
    const winner = result?.winnerId ? players.find((p) => p.id === result.winnerId) : null;
    const loser = result?.loserId ? players.find((p) => p.id === result.loserId) : null;

    const handleNextRound = () => {
      if (isGameOver(gameState)) {
        updateGameState({ phase: 'finished', roundResult: undefined });
      } else {
        const nextRound = initializeRound(gameState.players, gameState.round + 1);
        updateGameState({
          ...nextRound,
          settings: gameState.settings,
          timeBank: gameState.timeBank,
          roundResult: undefined,
        });
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-green-900">
        <div className="min-h-screen bg-black/20 flex items-center justify-center p-4">
          <div className="bg-slate-800/95 rounded-xl p-8 max-w-lg w-full">
            <h1 className="mb-6 text-center">
              <img src="/hive/images/vec_logo_soku-jong.svg" alt="速雀" className="h-10 mx-auto" />
            </h1>

            {/* 局結果ヘッダー */}
            <div className="text-center mb-6">
              <p className="text-slate-500 text-sm mb-1">東{gameState.round}局</p>
              {result?.type === 'draw' ? (
                <h2 className="text-2xl font-bold text-amber-400">流局</h2>
              ) : result?.type === 'tsumo' ? (
                <h2 className="text-2xl font-bold text-red-400">
                  {winner?.name ?? '?'} ツモ和了
                </h2>
              ) : (
                <h2 className="text-2xl font-bold text-red-400">
                  {winner?.name ?? '?'} ロン
                  <span className="text-lg text-slate-400 ml-2">← {loser?.name ?? '?'}</span>
                </h2>
              )}
            </div>

            {/* 和了者の手牌表示 */}
            {result?.winnerHand && result.winnerHand.length > 0 && (
              <div className="flex justify-center gap-1 mb-4">
                {result.winnerHand.map((tile) => (
                  <div key={tile.id} className="w-8 h-10 bg-slate-700 rounded border border-slate-600 flex items-center justify-center text-xs text-slate-200">
                    {tile.kind}
                    {tile.isRed && <span className="text-red-400 text-[8px] ml-0.5">赤</span>}
                  </div>
                ))}
              </div>
            )}

            {/* 点数内訳 */}
            {result?.score && (
              <div className="bg-slate-900/50 rounded-lg p-4 mb-4">
                {result.score.yakuman ? (
                  <div className="text-center">
                    <p className="text-xl font-bold text-amber-300 mb-1">
                      {YAKUMAN_NAMES[result.score.yakuman] ?? result.score.yakuman}
                    </p>
                    <p className="text-3xl font-bold text-red-400">{result.score.yakumanPoints}点</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1 mb-3">
                      {Object.entries(result.score.breakdown).map(([key, val]) => {
                        if (val === 0) return null;
                        return (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-slate-400">{BREAKDOWN_NAMES[key] ?? key}</span>
                            <span className="text-slate-200">{val}点</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t border-slate-700 pt-2 flex justify-between font-bold">
                      <span className="text-slate-300">合計</span>
                      <span className="text-red-400 text-lg">{result.score.total}点</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 各プレイヤーの持ち点 */}
            <div className="space-y-2 mb-6">
              {[...players].sort((a, b) => b.score - a.score).map((p) => (
                <div key={p.id} className={`flex justify-between items-center px-3 py-2 rounded ${
                  p.id === result?.winnerId ? 'bg-red-900/30 border border-red-800/50' :
                  p.id === result?.loserId ? 'bg-blue-900/30 border border-blue-800/50' :
                  'bg-slate-700/30'
                }`}>
                  <span className="text-slate-300">{p.name}</span>
                  <span className={`font-mono font-bold ${
                    p.id === result?.winnerId ? 'text-red-400' :
                    p.id === result?.loserId ? 'text-blue-400' :
                    'text-slate-300'
                  }`}>
                    {p.score}点
                  </span>
                </div>
              ))}
            </div>

            {/* 次局ボタン */}
            <div className="flex gap-3">
              <button
                onClick={handleBackToLobby}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 font-bold transition-all"
              >
                ロビーに戻る
              </button>
              <button
                onClick={handleNextRound}
                className="flex-1 px-4 py-3 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-white font-bold transition-all"
              >
                {isGameOver(gameState) ? '最終結果へ' : '次の局へ'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // finished フェーズ — 最終結果画面
  if (phase === 'finished' && gameState) {
    const rankedPlayers = [...players].sort((a, b) => b.score - a.score);
    const topPlayer = rankedPlayers[0];

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-green-900">
        <div className="min-h-screen bg-black/20 flex items-center justify-center p-4">
          <div className="bg-slate-800/95 rounded-xl p-8 max-w-lg w-full text-center">
            <h1 className="mb-6">
              <img src="/hive/images/vec_logo_soku-jong.svg" alt="速雀" className="h-10 mx-auto" />
            </h1>

            <h2 className="text-2xl font-bold text-amber-300 mb-2">対局終了</h2>
            <p className="text-slate-400 mb-6">東{gameState.settings.totalRounds}局 終了</p>

            {/* ランキング */}
            <div className="space-y-3 mb-8">
              {rankedPlayers.map((p, i) => (
                <div key={p.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                  i === 0 ? 'bg-amber-900/30 border border-amber-700/50' : 'bg-slate-700/30'
                }`}>
                  <span className={`text-lg font-bold w-8 ${
                    i === 0 ? 'text-amber-300' :
                    i === 1 ? 'text-slate-300' :
                    i === 2 ? 'text-amber-600' :
                    'text-slate-500'
                  }`}>
                    {i + 1}位
                  </span>
                  <span className="text-slate-200 flex-1 text-left">{p.name}</span>
                  <span className={`font-mono font-bold text-lg ${
                    i === 0 ? 'text-amber-300' : 'text-slate-300'
                  }`}>
                    {p.score}点
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleBackToLobby}
              className="w-full px-6 py-3 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-white font-bold transition-all"
            >
              ロビーに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // フォールバック
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-green-900 flex items-center justify-center">
      <div className="bg-slate-800/95 rounded-xl p-8 max-w-md w-full text-center">
        <p className="text-slate-400 mb-4">読み込み中...</p>
        <button
          onClick={handleBackToLobby}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 font-bold transition-all"
        >
          ロビーに戻る
        </button>
      </div>
    </div>
  );
};
