import { useEffect } from 'react';
import { usePlayer } from '../../shared/hooks/usePlayer';
import { useRoom } from './hooks/useRoom';
import { Lobby } from './components/Lobby';
import { GamePlayPhase } from './components/GamePlayPhase';
import { RevealPhase } from './components/RevealPhase';
import { ResultPhase } from './components/ResultPhase';
import {
  createBag,
  createPlatforms,
  distributeInitialGems,
  replenishPlatforms,
  determineWinner,
} from './lib/gems';
import { PLAYER_SETTINGS } from './types/game';
import type { RoundResult } from './types/game';

interface SparkGameProps {
  onBack: () => void;
}

export const SparkGame = ({ onBack }: SparkGameProps) => {
  // 本番版はデバッグモードOFF
  const debugMode = false;

  const { playerId, playerName, isLoading: isPlayerLoading } = usePlayer();
  const {
    roomCode,
    roomData,
    error,
    isLoading: isRoomLoading,
    isHost,
    createRoom,
    joinRoom,
    leaveRoom,
    updateGameState,
    setPlayerAction,
    addTestPlayer,
  } = useRoom(playerId, playerName);

  // ブラウザタブのタイトルを設定
  useEffect(() => {
    document.title = 'SPARK';
    return () => { document.title = 'Game Board'; };
  }, []);

  const gameState = roomData?.gameState;
  const players = gameState?.players ?? [];

  // ゲーム開始処理
  const handleStartGame = () => {
    if (!isHost || !gameState) return;

    const playerCount = players.length;
    const settings = PLAYER_SETTINGS[playerCount] || PLAYER_SETTINGS[2];

    // 袋を作成
    const bag = createBag(playerCount, settings);

    // 宝石台を作成
    let platforms = createPlatforms(settings.platforms);

    // 初期宝石を配置
    const distributed = distributeInitialGems(platforms, bag);
    platforms = distributed.platforms;
    const remainingBag = distributed.bag;

    // プレイヤーの状態をリセット
    const resetPlayers = players.map(p => ({
      ...p,
      vault: [],
      secured: [],
      action: null,
      isResting: false,
      isReady: false,
    }));

    updateGameState({
      phase: 'selecting',
      round: 1,
      bag: remainingBag,
      platforms,
      players: resetPlayers,
      winnerId: null,
    });
  };

  // アクションを公開して解決
  const handleRevealActions = () => {
    if (!isHost || !gameState) return;

    const results: RoundResult = {
      actions: [],
      transfers: [],
      barriers: [],
    };

    // 各プレイヤーのアクションを記録
    for (const player of players) {
      if (player.action && !player.isResting) {
        results.actions.push({
          playerId: player.id,
          playerName: player.name,
          action: player.action,
        });
      }
    }

    // アクションの解決
    let updatedPlayers = [...players];
    let updatedPlatforms = gameState.platforms.map(p => ({ ...p, gems: [...p.gems] }));

    // 場の宝石台への指差しを解決
    const platformTargets: Record<string, string[]> = {};
    for (const player of players) {
      if (player.action?.type === 'point_platform' && player.action.targetId) {
        const targetId = player.action.targetId;
        if (!platformTargets[targetId]) platformTargets[targetId] = [];
        platformTargets[targetId].push(player.id);
      }
    }

    for (const [platformId, attackerIds] of Object.entries(platformTargets)) {
      if (attackerIds.length === 1) {
        // 被りなし - 宝石を獲得
        const attackerId = attackerIds[0];
        const platformIndex = updatedPlatforms.findIndex(p => p.id === platformId);
        if (platformIndex !== -1) {
          const gems = updatedPlatforms[platformIndex].gems;
          if (gems.length > 0) {
            results.transfers.push({
              fromType: 'platform',
              fromId: platformId,
              toPlayerId: attackerId,
              gems: [...gems],
            });

            // プレイヤーの金庫に追加
            updatedPlayers = updatedPlayers.map(p => {
              if (p.id === attackerId) {
                return { ...p, vault: [...p.vault, ...gems] };
              }
              return p;
            });

            // 宝石台を空にする
            updatedPlatforms[platformIndex] = { ...updatedPlatforms[platformIndex], gems: [] };
          }
        }
      }
      // 被りあり - 何も起きない
    }

    // 金庫への指差しを解決
    const vaultTargets: Record<string, string[]> = {};
    for (const player of players) {
      if (player.action?.type === 'point_vault' && player.action.targetId) {
        const targetId = player.action.targetId;
        if (!vaultTargets[targetId]) vaultTargets[targetId] = [];
        vaultTargets[targetId].push(player.id);
      }
    }

    for (const [targetPlayerId, attackerIds] of Object.entries(vaultTargets)) {
      const targetPlayer = updatedPlayers.find(p => p.id === targetPlayerId);
      if (!targetPlayer) continue;

      // バリアされているかチェック
      const isBarriered = targetPlayer.action?.type === 'barrier';

      if (attackerIds.length === 1 && !isBarriered) {
        // 被りなし & バリアなし - 宝石を奪取
        const attackerId = attackerIds[0];
        const gems = targetPlayer.vault;
        if (gems.length > 0) {
          results.transfers.push({
            fromType: 'vault',
            fromId: targetPlayerId,
            toPlayerId: attackerId,
            gems: [...gems],
          });

          // 奪取処理
          updatedPlayers = updatedPlayers.map(p => {
            if (p.id === attackerId) {
              return { ...p, vault: [...p.vault, ...gems] };
            }
            if (p.id === targetPlayerId) {
              return { ...p, vault: [] };
            }
            return p;
          });
        }
      }
      // 被りあり or バリア - 何も起きない
    }

    // バリアを解決
    for (const player of players) {
      if (player.action?.type === 'barrier') {
        const currentPlayer = updatedPlayers.find(p => p.id === player.id);
        if (currentPlayer && currentPlayer.vault.length > 0) {
          results.barriers.push({
            playerId: player.id,
            gems: [...currentPlayer.vault],
          });

          // 金庫から確定へ移動
          updatedPlayers = updatedPlayers.map(p => {
            if (p.id === player.id) {
              return {
                ...p,
                secured: [...p.secured, ...p.vault],
                vault: [],
                isResting: true, // 次ラウンド休み
              };
            }
            return p;
          });
        } else {
          // 金庫が空でもバリア使用で休みになる
          updatedPlayers = updatedPlayers.map(p => {
            if (p.id === player.id) {
              return { ...p, isResting: true };
            }
            return p;
          });
        }
      }
    }

    // アクションをリセット
    updatedPlayers = updatedPlayers.map(p => ({
      ...p,
      action: null,
      isReady: false,
    }));

    updateGameState({
      phase: 'revealing',
      players: updatedPlayers,
      platforms: updatedPlatforms,
      lastRoundResults: results,
    });
  };

  // 次のラウンドへ
  const handleNextRound = () => {
    if (!isHost || !gameState) return;

    // ゲーム終了チェック
    if (gameState.bag.length === 0) {
      const winnerId = determineWinner(gameState.players);
      updateGameState({
        phase: 'ended',
        winnerId,
      });
      return;
    }

    // 宝石を補充
    const replenished = replenishPlatforms(gameState.platforms, gameState.bag);

    // 休み状態を解除
    const updatedPlayers = gameState.players.map(p => ({
      ...p,
      isResting: p.action?.type === 'barrier' ? true : false, // 前ラウンドでバリアした人は今ラウンド休み
      action: null,
      isReady: false,
    }));

    // 実際には前回バリアした人の isResting を維持する必要がある
    // lastRoundResults から判定
    const barrierPlayerIds = gameState.lastRoundResults?.barriers.map(b => b.playerId) ?? [];
    const finalPlayers = updatedPlayers.map(p => ({
      ...p,
      isResting: barrierPlayerIds.includes(p.id),
    }));

    updateGameState({
      phase: 'selecting',
      round: gameState.round + 1,
      bag: replenished.bag,
      platforms: replenished.platforms,
      players: finalPlayers,
    });
  };

  // もう一度遊ぶ
  const handlePlayAgain = () => {
    if (!isHost || !gameState) return;

    const resetPlayers = gameState.players.map(p => ({
      ...p,
      vault: [],
      secured: [],
      action: null,
      isResting: false,
      isReady: false,
    }));

    updateGameState({
      phase: 'waiting',
      round: 1,
      bag: [],
      platforms: [],
      players: resetPlayers,
      winnerId: null,
    });
  };

  // ローディング中
  if (isPlayerLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-900 to-blue-900 flex items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  // ロビー画面
  if (!roomCode || !gameState || gameState.phase === 'waiting') {
    return (
      <Lobby
        roomCode={roomCode}
        players={players}
        isHost={isHost}
        isLoading={isRoomLoading}
        error={error}
        hostId={roomData?.hostId ?? ''}
        playerName={playerName}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
        onLeaveRoom={leaveRoom}
        onStartGame={handleStartGame}
        onBack={onBack}
        debugMode={debugMode}
        onAddTestPlayer={addTestPlayer}
      />
    );
  }

  // 結果画面
  if (gameState.phase === 'ended') {
    return (
      <ResultPhase
        gameState={gameState}
        playerId={playerId ?? ''}
        isHost={isHost}
        onPlayAgain={handlePlayAgain}
        onLeaveRoom={leaveRoom}
      />
    );
  }

  // アクション公開画面
  if (gameState.phase === 'revealing' || gameState.phase === 'resolving' || gameState.phase === 'replenishing') {
    return (
      <RevealPhase
        gameState={gameState}
        isHost={isHost}
        onNextRound={handleNextRound}
        onLeaveRoom={leaveRoom}
      />
    );
  }

  // ゲーム画面（アクション選択）
  return (
    <GamePlayPhase
      gameState={gameState}
      playerId={playerId ?? ''}
      isHost={isHost}
      onSetAction={setPlayerAction}
      onRevealActions={handleRevealActions}
      onLeaveRoom={leaveRoom}
    />
  );
};
