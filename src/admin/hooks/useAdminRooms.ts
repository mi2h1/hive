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
  gameType: 'aoa' | 'moji-hunt' | 'moji-hunt-dev';
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
  };
}

export const useAdminRooms = () => {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const aoaRef = ref(db, 'rooms');
    const mojiHuntRef = ref(db, 'moji-hunt-rooms');
    const mojiHuntDevRef = ref(db, 'moji-hunt-dev-rooms');

    let aoaRooms: AdminRoom[] = [];
    let mojiHuntRooms: AdminRoom[] = [];
    let mojiHuntDevRooms: AdminRoom[] = [];

    const updateRooms = () => {
      setRooms([...aoaRooms, ...mojiHuntRooms, ...mojiHuntDevRooms].sort((a, b) => b.createdAt - a.createdAt));
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
          },
        };
      });
      updateRooms();
    });

    // もじはんと（開発版）の部屋を監視
    onValue(mojiHuntDevRef, (snapshot) => {
      if (!snapshot.exists()) {
        mojiHuntDevRooms = [];
        updateRooms();
        return;
      }

      const data = snapshot.val();
      mojiHuntDevRooms = Object.entries(data).map(([code, room]) => {
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

        return {
          gameType: 'moji-hunt-dev' as const,
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
          },
        };
      });
      updateRooms();
    });

    return () => {
      off(aoaRef);
      off(mojiHuntRef);
      off(mojiHuntDevRef);
    };
  }, []);

  // 特定の部屋を削除
  const deleteRoom = useCallback(async (gameType: 'aoa' | 'moji-hunt' | 'moji-hunt-dev', code: string) => {
    let path: string;
    if (gameType === 'aoa') {
      path = `rooms/${code}`;
    } else if (gameType === 'moji-hunt') {
      path = `moji-hunt-rooms/${code}`;
    } else {
      path = `moji-hunt-dev-rooms/${code}`;
    }
    await remove(ref(db, path));
  }, []);

  // 古い部屋を一括削除（1時間以上前）
  const cleanupOldRooms = useCallback(async () => {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1時間

    const deletePromises: Promise<void>[] = [];
    for (const room of rooms) {
      if (now - room.createdAt > maxAge) {
        let path: string;
        if (room.gameType === 'aoa') {
          path = `rooms/${room.code}`;
        } else if (room.gameType === 'moji-hunt') {
          path = `moji-hunt-rooms/${room.code}`;
        } else {
          path = `moji-hunt-dev-rooms/${room.code}`;
        }
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
      let path: string;
      if (room.gameType === 'aoa') {
        path = `rooms/${room.code}`;
      } else if (room.gameType === 'moji-hunt') {
        path = `moji-hunt-rooms/${room.code}`;
      } else {
        path = `moji-hunt-dev-rooms/${room.code}`;
      }
      deletePromises.push(remove(ref(db, path)));
    }
    await Promise.all(deletePromises);
    return deletePromises.length;
  }, [rooms]);

  return { rooms, isLoading, deleteRoom, cleanupOldRooms, deleteAllRooms };
};
