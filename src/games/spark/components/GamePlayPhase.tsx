import { useState } from 'react';
import { Shield, Target, Lock, Check, Clock } from 'lucide-react';
import type { GameState, PlayerAction, ActionType } from '../types/game';
import { GemStack, GemPlatform } from './Gem';

interface GamePlayPhaseProps {
  gameState: GameState;
  playerId: string;
  isHost: boolean;
  onSetAction: (action: PlayerAction) => void;
  onRevealActions: () => void;
  onLeaveRoom: () => void;
}

export const GamePlayPhase = ({
  gameState,
  playerId,
  isHost,
  onSetAction,
  onRevealActions,
  onLeaveRoom,
}: GamePlayPhaseProps) => {
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);

  const currentPlayer = gameState.players.find(p => p.id === playerId);
  const otherPlayers = gameState.players.filter(p => p.id !== playerId);
  const isResting = currentPlayer?.isResting ?? false;
  const hasSubmitted = currentPlayer?.isReady ?? false;
  const allPlayersReady = gameState.players
    .filter(p => !p.isResting)
    .every(p => p.isReady);

  // アクションを選択
  const handleSelectAction = (actionType: ActionType) => {
    if (hasSubmitted || isResting) return;

    if (actionType === 'barrier') {
      // バリアは即確定
      setSelectedAction('barrier');
      setSelectedTarget(null);
    } else {
      setSelectedAction(actionType);
      setSelectedTarget(null);
    }
  };

  // ターゲットを選択
  const handleSelectTarget = (targetId: string) => {
    if (hasSubmitted || isResting) return;
    setSelectedTarget(targetId);
  };

  // アクションを決定
  const handleConfirmAction = () => {
    if (hasSubmitted || isResting) return;

    if (selectedAction === 'barrier') {
      onSetAction({ type: 'barrier' });
    } else if (selectedAction && selectedTarget) {
      onSetAction({ type: selectedAction, targetId: selectedTarget });
    }
  };

  const canConfirm = selectedAction === 'barrier' || (selectedAction && selectedTarget);

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-900 to-blue-900">
      <div className="min-h-screen bg-black/20 p-4">
        <div className="max-w-4xl mx-auto">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img
                src="/boards/images/vec_logo_spark.svg"
                alt="SPARK"
                className="h-6"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <span className="text-cyan-400 font-bold">ラウンド {gameState.round}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">
                袋: {gameState.bag.length}個
              </span>
              <button
                onClick={onLeaveRoom}
                className="px-4 py-2 bg-slate-700/80 hover:bg-slate-600
                  rounded-lg text-slate-300 text-sm font-bold transition-all"
              >
                退出
              </button>
            </div>
          </div>

          {/* 休み状態表示 */}
          {isResting && (
            <div className="bg-amber-600/30 border border-amber-500/50 rounded-lg p-4 mb-4 text-center">
              <p className="text-amber-300 font-bold">バリアを使ったため今ラウンドは休みです</p>
            </div>
          )}

          {/* 宝石台エリア */}
          <div className="bg-slate-800/90 rounded-xl p-4 mb-4">
            <h2 className="text-white font-bold mb-3 flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              場の宝石台
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {gameState.platforms.map((platform, index) => {
                const isSelected = selectedAction === 'point_platform' && selectedTarget === platform.id;
                return (
                  <button
                    key={platform.id}
                    onClick={() => {
                      handleSelectAction('point_platform');
                      handleSelectTarget(platform.id);
                    }}
                    disabled={hasSubmitted || isResting || platform.gems.length === 0}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-600/30'
                        : platform.gems.length === 0
                        ? 'border-slate-600 bg-slate-700/30 opacity-50'
                        : 'border-slate-600 bg-slate-700/50 hover:border-cyan-400/50'
                    } ${hasSubmitted || isResting ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="text-slate-400 text-xs mb-1">台 {index + 1}</div>
                    {platform.gems.length > 0 ? (
                      <GemPlatform gems={platform.gems} className="mx-auto" />
                    ) : (
                      <div
                        className="text-slate-500 text-sm flex items-center justify-center mx-auto"
                        style={{ width: 80, height: 80 }}
                      >
                        空
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 他プレイヤーの金庫 */}
          <div className="bg-slate-800/90 rounded-xl p-4 mb-4">
            <h2 className="text-white font-bold mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-yellow-400" />
              他プレイヤーの金庫
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {otherPlayers.map((player) => {
                const isSelected = selectedAction === 'point_vault' && selectedTarget === player.id;
                const isTargetResting = player.isResting;
                return (
                  <button
                    key={player.id}
                    onClick={() => {
                      handleSelectAction('point_vault');
                      handleSelectTarget(player.id);
                    }}
                    disabled={hasSubmitted || isResting || player.vault.length === 0}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-yellow-400 bg-yellow-600/30'
                        : player.vault.length === 0
                        ? 'border-slate-600 bg-slate-700/30 opacity-50'
                        : 'border-slate-600 bg-slate-700/50 hover:border-yellow-400/50'
                    } ${hasSubmitted || isResting ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-bold">{player.name}</span>
                      {isTargetResting && (
                        <span className="text-xs bg-amber-600/50 text-amber-300 px-2 py-0.5 rounded">
                          休み
                        </span>
                      )}
                      {player.isReady && !isTargetResting && (
                        <Check className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    {player.vault.length > 0 ? (
                      <GemStack gems={player.vault} size="sm" maxDisplay={8} />
                    ) : (
                      <div className="text-slate-500 text-sm">空</div>
                    )}
                    {player.secured.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-600">
                        <span className="text-xs text-slate-400">確定: </span>
                        <GemStack gems={player.secured} size="sm" maxDisplay={6} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 自分の金庫 */}
          <div className="bg-slate-800/90 rounded-xl p-4 mb-4">
            <h2 className="text-white font-bold mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              自分の金庫
            </h2>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 bg-slate-700/50 rounded-lg p-4">
                <div className="text-slate-400 text-sm mb-2">金庫（奪われる可能性あり）</div>
                {currentPlayer && currentPlayer.vault.length > 0 ? (
                  <GemStack gems={currentPlayer.vault} size="md" maxDisplay={20} />
                ) : (
                  <div className="text-slate-500 text-sm">空</div>
                )}
              </div>
              <div className="flex-1 bg-green-900/30 rounded-lg p-4 border border-green-500/30">
                <div className="text-green-400 text-sm mb-2">確定（安全）</div>
                {currentPlayer && currentPlayer.secured.length > 0 ? (
                  <GemStack gems={currentPlayer.secured} size="md" maxDisplay={20} />
                ) : (
                  <div className="text-slate-500 text-sm">空</div>
                )}
              </div>
            </div>
          </div>

          {/* アクション選択エリア */}
          {!isResting && !hasSubmitted && (
            <div className="bg-slate-800/90 rounded-xl p-4 mb-4">
              <h2 className="text-white font-bold mb-3">アクションを選択</h2>
              <div className="flex flex-col md:flex-row gap-3">
                {/* バリアボタン */}
                <button
                  onClick={() => handleSelectAction('barrier')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    selectedAction === 'barrier'
                      ? 'border-purple-400 bg-purple-600/30'
                      : 'border-slate-600 bg-slate-700/50 hover:border-purple-400/50'
                  } ${currentPlayer && currentPlayer.vault.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={currentPlayer && currentPlayer.vault.length === 0}
                >
                  <Shield className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <div className="text-white font-bold">バリア</div>
                  <div className="text-slate-400 text-xs mt-1">
                    金庫の宝石を確定（次ラウンド休み）
                  </div>
                </button>

                {/* 確定ボタン */}
                <button
                  onClick={handleConfirmAction}
                  disabled={!canConfirm}
                  className={`flex-1 p-4 rounded-lg font-bold text-lg transition-all ${
                    canConfirm
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white'
                      : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {canConfirm ? '決定する' : '対象を選んでください'}
                </button>
              </div>
            </div>
          )}

          {/* 選択済み表示 */}
          {hasSubmitted && (
            <div className="bg-green-600/30 border border-green-500/50 rounded-lg p-4 mb-4 text-center">
              <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-green-300 font-bold">アクションを選択しました</p>
              <p className="text-slate-400 text-sm mt-1">他のプレイヤーを待っています...</p>
            </div>
          )}

          {/* プレイヤーステータス */}
          <div className="bg-slate-800/90 rounded-xl p-4">
            <h2 className="text-white font-bold mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              プレイヤー状況
            </h2>
            <div className="flex flex-wrap gap-2">
              {gameState.players.map((player) => (
                <div
                  key={player.id}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    player.isResting
                      ? 'bg-amber-600/30 text-amber-300'
                      : player.isReady
                      ? 'bg-green-600/30 text-green-300'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {player.name}
                  {player.id === playerId && ' (自分)'}
                  {player.isResting ? ' - 休み' : player.isReady ? ' ✓' : ' ...'}
                </div>
              ))}
            </div>

            {/* 全員準備完了時の進行ボタン（ホストのみ） */}
            {isHost && allPlayersReady && (
              <button
                onClick={onRevealActions}
                className="mt-4 w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg text-white font-bold transition-all"
              >
                アクションを公開する
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
