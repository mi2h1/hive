import { useState } from 'react';
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
  } = gameState;

  const [pendingAttack, setPendingAttack] = useState<string | null>(null);

  // デバッグモード用: どのプレイヤーを操作しているか
  const [debugControlledPlayerId, setDebugControlledPlayerId] = useState<string | null>(null);

  // デバッグモードで操作中のプレイヤーを決定
  const controlledPlayerId = debugMode && debugControlledPlayerId ? debugControlledPlayerId : playerId;

  const isMyTurn = currentTurnPlayerId === controlledPlayerId;
  const currentPlayer = players.find(p => p.id === currentTurnPlayerId);
  const myPlayer = players.find(p => p.id === controlledPlayerId);

  // 攻撃処理
  const handleAttack = (char: string) => {
    if (!isMyTurn || pendingAttack) return;

    setPendingAttack(char);

    // 全プレイヤーのヒット判定（Firebaseに保存されたnormalizedWordを使用）
    const allHits: AttackHit[] = [];

    players.forEach(p => {
      if (p.isEliminated) return;
      if (!p.normalizedWord) return; // 言葉が設定されていない場合はスキップ

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

    // 攻撃結果をFirebaseに送信
    const attackResult: AttackResult = {
      attackerId: controlledPlayerId,
      attackerName: myPlayer?.name ?? '',
      targetChar: char,
      hits: allHits,
      timestamp: Date.now(),
    };

    // 使用済み文字に追加
    const newUsedCharacters = [...usedCharacters, char];

    // 攻撃履歴に追加
    const newAttackHistory = [...attackHistory, attackResult];

    updateGameState({
      usedCharacters: newUsedCharacters,
      attackHistory: newAttackHistory,
      // lastAttackHadHitはprocessAttackResult内で適切に設定する
    });

    // 少し待ってからターンを進める
    setTimeout(() => {
      processAttackResult(char, allHits);
      setPendingAttack(null);
    }, 1500);
  };

  // 攻撃結果処理
  const processAttackResult = (_attackedChar: string, hits: AttackHit[]) => {
    // 各プレイヤーの更新を計算
    const anyHit = hits.length > 0;
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
      });
      return;
    }

    // 次のターンへの移動判定
    // 連続攻撃は1回まで：前回ヒットしていなくて今回ヒットした場合のみ連続攻撃可能
    const canContinue = anyHit && !lastAttackHadHit;
    let nextPlayerId = currentTurnPlayerId;
    let nextLastAttackHadHit = anyHit;

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
            {players.map((player) => (
              <PlayerWordDisplay
                key={player.id}
                player={player}
                localState={player.id === playerId ? localState ?? undefined : undefined}
                isCurrentTurn={player.id === currentTurnPlayerId}
                isMe={player.id === playerId}
              />
            ))}
          </div>
        </div>

        {/* 右カラム: アナウンス + 50音ボード */}
        <div className="space-y-4 order-1 lg:order-2 lg:flex-1">
          {/* ターン表示 */}
          <div className="bg-white/10 rounded-xl p-4 text-center">
            {isMyTurn ? (
              <div className="flex items-center justify-center gap-2 text-pink-300">
                <Zap className="w-5 h-5" />
                <span className="text-lg font-bold">
                  {debugMode && debugControlledPlayerId
                    ? `${myPlayer?.name}の番です！文字を選んで攻撃`
                    : 'あなたの番です！文字を選んで攻撃'
                  }
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
                  {latestAttack.hits.length > 0
                    ? `${latestAttack.hits.length}人にヒット！`
                    : 'ハズレ...'}
                </span>
              </div>
            </div>
          )}

          {/* 50音ボード */}
          <HiraganaBoard
            usedCharacters={usedCharacters}
            disabled={!isMyTurn || pendingAttack !== null}
            onSelectCharacter={handleAttack}
          />
        </div>
      </div>
    </div>
  );
};
