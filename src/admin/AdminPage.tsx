import { useState, useEffect } from 'react';
import { ArrowLeft, Users, Clock, RefreshCw, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useAdminRooms } from './hooks/useAdminRooms';
import type { AdminRoom } from './hooks/useAdminRooms';

interface AdminPageProps {
  onBack: () => void;
}

// ひらがな50音グリッド（10列×5行、空きはnull）
// 右から左: わ・ら・や・ま・は・な・た・さ・か・あ の順
const HIRAGANA_GRID: (string | null)[] = [
  // あ段
  'わ', 'ら', 'や', 'ま', 'は', 'な', 'た', 'さ', 'か', 'あ',
  // い段
  'を', 'り', null, 'み', 'ひ', 'に', 'ち', 'し', 'き', 'い',
  // う段
  'ん', 'る', 'ゆ', 'む', 'ふ', 'ぬ', 'つ', 'す', 'く', 'う',
  // え段
  null, 'れ', null, 'め', 'へ', 'ね', 'て', 'せ', 'け', 'え',
  // お段
  'ー', 'ろ', 'よ', 'も', 'ほ', 'の', 'と', 'そ', 'こ', 'お',
];

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return '今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  return date.toLocaleDateString('ja-JP');
};

const getPhaseLabel = (gameType: string, phase: string) => {
  if (gameType === 'aoa') {
    switch (phase) {
      case 'waiting': return 'ロビー';
      case 'round_start': return 'ラウンド開始';
      case 'decision': return '決定フェーズ';
      case 'reveal': return 'カード公開';
      case 'round_end': return 'ラウンド終了';
      case 'game_end': return 'ゲーム終了';
      default: return phase;
    }
  } else if (gameType === 'moji-hunt') {
    switch (phase) {
      case 'waiting': return 'ロビー';
      case 'word_input': return 'ワード入力';
      case 'playing': return 'プレイ中';
      case 'game_end': return 'ゲーム終了';
      default: return phase;
    }
  } else if (gameType === 'jackal') {
    switch (phase) {
      case 'waiting': return 'ロビー';
      case 'round_start': return 'ラウンド開始';
      case 'declaring': return '数字宣言中';
      case 'judging': return 'ジャッカル判定';
      case 'round_end': return 'ラウンド終了';
      case 'game_end': return 'ゲーム終了';
      default: return phase;
    }
  } else if (gameType === 'spark') {
    switch (phase) {
      case 'waiting': return 'ロビー';
      case 'selecting': return 'アクション選択';
      case 'revealing': return 'アクション公開';
      case 'resolving': return '解決中';
      case 'replenishing': return '宝石補充';
      case 'ended': return 'ゲーム終了';
      default: return phase;
    }
  } else {
    return phase;
  }
};

const getPhaseColor = (phase: string) => {
  switch (phase) {
    case 'waiting': return 'bg-gray-500';
    case 'word_input': return 'bg-yellow-500';
    case 'playing':
    case 'decision':
    case 'reveal':
    case 'declaring':
    case 'selecting': return 'bg-green-500';
    case 'judging':
    case 'finalRound':
    case 'finishing':
    case 'revealing':
    case 'resolving':
    case 'replenishing': return 'bg-orange-500';
    case 'game_end':
    case 'ended':
    case 'round_end': return 'bg-blue-500';
    default: return 'bg-gray-400';
  }
};

const getGameInfo = (room: AdminRoom) => {
  if (room.gameType === 'aoa') {
    const isIncan = room.details.ruleSetType === 'incan_gold';
    return {
      label: isIncan ? 'インカの黄金' : 'アトランティスの深淵',
      color: isIncan ? 'from-amber-600 to-yellow-600' : 'from-cyan-600 to-teal-600',
    };
  } else if (room.gameType === 'moji-hunt') {
    return {
      label: 'もじはんと',
      color: 'from-pink-600 to-orange-600',
    };
  } else if (room.gameType === 'jackal') {
    return {
      label: 'ジャッカル',
      color: 'from-emerald-600 to-green-600',
    };
  } else if (room.gameType === 'spark') {
    return {
      label: 'SPARK',
      color: 'from-cyan-600 to-blue-600',
    };
  } else {
    return {
      label: room.gameType,
      color: 'from-gray-600 to-gray-500',
    };
  }
};

