import { useState, useEffect } from 'react';
import { Zap, ArrowRight, FlaskConical, Eye } from 'lucide-react';
import type { GameState, LocalPlayerState, AttackResult, AttackHit } from '../types/game';
import { HiraganaBoard } from './HiraganaBoard';
import { PlayerWordDisplay } from './PlayerWordDisplay';
import { findCharacterPositions } from '../lib/hiragana';

interface GamePlayPhaseProps {
  gameState: GameState;
  localState: LocalPlayerState | null;
  playerId: string;
  isHost: boolean;
  updateGameState: (state: Partial<GameState>) => void;
  // デバッグ用
  debugMode?: boolean;
}

export const GamePlayPhase = ({
  gameState,
  localState,
  playerId,
  updateGameState,
  debugMode = false,
}: GamePlayPhaseProps) => {
  const {
    players,
    currentTurnPlayerId,
    turnOrder,
    usedCharacters,
    attackHistory,
    lastAttackHadHit,
    currentAttack,
  } = gameState;

  // フリップアニメーション中のプレイヤーと位置・文字（revealing時に設定）
  const [revealingPlayers, setRevealingPlayers] = useState<Record<string, { positions: number[]; characters: string[] }>>({});

  // currentAttackがrevealingに変わったらフリップアニメーション開始
  useEffect(() => {
    const hits = currentAttack?.hits ?? [];
    if (currentAttack?.phase === 'revealing' && hits.length > 0) {
      const revealing: Record<string, { positions: number[]; characters: string[] }> = {};
      hits.forEach(hit => {
        revealing[hit.playerId] = {
          positions: hit.positions,
          characters: hit.characters,
        };
      });
      setRevealingPlayers(revealing);
    } else {
      setRevealingPlayers({});
    }
  }, [currentAttack?.phase, currentAttack?.hits]);

  // 古いcurrentAttackを自動クリア（10秒以上経過 または タイムスタンプなし）
  useEffect(() => {
    if (!currentAttack) return;

    // タイムスタンプがない場合は即座にクリア（古いデータ）
    if (!currentAttack.timestamp) {
      console.log('Clearing currentAttack without timestamp');
      updateGameState({ currentAttack: null });
      return;
    }

    const checkStale = () => {
      const age = Date.now() - currentAttack.timestamp;
      if (age > 10000) {
        console.log('Clearing stale currentAttack:', age, 'ms old');
        updateGameState({ currentAttack: null });
      }
    };

    // 即時チェック
    checkStale();

    // 定期的にチェック
    const interval = setInterval(checkStale, 2000);
    return () => clearInterval(interval);
  }, [currentAttack, updateGameState]);

  // デバッグモード用: どのプレイヤーを操作しているか
  const [debugControlledPlayerId, setDebugControlledPlayerId] = useState<string | null>(null);

  // デバッグモードで操作中のプレイヤーを決定
  const controlledPlayerId = debugMode && debugControlledPlayerId ? debugControlledPlayerId : playerId;

  const isMyTurn = currentTurnPlayerId === controlledPlayerId;
  const currentPlayer = players.find(p => p.id === currentTurnPlayerId);
  const myPlayer = players.find(p => p.id === controlledPlayerId);

  // 攻撃処理
  const handleAttack = (char: string) => {
    if (!isMyTurn || currentAttack) return;

    // 全プレイヤーのヒット判定（Firebaseに保存されたnormalizedWordを使用）
    const allHits: AttackHit[] = [];

    players.forEach(p => {
      if (p.isEliminated) return;
      if (!p.normalizedWord) return;

      const positions = findCharacterPositions(p.normalizedWord, char);
      if (positions.length > 0) {
        allHits.push({
          playerId: p.id,
          playerName: p.name,
          positions,
          characters: positions.map(pos => p.normalizedWord[pos]),
        });
      }
    });

    // フェーズ1: 選択アナウンス（Firebaseに保存して全員に表示）
    const attackTimestamp = Date.now();
    updateGameState({
      currentAttack: {
        attackerName: myPlayer?.name ?? '',
        targetChar: char,
        phase: 'selecting',
        hits: allHits,
        timestamp: attackTimestamp,
      },
    });

    // 1.5秒後にフェーズ2: 結果発表
    setTimeout(() => {
      updateGameState({
        currentAttack: {
          attackerName: myPlayer?.name ?? '',
          targetChar: char,
          phase: 'revealing',
          hits: allHits,
          timestamp: attackTimestamp,
        },
      });

      // 攻撃結果をFirebaseに送信
      const attackResult: AttackResult = {
        attackerId: controlledPlayerId,
        attackerName: myPlayer?.name ?? '',
        targetChar: char,
        hits: allHits,
        timestamp: Date.now(),
      };

      const newUsedCharacters = [...usedCharacters, char];
      const newAttackHistory = [...attackHistory, attackResult];

      updateGameState({
        usedCharacters: newUsedCharacters,
        attackHistory: newAttackHistory,
      });

      // さらに1.5秒後にターン処理（currentAttackのクリアも含む）
      setTimeout(() => {
        processAttackResult(char, allHits);
      }, 1500);
    }, 1500);
  };

  // 攻撃結果処理
  const processAttackResult = (_attackedChar: string, hits: AttackHit[]) => {
    // 各プレイヤーの更新を計算
    // 他プレイヤーへのヒットのみをカウント（自分へのヒットは連続攻撃の対象外）
    const otherPlayerHits = hits.filter(h => h.playerId !== currentTurnPlayerId);
    const hitOthers = otherPlayerHits.length > 0;
    let eliminationCount = players.filter(p => p.isEliminated).length;

    // ヒットした全プレイヤーを更新
    const updatedPlayers = players.map(p => {
      if (p.isEliminated) return p;

      // このプレイヤーへのヒットを探す
      const hit = hits.find(h => h.playerId === p.id);
      if (!hit) return p;

      const newRevealedPositions = [...p.revealedPositions];
      const newRevealedCharacters = [...p.revealedCharacters];

      hit.positions.forEach((pos, i) => {
        newRevealedPositions[pos] = true;
        newRevealedCharacters[pos] = hit.characters[i];
      });

      // 全文字公開されたかチェック
      const allRevealed = newRevealedPositions.every(r => r);

      if (allRevealed) {
        eliminationCount++;
      }

      // Firebaseはundefinedを許可しないので、eliminatedAtは脱落時のみ設定
      const updatedPlayer: typeof p = {
        ...p,
        revealedPositions: newRevealedPositions,
        revealedCharacters: newRevealedCharacters,
        isEliminated: allRevealed,
      };
      if (allRevealed) {
        updatedPlayer.eliminatedAt = eliminationCount;
      }
      return updatedPlayer;
    });

    // 勝利判定
    const remainingPlayers = updatedPlayers.filter(p => !p.isEliminated);
    if (remainingPlayers.length <= 1) {
      updateGameState({
        players: updatedPlayers,
        phase: 'game_end',
        winnerId: remainingPlayers[0]?.id ?? null,
        currentAttack: null,
      });
      return;
    }

    // 次のターンへの移動判定
    // 連続攻撃は1回まで：前回ヒットしていなくて今回「他プレイヤーに」ヒットした場合のみ連続攻撃可能
    const canContinue = hitOthers && !lastAttackHadHit;
    let nextPlayerId = currentTurnPlayerId;
    let nextLastAttackHadHit = hitOthers;

    if (!canContinue) {
      // 次のプレイヤーへ
      const currentIndex = turnOrder.indexOf(currentTurnPlayerId ?? '');
      for (let i = 1; i < turnOrder.length; i++) {
        const nextIndex = (currentIndex + i) % turnOrder.length;
        const candidateId = turnOrder[nextIndex];
        const candidate = updatedPlayers.find(p => p.id === candidateId);
        if (candidate && !candidate.isEliminated) {
          nextPlayerId = candidateId;
          break;
        }
      }
      // ターンが移動したら、次のプレイヤーのlastAttackHadHitはリセット
      nextLastAttackHadHit = false;
    }

    updateGameState({
      players: updatedPlayers,
      currentTurnPlayerId: nextPlayerId,
      lastAttackHadHit: nextLastAttackHadHit,
      currentAttack: null,
    });
  };

  // 最新の攻撃結果を表示
  const latestAttack = attackHistory[attackHistory.length - 1];

  return (
    <div className="space-y-4">
      {/* デバッグ用: プレイヤー切り替え */}
      {debugMode && (
        <div className="bg-orange-900/30 border border-orange-600/50 rounded-xl p-4">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-orange-400" />
            デバッグ: プレイヤー操作
          </h3>
          <div className="flex flex-wrap gap-2">
            {players.map((player) => {
              const isControlled = debugControlledPlayerId
                ? player.id === debugControlledPlayerId
                : player.id === playerId;
              const isCurrentTurnPlayer = player.id === currentTurnPlayerId;

              return (
                <button
                  key={player.id}
                  onClick={() => setDebugControlledPlayerId(player.id === playerId ? null : player.id)}
                  disabled={player.isEliminated}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-bold transition-all
                    ${isControlled
                      ? 'bg-orange-600 text-white'
                      : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }
                    ${isCurrentTurnPlayer ? 'ring-2 ring-yellow-400' : ''}
                    ${player.isEliminated ? 'opacity-50 cursor-not-allowed line-through' : ''}
                  `}
                >
                  {player.name}
                  {player.id === playerId && ' (自分)'}
                  {isCurrentTurnPlayer && ' ★'}
                </button>
              );
            })}
          </div>
          <p className="text-orange-300/70 text-xs mt-2">
            ★=現在のターン / 操作したいプレイヤーをクリック
          </p>
        </div>
      )}

      {/* デバッグ用: 全プレイヤーの言葉を表示 */}
      {debugMode && (
        <div className="bg-orange-900/30 border border-orange-600/50 rounded-xl p-4">
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-orange-400" />
            デバッグ: 全プレイヤーの言葉
          </h3>
          <div className="space-y-2">
            {players.map((player) => (
              <div key={player.id} className="flex items-center gap-3">
                <span className={`w-24 font-bold truncate ${player.isEliminated ? 'text-red-400 line-through' : 'text-white'}`}>
                  {player.name}
                </span>
                <div className="flex gap-1">
                  {player.normalizedWord ? (
                    Array.from(player.normalizedWord).map((char, i) => {
                      const isRevealed = player.revealedPositions[i];
                      return (
                        <div
                          key={i}
                          className={`
                            w-8 h-8 flex items-center justify-center rounded text-sm font-bold
                            ${isRevealed ? 'bg-red-500/50 text-white' : 'bg-white/20 text-white'}
                          `}
                        >
                          {char}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-white/40 text-sm">（未設定）</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2カラムレイアウト */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 左カラム: プレイヤー状況（コンパクト幅） */}
        <div className="space-y-3 order-2 lg:order-1 lg:w-72 lg:shrink-0">
          <h3 className="text-white/80 font-bold">プレイヤー状況</h3>
          <div className="grid gap-3">
            {players.map((player) => {
              // デバッグモードでは操作中のプレイヤー視点で表示
              const viewAsMe = player.id === controlledPlayerId;
              const revealingData = revealingPlayers[player.id];
              return (
                <PlayerWordDisplay
                  key={player.id}
                  player={player}
                  localState={viewAsMe ? localState ?? undefined : undefined}
                  isCurrentTurn={player.id === currentTurnPlayerId}
                  isMe={viewAsMe}
                  revealingPositions={revealingData?.positions}
                  revealingCharacters={revealingData?.characters}
                />
              );
            })}
          </div>
        </div>

        {/* 右カラム: アナウンス + 50音ボード */}
        <div className="space-y-4 order-1 lg:order-2 lg:flex-1">
          {/* 攻撃フェーズのアナウンス */}
          {currentAttack ? (
            <div className="bg-white/10 rounded-xl p-6 text-center">
              {currentAttack.phase === 'selecting' ? (
                <div className="space-y-2">
                  <p className="text-white text-lg">
                    <span className="font-bold text-pink-300">{currentAttack.attackerName}</span> が
                  </p>
                  <p className="text-4xl font-bold text-yellow-300 animate-pulse">
                    「{currentAttack.targetChar}」
                  </p>
                  <p className="text-white text-lg">を選択！</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(currentAttack.hits?.length ?? 0) > 0 ? (
                    <>
                      <p className="text-2xl font-bold text-red-400">ヒット！</p>
                      <p className="text-white">
                        {currentAttack.hits?.map(h => h.playerName).join('、')} に当たった！
                      </p>
                    </>
                  ) : (
                    <p className="text-2xl font-bold text-gray-400">ハズレ...</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ターン表示 */}
              <div className="bg-white/10 rounded-xl p-4 text-center">
                {isMyTurn ? (
                  <div className="flex items-center justify-center gap-2 text-pink-300">
                    <Zap className="w-5 h-5" />
                    <span className="text-lg font-bold">
                      あなたの番です！文字を選んで攻撃
                    </span>
                  </div>
                ) : (
                  <div className="text-white/80">
                    <span className="font-bold text-white">{currentPlayer?.name}</span> の番です
                  </div>
                )}
                {lastAttackHadHit && !isMyTurn && currentPlayer && (
                  <p className="text-yellow-300 text-sm mt-1">
                    ヒット！ {currentPlayer.name} は続けて攻撃できます
                  </p>
                )}
              </div>

              {/* 最新の攻撃結果 */}
              {latestAttack && (
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
                    <span className="font-bold">{latestAttack.attackerName}</span>
                    <ArrowRight className="w-4 h-4" />
                    <span className="text-xl font-bold text-pink-400">「{latestAttack.targetChar}」</span>
                    <span className="ml-2">
                      {(latestAttack.hits?.length ?? 0) > 0
                        ? `${latestAttack.hits.length}人にヒット！`
                        : 'ハズレ...'}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* デバッグ: パネル状態表示 */}
          {debugMode && (
            <div className="bg-red-900/50 text-white text-xs p-2 rounded mb-2 font-mono">
              <div>isMyTurn: {String(isMyTurn)}</div>
              <div>currentTurnPlayerId: {currentTurnPlayerId ?? 'null'}</div>
              <div>controlledPlayerId: {controlledPlayerId}</div>
              <div>playerId: {playerId}</div>
              <div>currentAttack: {currentAttack ? JSON.stringify(currentAttack) : String(currentAttack)}</div>
              <div>disabled: {String(!isMyTurn || !!currentAttack)}</div>
            </div>
          )}

          {/* 50音ボード */}
          <HiraganaBoard
            usedCharacters={usedCharacters}
            disabled={!isMyTurn || !!currentAttack}
            onSelectCharacter={handleAttack}
            highlightedChar={currentAttack?.targetChar}
          />
        </div>
      </div>
    </div>
  );
};
