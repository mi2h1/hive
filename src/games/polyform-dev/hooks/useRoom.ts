import { useState, useEffect, useCallback } from 'react';
import { ref, set, onValue, off, update, remove, get, onDisconnect } from 'firebase/database';
import { db } from '../../../lib/firebase';
import type { GameState, Player, GameSettings, PieceInstance, WorkingPuzzle, PlacedPiece, CompletedPuzzle } from '../types/game';
import { INITIAL_PIECE_STOCK } from '../data/pieces';
import { WHITE_PUZZLES, BLACK_PUZZLES } from '../data/puzzles';

// Firebaseパス（開発用）
const FIREBASE_PATH = 'polyform-dev-rooms';

// ルームデータ
export interface RoomData {
  hostId: string;
  gameState: GameState;
  createdAt: number;
}

// デフォルト設定
export const DEFAULT_SETTINGS: GameSettings = {
  scoreVisibility: 'public', // デフォルトは公開
};

// 古いルームを削除（24時間以上前のルーム）
const cleanupOldRooms = async () => {
  try {
    const roomsRef = ref(db, FIREBASE_PATH);
    const snapshot = await get(roomsRef);
    if (!snapshot.exists()) return;

    const rooms = snapshot.val();
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;

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
        deletePromises.push(remove(ref(db, `${FIREBASE_PATH}/${code}`)));
      }
    }

    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`Cleaned up ${deletePromises.length} old polyform rooms`);
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

// シャッフル関数
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// 初期プレイヤーを作成
export const createInitialPlayer = (id: string, name: string): Player => {
  // 初期ピース: Lv1 x1, Lv2 x1
  const initialPieces: PieceInstance[] = [
    { id: `${id}-piece-1`, type: 'dot', rotation: 0 },
    { id: `${id}-piece-2`, type: 'i2', rotation: 0 },
  ];

  return {
    id,
    name,
    pieces: initialPieces,
    workingPuzzles: [],
    completedPuzzles: [],
    completedPuzzleIds: [],
    completedWhite: 0,
    completedBlack: 0,
    score: 0,
    remainingActions: 3,
    usedMasterAction: false,
    finishingDone: false,
    finishingPenalty: 0,
  };
};

