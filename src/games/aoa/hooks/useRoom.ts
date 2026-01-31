import { useState, useEffect, useCallback } from 'react';
import { ref, set, onValue, off, update, remove, get, onDisconnect } from 'firebase/database';
import { db } from '../../../lib/firebase';
import type { GameState, Player, TrapType, RuleSet, RuleSetType } from '../types/game';
import { RULE_SETS } from '../types/game';

// 古いルームを削除（24時間以上前のルーム）
const cleanupOldRooms = async () => {
  try {
    const roomsRef = ref(db, 'rooms');
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

      // Firebaseは配列をオブジェクトに変換することがあるので両方対応
      let playerCount = 0;
      if (Array.isArray(players)) {
        playerCount = players.length;
      } else if (players && typeof players === 'object') {
        playerCount = Object.keys(players).length;
      }

      // 24時間以上前 または プレイヤーが0人のルームを削除
      if (now - createdAt > maxAge || playerCount === 0) {
        deletePromises.push(remove(ref(db, `rooms/${code}`)));
      }
    }

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`Cleaned up ${deletePromises.length} old aoa rooms`);
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

// 初期の罠カウント（アトランティス用 + インカ用）
const createInitialTrapCounts = (): Record<TrapType, number> => ({
  // アトランティス用
  shark: 0,
  light: 0,
  rope: 0,
  bombe: 0,
  pressure: 0,
  // インカ用
  scorpion: 0,
  zombi: 0,
  snake: 0,
  fire: 0,
  rock: 0,
});

// 初期ゲーム状態
const createInitialGameState = (): Omit<GameState, 'players'> => ({
  phase: 'waiting',
  round: 1,
  turn: 0,
  deck: [],
  field: [],
  remainderGems: 0,
  trapCounts: createInitialTrapCounts(),
  currentEvent: null,
  relicsOnField: 0,
  comboCount: 0,
});

