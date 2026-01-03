import { useState, useEffect, useCallback } from 'react';
import { ref, set, onValue, off, update, remove, get } from 'firebase/database';
import { db } from '../../../lib/firebase';
import type { GameState, Player, RoomData, GameSettings, AttackResult, AttackHit } from '../types/game';
import { createInitialPlayer, createInitialGameState, DEFAULT_SETTINGS } from '../types/game';

// 古いルームを削除（24時間以上前のルーム）
const cleanupOldRooms = async () => {
  try {
    const roomsRef = ref(db, 'moji-hunt-rooms');
    const snapshot = await get(roomsRef);
    if (!snapshot.exists()) return;

    const rooms = snapshot.val();
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24時間

    const deletePromises: Promise<void>[] = [];
    for (const [code, room] of Object.entries(rooms)) {
      const roomData = room as { createdAt?: number; gameState?: { players?: unknown[] } };
      const createdAt = roomData.createdAt || 0;
      const players = roomData.gameState?.players;
      const playerCount = Array.isArray(players) ? players.length : 0;

      // 24時間以上前 または プレイヤーが0人のルームを削除
      if (now - createdAt > maxAge || playerCount === 0) {
        deletePromises.push(remove(ref(db, `moji-hunt-rooms/${code}`)));
      }
    }

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`Cleaned up ${deletePromises.length} old moji-guess rooms`);
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

  // ルームのリアルタイム監視
  useEffect(() => {
    if (!roomCode) {
      setRoomData(null);
      return;
    }

    const roomRef = ref(db, `moji-hunt-rooms/${roomCode}`);

    onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const gs = data.gameState;

        // 配列の正規化
        const normalizedPlayers = normalizeArray<Player>(gs?.players).map((p) => ({
          ...p,
          revealedPositions: normalizeArray<boolean>(p.revealedPositions),
          revealedCharacters: normalizeArray<string>(p.revealedCharacters),
        }));

        const normalizedData: RoomData = {
          ...data,
          gameState: {
            ...gs,
            players: normalizedPlayers,
            turnOrder: normalizeArray<string>(gs?.turnOrder),
            usedCharacters: normalizeArray<string>(gs?.usedCharacters),
            attackHistory: normalizeArray<AttackResult>(gs?.attackHistory).map((attack: AttackResult) => ({
              ...attack,
              hits: normalizeArray<AttackHit>(attack.hits).map((hit: AttackHit) => ({
                ...hit,
                positions: normalizeArray<number>(hit.positions),
                characters: normalizeArray<string>(hit.characters),
              })),
            })),
            settings: gs?.settings ?? DEFAULT_SETTINGS,
          },
        };
        setRoomData(normalizedData);
        setError(null);
      } else {
        setRoomData(null);
        setError('ルームが見つかりません');
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
      // 古いルームをクリーンアップ
      await cleanupOldRooms();

      const code = generateRoomCode();
      const roomRef = ref(db, `moji-hunt-rooms/${code}`);

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
      const roomRef = ref(db, `moji-hunt-rooms/${upperCode}`);

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

          // ゲームが開始済みかチェック
          if (data.gameState.phase !== 'waiting') {
            setError('ゲームは既に開始されています');
            setIsLoading(false);
            resolve(false);
            return;
          }

          const players = normalizeArray<Player>(data.gameState.players);

          // 最大5人チェック
          if (players.length >= 5) {
            setError('ルームが満員です（最大5人）');
            setIsLoading(false);
            resolve(false);
            return;
          }

          // 既に参加済みかチェック
          const existingPlayer = players.find(p => p.id === playerId);
          if (existingPlayer) {
            setRoomCode(upperCode);
            setIsLoading(false);
            resolve(true);
            return;
          }

          // 新規プレイヤーを追加
          const newPlayer = createInitialPlayer(playerId, playerName);
          const updatedPlayers = [...players, newPlayer];

          await update(ref(db, `moji-hunt-rooms/${upperCode}/gameState`), {
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
        // ホストの場合はルームを削除
        await remove(ref(db, `moji-hunt-rooms/${roomCode}`));
      } else {
        // プレイヤーの場合は自分を削除
        const updatedPlayers = roomData.gameState.players.filter(p => p.id !== playerId);

        if (updatedPlayers.length === 0) {
          await remove(ref(db, `moji-hunt-rooms/${roomCode}`));
        } else {
          await update(ref(db, `moji-hunt-rooms/${roomCode}/gameState`), {
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
      await update(ref(db, `moji-hunt-rooms/${roomCode}/gameState`), newState);
    } catch (err) {
      console.error('Update game state error:', err);
      setError('状態の更新に失敗しました');
    }
  }, [roomCode]);

  // 設定を更新（ホストのみ）
  const updateSettings = useCallback(async (settings: Partial<GameSettings>) => {
    if (!roomCode || !roomData) return;

    try {
      const currentSettings = roomData.gameState.settings;
      await update(ref(db, `moji-hunt-rooms/${roomCode}/gameState`), {
        settings: { ...currentSettings, ...settings },
      });
    } catch (err) {
      console.error('Update settings error:', err);
    }
  }, [roomCode, roomData]);

  // デバッグ用: テストプレイヤーを追加
  const addTestPlayer = useCallback(async () => {
    if (!roomCode || !roomData) return;

    const players = roomData.gameState.players;
    if (players.length >= 5) return;

    // 既存のテストプレイヤー数をカウント
    const testPlayerCount = players.filter(p => p.name.startsWith('テスト')).length;
    const testNumber = testPlayerCount + 1;

    const testPlayer = createInitialPlayer(
      `test-${Date.now()}-${testNumber}`,
      `テスト${testNumber}`
    );

    try {
      await update(ref(db, `moji-hunt-rooms/${roomCode}/gameState`), {
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
