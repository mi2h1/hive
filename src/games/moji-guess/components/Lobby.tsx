import { useState } from 'react';
import { Copy, Check, Crown, Users, LogOut, Play } from 'lucide-react';
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
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  onStartGame: () => void;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
}

export const Lobby = ({
  roomCode,
  players,
  isHost,
  isLoading,
  error,
  settings,
  hostId,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onStartGame,
  onUpdateSettings,
}: LobbyProps) => {
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canStartGame = players.length >= 2;

  // ルームに参加していない場合
  if (!roomCode) {
    return (
      <div className="space-y-6">
        {/* ルーム作成 */}
        <div className="bg-white/10 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">ルームを作成</h2>
          <button
            onClick={onCreateRoom}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-500
              hover:from-pink-600 hover:to-orange-600 disabled:from-gray-500 disabled:to-gray-600
              rounded-lg text-white font-bold transition-all"
          >
            {isLoading ? '作成中...' : '新しいルームを作成'}
          </button>
        </div>

        {/* ルーム参加 */}
        <div className="bg-white/10 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">ルームに参加</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ルームコード"
              maxLength={4}
              className="flex-1 px-4 py-3 bg-white/10 text-white rounded-lg
                focus:outline-none focus:ring-2 focus:ring-pink-500
                placeholder:text-white/40 uppercase tracking-widest text-center text-xl"
            />
            <button
              onClick={() => onJoinRoom(joinCode)}
              disabled={isLoading || joinCode.length !== 4}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 disabled:bg-white/10
                disabled:text-white/40 rounded-lg text-white font-bold transition-all"
            >
              参加
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 text-red-200 px-4 py-3 rounded-lg text-center">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ルームに参加している場合
  return (
    <div className="space-y-6">
      {/* ルーム情報 */}
      <div className="bg-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">ルーム: {roomCode}</h2>
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20
              rounded-lg text-white/80 text-sm transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                コピー済み
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                コードをコピー
              </>
            )}
          </button>
        </div>

        {/* お題設定（ホストのみ） */}
        {isHost && (
          <div className="mb-4">
            <label className="block text-white/80 text-sm mb-2">お題</label>
            <select
              value={settings.topic}
              onChange={(e) => onUpdateSettings({ topic: e.target.value as TopicCategory })}
              className="w-full px-4 py-2 bg-white/10 text-white rounded-lg
                focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              {Object.entries(TOPIC_LABELS).map(([value, label]) => (
                <option key={value} value={value} className="bg-slate-800">
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 参加者一覧 */}
        <div>
          <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
            <Users className="w-4 h-4" />
            <span>参加者 ({players.length}/5)</span>
          </div>
          <div className="space-y-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg"
              >
                {player.id === hostId && (
                  <Crown className="w-4 h-4 text-yellow-400" />
                )}
                <span className="text-white">{player.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex gap-3">
        <button
          onClick={onLeaveRoom}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white/10
            hover:bg-white/20 rounded-lg text-white/80 transition-all"
        >
          <LogOut className="w-5 h-5" />
          退出
        </button>
        {isHost && (
          <button
            onClick={onStartGame}
            disabled={!canStartGame}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3
              bg-gradient-to-r from-pink-500 to-orange-500
              hover:from-pink-600 hover:to-orange-600
              disabled:from-gray-500 disabled:to-gray-600
              rounded-lg text-white font-bold transition-all"
          >
            <Play className="w-5 h-5" />
            {canStartGame ? 'ゲーム開始' : '2人以上で開始できます'}
          </button>
        )}
        {!isHost && (
          <div className="flex-1 flex items-center justify-center px-6 py-3
            bg-white/5 rounded-lg text-white/60">
            ホストがゲームを開始するのを待っています...
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-200 px-4 py-3 rounded-lg text-center">
          {error}
        </div>
      )}
    </div>
  );
};