export interface RoomData {
  hostId: string;
  gameState: GameState;
  ruleSet: RuleSet;
  createdAt: number;
}

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

  // プレゼンス（接続状態）の設定とホスト切断時の部屋削除
  useEffect(() => {
    if (!roomCode || !playerId) {
      return;
    }

    const roomRef = ref(db, `rooms/${roomCode}`);
    const myPresenceRef = ref(db, `rooms/${roomCode}/presence/${playerId}`);

    const setupPresence = async () => {
      // オンラインとしてマーク
      await set(myPresenceRef, true);

      // 切断時に自動でpresenceを削除
      await onDisconnect(myPresenceRef).remove();

      // ホストの場合は切断時に部屋全体を削除
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
      // コンポーネントアンマウント時にpresenceを削除
      remove(myPresenceRef);
      // onDisconnectをキャンセル
      onDisconnect(myPresenceRef).cancel();
      onDisconnect(roomRef).cancel();
    };
  }, [roomCode, playerId]);

  // presenceの変更を監視してプレイヤーを削除・ホスト引き継ぎ
  useEffect(() => {
    if (!roomCode || !playerId) return;

    const presenceListRef = ref(db, `rooms/${roomCode}/presence`);
    const roomRef = ref(db, `rooms/${roomCode}`);

    onValue(presenceListRef, async (snapshot) => {
      const presenceData = snapshot.val() || {};
      const onlinePlayerIds = Object.keys(presenceData);

      // 現在のルームデータを取得
      const roomSnapshot = await get(roomRef);
      if (!roomSnapshot.exists()) return;

      const room = roomSnapshot.val();
      const players = normalizeArray<Player>(room.gameState?.players);
      const currentHostId = room.hostId;

      // オフラインのプレイヤーを特定
      const offlinePlayers = players.filter(p => !onlinePlayerIds.includes(p.id));

      if (offlinePlayers.length > 0) {
        // オフラインプレイヤーを削除
        const remainingPlayers = players.filter(p => onlinePlayerIds.includes(p.id));

        if (remainingPlayers.length === 0) {
          // 全員いなくなったら部屋を削除
          await remove(roomRef);
        } else {
          // プレイヤーリストを更新
          const updates: Record<string, unknown> = {
            'gameState/players': remainingPlayers,
          };

          // ホストがオフラインになった場合は引き継ぎ
          if (!onlinePlayerIds.includes(currentHostId)) {
            const newHostId = remainingPlayers[0].id;
            updates['hostId'] = newHostId;

            // 自分が新しいホストになった場合、onDisconnectで部屋削除を設定
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

    const roomRef = ref(db, `rooms/${roomCode}`);

    onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Firebaseから取得したデータの配列を正規化
        const gs = data.gameState;

        // returnResolve内の配列を正規化
        let normalizedReturnResolve = gs?.returnResolve;
        if (normalizedReturnResolve) {
          const normalizePlayer = (p: Record<string, unknown>) => ({
            ...p,
            rolledRelics: Array.isArray(p.rolledRelics) ? p.rolledRelics : p.rolledRelics ? Object.values(p.rolledRelics as object) : [],
          });
          const rawPlayers = normalizedReturnResolve.returningPlayers;
          normalizedReturnResolve = {
            ...normalizedReturnResolve,
            returningPlayers: Array.isArray(rawPlayers)
              ? rawPlayers.map(normalizePlayer)
              : rawPlayers
                ? (Object.values(rawPlayers) as Record<string, unknown>[]).map(normalizePlayer)
                : [],
          };
        }

        // relicRoll内の配列を正規化
        let normalizedRelicRoll = gs?.relicRoll;
        if (normalizedRelicRoll) {
          normalizedRelicRoll = {
            ...normalizedRelicRoll,
            rolledValues: Array.isArray(normalizedRelicRoll.rolledValues)
              ? normalizedRelicRoll.rolledValues
              : normalizedRelicRoll.rolledValues
                ? Object.values(normalizedRelicRoll.rolledValues)
                : [],
          };
        }

        // players内のrelics配列を正規化
        const normalizedPlayers = (Array.isArray(gs?.players) ? gs.players : gs?.players ? Object.values(gs.players) : [])
          .map((p: Record<string, unknown>) => ({
            ...p,
            relics: Array.isArray(p.relics) ? p.relics : p.relics ? Object.values(p.relics) : [],
          }));

        const normalizedData: RoomData = {
          ...data,
          gameState: {
            ...gs,
            players: normalizedPlayers,
            deck: Array.isArray(gs?.deck)
              ? gs.deck
              : gs?.deck
                ? Object.values(gs.deck)
                : [],
            field: Array.isArray(gs?.field)
              ? gs.field
              : gs?.field
                ? Object.values(gs.field)
                : [],
            returnResolve: normalizedReturnResolve,
            relicRoll: normalizedRelicRoll,
            mysteryReveal: gs?.mysteryReveal ? {
              ...gs.mysteryReveal,
              mysteryIndices: Array.isArray(gs.mysteryReveal.mysteryIndices)
                ? gs.mysteryReveal.mysteryIndices
                : gs.mysteryReveal.mysteryIndices
                  ? Object.values(gs.mysteryReveal.mysteryIndices)
                  : [],
            } : null,
            cardDraw: gs?.cardDraw ?? null,
          },
          // ルールセットがない場合はデフォルト（atlantis）を使用
          ruleSet: data.ruleSet ?? RULE_SETS.atlantis,
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

  // 注: onDisconnectは接続タイムアウトで誤発動するため無効化
  // 手動でleaveRoom()を呼び出して退出する

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
      const roomRef = ref(db, `rooms/${code}`);

      const initialPlayer: Player = {
        id: playerId,
        name: playerName,
        confirmedGems: 0,
        pendingGems: 0,
        isExploring: true,
        hasReturnedThisTurn: false,
        isAllIn: false,
        decision: null,
        relics: [],
      };

      const newRoom: RoomData = {
        hostId: playerId,
        gameState: {
          ...createInitialGameState(),
          players: [initialPlayer],
        },
        ruleSet: RULE_SETS.atlantis, // デフォルトはアトランティスルール
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
      const roomRef = ref(db, `rooms/${upperCode}`);

      // ルームの存在確認
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

          // 既に参加済みかチェック
          const existingPlayer = data.gameState.players.find(p => p.id === playerId);
          if (existingPlayer) {
            setRoomCode(upperCode);
            setIsLoading(false);
            resolve(true);
            return;
          }

          // 新規プレイヤーを追加
          const newPlayer: Player = {
            id: playerId,
            name: playerName,
            confirmedGems: 0,
            pendingGems: 0,
            isExploring: true,
            hasReturnedThisTurn: false,
            isAllIn: false,
            decision: null,
            relics: [],
          };

          const updatedPlayers = [...data.gameState.players, newPlayer];

          await update(ref(db, `rooms/${upperCode}/gameState`), {
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
        await remove(ref(db, `rooms/${roomCode}`));
      } else {
        // プレイヤーの場合は自分を削除
        const updatedPlayers = roomData.gameState.players.filter(p => p.id !== playerId);

        // 最後のプレイヤーが退出した場合はルームを削除
        if (updatedPlayers.length === 0) {
          await remove(ref(db, `rooms/${roomCode}`));
        } else {
          await update(ref(db, `rooms/${roomCode}/gameState`), {
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
      await update(ref(db, `rooms/${roomCode}/gameState`), newState);
    } catch (err) {
      console.error('Update game state error:', err);
      setError('状態の更新に失敗しました');
    }
  }, [roomCode]);

  // プレイヤーの決定を更新
  const updatePlayerDecision = useCallback(async (decision: 'proceed' | 'return') => {
    if (!roomCode || !playerId || !roomData) return;

    try {
      const updatedPlayers = roomData.gameState.players.map(p =>
        p.id === playerId ? { ...p, decision } : p
      );

      await update(ref(db, `rooms/${roomCode}/gameState`), {
        players: updatedPlayers,
      });
    } catch (err) {
      console.error('Update decision error:', err);
    }
  }, [roomCode, playerId, roomData]);

  // デバッグ用: 任意プレイヤーの決定を更新
  const updateAnyPlayerDecision = useCallback(async (targetPlayerId: string, decision: 'proceed' | 'return') => {
    if (!roomCode || !roomData) return;

    try {
      const updatedPlayers = roomData.gameState.players.map(p =>
        p.id === targetPlayerId ? { ...p, decision } : p
      );

      await update(ref(db, `rooms/${roomCode}/gameState`), {
        players: updatedPlayers,
      });
    } catch (err) {
      console.error('Update any player decision error:', err);
    }
  }, [roomCode, roomData]);

  // ルールセットを更新（ホストのみ）
  const updateRuleSet = useCallback(async (ruleSetType: RuleSetType) => {
    if (!roomCode || !roomData) return;

    try {
      await update(ref(db, `rooms/${roomCode}`), {
        ruleSet: RULE_SETS[ruleSetType],
      });
    } catch (err) {
      console.error('Update rule set error:', err);
    }
  }, [roomCode, roomData]);

  // デバッグ用: テストプレイヤーを追加
  const addTestPlayer = useCallback(async () => {
    if (!roomCode || !roomData) return;

    const currentPlayers = roomData.gameState.players;
    if (currentPlayers.length >= 6) return; // 最大6人

    // ユニークなテストプレイヤー名を生成
    const testNumber = currentPlayers.filter(p => p.name.startsWith('Test')).length + 1;
    const testPlayerId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newPlayer: Player = {
      id: testPlayerId,
      name: `Test${testNumber}`,
      confirmedGems: 0,
      pendingGems: 0,
      isExploring: true,
      hasReturnedThisTurn: false,
      isAllIn: false,
      decision: null,
      relics: [],
    };

    try {
      await update(ref(db, `rooms/${roomCode}/gameState`), {
        players: [...currentPlayers, newPlayer],
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
    updatePlayerDecision,
    updateRuleSet,
    // デバッグ用
    addTestPlayer,
    updateAnyPlayerDecision,
  };
};
