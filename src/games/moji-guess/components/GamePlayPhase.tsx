import { useState } from 'react';
import { Zap, ArrowRight } from 'lucide-react';
import type { GameState, LocalPlayerState, AttackResult, AttackHit } from '../types/game';
import { HiraganaBoard } from './HiraganaBoard';
import { PlayerWordDisplay } from './PlayerWordDisplay';
import { findCharacterPositions } from '../lib/hiragana';

interface GamePlayPhaseProps {
  gameState: GameState;
  localState: LocalPlayerState;
  playerId: string;
  isHost: boolean;
  updateGameState: (state: Partial<GameState>) => void;
}

export const GamePlayPhase = ({
  gameState,
  localState,
  playerId,
  updateGameState,
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

  const isMyTurn = currentTurnPlayerId === playerId;
  const currentPlayer = players.find(p => p.id === currentTurnPlayerId);
  const myPlayer = players.find(p => p.id === playerId);

  // 攻撃処理
  const handleAttack = (char: string) => {
    if (!isMyTurn || pendingAttack) return;

    setPendingAttack(char);

    // 自分の言葉へのヒット判定
    const myPositions = findCharacterPositions(localState.normalizedWord, char);
    const myHit: AttackHit | null = myPositions.length > 0 ? {
      playerId,
      playerName: myPlayer?.name ?? '',
      positions: myPositions,
      characters: myPositions.map(pos => localState.normalizedWord[pos]),
    } : null;

    // 攻撃結果をFirebaseに送信
    // 注: 他プレイヤーのヒット判定は各クライアントで行い、
    // ホストが集約して更新する簡易的な方式
    const attackResult: AttackResult = {
      attackerId: playerId,
      attackerName: myPlayer?.name ?? '',
      targetChar: char,
      hits: myHit ? [myHit] : [],
      timestamp: Date.now(),
    };

    // 使用済み文字に追加
    const newUsedCharacters = [...usedCharacters, char];

    // 攻撃履歴に追加
    const newAttackHistory = [...attackHistory, attackResult];

    updateGameState({
      usedCharacters: newUsedCharacters,
      attackHistory: newAttackHistory,
      lastAttackHadHit: myHit !== null, // 暫定的に自分のヒットのみで判定
    });

    // 少し待ってからターンを進める
    setTimeout(() => {
      processAttackResult(char);
      setPendingAttack(null);
    }, 1500);
  };

  // 攻撃結果処理
  const processAttackResult = (attackedChar: string) => {
    // 各プレイヤーの更新を計算
    let anyHit = false;
    let eliminationCount = players.filter(p => p.isEliminated).length;

    const updatedPlayers = players.map(p => {
      if (p.isEliminated || p.id === playerId) return p;

      // ホストが全員分のヒット判定を行う（簡易方式）
      // 実際には各クライアントが自分の結果を報告すべきだが、
      // Cloud Functions不使用のため、仲間内で遊ぶ前提で簡略化

      // 注: このロジックは不完全。実際には他プレイヤーの秘密の言葉が不明なため、
      // ヒット判定は各クライアントで行い、結果をFirebaseに送信する必要がある
      return p;
    });

    // 自分のプレイヤー情報を更新（ヒットした場合）
    const myPositions = findCharacterPositions(localState.normalizedWord, attackedChar);
    if (myPositions.length > 0) {
      anyHit = true;
      const myPlayerIndex = updatedPlayers.findIndex(p => p.id === playerId);
      if (myPlayerIndex >= 0) {
        const myPlayerData = updatedPlayers[myPlayerIndex];
        const newRevealedPositions = [...myPlayerData.revealedPositions];
        const newRevealedCharacters = [...myPlayerData.revealedCharacters];

        myPositions.forEach(pos => {
          newRevealedPositions[pos] = true;
          newRevealedCharacters[pos] = localState.normalizedWord[pos];
        });

        // 全文字公開されたかチェック
        const allRevealed = newRevealedPositions.every(r => r);

        updatedPlayers[myPlayerIndex] = {
          ...myPlayerData,
          revealedPositions: newRevealedPositions,
          revealedCharacters: newRevealedCharacters,
          isEliminated: allRevealed,
          eliminatedAt: allRevealed ? eliminationCount + 1 : undefined,
        };

        if (allRevealed) {
          eliminationCount++;
        }
      }
    }

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

    // 次のターンへ
    let nextPlayerId = currentTurnPlayerId;
    if (!anyHit) {
      // ヒットなしの場合、次のプレイヤーへ
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
    }

    updateGameState({
      players: updatedPlayers,
      currentTurnPlayerId: nextPlayerId,
      lastAttackHadHit: anyHit,
    });
  };

  // 最新の攻撃結果を表示
  const latestAttack = attackHistory[attackHistory.length - 1];

  return (
    <div className="space-y-6">
      {/* ターン表示 */}
      <div className="bg-white/10 rounded-xl p-4 text-center">
        {isMyTurn ? (
          <div className="flex items-center justify-center gap-2 text-pink-300">
            <Zap className="w-5 h-5" />
            <span className="text-lg font-bold">あなたの番です！文字を選んで攻撃</span>
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
          <div className="flex items-center gap-2 text-white/80 text-sm">
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

      {/* プレイヤー状況 */}
      <div className="space-y-3">
        <h3 className="text-white/80 font-bold">プレイヤー状況</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {players.map((player) => (
            <PlayerWordDisplay
              key={player.id}
              player={player}
              localState={player.id === playerId ? localState : undefined}
              isCurrentTurn={player.id === currentTurnPlayerId}
              isMe={player.id === playerId}
            />
          ))}
        </div>
      </div>

      {/* 自分の言葉（常時表示） */}
      <div className="bg-white/5 rounded-xl p-4">
        <p className="text-white/60 text-sm mb-2">あなたの言葉</p>
        <div className="flex gap-1">
          {Array.from(localState.normalizedWord).map((char, i) => {
            const isRevealed = myPlayer?.revealedPositions[i];
            return (
              <div
                key={i}
                className={`
                  w-10 h-10 flex items-center justify-center rounded font-bold text-lg
                  ${isRevealed ? 'bg-red-500/50 text-white' : 'bg-white/20 text-white'}
                `}
              >
                {char}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
