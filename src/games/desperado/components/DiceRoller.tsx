import { useRef, useEffect, useCallback, useState } from 'react';
import { ThreeDDice, ThreeDDiceRollEvent, type IRoll } from 'dddice-js';

// dddice APIキー
const DDDICE_API_KEY = 'lu5TTPrLRZ4JcL2t7PwE9xBnkdltDqhlwyk33XnUdb7bd065';

interface DiceRollerProps {
  isHost: boolean;
  dddiceRoomSlug: string | null;
  onDddiceRoomCreated: (slug: string) => void;
  onRollComplete: (die1: number, die2: number) => void;
  isMyTurn: boolean;
  onStartRoll: () => void;
  showButton: boolean;
}

export const DiceRoller = ({
  isHost,
  dddiceRoomSlug,
  onDddiceRoomCreated,
  onRollComplete,
  isMyTurn,
  onStartRoll,
  showButton,
}: DiceRollerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dddiceRef = useRef<ThreeDDice | null>(null);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('初期化中...');
  const hasHandledRoll = useRef(false);
  const isInitialized = useRef(false);
  const isSettingUpRoom = useRef(false);
  const onRollCompleteRef = useRef(onRollComplete);

  // コールバックを常に最新に保つ
  useEffect(() => {
    onRollCompleteRef.current = onRollComplete;
  }, [onRollComplete]);

  // dddice 初期化
  useEffect(() => {
    if (!canvasRef.current || isInitialized.current) return;
    isInitialized.current = true;

    const initDddice = async () => {
      try {
        setConnectionStatus('SDK初期化中...');
        const dddice = new ThreeDDice(canvasRef.current!, DDDICE_API_KEY);
        dddiceRef.current = dddice;

        // ロール完了イベントをリッスン
        dddice.on(ThreeDDiceRollEvent.RollFinished, (roll: IRoll) => {
          if (hasHandledRoll.current) return;
          hasHandledRoll.current = true;

          // d6のダイスの結果を取得
          const dice = roll.values || [];
          if (dice.length >= 2) {
            const die1 = dice[0]?.value ?? 1;
            const die2 = dice[1]?.value ?? 1;
            onRollCompleteRef.current(die1, die2);
          }
          setIsRolling(false);
        });

        // APIキーで開始（ゲストユーザー作成は不要）
        await dddice.start();
        console.log('dddice SDK started with API key');

        setConnectionStatus('SDK起動完了');
        setIsSdkReady(true);
      } catch (err) {
        console.error('dddice initialization error:', err);
        setConnectionStatus('SDK初期化エラー');
      }
    };

    initDddice();

    return () => {
      if (dddiceRef.current) {
        dddiceRef.current.stop();
        dddiceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 一度だけ初期化

  // ルームの作成または参加
  useEffect(() => {
    console.log('[DiceRoller] useEffect triggered:', {
      isSdkReady,
      isConnected,
      isHost,
      dddiceRoomSlug,
      hasDddice: !!dddiceRef.current,
    });

    // SDK未初期化 or 接続済み or 処理中ならスキップ
    if (!isSdkReady || isConnected) return;

    const dddice = dddiceRef.current;
    if (!dddice) return;

    // ホストでスラッグがない → ルーム作成
    // スラッグがある → 参加
    // どちらでもない → 待機（何もしない）
    const shouldCreateRoom = isHost && !dddiceRoomSlug;
    const shouldJoinRoom = !!dddiceRoomSlug;
    console.log('[DiceRoller] shouldCreateRoom:', shouldCreateRoom, 'shouldJoinRoom:', shouldJoinRoom);

    if (!shouldCreateRoom && !shouldJoinRoom) {
      setConnectionStatus('ホストがルームを作成するのを待っています...');
      return;
    }

    // 既に処理中なら重複実行を防ぐ
    if (isSettingUpRoom.current) return;
    isSettingUpRoom.current = true;

    const setupRoom = async () => {
      try {
        if (shouldCreateRoom) {
          // ホスト: 新しいルームを作成
          setConnectionStatus('ルーム作成中...');
          console.log('Creating dddice room...');

          const response = await dddice.api?.room?.create();
          if (response?.data?.slug) {
            const newSlug = response.data.slug;
            console.log('dddice room created:', newSlug);

            // Firebaseにスラッグを保存
            onDddiceRoomCreated(newSlug);

            // ルームに接続
            setConnectionStatus('ルームに接続中...');
            dddice.connect(newSlug);
            setIsConnected(true);
            setConnectionStatus('接続完了');
            console.log('dddice connected to room:', newSlug);
          } else {
            console.error('Failed to create room - no slug returned');
            setConnectionStatus('ルーム作成失敗');
            isSettingUpRoom.current = false;
          }
        } else if (shouldJoinRoom && dddiceRoomSlug) {
          // 参加者: 既存のルームに参加
          setConnectionStatus('ルームに参加中...');
          console.log('Joining dddice room:', dddiceRoomSlug);

          try {
            // まずルームに参加（パーティシパントとして登録）
            await dddice.api?.room?.join(dddiceRoomSlug);
            console.log('Joined room as participant');
          } catch (joinErr) {
            // 既に参加している場合はエラーを無視
            console.log('Join room result:', joinErr);
          }

          // WebSocket接続
          dddice.connect(dddiceRoomSlug);
          setIsConnected(true);
          setConnectionStatus('接続完了');
          console.log('dddice connected to room:', dddiceRoomSlug);
        }
      } catch (err) {
        console.error('Room setup error:', err);
        setConnectionStatus('接続エラー');
        isSettingUpRoom.current = false;
      }
    };

    setupRoom();
  }, [isSdkReady, isHost, dddiceRoomSlug, isConnected, onDddiceRoomCreated]);

  // ダイスを振る
  const handleRoll = useCallback(async () => {
    if (!dddiceRef.current || !isConnected || isRolling || !dddiceRoomSlug) return;

    onStartRoll();
    setIsRolling(true);
    hasHandledRoll.current = false;

    try {
      console.log('Rolling dice in room:', dddiceRoomSlug);
      // 2つのd6を振る（ルームを明示的に指定）
      await dddiceRef.current.roll([
        { theme: 'dddice-standard', type: 'd6' },
        { theme: 'dddice-standard', type: 'd6' },
      ], { room: dddiceRoomSlug });
    } catch (err: unknown) {
      console.error('Roll error:', err);
      // エラーレスポンスの詳細を表示
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: unknown; status?: number; headers?: unknown } };
        console.error('Response data (full):', JSON.stringify(axiosErr.response?.data, null, 2));
        console.error('Response status:', axiosErr.response?.status);
      }
      setIsRolling(false);
    }
  }, [isConnected, isRolling, onStartRoll, dddiceRoomSlug]);

  return (
    <div className="relative w-full h-64 bg-slate-900 rounded-xl overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />

      {/* 接続中表示 */}
      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <p className="text-amber-400 animate-pulse">{connectionStatus}</p>
        </div>
      )}

      {/* ボタン表示 */}
      {showButton && isConnected && isMyTurn && !isRolling && (
        <button
          onClick={handleRoll}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-8 py-3
            bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600
            rounded-lg text-white font-bold text-lg transition-all shadow-lg"
        >
          ダイスを振る
        </button>
      )}

      {/* ロール中表示 */}
      {isRolling && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <p className="text-amber-400 animate-pulse">ダイスを振っています...</p>
        </div>
      )}
    </div>
  );
};
