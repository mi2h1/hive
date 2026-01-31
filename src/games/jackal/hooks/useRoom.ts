import { useState, useEffect, useCallback } from 'react';
import { ref, set, onValue, off, update, remove, get, onDisconnect } from 'firebase/database';
import { db } from '../../../lib/firebase';
import type { GameState, Player, GameSettings, Card } from '../types/game';
import { DEFAULT_SETTINGS } from '../types/game';

// ルームデータ
export interface RoomData {
  hostId: string;
  gameState: GameState;
  createdAt: number;
}

// 古いルームを削除（24時間以上前のルーム）
const cleanupOldRooms = async () => {
  try {
    const roomsRef = ref(db, 'jackal-rooms');
    const snapshot = await get(roomsRef);
    if (!snapshot.exists()) return;

    const rooms = snapshot.val();
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24時間

    const deletePromises: Promise<void>[] = [];
    for (const [code, room] of Object.entries(rooms)) {
      const roomData = room as { createdAt?: number; gameState?: { players?: unknown[] | Record<string, unknown> } };
      const createdAt = roomData.createdAt || 0;
      const players = roomData.gameState?.players;

      let playerCount = 0;
      if (Array.isArray(players)) {
        playerCount = players.length;
      } else if (players && typeof players === 'object') {
        playerCount = Object.keys(players).length;
      }

      if (now - createdAt > maxAge || playerCount === 0) {
        deletePromises.push(remove(ref(db, `jackal-rooms/${code}`)));
      }
    }

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`Cleaned up ${deletePromises.length} old jackal rooms`);
    }
  } catch (err) {
    console.error('Cleanup old rooms error:', err);
  }
};

// ルームコード生成（4文字）
const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// Firebase配列の正規化
const normalizeArray = <T>(data: T[] | Record<string, T> | undefined | null): T[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return Object.values(data);
};

// 初期プレイヤーを作成
export const createInitialPlayer = (id: string, name: string, initialLife: number = 3): Player => ({
  id,
  name,
  life: initialLife,
  isEliminated: false,
  cardId: null,
});

// 初期ゲーム状態を作成
export const createInitialGameState = (settings: GameSettings = DEFAULT_SETTINGS): GameState => ({
  phase: 'waiting',
  settings,
  players: [],
  deck: [],
  discardPile: [],
  dealtCards: {},
  round: 1,
  currentTurnPlayerId: null,
  turnOrder: [],
  currentDeclaredValue: null,
  lastDeclarerId: null,
  judgmentResult: null,
  winnerId: null,
});

