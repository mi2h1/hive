import { useState, useRef } from 'react';
import { Crown, HelpCircle, Link } from 'lucide-react';
import type { Player, GameSettings } from '../types/game';

interface LobbyProps {
  roomCode: string | null;
  players: Player[];
  isHost: boolean;
  isLoading: boolean;
  error: string | null;
  hostId: string;
  playerName: string | null;
  settings?: GameSettings;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  onStartGame: () => void;
  onUpdateSettings?: (settings: Partial<GameSettings>) => void;
  onBack?: () => void;
  // フェードアウト中
  isFadingOut?: boolean;
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
  isFadingOut = false,
}: LobbyProps) => {
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [showLinkCopiedToast, setShowLinkCopiedToast] = useState(false);
  const roomCodeInputRef = useRef<HTMLInputElement>(null);
  const [canJoin, setCanJoin] = useState(false);

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    }
  };

  const copyInviteLink = () => {
    if (roomCode) {
      const url = `${window.location.origin}/hive/polyform?room=${roomCode}`;
      navigator.clipboard.writeText(url);
      setShowLinkCopiedToast(true);
      setTimeout(() => setShowLinkCopiedToast(false), 2000);
    }
  };

  // 2人以上でゲーム開始可能
  const canStartGame = players.length >= 2;

  // ルーム待機画面
  if (roomCode) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-teal-900 to-emerald-900 transition-opacity duration-300 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
        <div className="min-h-screen bg-black/20 flex items-center justify-center p-4">
          <div className="bg-slate-800/95 rounded-xl p-6 max-w-3xl w-full">
            {/* タイトル */}
            <div className="text-center mb-4 relative">
              <button
                onClick={() => {/* TODO: ルールモーダル */}}
                className="absolute right-0 top-0 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="遊び方"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <img
                src="/hive/images/vec_logo_polyform.svg"
                alt="POLYFORM"
                className="h-7 mx-auto filter brightness-0 invert"
              />
              <p className="text-white/60 text-sm mt-2">パズル × 拡大再生産</p>
            </div>

            {/* ルームコード */}
            <div className="bg-slate-700 rounded-lg p-4 mb-4 text-center relative">
              <div className="text-slate-400 text-sm mb-1">ルームコード</div>
              <button
                onClick={copyRoomCode}
                className="w-full flex items-center justify-center gap-2 text-4xl font-mono font-bold text-white tracking-widest transition-colors cursor-pointer hover:text-teal-300"
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

            {/* 招待リンク */}
            <div className="mb-6 relative">
              <button
                onClick={copyInviteLink}
                className="w-full flex items-center justify-center gap-2 px-4 py-2
                  bg-slate-600 hover:bg-slate-500 rounded-lg text-slate-200 text-sm transition-colors"
              >
                <Link className="w-4 h-4" />
                招待リンクをコピー
              </button>
              {showLinkCopiedToast && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-sm rounded-full animate-fade-in whitespace-nowrap">
                  リンクをコピーしました
                </div>
              )}
            </div>

            {/* 2カラムレイアウト */}
            <div className="flex gap-6 mb-6">
              {/* 左カラム: プレイヤー一覧 */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-bold">プレイヤー ({players.length}/4)</span>
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
                      <div className="flex items-center gap-1 text-slate-400 text-sm">
                        ピース: {player.pieces.length}
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

              {/* 右カラム: ルールオプション */}
              <div className="w-56">
                <div className="text-white font-bold mb-2">ルールオプション</div>
                <div className="bg-slate-700/50 rounded-lg p-3 space-y-3">
                  {/* スコア公開設定 */}
                  <div>
                    <div className="text-slate-300 text-sm mb-2">他プレイヤーの得点</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onUpdateSettings?.({ scoreVisibility: 'public' })}
                        disabled={!isHost}
                        className={`flex-1 py-1.5 px-2 rounded text-sm font-medium transition-all ${
                          settings?.scoreVisibility === 'public'
                            ? 'bg-teal-500 text-white'
                            : isHost
                              ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                              : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        公開
                      </button>
                      <button
                        onClick={() => onUpdateSettings?.({ scoreVisibility: 'hidden' })}
                        disabled={!isHost}
                        className={`flex-1 py-1.5 px-2 rounded text-sm font-medium transition-all ${
                          settings?.scoreVisibility === 'hidden'
                            ? 'bg-teal-500 text-white'
                            : isHost
                              ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                              : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        非公開
                      </button>
                    </div>
                    <div className="text-slate-400 text-xs mt-1">
                      {settings?.scoreVisibility === 'hidden'
                        ? 'ゲーム終了まで非表示'
                        : '常に表示'}
                    </div>
                  </div>
                </div>
                {!isHost && (
                  <div className="text-slate-500 text-xs mt-2 text-center">
                    ホストのみ変更可能
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
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white'
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
    <div className="min-h-screen bg-gradient-to-br from-teal-900 to-emerald-900">
      <div className="min-h-screen bg-black/20 flex items-center justify-center p-4">
        <div className="bg-slate-800/95 rounded-xl p-6 max-w-md w-full">
          {/* タイトル */}
          <div className="relative mb-2">
            <button
              onClick={() => {/* TODO: ルールモーダル */}}
              className="absolute right-0 top-0 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="遊び方"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <img
              src="/hive/images/vec_logo_polyform.svg"
              alt="POLYFORM"
              className="h-8 mx-auto filter brightness-0 invert"
            />
          </div>
          <div className="text-slate-400 text-center mb-6">
            ようこそ、{playerName}さん
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-900/50 text-red-300 px-4 py-2 rounded-lg mb-4 text-center">
              {error}
            </div>
          )}

          {/* アクション */}
          <div className="space-y-6">
            {/* ルーム作成 */}
            <button
              onClick={onCreateRoom}
              disabled={isLoading}
              className="w-full px-6 py-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 rounded-lg text-white font-bold text-lg transition-all"
            >
              {isLoading ? '作成中...' : '新しいルームを作成'}
            </button>

            {/* 区切り */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-600" />
              <span className="text-slate-500">または</span>
              <div className="flex-1 h-px bg-slate-600" />
            </div>

            {/* ルーム参加 */}
            <div className="space-y-3">
              <input
                ref={roomCodeInputRef}
                type="text"
                inputMode="url"
                enterKeyHint="go"
                lang="en"
                onChange={(e) => {
                  const filtered = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                  setCanJoin(filtered.length >= 4);
                }}
                onBlur={(e) => {
                  const raw = e.target.value;
                  const filtered = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
                  e.target.value = filtered;
                  setCanJoin(filtered.length === 4);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const raw = roomCodeInputRef.current?.value ?? '';
                    const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
                    if (code.length === 4) onJoinRoom(code);
                  }
                }}
                placeholder="ルームコードを入力"
                className="w-full px-4 py-3 bg-slate-700 text-white text-center text-xl font-mono tracking-widest rounded-lg uppercase focus:outline-none focus:ring-2 focus:ring-teal-500"
                maxLength={10}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
              <button
                onClick={() => {
                  const raw = roomCodeInputRef.current?.value ?? '';
                  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
                  if (code.length === 4) onJoinRoom(code);
                }}
                disabled={isLoading || !canJoin}
                className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-500 disabled:to-gray-600 rounded-lg text-white font-bold transition-all"
              >
                {isLoading ? '参加中...' : 'ルームに参加'}
              </button>
            </div>

            {/* 戻るボタン */}
            {onBack && (
              <button
                onClick={onBack}
                className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 font-bold transition-all"
              >
                ゲーム選択に戻る
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
