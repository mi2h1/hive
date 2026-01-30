import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { ThreeDDice, ThreeDDiceRollEvent, type IRoll } from 'dddice-js';

// dddice APIキー
const DDDICE_API_KEY = 'lu5TTPrLRZ4JcL2t7PwE9xBnkdltDqhlwyk33XnUdb7bd065';
const DICE_THEME = 'untitled-dice-mkhmye02';

interface DiceRollerProps {
  isHost: boolean;
  dddiceRoomSlug: string | null;
  onDddiceRoomCreated: (slug: string) => void;
  onRollComplete: (die1: number, die2: number) => void;
  isMyTurn: boolean;
  onStartRoll: () => void;
  showButton: boolean;
  rollingPlayerId: string | null;
  onConnected?: () => void; // dddice接続完了時のコールバック
}

// 外部からロールをトリガーするためのハンドル
export interface DiceRollerHandle {
  triggerRoll: () => void;
}

export const DiceRoller = forwardRef<DiceRollerHandle, DiceRollerProps>(({
  isHost,
  dddiceRoomSlug,
  onDddiceRoomCreated,
  onRollComplete,
  isMyTurn,
  onStartRoll,
  showButton,
  rollingPlayerId,
  onConnected,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dddiceRef = useRef<ThreeDDice | null>(null);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('ダイスを準備中...');
  const [webglError, setWebglError] = useState(false);
  const lastRollUuid = useRef<string | null>(null);
  const isInitialized = useRef(false);
  const isSettingUpRoom = useRef(false);
  const onRollCompleteRef = useRef(onRollComplete);
  // 自分がロール中かどうかを追跡（イベントハンドラ内で参照）
  const iAmRollingRef = useRef(false);
  // このロールセッションで既に結果を報告したかどうか
  const hasReportedResultRef = useRef(false);

  // コールバックを常に最新に保つ
  useEffect(() => {
    onRollCompleteRef.current = onRollComplete;
  }, [onRollComplete]);

  // 誰かがロールを開始したらダイスをクリア
  useEffect(() => {
    if (rollingPlayerId && dddiceRef.current) {
      dddiceRef.current.clear();
    }
  }, [rollingPlayerId]);

  // dddice 初期化
  useEffect(() => {
    if (!canvasRef.current || isInitialized.current) return;
    isInitialized.current = true;

    const initDddice = async () => {
      try {
        setConnectionStatus('ダイスを準備中...');

        // WebGL利用可能チェック
        if (!ThreeDDice.isWebGLAvailable()) {
          console.error('WebGL is not available');
          setWebglError(true);
          setConnectionStatus('WebGLが利用できません');
          // WebGLなしでもゲームを続行できるようにする
          setIsSdkReady(true);
          onConnected?.();
          return;
        }

        // ダイスサイズを大きく設定
        const dddice = new ThreeDDice(canvasRef.current!, DDDICE_API_KEY, {
          dice: {
            size: 2.5, // さらに大きく
          },
        });
        dddiceRef.current = dddice;

        // ロール完了イベントをリッスン
        dddice.on(ThreeDDiceRollEvent.RollFinished, (roll: IRoll) => {
          // 同じロールを複数回処理しない
          if (lastRollUuid.current === roll.uuid) return;
          lastRollUuid.current = roll.uuid;

          // 自分がロールした場合のみゲーム状態を更新
          // 他のプレイヤーのロールはアニメーションだけ見る
          // 既に結果を報告済みなら二重処理しない
          if (iAmRollingRef.current && !hasReportedResultRef.current) {
            const dice = roll.values || [];
            if (dice.length >= 2) {
              const die1 = dice[0]?.value ?? 1;
              const die2 = dice[1]?.value ?? 1;
              hasReportedResultRef.current = true; // 結果報告済みフラグを立てる
              onRollCompleteRef.current(die1, die2);
            }
            iAmRollingRef.current = false;
          }
          setIsRolling(false);
        });

        // SDK開始
        await dddice.start();

        // dddice内部のaudioをミュート（privateプロパティに直接アクセス）
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dddiceAny = dddice as any;
        if (dddiceAny.audioListener) {
          // Three.jsのAudioListenerでマスターボリュームを0に
          dddiceAny.audioListener.setMasterVolume(0);
        }

        // カメラコントロールを無効化（ドラッグ/タッチで視点変更させない）
        dddice.controlsEnabled = false;

        // テーマをプリロード（ディレイ軽減）
        try {
          const theme = await dddice.api?.theme?.get(DICE_THEME);
          if (theme?.data) {
            dddice.loadTheme(theme.data);
            // テーマリソースもプリロード
            dddice.loadThemeResources(DICE_THEME);
          }
        } catch {
          // テーマ取得失敗は無視
        }

        setConnectionStatus('準備完了');
        setIsSdkReady(true);
      } catch (err) {
        console.error('dddice initialization error:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('Error details:', errorMessage);

        // WebGLエラーの場合はフォールバックモードで続行
        if (errorMessage.includes('WebGL')) {
          setWebglError(true);
          setConnectionStatus('3Dダイスが利用できません');
          // WebGLなしでもゲームを続行できるようにする
          setIsSdkReady(true);
          onConnected?.();
        } else {
          setConnectionStatus(`準備に失敗しました: ${errorMessage.slice(0, 50)}`);
        }
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
    // SDK未初期化 or 接続済みならスキップ
    if (!isSdkReady || isConnected) return;

    const dddice = dddiceRef.current;
    if (!dddice) return;

    // ホストでスラッグがない → ルーム作成
    // スラッグがある → 参加
    // どちらでもない → 待機
    const shouldCreateRoom = isHost && !dddiceRoomSlug;
    const shouldJoinRoom = !!dddiceRoomSlug;

    if (!shouldCreateRoom && !shouldJoinRoom) {
      setConnectionStatus('他のプレイヤーを待っています...');
      return;
    }

    // 既に処理中なら重複実行を防ぐ
    if (isSettingUpRoom.current) return;
    isSettingUpRoom.current = true;

    const setupRoom = async () => {
      try {
        if (shouldCreateRoom) {
          // ホスト: 新しいルームを作成
          setConnectionStatus('ダイスフィールドを準備中...');

          const response = await dddice.api?.room?.create();
          if (response?.data?.slug) {
            const newSlug = response.data.slug;
            const room = response.data;

            // ダイス音を無効化（自分のparticipant設定を更新）
            const myParticipant = room.participants?.[0];
            if (myParticipant?.id) {
              try {
                await dddice.api?.room?.updateParticipant(newSlug, myParticipant.id, {
                  settings: { roll: { disableShakingSound: true } }
                } as Partial<typeof myParticipant>);
              } catch {
                // 設定更新失敗は無視
              }
            }

            // Firebaseにスラッグを保存
            onDddiceRoomCreated(newSlug);

            // ルームに接続
            setConnectionStatus('接続中...');
            dddice.connect(newSlug);
            setIsConnected(true);
            setConnectionStatus('接続完了');
            onConnected?.();
          } else {
            setConnectionStatus('準備に失敗しました');
            isSettingUpRoom.current = false;
          }
        } else if (shouldJoinRoom && dddiceRoomSlug) {
          // 参加者: 既存のルームに参加
          setConnectionStatus('参加中...');

          try {
            const joinResponse = await dddice.api?.room?.join(dddiceRoomSlug);

            // ダイス音を無効化（自分のparticipant設定を更新）
            const participants = joinResponse?.data?.participants || [];
            const myParticipant = participants[participants.length - 1]; // 最後に参加した人が自分
            if (myParticipant?.id) {
              try {
                await dddice.api?.room?.updateParticipant(dddiceRoomSlug, myParticipant.id, {
                  settings: { roll: { disableShakingSound: true } }
                } as Partial<typeof myParticipant>);
              } catch {
                // 設定更新失敗は無視
              }
            }
          } catch (joinErr) {
            // 既に参加している場合はエラーを無視するが、ログは出す
            console.warn('Room join warning:', joinErr);
          }

          // WebSocket接続
          dddice.connect(dddiceRoomSlug);
          setIsConnected(true);
          setConnectionStatus('接続完了');
          onConnected?.();
        }
      } catch (err) {
        console.error('Room setup error:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('Room setup error details:', errorMessage);
        setConnectionStatus(`接続に失敗しました: ${errorMessage.slice(0, 50)}`);
        isSettingUpRoom.current = false;
      }
    };

    setupRoom();
  }, [isSdkReady, isHost, dddiceRoomSlug, isConnected, onDddiceRoomCreated, onConnected]);

  // ダイスを振る
  const handleRoll = useCallback(async () => {
    // WebGLフォールバックモード: 3Dなしでランダムダイスを生成
    if (webglError) {
      onStartRoll();
      setIsRolling(true);

      // アニメーション風に少し待つ
      setTimeout(() => {
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        onRollComplete(die1, die2);
        setIsRolling(false);
      }, 1000);
      return;
    }

    if (!dddiceRef.current || !isConnected || isRolling || !dddiceRoomSlug) return;

    onStartRoll();
    setIsRolling(true);
    iAmRollingRef.current = true; // 自分がロール中フラグを立てる
    hasReportedResultRef.current = false; // 結果報告済みフラグをリセット

    try {
      // 2つのd6を振る（クリアは RollStarted イベントで全員同期される）
      await dddiceRef.current.roll([
        { theme: DICE_THEME, type: 'd6' },
        { theme: DICE_THEME, type: 'd6' },
      ], { room: dddiceRoomSlug });
    } catch (err) {
      console.error('Roll error:', err);
      setIsRolling(false);
      iAmRollingRef.current = false;
      hasReportedResultRef.current = false;
    }
  }, [webglError, isConnected, isRolling, onStartRoll, dddiceRoomSlug, onRollComplete]);

  // 外部からロールをトリガーするためのハンドルを公開
  useImperativeHandle(ref, () => ({
    triggerRoll: () => {
      handleRoll();
    },
  }), [handleRoll]);

  return (
    <div className="relative w-full h-64">
      {/* フェルト部分 */}
      <div
        className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 overflow-hidden shadow-xl"
        style={{
          boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.4), inset 0 -2px 8px rgba(255,255,255,0.1)',
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block', touchAction: 'none' }}
        />
      </div>

      {/* WebGLフォールバック表示 */}
      {webglError && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
          <div className="text-center">
            <p className="text-amber-400 text-sm mb-2">3Dダイスが利用できません</p>
            <p className="text-slate-400 text-xs">（他のタブを閉じると改善する場合があります）</p>
          </div>
        </div>
      )}

      {/* 接続中表示 */}
      {!isConnected && !webglError && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
          <p className="text-amber-400 animate-pulse">{connectionStatus}</p>
        </div>
      )}

      {/* ボタン表示 */}
      {showButton && (isConnected || webglError) && isMyTurn && !isRolling && (
        <button
          onClick={handleRoll}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 px-8 py-3
            bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600
            rounded-full text-white font-bold text-lg transition-all shadow-lg
            border-2 border-amber-300/30"
        >
          ダイスを振る
        </button>
      )}

      {/* ロール中表示 */}
      {isRolling && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <p className="text-amber-300 animate-pulse font-bold">ダイスを振っています...</p>
        </div>
      )}
    </div>
  );
});

DiceRoller.displayName = 'DiceRoller';