export const useRoom = (playerId: string | null, playerName: string | null) => {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // マウント時に古いルームをクリーンアップ
  useEffect(() => {
    cleanupOldRooms();
  }, []);

  // プレゼンス（接続状態）の設定
  useEffect(() => {
    if (!roomCode || !playerId) return;

    const roomRef = ref(db, `jackal-rooms/${roomCode}`);
    const myPresenceRef = ref(db, `jackal-rooms/${roomCode}/presence/${playerId}`);

    const setupPresence = async () => {
      await set(myPresenceRef, true);
      await onDisconnect(myPresenceRef).remove();

      const roomSnapshot = await get(roomRef);
      if (roomSnapshot.exists()) {
        const room = roomSnapshot.val();
        if (room.hostId === playerId) {
          await onDisconnect(roomRef).remove();
        }
      }
    };

    setupPresence();

    return () => {
      remove(myPresenceRef);
      onDisconnect(myPresenceRef).cancel();
      onDisconnect(roomRef).cancel();
    };
  }, [roomCode, playerId]);

  // presenceの変更を監視
  useEffect(() => {
    if (!roomCode || !playerId) return;

    const presenceListRef = ref(db, `jackal-rooms/${roomCode}/presence`);
    const roomRef = ref(db, `jackal-rooms/${roomCode}`);

    onValue(presenceListRef, async (snapshot) => {
      const presenceData = snapshot.val() || {};
      const onlinePlayerIds = Object.keys(presenceData);

      const roomSnapshot = await get(roomRef);
      if (!roomSnapshot.exists()) return;

      const room = roomSnapshot.val();
      const players = normalizeArray<Player>(room.gameState?.players);
      const currentHostId = room.hostId;

      // テストプレイヤーはプレゼンス対象外
      const isTestPlayer = (id: string) => id.startsWith('test-');
      const offlinePlayers = players.filter(p => !isTestPlayer(p.id) && !onlinePlayerIds.includes(p.id));

      if (offlinePlayers.length > 0) {
        const remainingPlayers = players.filter(p => isTestPlayer(p.id) || onlinePlayerIds.includes(p.id));

        if (remainingPlayers.length === 0) {
          await remove(roomRef);
        } else {
          const updates: Record<string, unknown> = {
            'gameState/players': remainingPlayers,
          };

          if (!onlinePlayerIds.includes(currentHostId)) {
            const realPlayers = remainingPlayers.filter(p => !isTestPlayer(p.id));
            const newHostId = realPlayers.length > 0 ? realPlayers[0].id : remainingPlayers[0].id;
            updates['hostId'] = newHostId;

            if (newHostId === playerId) {
              await onDisconnect(roomRef).remove();
            }
          }

          await update(roomRef, updates);
        }
      }
    });

    return () => {
      off(presenceListRef);
    };
  }, [roomCode, playerId]);

  // ルームのリアルタイム監視
  useEffect(() => {
    if (!roomCode) {
      setRoomData(null);
      return;
    }

    const roomRef = ref(db, `jackal-rooms/${roomCode}`);

    onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const gs = data.gameState;

        const normalizedData: RoomData = {
          ...data,
          gameState: {
            ...gs,
            players: normalizeArray<Player>(gs?.players),
            deck: normalizeArray<Card>(gs?.deck),
            turnOrder: normalizeArray<string>(gs?.turnOrder),
            settings: gs?.settings ?? DEFAULT_SETTINGS,
          },
        };
        setRoomData(normalizedData);
        setError(null);
      } else {
        // 部屋が削除された（ホストが退出した）
        setRoomData(null);
        setRoomCode(null);
        setError('ホストがゲームを終了しました');
      }
    }, (err) => {
      console.error('Room subscription error:', err);
      setError('接続エラーが発生しました');
    });

    return () => {
      off(roomRef);
    };
  }, [roomCode]);

  // ルーム作成
  const createRoom = useCallback(async () => {
    if (!playerId || !playerName) {
      setError('プレイヤー情報が必要です');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      await cleanupOldRooms();

      const code = generateRoomCode();
      const roomRef = ref(db, `jackal-rooms/${code}`);

      const initialPlayer = createInitialPlayer(playerId, playerName);
      const initialGameState = createInitialGameState();

      const newRoom: RoomData = {
        hostId: playerId,
        gameState: {
          ...initialGameState,
          players: [initialPlayer],
        },
        createdAt: Date.now(),
      };

      await set(roomRef, newRoom);
      setRoomCode(code);
      return code;
    } catch (err) {
      console.error('Create room error:', err);
      setError('ルーム作成に失敗しました');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [playerId, playerName]);

  // ルーム参加
  const joinRoom = useCallback(async (code: string) => {
    if (!playerId || !playerName) {
      setError('プレイヤー情報が必要です');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const upperCode = code.toUpperCase();
      const roomRef = ref(db, `jackal-rooms/${upperCode}`);

      return new Promise<boolean>((resolve) => {
        onValue(roomRef, async (snapshot) => {
          const data = snapshot.val() as RoomData | null;
          off(roomRef);

          if (!data) {
            setError('ルームが見つかりません');
            setIsLoading(false);
            resolve(false);
            return;
          }

          if (data.gameState.phase !== 'waiting') {
            setError('ゲームは既に開始されています');
            setIsLoading(false);
            resolve(false);
            return;
          }

          const players = normalizeArray<Player>(data.gameState.players);

          // 最大10人チェック
          if (players.length >= 10) {
            setError('ルームが満員です（最大10人）');
            setIsLoading(false);
            resolve(false);
            return;
          }

          const existingPlayer = players.find(p => p.id === playerId);
          if (existingPlayer) {
            setRoomCode(upperCode);
            setIsLoading(false);
            resolve(true);
            return;
          }

          const newPlayer = createInitialPlayer(playerId, playerName, data.gameState.settings.initialLife);
          const updatedPlayers = [...players, newPlayer];

          await update(ref(db, `jackal-rooms/${upperCode}/gameState`), {
            players: updatedPlayers,
          });

          setRoomCode(upperCode);
          setIsLoading(false);
          resolve(true);
        }, { onlyOnce: true });
      });
    } catch (err) {
      console.error('Join room error:', err);
      setError('ルーム参加に失敗しました');
      setIsLoading(false);
      return false;
    }
  }, [playerId, playerName]);

  // ルーム退出
  const leaveRoom = useCallback(async () => {
    if (!roomCode || !playerId || !roomData) return;

    try {
      const isHost = roomData.hostId === playerId;

      if (isHost) {
        await remove(ref(db, `jackal-rooms/${roomCode}`));
      } else {
        const updatedPlayers = roomData.gameState.players.filter(p => p.id !== playerId);

        if (updatedPlayers.length === 0) {
          await remove(ref(db, `jackal-rooms/${roomCode}`));
        } else {
          await update(ref(db, `jackal-rooms/${roomCode}/gameState`), {
            players: updatedPlayers,
          });
        }
      }

      setRoomCode(null);
      setRoomData(null);
    } catch (err) {
      console.error('Leave room error:', err);
    }
  }, [roomCode, playerId, roomData]);

  // ゲーム状態を更新
  const updateGameState = useCallback(async (newState: Partial<GameState>) => {
    if (!roomCode) return;

    try {
      await update(ref(db, `jackal-rooms/${roomCode}/gameState`), newState);
    } catch (err) {
      console.error('Update game state error:', err);
      setError('状態の更新に失敗しました');
    }
  }, [roomCode]);

  // 設定を更新
  const updateSettings = useCallback(async (settings: Partial<GameSettings>) => {
    if (!roomCode || !roomData) return;

    try {
      const currentSettings = roomData.gameState.settings;
      const newSettings = { ...currentSettings, ...settings };

      // ライフ設定が変更された場合、既存プレイヤーにも適用
      if (settings.initialLife !== undefined) {
        const updatedPlayers = roomData.gameState.players.map(p => ({
          ...p,
          life: settings.initialLife!,
        }));

        await update(ref(db, `jackal-rooms/${roomCode}/gameState`), {
          settings: newSettings,
          players: updatedPlayers,
        });
      } else {
        await update(ref(db, `jackal-rooms/${roomCode}/gameState`), {
          settings: newSettings,
        });
      }
    } catch (err) {
      console.error('Update settings error:', err);
    }
  }, [roomCode, roomData]);

  // デバッグ用: テストプレイヤーを追加
  const addTestPlayer = useCallback(async () => {
    if (!roomCode || !roomData) return;

    const players = roomData.gameState.players;
    if (players.length >= 10) return;

    const testPlayerCount = players.filter(p => p.name.startsWith('テスト')).length;
    const testNumber = testPlayerCount + 1;

    const testPlayer = createInitialPlayer(
      `test-${Date.now()}-${testNumber}`,
      `テスト${testNumber}`,
      roomData.gameState.settings.initialLife
    );

    try {
      await update(ref(db, `jackal-rooms/${roomCode}/gameState`), {
        players: [...players, testPlayer],
      });
    } catch (err) {
      console.error('Add test player error:', err);
    }
  }, [roomCode, roomData]);

  const isHost = roomData?.hostId === playerId;
  const currentPlayer = roomData?.gameState.players.find(p => p.id === playerId);

  return {
    roomCode,
    roomData,
    error,
    isLoading,
    isHost,
    currentPlayer,
    createRoom,
    joinRoom,
    leaveRoom,
    updateGameState,
    updateSettings,
    addTestPlayer,
  };
};
