import { useState, useRef } from 'react';
import { Crown, FlaskConical, HelpCircle, Heart, ArrowLeft } from 'lucide-react';
import type { Player, GameSettings } from '../types/game';

interface LobbyProps {
  roomCode: string | null;
  players: Player[];
  isHost: boolean;
  isLoading: boolean;
  error: string | null;
  hostId: string;
  playerName: string | null;
  settings: GameSettings;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  onStartGame: () => void;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  onBack?: () => void;
  // デバッグ用
  debugMode?: boolean;
  onAddTestPlayer?: () => void;
}

export const Lobby = ({
  roomCode,
  players,
  isHost,
  isLoading,
  error,
  hostId,
  playerName,
  settings,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onStartGame,
  onUpdateSettings,
  onBack,
  debugMode = false,
  onAddTestPlayer,
}: LobbyProps) => {
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const roomCodeInputRef = useRef<HTMLInputElement>(null);
  const [canJoin, setCanJoin] = useState(false);

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    }
  };

  // デバッグモードでは1人でもゲーム開始可能、通常は2人以上
  const canStartGame = debugMode ? players.length >= 1 : players.length >= 2;

  // ルーム待機画面
  if (roomCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900">
        <div className="min-h-screen bg-black/20 flex items-center justify-center p-4">
          <div className="bg-slate-800/95 rounded-xl p-6 max-w-2xl w-full">
            {/* タイトル */}
            <div className="text-center mb-4 relative">
              <button
                onClick={() => {/* TODO: ルールモーダル */}}
                className="absolute right-0 top-0 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="遊び方"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <h1 className="text-3xl font-bold text-white">ジャッカル</h1>
              <p className="text-white/60 text-sm mt-1">ブラフ＆心理戦ゲーム</p>
              {debugMode && (
                <span className="text-xs bg-orange-600 text-white px-2 py-0.5 rounded inline-flex items-center gap-1 mt-2">
                  <FlaskConical className="w-3 h-3" />
                  デバッグモード
                </span>
              )}
            </div>

            {/* ルームコード */}
            <div className="bg-slate-700 rounded-lg p-4 mb-6 text-center relative">
              <div className="text-slate-400 text-sm mb-1">ルームコード</div>
              <button
                onClick={copyRoomCode}
                className="w-full flex items-center justify-center gap-2 text-4xl font-mono font-bold text-white tracking-widest transition-colors cursor-pointer hover:text-indigo-300"
                title="クリックでコピー"
              >
                {roomCode}
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              {showCopiedToast && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-full bg-green-500 text-white text-sm px-3 py-1 rounded shadow-lg">
                  コピーしました
                </div>
              )}
            </div>

            {/* 設定（ホストのみ） */}
            {isHost && (
              <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                <h3 className="text-white font-bold text-sm mb-3">ゲーム設定</h3>
                <div className="flex items-center gap-4">
                  <span className="text-slate-300 text-sm flex items-center gap-1">
                    <Heart className="w-4 h-4 text-red-400" />
                    初期ライフ
                  </span>
                  <div className="flex gap-2">
                    {[2, 3].map((life) => (
                      <button
                        key={life}
                        onClick={() => onUpdateSettings({ initialLife: life })}
                        className={`px-4 py-1 rounded font-bold transition-colors ${
                          settings.initialLife === life
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                        }`}
                      >
                        {life}
                      </button>
                    ))}
                  </div>
                  <span className="text-slate-400 text-xs">
                    {players.length >= 6 ? '（6人以上は2推奨）' : ''}
                  </span>
                </div>
              </div>
            )}

            {/* プレイヤー一覧 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-bold">プレイヤー ({players.length}/10)</span>
                {debugMode && onAddTestPlayer && players.length < 10 && (
                  <button
                    onClick={onAddTestPlayer}
                    className="text-xs bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 rounded transition-colors"
                  >
                    + テストプレイヤー
                  </button>
                )}
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 p-2 bg-slate-800/50 rounded"
                  >
                    {player.id === hostId && (
                      <Crown className="w-4 h-4 text-yellow-400" />
                    )}
                    <span className="text-white flex-1">{player.name}</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: player.life }).map((_, i) => (
                        <Heart key={i} className="w-4 h-4 text-red-400 fill-red-400" />
                      ))}
                    </div>
                  </div>
                ))}
                {players.length === 0 && (
                  <div className="text-slate-400 text-center py-4">
                    プレイヤーがいません
                  </div>
                )}
              </div>
            </div>

            {/* エラー表示 */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 text-center text-red-300">
                {error}
              </div>
            )}

            {/* アクションボタン */}
            <div className="flex gap-3">
              <button
                onClick={onLeaveRoom}
                className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
              >
                退出
              </button>
              {isHost ? (
                <button
                  onClick={onStartGame}
                  disabled={!canStartGame || isLoading}
                  className={`flex-1 py-3 rounded-lg font-bold transition-all ${
                    canStartGame && !isLoading
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white'
                      : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? '準備中...' : canStartGame ? 'ゲーム開始' : `あと${2 - players.length}人必要`}
                </button>
              ) : (
                <div className="flex-1 py-3 bg-slate-700 rounded-lg text-center text-slate-400">
                  ホストの開始を待っています...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ルーム作成/参加画面
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900">
      <div className="min-h-screen bg-black/20 flex items-center justify-center p-4">
        <div className="bg-slate-800/95 rounded-xl p-6 max-w-md w-full">
          {/* 戻るボタン */}
          {onBack && (
            <button
              onClick={onBack}
              className="mb-4 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* タイトル */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white">ジャッカル</h1>
            <p className="text-white/60 text-sm mt-1">ブラフ＆心理戦ゲーム</p>
            {debugMode && (
              <span className="text-xs bg-orange-600 text-white px-2 py-0.5 rounded inline-flex items-center gap-1 mt-2">
                <FlaskConical className="w-3 h-3" />
                デバッグモード
              </span>
            )}
          </div>

          {/* プレイヤー名表示 */}
          <div className="bg-slate-700/50 rounded-lg p-3 mb-6 text-center">
            <span className="text-slate-400 text-sm">プレイヤー名: </span>
            <span className="text-white font-bold">{playerName}</span>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 text-center text-red-300">
              {error}
            </div>
          )}

          {/* アクション */}
          <div className="space-y-4">
            {/* ルーム作成 */}
            <button
              onClick={onCreateRoom}
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:from-slate-600 disabled:to-slate-600 rounded-lg text-white font-bold transition-all"
            >
              {isLoading ? '作成中...' : '部屋を作る'}
            </button>

            {/* 区切り */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-600" />
              <span className="text-slate-400 text-sm">または</span>
              <div className="flex-1 h-px bg-slate-600" />
            </div>

            {/* ルーム参加 */}
            <div className="space-y-2">
              <input
                ref={roomCodeInputRef}
                type="text"
                placeholder="ルームコードを入力"
                maxLength={4}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  e.target.value = value;
                  setCanJoin(value.length === 4);
                }}
                className="w-full px-4 py-3 bg-slate-700 rounded-lg text-white text-center text-2xl font-mono tracking-widest placeholder:text-slate-500 placeholder:text-base placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => {
                  const code = roomCodeInputRef.current?.value;
                  if (code) onJoinRoom(code);
                }}
                disabled={!canJoin || isLoading}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white font-bold transition-colors"
              >
                {isLoading ? '参加中...' : '部屋に入る'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
