import { useRef, useEffect, useCallback, useState } from 'react';
import { ThreeDDice, ThreeDDiceRollEvent, type IRoll } from 'dddice-js';

// dddice APIキー
const DDDICE_API_KEY = 'lu5TTPrLRZ4JcL2t7PwE9xBnkdltDqhlwyk33XnUdb7bd065';

interface DiceRollerProps {
  roomCode: string;
  onRollComplete: (die1: number, die2: number) => void;
  isMyTurn: boolean;
  onStartRoll: () => void;
  showButton: boolean;
}

export const DiceRoller = ({
  roomCode,
  onRollComplete,
  isMyTurn,
  onStartRoll,
  showButton,
}: DiceRollerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dddiceRef = useRef<ThreeDDice | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const hasHandledRoll = useRef(false);

  // dddice 初期化
  useEffect(() => {
    if (!canvasRef.current || dddiceRef.current) return;

    const initDddice = async () => {
      try {
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
            onRollComplete(die1, die2);
          }
          setIsRolling(false);
        });

        // 開始
        await dddice.start();

        // ルームに接続（ルームコードをスラッグとして使用）
        const roomSlug = `desperado-${roomCode.toLowerCase()}`;
        try {
          await dddice.connect(roomSlug);
          setIsConnected(true);
          console.log('dddice connected to room:', roomSlug);
        } catch (err) {
          // ルームが存在しない場合は作成を試みる
          console.log('Room not found, creating...', err);
          try {
            // @ts-expect-error - SDK型定義が不完全な可能性
            await dddice.api?.room?.create({ slug: roomSlug, is_public: false });
            await dddice.connect(roomSlug);
            setIsConnected(true);
            console.log('dddice room created and connected:', roomSlug);
          } catch (createErr) {
            console.error('Failed to create room:', createErr);
          }
        }
      } catch (err) {
        console.error('dddice initialization error:', err);
      }
    };

    initDddice();

    return () => {
      if (dddiceRef.current) {
        dddiceRef.current.stop();
        dddiceRef.current = null;
      }
    };
  }, [roomCode, onRollComplete]);

  // ダイスを振る
  const handleRoll = useCallback(async () => {
    if (!dddiceRef.current || !isConnected || isRolling) return;

    onStartRoll();
    setIsRolling(true);
    hasHandledRoll.current = false;

    try {
      // 2つのd6を振る
      await dddiceRef.current.roll([
        { theme: 'dddice-red', type: 'd6' },
        { theme: 'dddice-red', type: 'd6' },
      ]);
    } catch (err) {
      console.error('Roll error:', err);
      setIsRolling(false);
    }
  }, [isConnected, isRolling, onStartRoll]);

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
          <p className="text-amber-400 animate-pulse">接続中...</p>
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
