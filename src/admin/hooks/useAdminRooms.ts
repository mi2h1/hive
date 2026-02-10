import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, off, remove } from 'firebase/database';
import { db } from '../../lib/firebase';

// プレイヤー型
interface AoaPlayer {
  id: string;
  name: string;
  gems: number;
  isReturning?: boolean;
}

interface MojiHuntPlayer {
  id: string;
  name: string;
  isEliminated?: boolean;
  isReady?: boolean;
  wordLength?: number;
  normalizedWord?: string;
  revealedPositions?: boolean[];
  revealedCharacters?: string[];
}

interface JackalPlayer {
  id: string;
  name: string;
  life: number;
  isEliminated: boolean;
}

interface DesperadoPlayer {
  id: string;
  name: string;
  lives: number;
  hasRolled: boolean;
  isEliminated: boolean;
  currentRoll?: { die1: number; die2: number } | null;
}

interface SparkPlayer {
  id: string;
  name: string;
  vault: unknown[];
  secured: unknown[];
  isReady: boolean;
  isResting: boolean;
}

// AOAの部屋データ型
interface AoaRoom {
  code: string;
  hostId: string;
  createdAt: number;
  ruleSet?: {
    type: 'atlantis' | 'incan_gold';
  };
  gameState: {
    phase: string;
    round: number;
    players: AoaPlayer[] | Record<string, AoaPlayer>;
  };
}

// もじはんとの部屋データ型
interface MojiHuntRoom {
  code: string;
  hostId: string;
  createdAt: number;
  gameState: {
    phase: string;
    currentTopic?: string;
    players: MojiHuntPlayer[] | Record<string, MojiHuntPlayer>;
    currentTurnPlayerId?: string;
    usedCharacters?: string[] | Record<string, string>;
  };
}

// ジャッカルの部屋データ型
interface JackalRoom {
  code: string;
  hostId: string;
  createdAt: number;
  gameState: {
    phase: string;
    round: number;
    players: JackalPlayer[] | Record<string, JackalPlayer>;
    currentTurnPlayerId?: string;
    currentDeclaredValue?: number;
  };
}

// デスペラードの部屋データ型
interface DesperadoRoom {
  code: string;
  hostId: string;
  createdAt: number;
  gameState: {
    phase: string;
    currentRound: number;
    desperadoRolledThisRound: boolean;
    players: DesperadoPlayer[] | Record<string, DesperadoPlayer>;
    currentTurnPlayerId?: string | null;
    winnerId?: string | null;
  };
}

// SPARKの部屋データ型
interface SparkRoom {
  code: string;
  hostId: string;
  createdAt: number;
  gameState: {
    phase: string;
    round: number;
    players: SparkPlayer[] | Record<string, SparkPlayer>;
    winnerId?: string | null;
  };
}

export interface AdminMojiHuntPlayerDetail {
  id: string;
  name: string;
  isEliminated: boolean;
  isReady: boolean;
  normalizedWord: string;
  revealedPositions: boolean[];
  revealedCharacters: string[];
}

export interface AdminRoom {
  gameType: 'aoa' | 'moji-hunt' | 'jackal' | 'desperado' | 'spark';
  code: string;
  hostId: string;
  createdAt: number;
  phase: string;
  playerCount: number;
  players: Array<{ id: string; name: string }>;
  // ゲーム固有の情報
  details: {
    // AOA
    round?: number;
    ruleSetType?: 'atlantis' | 'incan_gold';
    // もじはんと
    currentTopic?: string;
    currentTurnPlayerName?: string;
    eliminatedCount?: number;
    mojiHuntPlayers?: AdminMojiHuntPlayerDetail[];
    usedCharacters?: string[];
    // ジャッカル
    jackalRound?: number;
    currentDeclaredValue?: number;
    jackalPlayers?: Array<{ id: string; name: string; life: number; isEliminated: boolean }>;
    // POLYFORM
    currentTurnNumber?: number;
    finalRound?: boolean;
    polyformPlayers?: Array<{ id: string; name: string; score: number; completedWhite: number; completedBlack: number }>;
    // デスペラード
    desperadoRound?: number;
    desperadoRolledThisRound?: boolean;
    desperadoPlayers?: Array<{ id: string; name: string; lives: number; hasRolled: boolean; isEliminated: boolean }>;
    // SPARK
    sparkRound?: number;
    sparkReadyCount?: number;
    sparkRestingCount?: number;
  };
}

