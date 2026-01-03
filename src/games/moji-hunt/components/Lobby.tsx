import { useState } from 'react';
import { Crown, FlaskConical } from 'lucide-react';
import type { Player, GameSettings, TopicCategory } from '../types/game';
import { TOPIC_LABELS } from '../types/game';

interface LobbyProps {
  roomCode: string | null;
  players: Player[];
  isHost: boolean;
  isLoading: boolean;
  error: string | null;
  settings: GameSettings;
  hostId: string;
  playerName: string | null;
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
  settings,
  hostId,
  playerName,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onStartGame,
  onUpdateSettings,
  onBack,
  debugMode = false,
  onAddTestPlayer,
}: LobbyProps) => {
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    }
  };

  // デバッグモードでは1人でもゲーム開始可能
  const canStartGame = debugMode ? players.length >= 1 : players.length >= 2;

  // ルーム待機画面
  if (roomCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-900 to-orange-900">
        <div className="min-h-screen bg-black/20 flex items-center justify-center p-4">
          <div className="bg-slate-800/95 rounded-xl p-6 max-w-2xl w-full">
            {/* タイトル */}
            <h1 className="text-3xl font-bold text-white text-center mb-4 flex items-center justify-center gap-2">
              もじはんと
              {debugMode && (
                <span className="text-xs bg-orange-600 text-white px-2 py-0.5 rounded inline-flex items-center gap-1">
                  <FlaskConical className="w-3 h-3" />
                  デバッグモード
                </span>
              )}
            </h1>

            {/* ルームコード */}
            <div className="bg-slate-700 rounded-lg p-4 mb-6 text-center relative">
              <div className="text-slate-400 text-sm mb-1">ルームコード</div>
              <button
                onClick={copyRoomCode}
                className="w-full flex items-center justify-center gap-2 text-4xl font-mono font-bold text-white tracking-widest transition-colors cursor-pointer hover:text-pink-300"
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

            {/* デバッグ用: ゲーム開始ボタン（通常ボタンの上に配置） */}
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
                    className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-500
                      hover:from-pink-600 hover:to-orange-600 disabled:from-gray-500 disabled:to-gray-600
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

            {/* 参加者とお題設定（2列レイアウト） */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* 左列: プレイヤー追加（デバッグ時）+ プレイヤー一覧 */}
              <div>
                {/* デバッグ用: テストプレイヤー追加 */}
                {debugMode && onAddTestPlayer && players.length < 5 && (
                  <button
                    onClick={onAddTestPlayer}
                    className="w-full mb-2 px-3 py-2 bg-orange-600 hover:bg-orange-700
                      rounded-lg text-white text-sm font-bold transition-all"
                  >
                    + テストプレイヤーを追加
                  </button>
                )}
                <div className="text-slate-400 text-sm mb-2">
                  参加者 ({players.length}/5)
                </div>
                <div className="space-y-1">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-1 bg-slate-700 px-3 py-1.5 rounded-lg text-sm"
                    >
                      {player.id === hostId && <Crown className="w-4 h-4 text-yellow-400" />}
                      <span className="text-white truncate">{player.name}</span>
                      {player.name === playerName && (
                        <span className="text-slate-400 text-xs">(自分)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 右列: お題設定 */}
              <div>
                <div className="text-slate-400 text-sm mb-2">お題</div>
                <div className="space-y-1">
                  {(Object.keys(TOPIC_LABELS) as TopicCategory[]).map((topic) => {
                    const isActive = settings.topic === topic;
                    return (
                      <button
                        key={topic}
                        onClick={() => isHost && onUpdateSettings({ topic })}
                        disabled={!isHost}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm ${
                          isActive
                            ? 'bg-pink-600 text-white'
                            : isHost
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              : 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <span className="font-bold">{TOPIC_LABELS[topic]}</span>
                      </button>
                    );
                  })}
                </div>
                {!isHost && (
                  <div className="text-slate-500 text-xs mt-1 text-center">
                    ホストのみ変更可
                  </div>
                )}
              </div>
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
    );
  }

  // ルーム作成/参加画面
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-900 to-orange-900">
      <div className="min-h-screen bg-black/20 flex items-center justify-center p-4">
        <div className="bg-slate-800/95 rounded-xl p-6 max-w-md w-full">
          {/* タイトル */}
          <h1 className="text-4xl font-bold text-white text-center mb-2">もじはんと</h1>
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
              className="w-full px-6 py-4 bg-gradient-to-r from-pink-500 to-orange-500
                hover:from-pink-600 hover:to-orange-600 disabled:from-gray-500 disabled:to-gray-600
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
                type="text"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="ルームコードを入力"
                className="w-full px-4 py-3 bg-slate-700 text-white text-center text-xl
                  font-mono tracking-widest rounded-lg uppercase
                  focus:outline-none focus:ring-2 focus:ring-pink-500"
                maxLength={4}
              />
              <button
                onClick={() => onJoinRoom(roomCodeInput)}
                disabled={isLoading || roomCodeInput.length !== 4}
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
  );
};