const RoomCard = ({ room, onDelete }: { room: AdminRoom; onDelete: () => void }) => {
  const [expanded, setExpanded] = useState(false);

  const { label: gameLabel, color: gameColor } = getGameInfo(room);

  return (
    <div className="bg-slate-800/80 rounded-xl overflow-hidden">
      {/* ヘッダー */}
      <div className={`bg-gradient-to-r ${gameColor} px-4 py-2 flex items-center justify-between`}>
        <span className="text-white font-bold text-sm">{gameLabel}</span>
        <div className="flex items-center gap-2">
          <span className="text-white/80 text-sm font-mono">{room.code}</span>
          <button
            onClick={onDelete}
            className="p-1 text-white/60 hover:text-red-300 hover:bg-white/10 rounded transition-colors"
            title="この部屋を削除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* メイン情報 */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Users className="w-4 h-4" />
              <span className="font-bold">{room.playerCount}</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${getPhaseColor(room.phase)}`}>
              {getPhaseLabel(room.gameType, room.phase)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 text-xs">
            <Clock className="w-3 h-3" />
            <span>{formatTime(room.createdAt)}</span>
          </div>
        </div>

        {/* ゲーム固有情報 */}
        {room.gameType === 'aoa' && room.details.round !== undefined && (
          <div className="text-slate-400 text-sm mb-2">
            ラウンド {room.details.round}/5
          </div>
        )}
        {(room.gameType === 'moji-hunt') && (
          <div className="text-slate-400 text-sm mb-2 flex gap-3">
            {/* 左カラム: 情報 */}
            <div className="flex-1 space-y-1">
              {room.details.currentTopic && (
                <div>お題: <span className="text-white">{room.details.currentTopic}</span></div>
              )}
              {room.details.currentTurnPlayerName && room.phase === 'playing' && (
                <div className="flex items-center gap-2">
                  <span>ターン: <span className="text-yellow-400">{room.details.currentTurnPlayerName}</span></span>
                  {room.details.usedCharacters && room.details.usedCharacters.length > 0 && (
                    <span className="px-2 py-0.5 bg-yellow-500/20 border border-yellow-500/50 rounded text-yellow-300 font-bold">
                      {room.details.usedCharacters[room.details.usedCharacters.length - 1]}
                    </span>
                  )}
                </div>
              )}
              {room.details.eliminatedCount !== undefined && room.details.eliminatedCount > 0 && (
                <div>脱落: <span className="text-red-400">{room.details.eliminatedCount}人</span></div>
              )}
              {room.phase === 'playing' && room.details.usedCharacters && (
                <div className="text-xs text-slate-500">
                  使用済み: {room.details.usedCharacters.length}/47
                </div>
              )}
            </div>
            {/* 右カラム: 文字パネル */}
            {room.phase === 'playing' && room.details.usedCharacters && (() => {
              const usedChars = room.details.usedCharacters || [];
              const lastChar = usedChars.length > 0 ? usedChars[usedChars.length - 1] : null;
              return (
                <div className="flex-shrink-0">
                  <div className="grid gap-px" style={{ gridTemplateColumns: 'repeat(10, 1fr)', width: 'fit-content' }}>
                    {HIRAGANA_GRID.map((char, i) => {
                      if (char === null) {
                        return <span key={i} className="w-3 h-3" />;
                      }
                      const isUsed = usedChars.includes(char);
                      const isLast = char === lastChar;
                      return (
                        <span
                          key={i}
                          className={`w-3 h-3 text-[8px] flex items-center justify-center ${
                            isLast
                              ? 'text-yellow-400'
                              : isUsed
                                ? 'text-slate-600'
                                : 'text-white'
                          }`}
                          title={char}
                        >
                          ■
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        {(room.gameType === 'jackal') && (
          <div className="text-slate-400 text-sm mb-2 space-y-1">
            {room.details.jackalRound !== undefined && (
              <div>ラウンド {room.details.jackalRound}</div>
            )}
            {room.details.currentTurnPlayerName && room.phase === 'declaring' && (
              <div>ターン: <span className="text-yellow-400">{room.details.currentTurnPlayerName}</span></div>
            )}
            {room.details.currentDeclaredValue !== undefined && room.phase === 'declaring' && (
              <div>現在の宣言値: <span className="text-emerald-400 font-bold">{room.details.currentDeclaredValue}</span></div>
            )}
            {room.details.eliminatedCount !== undefined && room.details.eliminatedCount > 0 && (
              <div>脱落: <span className="text-red-400">{room.details.eliminatedCount}人</span></div>
            )}
          </div>
        )}
        {room.gameType === 'spark' && (
          <div className="text-slate-400 text-sm mb-2 space-y-1">
            {room.details.sparkRound !== undefined && (
              <div>ラウンド {room.details.sparkRound}</div>
            )}
            {room.phase === 'selecting' && room.details.sparkReadyCount !== undefined && (
              <div>選択済み: <span className="text-cyan-400">{room.details.sparkReadyCount}/{room.playerCount}</span></div>
            )}
            {room.details.sparkRestingCount !== undefined && room.details.sparkRestingCount > 0 && (
              <div>休み中: <span className="text-slate-500">{room.details.sparkRestingCount}人</span></div>
            )}
          </div>
        )}

        {/* 展開ボタン */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-slate-500 hover:text-slate-300 text-sm py-1 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              閉じる
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              プレイヤー一覧
            </>
          )}
        </button>

        {/* プレイヤー一覧（展開時） */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="space-y-2">
              {(room.gameType === 'moji-hunt') && room.details.mojiHuntPlayers ? (
                // もじはんと: ワードと公開状況を表示
                room.details.mojiHuntPlayers.map((player, i) => (
                  <div key={player.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 w-4">{i + 1}.</span>
                      <span className={`${player.isEliminated ? 'text-red-400 line-through' : 'text-slate-300'}`}>
                        {player.name}
                      </span>
                      {room.players[i]?.id === room.hostId && (
                        <span className="text-xs text-yellow-500">(ホスト)</span>
                      )}
                      {player.isEliminated && (
                        <span className="text-xs text-red-500">脱落</span>
                      )}
                      {!player.isReady && !player.isEliminated && room.phase === 'word_input' && (
                        <span className="text-xs text-gray-500">入力中...</span>
                      )}
                    </div>
                    {player.normalizedWord && (
                      <div className="ml-6 mt-1 font-mono text-base">
                        {player.normalizedWord.split('').map((char, idx) => (
                          <span
                            key={idx}
                            className={`inline-block w-6 h-6 text-center border rounded mr-0.5 ${
                              player.revealedPositions[idx]
                                ? 'bg-red-500/30 border-red-500 text-red-300'
                                : 'bg-slate-700 border-slate-600 text-white'
                            }`}
                          >
                            {char}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (room.gameType === 'jackal') && room.details.jackalPlayers ? (
                // ジャッカル: ライフと脱落状態を表示
                room.details.jackalPlayers.map((player, i) => (
                  <div key={player.id} className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500 w-4">{i + 1}.</span>
                    <span className={`${player.isEliminated ? 'text-red-400 line-through' : 'text-slate-300'}`}>
                      {player.name}
                    </span>
                    {room.players[i]?.id === room.hostId && (
                      <span className="text-xs text-yellow-500">(ホスト)</span>
                    )}
                    {!player.isEliminated && (
                      <span className="text-xs text-emerald-400">ライフ: {player.life}</span>
                    )}
                    {player.isEliminated && (
                      <span className="text-xs text-red-500">脱落</span>
                    )}
                  </div>
                ))
              ) : (
                // AOA等: シンプルな表示
                room.players.map((player, i) => (
                  <div key={player.id} className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500 w-4">{i + 1}.</span>
                    <span className="text-slate-300">{player.name}</span>
                    {player.id === room.hostId && (
                      <span className="text-xs text-yellow-500">(ホスト)</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const AdminPage = ({ onBack }: AdminPageProps) => {
  const { rooms, isLoading, deleteRoom, cleanupOldRooms, deleteAllRooms } = useAdminRooms();
  const [isDeleting, setIsDeleting] = useState(false);

  // ブラウザタブのタイトルを設定
  useEffect(() => {
    document.title = 'HIVE - Admin Dashboard';
    return () => { document.title = 'HIVE'; };
  }, []);

  const aoaRooms = rooms.filter(r => r.gameType === 'aoa');
  const mojiHuntRooms = rooms.filter(r => r.gameType === 'moji-hunt');
  const jackalRooms = rooms.filter(r => r.gameType === 'jackal');
  const sparkRooms = rooms.filter(r => r.gameType === 'spark');

  // 1時間以上前の部屋数
  const oldRoomsCount = rooms.filter(r => Date.now() - r.createdAt > 60 * 60 * 1000).length;

  const handleCleanup = async () => {
    if (oldRoomsCount === 0) return;
    setIsDeleting(true);
    const count = await cleanupOldRooms();
    setIsDeleting(false);
    console.log(`Deleted ${count} old rooms`);
  };

  const handleDeleteAll = async () => {
    if (rooms.length === 0) return;
    if (!confirm(`本当に全${rooms.length}部屋を削除しますか？`)) return;
    setIsDeleting(true);
    await deleteAllRooms();
    setIsDeleting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <header className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm">リアルタイムで部屋を監視</p>
          </div>
          <div className="flex items-center gap-2">
            {oldRoomsCount > 0 && (
              <button
                onClick={handleCleanup}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 rounded-lg text-white text-sm font-bold transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                古い部屋を削除 ({oldRoomsCount})
              </button>
            )}
            {rooms.length > 0 && (
              <button
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 rounded-lg text-white text-sm font-bold transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                全削除
              </button>
            )}
            {(isLoading || isDeleting) && (
              <RefreshCw className="w-5 h-5 text-slate-500 animate-spin" />
            )}
          </div>
        </header>

        {/* サマリー */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <div className="bg-slate-800/60 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{rooms.length}</div>
            <div className="text-slate-500 text-xs">総部屋数</div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-cyan-400">{aoaRooms.length}</div>
            <div className="text-slate-500 text-xs">AOA</div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-pink-400">{mojiHuntRooms.length}</div>
            <div className="text-slate-500 text-xs">もじはんと</div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">{jackalRooms.length}</div>
            <div className="text-slate-500 text-xs">ジャッカル</div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{sparkRooms.length}</div>
            <div className="text-slate-500 text-xs">SPARK</div>
          </div>
        </div>

        {/* 部屋一覧 */}
        {rooms.length === 0 ? (
          <div className="bg-slate-800/40 rounded-xl p-12 text-center">
            <div className="text-slate-500 text-lg">現在アクティブな部屋はありません</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map(room => (
              <RoomCard
                key={`${room.gameType}-${room.code}`}
                room={room}
                onDelete={() => deleteRoom(room.gameType, room.code)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