export const useAdminRooms = () => {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const aoaRef = ref(db, 'rooms');
    const mojiHuntRef = ref(db, 'moji-hunt-rooms');
    const jackalRef = ref(db, 'jackal-rooms');
    const desperadoRef = ref(db, 'desperado-rooms');
    const sparkRef = ref(db, 'spark-rooms');

    let aoaRooms: AdminRoom[] = [];
    let mojiHuntRooms: AdminRoom[] = [];
    let jackalRooms: AdminRoom[] = [];
    let desperadoRooms: AdminRoom[] = [];
    let sparkRooms: AdminRoom[] = [];

    const updateRooms = () => {
      setRooms([...aoaRooms, ...mojiHuntRooms, ...jackalRooms, ...desperadoRooms, ...sparkRooms].sort((a, b) => b.createdAt - a.createdAt));
      setIsLoading(false);
    };

    // AOAの部屋を監視
    onValue(aoaRef, (snapshot) => {
      if (!snapshot.exists()) {
        aoaRooms = [];
        updateRooms();
        return;
      }

      const data = snapshot.val();
      aoaRooms = Object.entries(data).map(([code, room]) => {
        const r = room as AoaRoom;
        const rawPlayers = r.gameState?.players;
        const players: AoaPlayer[] = Array.isArray(rawPlayers)
          ? rawPlayers
          : Object.values(rawPlayers || {}) as AoaPlayer[];

        return {
          gameType: 'aoa' as const,
          code,
          hostId: r.hostId,
          createdAt: r.createdAt || 0,
          phase: r.gameState?.phase || 'unknown',
          playerCount: players.length,
          players: players.map(p => ({ id: p.id, name: p.name })),
          details: {
            round: r.gameState?.round,
            ruleSetType: r.ruleSet?.type,
          },
        };
      });
      updateRooms();
    });

    // もじはんとの部屋を監視
    onValue(mojiHuntRef, (snapshot) => {
      if (!snapshot.exists()) {
        mojiHuntRooms = [];
        updateRooms();
        return;
      }

      const data = snapshot.val();
      mojiHuntRooms = Object.entries(data).map(([code, room]) => {
        const r = room as MojiHuntRoom;
        const rawPlayers = r.gameState?.players;
        const players: MojiHuntPlayer[] = Array.isArray(rawPlayers)
          ? rawPlayers
          : Object.values(rawPlayers || {}) as MojiHuntPlayer[];

        const currentTurnPlayer = players.find(p => p.id === r.gameState?.currentTurnPlayerId);
        const eliminatedCount = players.filter(p => p.isEliminated).length;

        // プレイヤー詳細情報
        const mojiHuntPlayers: AdminMojiHuntPlayerDetail[] = players.map(p => ({
          id: p.id,
          name: p.name,
          isEliminated: p.isEliminated || false,
          isReady: p.isReady || false,
          normalizedWord: p.normalizedWord || '',
          revealedPositions: Array.isArray(p.revealedPositions) ? p.revealedPositions : [],
          revealedCharacters: Array.isArray(p.revealedCharacters) ? p.revealedCharacters : [],
        }));

        // 使用済み文字
        const rawUsedChars = r.gameState?.usedCharacters;
        const usedCharacters: string[] = Array.isArray(rawUsedChars)
          ? rawUsedChars
          : rawUsedChars ? Object.values(rawUsedChars) : [];

        return {
          gameType: 'moji-hunt' as const,
          code,
          hostId: r.hostId,
          createdAt: r.createdAt || 0,
          phase: r.gameState?.phase || 'unknown',
          playerCount: players.length,
          players: players.map(p => ({ id: p.id, name: p.name })),
          details: {
            currentTopic: r.gameState?.currentTopic,
            currentTurnPlayerName: currentTurnPlayer?.name,
            eliminatedCount,
            mojiHuntPlayers,
            usedCharacters,
          },
        };
      });
      updateRooms();
    });

    // ジャッカルの部屋を監視
    onValue(jackalRef, (snapshot) => {
      if (!snapshot.exists()) {
        jackalRooms = [];
        updateRooms();
        return;
      }

      const data = snapshot.val();
      jackalRooms = Object.entries(data).map(([code, room]) => {
        const r = room as JackalRoom;
        const rawPlayers = r.gameState?.players;
        const players: JackalPlayer[] = Array.isArray(rawPlayers)
          ? rawPlayers
          : Object.values(rawPlayers || {}) as JackalPlayer[];

        const currentTurnPlayer = players.find(p => p.id === r.gameState?.currentTurnPlayerId);
        const eliminatedCount = players.filter(p => p.isEliminated).length;

        return {
          gameType: 'jackal' as const,
          code,
          hostId: r.hostId,
          createdAt: r.createdAt || 0,
          phase: r.gameState?.phase || 'unknown',
          playerCount: players.length,
          players: players.map(p => ({ id: p.id, name: p.name })),
          details: {
            jackalRound: r.gameState?.round,
            currentTurnPlayerName: currentTurnPlayer?.name,
            currentDeclaredValue: r.gameState?.currentDeclaredValue ?? undefined,
            eliminatedCount,
            jackalPlayers: players.map(p => ({
              id: p.id,
              name: p.name,
              life: p.life,
              isEliminated: p.isEliminated,
            })),
          },
        };
      });
      updateRooms();
    });

    // デスペラードの部屋を監視
    onValue(desperadoRef, (snapshot) => {
      if (!snapshot.exists()) {
        desperadoRooms = [];
        updateRooms();
        return;
      }

      const data = snapshot.val();
      desperadoRooms = Object.entries(data).map(([code, room]) => {
        const r = room as DesperadoRoom;
        const rawPlayers = r.gameState?.players;
        const players: DesperadoPlayer[] = Array.isArray(rawPlayers)
          ? rawPlayers
          : Object.values(rawPlayers || {}) as DesperadoPlayer[];

        const currentTurnPlayer = players.find(p => p.id === r.gameState?.currentTurnPlayerId);
        const eliminatedCount = players.filter(p => p.isEliminated).length;

        return {
          gameType: 'desperado' as const,
          code,
          hostId: r.hostId,
          createdAt: r.createdAt || 0,
          phase: r.gameState?.phase || 'unknown',
          playerCount: players.length,
          players: players.map(p => ({ id: p.id, name: p.name })),
          details: {
            desperadoRound: r.gameState?.currentRound,
            desperadoRolledThisRound: r.gameState?.desperadoRolledThisRound,
            currentTurnPlayerName: currentTurnPlayer?.name,
            eliminatedCount,
            desperadoPlayers: players.map(p => ({
              id: p.id,
              name: p.name,
              lives: p.lives,
              hasRolled: p.hasRolled,
              isEliminated: p.isEliminated,
            })),
          },
        };
      });
      updateRooms();
    });

    // SPARKの部屋を監視
    onValue(sparkRef, (snapshot) => {
      if (!snapshot.exists()) {
        sparkRooms = [];
        updateRooms();
        return;
      }

      const data = snapshot.val();
      sparkRooms = Object.entries(data).map(([code, room]) => {
        const r = room as SparkRoom;
        const rawPlayers = r.gameState?.players;
        const players: SparkPlayer[] = Array.isArray(rawPlayers)
          ? rawPlayers
          : Object.values(rawPlayers || {}) as SparkPlayer[];

        const readyCount = players.filter(p => p.isReady).length;
        const restingCount = players.filter(p => p.isResting).length;

        return {
          gameType: 'spark' as const,
          code,
          hostId: r.hostId,
          createdAt: r.createdAt || 0,
          phase: r.gameState?.phase || 'unknown',
          playerCount: players.length,
          players: players.map(p => ({ id: p.id, name: p.name })),
          details: {
            sparkRound: r.gameState?.round,
            sparkReadyCount: readyCount,
            sparkRestingCount: restingCount,
          },
        };
      });
      updateRooms();
    });

    return () => {
      off(aoaRef);
      off(mojiHuntRef);
      off(jackalRef);
      off(desperadoRef);
      off(sparkRef);
    };
  }, []);

  // ゲームタイプからFirebaseパスを取得
  const getPathForGameType = (gameType: AdminRoom['gameType'], code: string): string => {
    switch (gameType) {
      case 'aoa': return `rooms/${code}`;
      case 'moji-hunt': return `moji-hunt-rooms/${code}`;
      case 'jackal': return `jackal-rooms/${code}`;
      case 'desperado': return `desperado-rooms/${code}`;
      case 'spark': return `spark-rooms/${code}`;
    }
  };

  // 特定の部屋を削除
  const deleteRoom = useCallback(async (gameType: AdminRoom['gameType'], code: string) => {
    const path = getPathForGameType(gameType, code);
    await remove(ref(db, path));
  }, []);

  // 古い部屋を一括削除（1時間以上前）
  const cleanupOldRooms = useCallback(async () => {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1時間

    const deletePromises: Promise<void>[] = [];
    for (const room of rooms) {
      if (now - room.createdAt > maxAge) {
        const path = getPathForGameType(room.gameType, room.code);
        deletePromises.push(remove(ref(db, path)));
      }
    }

    await Promise.all(deletePromises);
    return deletePromises.length;
  }, [rooms]);

  // 全部屋を削除
  const deleteAllRooms = useCallback(async () => {
    const deletePromises: Promise<void>[] = [];
    for (const room of rooms) {
      const path = getPathForGameType(room.gameType, room.code);
      deletePromises.push(remove(ref(db, path)));
    }
    await Promise.all(deletePromises);
    return deletePromises.length;
  }, [rooms]);

  return { rooms, isLoading, deleteRoom, cleanupOldRooms, deleteAllRooms };
};