// 初期ゲーム状態を作成
export const createInitialGameState = (settings: GameSettings = DEFAULT_SETTINGS): GameState => ({
  phase: 'waiting',
  players: [],
  playerOrder: [],
  currentPlayerIndex: 0,
  hostId: '',
  whitePuzzleDeck: [],
  blackPuzzleDeck: [],
  whitePuzzleMarket: [],
  blackPuzzleMarket: [],
  pieceStock: { ...INITIAL_PIECE_STOCK },
  finalRound: false,
  finalRoundTurnNumber: null,
  currentTurnNumber: 1,
  settings,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// ゲーム初期化（パズルシャッフル等）
const initializeGame = (players: Player[]): Partial<GameState> => {
  const shuffledWhite = shuffleArray(WHITE_PUZZLES.map(p => p.id));
  const shuffledBlack = shuffleArray(BLACK_PUZZLES.map(p => p.id));

  // プレイヤー人数に応じた黒パズル枚数（2人:12枚、3人:14枚、4人:16枚）
  const blackPuzzleCount = players.length === 2 ? 12 : players.length === 3 ? 14 : 16;
  const selectedBlack = shuffledBlack.slice(0, blackPuzzleCount);

  // プレイヤー順をシャッフル
  const playerOrder = shuffleArray(players.map(p => p.id));

  // 各プレイヤーのピースストックから初期ピースを引く
  const pieceStock = { ...INITIAL_PIECE_STOCK };
  pieceStock.dot -= players.length;
  pieceStock.i2 -= players.length;

  // プレイヤーのアクションをリセット
  const resetPlayers = players.map(p => ({
    ...p,
    remainingActions: 3,
    usedMasterAction: false,
  }));

  return {
    phase: 'playing',
    players: resetPlayers,
    playerOrder,
    currentPlayerIndex: 0,
    whitePuzzleDeck: shuffledWhite.slice(4),
    blackPuzzleDeck: selectedBlack.slice(4),
    whitePuzzleMarket: shuffledWhite.slice(0, 4),
    blackPuzzleMarket: selectedBlack.slice(0, 4),
    pieceStock,
    finalRound: false,
    finalRoundTurnNumber: null,
    currentTurnNumber: 1,
    updatedAt: Date.now(),
  };
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

  // プレゼンス（接続状態）の設定 + ハートビート
  useEffect(() => {
    if (!roomCode || !playerId) return;

    const roomRef = ref(db, `${FIREBASE_PATH}/${roomCode}`);
    const myPresenceRef = ref(db, `${FIREBASE_PATH}/${roomCode}/presence/${playerId}`);

    const setupPresence = async () => {
      await set(myPresenceRef, Date.now()); // タイムスタンプで更新
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

    // ハートビート: 15秒ごとにプレゼンスを更新してFirebase接続を維持
    const heartbeatInterval = setInterval(() => {
      set(myPresenceRef, Date.now()).catch(console.error);
    }, 15000);

    return () => {
      clearInterval(heartbeatInterval);
      remove(myPresenceRef);
      onDisconnect(myPresenceRef).cancel();
      onDisconnect(roomRef).cancel();
    };
  }, [roomCode, playerId]);

  // presenceの変更を監視
  // 注意: ゲーム進行中はプレイヤー削除をスキップ（競合防止）
  useEffect(() => {
    if (!roomCode || !playerId) return;

    const presenceListRef = ref(db, `${FIREBASE_PATH}/${roomCode}/presence`);
    const roomRef = ref(db, `${FIREBASE_PATH}/${roomCode}`);

    onValue(presenceListRef, async (snapshot) => {
      const presenceData = snapshot.val() || {};
      const onlinePlayerIds = Object.keys(presenceData);

      const roomSnapshot = await get(roomRef);
      if (!roomSnapshot.exists()) return;

      const room = roomSnapshot.val();
      const gamePhase = room.gameState?.phase;

      // ゲーム進行中（waiting以外）はプレイヤー削除をスキップ
      // これにより、一時的な接続問題でゲームが壊れることを防ぐ
      if (gamePhase && gamePhase !== 'waiting') {
        return;
      }

      const players = normalizeArray<Player>(room.gameState?.players);
      const currentHostId = room.hostId;

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

    const roomRef = ref(db, `${FIREBASE_PATH}/${roomCode}`);

    onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const gs = data.gameState;

        // プレイヤーデータの正規化（ネストした配列も含む）
        const rawPlayers = normalizeArray<Player>(gs?.players);
        const normalizedPlayers = rawPlayers.map((p): Player => ({
          ...p,
          pieces: normalizeArray<PieceInstance>(p.pieces),
          workingPuzzles: normalizeArray<WorkingPuzzle>(p.workingPuzzles).map((wp): WorkingPuzzle => ({
            ...wp,
            placedPieces: normalizeArray<PlacedPiece>(wp.placedPieces),
          })),
          completedPuzzles: normalizeArray<CompletedPuzzle>(p.completedPuzzles).map((cp): CompletedPuzzle => ({
            ...cp,
            placedPieces: normalizeArray<PlacedPiece>(cp.placedPieces),
          })),
          completedPuzzleIds: normalizeArray<string>(p.completedPuzzleIds),
        }));

        const normalizedData: RoomData = {
          ...data,
          gameState: {
            ...gs,
            players: normalizedPlayers,
            playerOrder: normalizeArray<string>(gs?.playerOrder),
            whitePuzzleDeck: normalizeArray<string>(gs?.whitePuzzleDeck),
            blackPuzzleDeck: normalizeArray<string>(gs?.blackPuzzleDeck),
            whitePuzzleMarket: normalizeArray<string>(gs?.whitePuzzleMarket),
            blackPuzzleMarket: normalizeArray<string>(gs?.blackPuzzleMarket),
            settings: gs?.settings ?? DEFAULT_SETTINGS,
            pieceStock: gs?.pieceStock ?? INITIAL_PIECE_STOCK,
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
      // クリーンアップはバックグラウンドで実行（ブロックしない）
      cleanupOldRooms().catch(console.error);

      const code = generateRoomCode();
      const roomRef = ref(db, `${FIREBASE_PATH}/${code}`);

      const initialPlayer = createInitialPlayer(playerId, playerName);
      const initialGameState = createInitialGameState();

      const newRoom: RoomData = {
        hostId: playerId,
        gameState: {
          ...initialGameState,
          hostId: playerId,
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
      const roomRef = ref(db, `${FIREBASE_PATH}/${upperCode}`);

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

          if (players.length >= 4) {
            setError('ルームが満員です（最大4人）');
            setIsLoading(false);
            resolve(false);
            return;
          }

          const newPlayer = createInitialPlayer(playerId, playerName);
          const updatedPlayers = [...players, newPlayer];

          await update(ref(db, `${FIREBASE_PATH}/${upperCode}/gameState`), {
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
        await remove(ref(db, `${FIREBASE_PATH}/${roomCode}`));
      } else {
        const updatedPlayers = roomData.gameState.players.filter(p => p.id !== playerId);

        if (updatedPlayers.length === 0) {
          await remove(ref(db, `${FIREBASE_PATH}/${roomCode}`));
        } else {
          await update(ref(db, `${FIREBASE_PATH}/${roomCode}/gameState`), {
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

  // ゲーム開始
  const startGame = useCallback(async () => {
    if (!roomCode || !roomData) return;

    try {
      const gameInit = initializeGame(roomData.gameState.players);
      await update(ref(db, `${FIREBASE_PATH}/${roomCode}/gameState`), gameInit);
    } catch (err) {
      console.error('Start game error:', err);
      setError('ゲーム開始に失敗しました');
    }
  }, [roomCode, roomData]);

  // ゲーム状態を更新（リトライ付き）
  const updateGameState = useCallback(async (newState: Partial<GameState>, retryCount = 0) => {
    if (!roomCode) return;

    const maxRetries = 3;
    const gameStateRef = ref(db, `${FIREBASE_PATH}/${roomCode}/gameState`);

    try {
      // まず部屋が存在するか確認
      const roomSnapshot = await get(ref(db, `${FIREBASE_PATH}/${roomCode}`));
      if (!roomSnapshot.exists()) {
        console.warn('Room no longer exists, skipping update');
        setError('ルームが見つかりません');
        return;
      }

      await update(gameStateRef, {
        ...newState,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error(`Update game state error (attempt ${retryCount + 1}):`, err);

      // リトライ
      if (retryCount < maxRetries) {
        console.log(`Retrying update... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 500 * (retryCount + 1)));
        return updateGameState(newState, retryCount + 1);
      }

      setError('状態の更新に失敗しました。ページを再読み込みしてください。');
    }
  }, [roomCode]);

  // 設定を更新
  const updateSettings = useCallback(async (newSettings: Partial<GameSettings>) => {
    if (!roomCode || !roomData) return;

    try {
      const currentSettings = roomData.gameState.settings ?? DEFAULT_SETTINGS;
      await update(ref(db, `${FIREBASE_PATH}/${roomCode}/gameState`), {
        settings: { ...currentSettings, ...newSettings },
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.error('Update settings error:', err);
      setError('設定の更新に失敗しました');
    }
  }, [roomCode, roomData]);

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
      await update(ref(db, `${FIREBASE_PATH}/${roomCode}/gameState`), {
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
    startGame,
    updateGameState,
    updateSettings,
    addTestPlayer,
  };
};
