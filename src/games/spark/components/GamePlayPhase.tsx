import { useState } from 'react';
import { X, Check } from 'lucide-react';
import type { GameState, PlayerAction } from '../types/game';
import { Gem } from './Gem';
import { GemPlatform3D } from './GemPlatform3D';
import { calculateScore } from '../lib/gems';

interface GamePlayPhaseProps {
  gameState: GameState;
  playerId: string;
  isHost: boolean;
  onSetAction: (action: PlayerAction) => void;
  onRevealActions: () => void;
  onLeaveRoom: () => void;
}

// 宝石をポイント順にソート（赤3 > 黄2 > 青1 > 白は最後）
const sortGemsByValue = (gems: { id: string; color: 'blue' | 'yellow' | 'red' | 'white' }[]) => {
  const colorOrder = { red: 0, yellow: 1, blue: 2, white: 3 };
  return [...gems].sort((a, b) => colorOrder[a.color] - colorOrder[b.color]);
};

export const GamePlayPhase = ({
  gameState,
  playerId,
  isHost,
  onSetAction,
  onRevealActions,
  onLeaveRoom,
}: GamePlayPhaseProps) => {
  const [selectedType, setSelectedType] = useState<'platform' | 'vault' | 'barrier' | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const currentPlayer = gameState.players.find(p => p.id === playerId);
  const isResting = currentPlayer?.isResting ?? false;
  const hasSubmitted = currentPlayer?.isReady ?? false;
  const allPlayersReady = gameState.players
    .filter(p => !p.isResting)
    .every(p => p.isReady);

  // 6人分のスロットを作成
  const playerSlots = Array(6).fill(null).map((_, i) => gameState.players[i] || null);
  const topRowPlayers = playerSlots.slice(0, 3);
  const bottomRowPlayers = playerSlots.slice(3, 6);

  // 台をクリック
  const handlePlatformClick = (platformId: string) => {
    if (hasSubmitted || isResting) return;
    const platform = gameState.platforms.find(p => p.id === platformId);
    if (!platform || platform.gems.length === 0) return;

    setSelectedType('platform');
    setSelectedTargetId(platformId);
  };

  // 金庫をクリック
  const handleVaultClick = (targetPlayerId: string) => {
    if (hasSubmitted || isResting) return;
    const targetPlayer = gameState.players.find(p => p.id === targetPlayerId);
    if (!targetPlayer) return;

    // 休み中のプレイヤーは選択不可
    if (targetPlayer.isResting) return;

    if (targetPlayerId === playerId) {
      // 自分の金庫 = バリア
      setSelectedType('barrier');
      setSelectedTargetId(null);
    } else {
      // 他人の金庫 = 奪取
      if (targetPlayer.vault.length === 0) return;
      setSelectedType('vault');
      setSelectedTargetId(targetPlayerId);
    }
  };

  // 確定
  const handleConfirm = () => {
    if (hasSubmitted || isResting) return;

    if (selectedType === 'barrier') {
      onSetAction({ type: 'barrier' });
    } else if (selectedType === 'platform' && selectedTargetId) {
      onSetAction({ type: 'point_platform', targetId: selectedTargetId });
    } else if (selectedType === 'vault' && selectedTargetId) {
      onSetAction({ type: 'point_vault', targetId: selectedTargetId });
    }
  };

  // 選択中のアクション説明を取得
  const getActionDescription = () => {
    if (!selectedType) return null;

    if (selectedType === 'barrier') {
      return '金庫の宝石を確定する（バリア）';
    } else if (selectedType === 'platform' && selectedTargetId) {
      const platformIndex = gameState.platforms.findIndex(p => p.id === selectedTargetId);
      return `宝石台${platformIndex + 1}から取得`;
    } else if (selectedType === 'vault' && selectedTargetId) {
      const target = gameState.players.find(p => p.id === selectedTargetId);
      return `${target?.name}の金庫から奪う`;
    }
    return null;
  };

  const actionDescription = getActionDescription();
  const canConfirm = selectedType === 'barrier' || (selectedType && selectedTargetId);

  // プレイヤー金庫パネル
  const PlayerVaultPanel = ({ player, isEmpty }: { player: typeof gameState.players[0] | null; isEmpty: boolean }) => {
    if (isEmpty || !player) {
      // 空スロット
      return (
        <div className="flex-1 min-w-[100px] h-28 rounded-lg border-2 border-dashed border-slate-600 bg-slate-800/30" />
      );
    }

    const isMe = player.id === playerId;
    const isPlayerResting = player.isResting;
    const isSelected = (selectedType === 'vault' && selectedTargetId === player.id) ||
                       (selectedType === 'barrier' && isMe);
    const score = calculateScore(player);
    const sortedVault = sortGemsByValue(player.vault);

    return (
      <button
        onClick={() => handleVaultClick(player.id)}
        disabled={hasSubmitted || isResting || isPlayerResting}
        className={`flex-1 min-w-[100px] h-28 rounded-lg border-2 p-2 transition-all relative ${
          isSelected
            ? 'border-cyan-400 bg-cyan-600/30'
            : isMe
            ? 'border-cyan-500 bg-cyan-900/30'
            : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
        } ${(hasSubmitted || isResting || isPlayerResting) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {/* 休み中のプレイヤーはバツ表示 */}
        {isPlayerResting && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-lg z-10">
            <X className="w-12 h-12 text-slate-500" />
          </div>
        )}

        {/* ヘッダー: 名前と確定ポイント */}
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-bold truncate ${isMe ? 'text-cyan-300' : 'text-white'}`}>
            {player.name}{isMe && ' (自分)'}
          </span>
          {score.total > 0 && (
            <span className="text-xs text-green-400 font-bold">{score.total}pt</span>
          )}
        </div>

        {/* 金庫の宝石 */}
        <div className="flex flex-wrap gap-0.5">
          {sortedVault.length > 0 ? (
            sortedVault.slice(0, 12).map(gem => (
              <Gem key={gem.id} color={gem.color} size="sm" />
            ))
          ) : (
            <span className="text-slate-500 text-xs">金庫：空</span>
          )}
          {sortedVault.length > 12 && (
            <span className="text-slate-400 text-xs">+{sortedVault.length - 12}</span>
          )}
        </div>

        {/* 確定済みの表示 */}
        {player.isReady && !isPlayerResting && (
          <div className="absolute top-1 right-1">
            <Check className="w-4 h-4 text-green-400" />
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-900 to-blue-900">
      <div className="min-h-screen bg-black/20 p-4">
        <div className="max-w-2xl mx-auto">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <img
                src="/boards/images/vec_logo_spark.svg"
                alt="SPARK"
                className="h-5"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <span className="text-cyan-400 font-bold text-sm">R{gameState.round}</span>
              <span className="text-slate-400 text-xs">袋: {gameState.bag.length}</span>
            </div>
            <button
              onClick={onLeaveRoom}
              className="px-3 py-1 bg-slate-700/80 hover:bg-slate-600
                rounded text-slate-300 text-xs font-bold transition-all"
            >
              退出
            </button>
          </div>

          {/* インフォパネル（固定2行分の高さ） */}
          <div className="bg-slate-800/90 rounded-xl p-3 mb-3 h-20 flex flex-col justify-center">
            {isResting ? (
              <>
                <div className="text-amber-300 font-bold text-center">
                  バリアを使ったため今ラウンドは休みです
                </div>
                <div className="text-slate-400 text-sm text-center mt-1">
                  他のプレイヤーを待っています...
                </div>
              </>
            ) : hasSubmitted ? (
              <>
                <div className="text-green-300 font-bold text-center">
                  アクション確定済み
                </div>
                <div className="flex items-center justify-center gap-2 mt-1">
                  {gameState.players.map(p => (
                    <div
                      key={p.id}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        p.isResting
                          ? 'bg-amber-600/50 text-amber-300'
                          : p.isReady
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-600 text-slate-400'
                      }`}
                      title={p.name}
                    >
                      {p.isResting ? '休' : p.isReady ? '✓' : '...'}
                    </div>
                  ))}
                </div>
              </>
            ) : actionDescription ? (
              <>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-white font-bold">{actionDescription}</span>
                  <button
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                    className="px-4 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded text-white font-bold text-sm transition-all"
                  >
                    確定
                  </button>
                </div>
                <div className="text-slate-400 text-xs text-center mt-1">
                  場か金庫を選択してください
                </div>
              </>
            ) : (
              <>
                <div className="text-slate-300 text-center">
                  場の宝石台または金庫を選択してください
                </div>
                <div className="text-slate-500 text-xs text-center mt-1">
                  自分の金庫を選ぶとバリア（確定）になります
                </div>
              </>
            )}
          </div>

          {/* プレイヤー上段 (P1, P2, P3) */}
          <div className="flex gap-2 mb-3">
            {topRowPlayers.map((player, i) => (
              <PlayerVaultPanel key={i} player={player} isEmpty={!player} />
            ))}
          </div>

          {/* 宝石台 */}
          <div className="bg-slate-800/90 rounded-xl p-3 mb-3">
            <div className="flex flex-wrap justify-center gap-3">
              {gameState.platforms.map((platform) => {
                const isSelected = selectedType === 'platform' && selectedTargetId === platform.id;
                const isEmpty = platform.gems.length === 0;

                return (
                  <button
                    key={platform.id}
                    onClick={() => handlePlatformClick(platform.id)}
                    disabled={hasSubmitted || isResting || isEmpty}
                    className={`p-1 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/20'
                        : isEmpty
                        ? 'border-transparent opacity-50'
                        : 'border-transparent hover:border-cyan-400/50'
                    } ${(hasSubmitted || isResting) ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {!isEmpty ? (
                      <GemPlatform3D gems={platform.gems} />
                    ) : (
                      <div
                        className="text-slate-500 text-xs flex items-center justify-center bg-slate-700/50 rounded-lg"
                        style={{ width: 180, height: 180 }}
                      >
                        空
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* プレイヤー下段 (P4, P5, P6) */}
          <div className="flex gap-2 mb-3">
            {bottomRowPlayers.map((player, i) => (
              <PlayerVaultPanel key={i + 3} player={player} isEmpty={!player} />
            ))}
          </div>

          {/* 全員準備完了時の進行ボタン（ホストのみ） */}
          {isHost && allPlayersReady && (
            <button
              onClick={onRevealActions}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg text-white font-bold transition-all"
            >
              アクションを公開する
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
