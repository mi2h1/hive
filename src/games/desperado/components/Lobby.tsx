import { useState, useRef } from 'react';
import { Crown, HelpCircle, Link } from 'lucide-react';
import type { Player } from '../types/game';
import { RulesModal } from './RulesModal';

interface LobbyProps {
  roomCode: string | null;
  players: Player[];
  isHost: boolean;
  isLoading: boolean;
  error: string | null;
  hostId: string;
  playerName: string | null;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  onStartGame: () => void;
  onBack?: () => void;
  // デバッグ用
  debugMode?: boolean;
  onAddTestPlayer?: () => void;
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
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onStartGame,
  onBack,
  debugMode = false,
  onAddTestPlayer,
  isFadingOut = false,
}: LobbyProps) => {
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [showLinkCopiedToast, setShowLinkCopiedToast] = useState(false);
  const [showRules, setShowRules] = useState(false);
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
      const url = `${window.location.origin}/boards/desperado?room=${roomCode}`;
      navigator.clipboard.writeText(url);
      setShowLinkCopiedToast(true);
      setTimeout(() => setShowLinkCopiedToast(false), 2000);
    }
  };

  // デバッグモードでは1人でもゲーム開始可能
  const canStartGame = debugMode ? players.length >= 1 : players.length >= 2;

  // ルーム待機画面
  if (roomCode) {
    return (
      <>
        {showRules && <RulesModal onClose={() => setShowRules(false)} />}
        <div className={`min-h-screen bg-gradient-to-br from-amber-900 to-red-900 transition-opacity duration-300 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
          <div className="min-h-screen bg-black/20 flex items-center justify-center p-4">
            <div className="bg-slate-800/95 rounded-xl p-6 max-w-2xl w-full">
              {/* タイトル */}
              <div className="text-center mb-4 relative">
                <button
                  onClick={() => setShowRules(true)}
                  className="absolute right-0 top-0 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="遊び方"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
                <img
                  src="/boards/images/vec_logo_desperado.svg"
                  alt="Desperado"
                  className="h-10 mx-auto mb-2"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
                <p className="text-amber-400 text-sm">ダイスバトルゲーム</p>
              </div>

              {/* ルームコード */}
              <div className="bg-slate-700 rounded-lg p-4 mb-4 text-center relative">
                <div className="text-slate-400 text-sm mb-1">ルームコード</div>
                <button
                  onClick={copyRoomCode}
                  className="w-full flex items-center justify-center gap-2 text-4xl font-mono font-bold text-white tracking-widest transition-colors cursor-pointer hover:text-amber-300"
                  title="クリックでコピー"
                >
                  {roomCode}
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                {showCopiedToast && (
                  <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-sm rounded-full animate-fade-in">
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

              {/* デバッグ用: ゲーム開始ボタン */}
              {debugMode && isHost && (
                <div className="mb-4">
                  <button
                    onClick={onStartGame}
                    disabled={players.length < 1}
                    className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700
                      disabled:bg-gray-600 rounded-lg text-white font-bold transition-all"
                  >
                    {players.length >= 1 ? 'ゲーム開始（デバッグ）' : 'プレイヤーを追加してください'}
                  </button>
                </div>
              )}

              {/* ゲーム開始ボタン（通常モード・ホストのみ） */}
              {!debugMode && (
                <div className="mb-4">
                  {isHost ? (
                    <button
                      onClick={onStartGame}
                      disabled={!canStartGame}
                      className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500
                        hover:from-amber-600 hover:to-orange-600 disabled:from-gray-500 disabled:to-gray-600
                        rounded-lg text-white font-bold transition-all"
                    >
                      {canStartGame ? 'ゲーム開始' : '2人以上で開始できます'}
                    </button>
                  ) : (
                    <div className="text-center text-slate-400 py-3">
                      ホストの開始を待っています...
                    </div>
                  )}
                </div>
              )}

              {/* 参加者一覧 */}
              <div className="mb-4">
                {/* デバッグ用: テストプレイヤー追加 */}
                {debugMode && onAddTestPlayer && (
                  <button
                    onClick={onAddTestPlayer}
                    className="w-full mb-2 px-3 py-2 bg-orange-600 hover:bg-orange-700
                      rounded-lg text-white text-sm font-bold transition-all"
                  >
                    + テストプレイヤーを追加
                  </button>
                )}
                <div className="text-slate-400 text-sm mb-2">
                  参加者 ({players.length}人)
                </div>
                <div className="flex flex-wrap gap-2">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-1 bg-slate-700 px-3 py-1.5 rounded-lg text-sm"
                    >
                      {player.id === hostId && <Crown className="w-4 h-4 text-yellow-400" />}
                      <span className="text-white">{player.name}</span>
                      {player.name === playerName && (
                        <span className="text-slate-400 text-xs">(自分)</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-slate-500 text-xs mt-3 text-center">
                  ライフ5からスタート。最後まで生き残れ！
                </p>
              </div>

              {/* 退出ボタン */}
              <button
                onClick={onLeaveRoom}
                className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600
                  rounded-lg text-slate-300 font-bold transition-all"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ルーム作成/参加画面
  return (
    <>
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      <div className="min-h-screen bg-gradient-to-br from-amber-900 to-red-900">
        <div className="min-h-screen bg-black/20 flex items-center justify-center p-4">
          <div className="bg-slate-800/95 rounded-xl p-6 max-w-md w-full">
            {/* タイトル */}
            <div className="relative mb-2">
              <button
                onClick={() => setShowRules(true)}
                className="absolute right-0 top-0 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="遊び方"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <img
                src="/boards/images/vec_logo_desperado.svg"
                alt="Desperado"
                className="h-12 mx-auto mb-2"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <p className="text-amber-400 text-center text-sm">ダイスバトルゲーム</p>
            </div>
            <div className="text-slate-400 text-center mb-6">
              ようこそ、{playerName}さん
            </div>

            {error && (
              <div className="bg-red-900/50 text-red-300 px-4 py-2 rounded-lg mb-4 text-center">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* ルーム作成 */}
              <button
                onClick={onCreateRoom}
                disabled={isLoading}
                className="w-full px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500
                  hover:from-amber-600 hover:to-orange-600 disabled:from-gray-500 disabled:to-gray-600
                  rounded-lg text-white font-bold text-lg transition-all"
              >
                {isLoading ? '作成中...' : '新しいルームを作成'}
              </button>

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
                  className="w-full px-4 py-3 bg-slate-700 text-white text-center text-xl
                    font-mono tracking-widest rounded-lg uppercase
                    focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500
                    hover:from-orange-600 hover:to-red-600 disabled:from-gray-500 disabled:to-gray-600
                    rounded-lg text-white font-bold transition-all"
                >
                  {isLoading ? '参加中...' : 'ルームに参加'}
                </button>
              </div>

              {/* 戻るボタン */}
              {onBack && (
                <button
                  onClick={onBack}
                  className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600
                    rounded-lg text-slate-300 font-bold transition-all"
                >
                  ゲーム選択に戻る
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
