import { Shield, Target, Lock, ArrowRight } from 'lucide-react';
import type { GameState } from '../types/game';
import { GemStack } from './Gem';

interface RevealPhaseProps {
  gameState: GameState;
  isHost: boolean;
  onNextRound: () => void;
  onLeaveRoom: () => void;
}

export const RevealPhase = ({
  gameState,
  isHost,
  onNextRound,
  onLeaveRoom,
}: RevealPhaseProps) => {
  const results = gameState.lastRoundResults;

  // アクションごとにグループ化
  const platformActions = results?.actions.filter(a => a.action.type === 'point_platform') ?? [];
  const vaultActions = results?.actions.filter(a => a.action.type === 'point_vault') ?? [];
  const barrierActions = results?.actions.filter(a => a.action.type === 'barrier') ?? [];

  // 同じターゲットを指した人をグループ化
  const groupByTarget = (actions: typeof platformActions) => {
    const groups: Record<string, typeof platformActions> = {};
    for (const action of actions) {
      const targetId = action.action.targetId ?? '';
      if (!groups[targetId]) groups[targetId] = [];
      groups[targetId].push(action);
    }
    return groups;
  };

  const platformGroups = groupByTarget(platformActions);
  const vaultGroups = groupByTarget(vaultActions);

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
              <span className="text-cyan-400 font-bold">ラウンド {gameState.round} 結果</span>
            </div>
            <button
              onClick={onLeaveRoom}
              className="px-4 py-2 bg-slate-700/80 hover:bg-slate-600
                rounded-lg text-slate-300 text-sm font-bold transition-all"
            >
              退出
            </button>
          </div>

          {/* 場の宝石台への指差し結果 */}
          {Object.keys(platformGroups).length > 0 && (
            <div className="bg-slate-800/90 rounded-xl p-4 mb-4">
              <h2 className="text-white font-bold mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-400" />
                場の宝石台
              </h2>
              <div className="space-y-3">
                {Object.entries(platformGroups).map(([targetId, actions]) => {
                  const platform = gameState.platforms.find(p => p.id === targetId);
                  const platformIndex = gameState.platforms.findIndex(p => p.id === targetId);
                  const isBatting = actions.length > 1;
                  const transfer = results?.transfers.find(
                    t => t.fromType === 'platform' && t.fromId === targetId
                  );

                  return (
                    <div
                      key={targetId}
                      className={`p-3 rounded-lg ${
                        isBatting ? 'bg-red-600/20 border border-red-500/50' : 'bg-green-600/20 border border-green-500/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-slate-400">台 {platformIndex + 1}</span>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                        <span className={`font-bold ${isBatting ? 'text-red-400' : 'text-green-400'}`}>
                          {actions.map(a => a.playerName).join(', ')}
                        </span>
                        {isBatting && (
                          <span className="text-red-400 text-sm">かぶり！</span>
                        )}
                      </div>
                      {transfer && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-green-400">獲得:</span>
                          <GemStack gems={transfer.gems} size="sm" />
                        </div>
                      )}
                      {isBatting && platform && platform.gems.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-red-400">誰も取れず:</span>
                          <GemStack gems={platform.gems} size="sm" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 金庫への指差し結果 */}
          {Object.keys(vaultGroups).length > 0 && (
            <div className="bg-slate-800/90 rounded-xl p-4 mb-4">
              <h2 className="text-white font-bold mb-3 flex items-center gap-2">
                <Lock className="w-5 h-5 text-yellow-400" />
                金庫への攻撃
              </h2>
              <div className="space-y-3">
                {Object.entries(vaultGroups).map(([targetId, actions]) => {
                  const targetPlayer = gameState.players.find(p => p.id === targetId);
                  const isBatting = actions.length > 1;
                  const isBlocked = targetPlayer?.action?.type === 'barrier';
                  const transfer = results?.transfers.find(
                    t => t.fromType === 'vault' && t.fromId === targetId
                  );

                  return (
                    <div
                      key={targetId}
                      className={`p-3 rounded-lg ${
                        isBatting || isBlocked
                          ? 'bg-red-600/20 border border-red-500/50'
                          : 'bg-yellow-600/20 border border-yellow-500/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-white">{targetPlayer?.name}の金庫</span>
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                        <span className={`font-bold ${isBatting || isBlocked ? 'text-red-400' : 'text-yellow-400'}`}>
                          {actions.map(a => a.playerName).join(', ')}
                        </span>
                        {isBatting && <span className="text-red-400 text-sm">かぶり！</span>}
                        {isBlocked && <span className="text-purple-400 text-sm">バリアで防御！</span>}
                      </div>
                      {transfer && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-yellow-400">奪取:</span>
                          <GemStack gems={transfer.gems} size="sm" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* バリア結果 */}
          {barrierActions.length > 0 && (
            <div className="bg-slate-800/90 rounded-xl p-4 mb-4">
              <h2 className="text-white font-bold mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                バリア
              </h2>
              <div className="space-y-3">
                {barrierActions.map((action) => {
                  const barrier = results?.barriers.find(b => b.playerId === action.playerId);
                  return (
                    <div
                      key={action.playerId}
                      className="p-3 rounded-lg bg-purple-600/20 border border-purple-500/50"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-purple-400 font-bold">{action.playerName}</span>
                        <span className="text-slate-400">がバリアを発動</span>
                      </div>
                      {barrier && barrier.gems.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-purple-400">確定:</span>
                          <GemStack gems={barrier.gems} size="sm" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 次のラウンドへ / ゲーム終了判定 */}
          <div className="bg-slate-800/90 rounded-xl p-4">
            {isHost ? (
              <button
                onClick={onNextRound}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg text-white font-bold transition-all"
              >
                {gameState.bag.length === 0 ? '結果発表へ' : '次のラウンドへ'}
              </button>
            ) : (
              <div className="text-center text-slate-400">
                ホストの操作を待っています...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
