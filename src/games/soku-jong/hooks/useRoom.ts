import { useState, useEffect, useCallback } from 'react';
import { ref, set, onValue, off, update, remove, get, onDisconnect } from 'firebase/database';
import { db } from '../../../lib/firebase';
import type { GameState, Player, RoomData } from '../types/game';
import { createInitialPlayer, createInitialGameState } from '../types/game';

const ROOM_PATH = 'soku-jong-rooms';

// 古いルームを削除（24時間以上前のルーム）
const cleanupOldRooms = async () => {
  try {
    const roomsRef = ref(db, ROOM_PATH);
    const snapshot = await get(roomsRef);
    if (!snapshot.exists()) return;

    const rooms = snapshot.val();
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;

    const deletePromises: Promise<void>[] = [];

    for (const [code, room] of Object.entries(rooms)) {
      const roomData = room as {
        createdAt?: number;
        gameState?: {
          players?: unknown[] | Record<string, unknown>;
        };
      };
      const createdAt = roomData.createdAt || 0;
      const players = roomData.gameState?.players;

      let playerCount = 0;
      if (Array.isArray(players)) {
        playerCount = players.length;
      } else if (players && typeof players === 'object') {
        playerCount = Object.keys(players).length;
      }

      if (now - createdAt > maxAge || playerCount === 0) {
        deletePromises.push(remove(ref(db, `${ROOM_PATH}/${code}`)));
      }
    }

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`Cleaned up ${deletePromises.length} old soku-jong rooms`);
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

    // テストプレイヤーはプレゼンス対象外
    if (playerId.startsWith('test-')) return;

    const myPresenceRef = ref(db, `${ROOM_PATH}/${roomCode}/presence/${playerId}`);

    const setupPresence = async () => {
      await set(myPresenceRef, true);
      await onDisconnect(myPresenceRef).remove();
    };

    setupPresence();

    return () => {
      remove(myPresenceRef);
      onDisconnect(myPresenceRef).cancel();
    };
  }, [roomCode, playerId]);

  // presenceの変更を監視
  useEffect(() => {
    if (!roomCode || !playerId) return;

    const presenceListRef = ref(db, `${ROOM_PATH}/${roomCode}/presence`);
    const roomRef = ref(db, `${ROOM_PATH}/${roomCode}`);

    onValue(presenceListRef, async (snapshot) => {
      const presenceData = snapshot.val() || {};
      const onlinePlayerIds = Object.keys(presenceData);

      const roomSnapshot = await get(roomRef);
      if (!roomSnapshot.exists()) return;

      const room = roomSnapshot.val();
      const gamePhase = room.gameState?.phase;
      const players = normalizeArray<Player>(room.gameState?.players);
      const currentHostId = room.hostId;

      // テストプレイヤーは常にオンライン扱い
      const testPlayerIds = players.filter(p => p.id.startsWith('test-')).map(p => p.id);
      const effectiveOnlineIds = [...onlinePlayerIds, ...testPlayerIds];

      const offlinePlayers = players.filter(p => !effectiveOnlineIds.includes(p.id));

      if (offlinePlayers.length > 0) {
        const remainingPlayers = players.filter(p => effectiveOnlineIds.includes(p.id));

        // 全員オフラインなら部屋を削除
        if (remainingPlayers.length === 0) {
          await remove(roomRef);
          return;
        }

        // ゲーム中は個々のプレイヤー削除を行わない（一時切断対策）
        if (gamePhase !== 'waiting') return;

        const updates: Record<string, unknown> = {
          'gameState/players': remainingPlayers,
        };

        if (!effectiveOnlineIds.includes(currentHostId)) {
          const newHostId = remainingPlayers[0].id;
          updates['hostId'] = newHostId;
        }

        await update(roomRef, updates);
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

    const roomRef = ref(db, `${ROOM_PATH}/${roomCode}`);

    onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const gs = data.gameState;

        const normalizedPlayers = normalizeArray<Player>(gs?.players).map((p) => ({
          ...p,
          hand: normalizeArray(p.hand),
          discards: normalizeArray(p.discards),
        }));

        const normalizedData: RoomData = {
          ...data,
          gameState: {
            ...gs,
            players: normalizedPlayers,
            deck: normalizeArray(gs?.deck),
          },
        };
        setRoomData(normalizedData);
        setError(null);
      } else {
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
      const roomRef = ref(db, `${ROOM_PATH}/${code}`);

      const initialPlayer = createInitialPlayer(playerId, playerName);

      const newRoom: RoomData = {
        hostId: playerId,
        gameState: {
          ...createInitialGameState(),
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

  // ルーム参加（2〜4人）
  const joinRoom = useCallback(async (code: string) => {
    if (!playerId || !playerName) {
      setError('プレイヤー情報が必要です');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const upperCode = code.toUpperCase();
      const roomRef = ref(db, `${ROOM_PATH}/${upperCode}`);

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

          const players = normalizeArray<Player>(data.gameState.players);

          // 既に参加済みかチェック（ゲーム中でも復帰可能）
          const existingPlayer = players.find(p => p.id === playerId);
          if (existingPlayer) {
            setRoomCode(upperCode);
            setIsLoading(false);
            resolve(true);
            return;
          }

          // 新規参加者はゲーム開始後は参加不可
          if (data.gameState.phase !== 'waiting') {
            setError('ゲームは既に開始されています');
            setIsLoading(false);
            resolve(false);
            return;
          }

          // 4人制限
          if (players.length >= 4) {
            setError('ルームが満員です（最大4人）');
            setIsLoading(false);
            resolve(false);
            return;
          }

          // 新規プレイヤーを追加
          const newPlayer = createInitialPlayer(playerId, playerName);
          const updatedPlayers = [...players, newPlayer];

          await update(ref(db, `${ROOM_PATH}/${upperCode}/gameState`), {
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
        await remove(ref(db, `${ROOM_PATH}/${roomCode}`));
      } else {
        const updatedPlayers = roomData.gameState.players.filter(p => p.id !== playerId);

        if (updatedPlayers.length === 0) {
          await remove(ref(db, `${ROOM_PATH}/${roomCode}`));
        } else {
          await update(ref(db, `${ROOM_PATH}/${roomCode}/gameState`), {
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

    // Firebase Realtime Database は undefined を受け付けないため除去（null は削除として有効）
    const cleaned = Object.fromEntries(
      Object.entries(newState).filter(([, v]) => v !== undefined),
    );
    if (Object.keys(cleaned).length === 0) return;

    try {
      await update(ref(db, `${ROOM_PATH}/${roomCode}/gameState`), cleaned);
    } catch (err) {
      console.error('Update game state error:', err);
      setError('状態の更新に失敗しました');
    }
  }, [roomCode]);

  // デバッグ用: テストプレイヤーを追加
  const addTestPlayer = useCallback(async () => {
    if (!roomCode || !roomData) return;

    const players = roomData.gameState.players;
    if (players.length >= 4) return;

    const testPlayerCount = players.filter(p => p.name.startsWith('テスト')).length;
    const testNumber = testPlayerCount + 1;

    const testPlayer = createInitialPlayer(
      `test-${Date.now()}-${testNumber}`,
      `テスト${testNumber}`
    );

    try {
      await update(ref(db, `${ROOM_PATH}/${roomCode}/gameState`), {
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
    addTestPlayer,
  };
};
