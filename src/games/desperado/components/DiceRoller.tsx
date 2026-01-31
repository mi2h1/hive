import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from 'lucide-react';
// dddice-jsは動的インポート（Three.js競合を避けるため）
import type { ThreeDDice as ThreeDDiceType, IRoll } from 'dddice-js';

// ダイスアイコンコンポーネント
const DiceIcon = ({ value, className }: { value: number; className?: string }) => {
  const icons = { 1: Dice1, 2: Dice2, 3: Dice3, 4: Dice4, 5: Dice5, 6: Dice6 };
  const Icon = icons[value as keyof typeof icons] || Dice1;
  return <Icon className={className} />;
};

// dddice APIキー
const DDDICE_API_KEY = 'lu5TTPrLRZ4JcL2t7PwE9xBnkdltDqhlwyk33XnUdb7bd065';
const DICE_THEME = 'untitled-dice-mkhmye02';


interface DiceRollerProps {
  isHost: boolean;
  dddiceRoomSlug: string | null;
  onDddiceRoomCreated: (slug: string) => void;
  onRollComplete: (die1: number, die2: number) => void;
  onStartRoll: () => void;
  rollingPlayerId: string | null;
  onConnected?: () => void; // dddice接続完了時のコールバック
  displayedDice?: { die1: number; die2: number } | null; // 2Dモード: ゲーム状態から取得したダイス結果
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
  onStartRoll,
  rollingPlayerId,
  onConnected,
  displayedDice,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dddiceRef = useRef<ThreeDDiceType | null>(null);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('ダイスを準備中...');
  const [webglError, setWebglError] = useState(false);
  const [fallbackDice, setFallbackDice] = useState<{ die1: number; die2: number } | null>(null);
  const lastRollUuid = useRef<string | null>(null);
  const isInitialized = useRef(false);
  const isSettingUpRoom = useRef(false);
  const onRollCompleteRef = useRef(onRollComplete);
  const onDddiceRoomCreatedRef = useRef(onDddiceRoomCreated);
  const onConnectedRef = useRef(onConnected);
  const isHostRef = useRef(isHost);
  const dddiceRoomSlugRef = useRef(dddiceRoomSlug);
  // 自分がロール中かどうかを追跡（イベントハンドラ内で参照）
  const iAmRollingRef = useRef(false);
  // このロールセッションで既に結果を報告したかどうか
  const hasReportedResultRef = useRef(false);

  // コールバックとpropsを常に最新に保つ
  useEffect(() => {
    onRollCompleteRef.current = onRollComplete;
    onDddiceRoomCreatedRef.current = onDddiceRoomCreated;
    onConnectedRef.current = onConnected;
    isHostRef.current = isHost;
    dddiceRoomSlugRef.current = dddiceRoomSlug;
  }, [onRollComplete, onDddiceRoomCreated, onConnected, isHost, dddiceRoomSlug]);

  // 誰かがロールを開始したらダイスをクリア
  useEffect(() => {
    if (rollingPlayerId) {
      if (dddiceRef.current) {
        dddiceRef.current.clear();
      }
      // 2Dモードの場合もクリア
      if (webglError) {
        setFallbackDice(null);
      }
    }
  }, [rollingPlayerId, webglError]);

  // dddice 初期化
  useEffect(() => {
    if (!canvasRef.current || isInitialized.current) return;
    isInitialized.current = true;

    const initDddice = async () => {
      try {
        setConnectionStatus('ダイスを準備中...');
        console.log('[DiceRoller] Starting initialization...');

        // dddice-jsを動的インポート（Three.js競合を避けるため）
        console.log('[DiceRoller] Loading dddice-js dynamically...');
        const dddiceModule = await import('dddice-js');
        const { ThreeDDice, ThreeDDiceRollEvent } = dddiceModule;

        console.log('[DiceRoller] Creating dddice instance...');

        // ダイスサイズを大きく設定、アウトラインを無効化
        const dddice = new ThreeDDice(canvasRef.current!, DDDICE_API_KEY, {
          dice: {
            size: 2.5,
            drawOutlines: false,
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
        console.log('[DiceRoller] Starting dddice SDK...');
        await dddice.start();
        console.log('[DiceRoller] dddice SDK started successfully');

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
        console.error('[DiceRoller] Initialization error:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error('[DiceRoller] Error details:', errorMessage);

        // 初期化に失敗したら2Dモードにフォールバック
        // ルーム設定はuseEffectに任せる（fallbackスラッグは作らない）
        console.log('[DiceRoller] WebGL failed, will use 2D mode');
        setWebglError(true);
        setConnectionStatus('2Dモードで動作中');
        setIsSdkReady(true);
        // isConnectedは設定しない → ルーム設定effectが実行される
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

    // 自分が2Dモード（WebGL失敗）の場合
    // 他のプレイヤーのWebGL状態に関係なく、独立して2Dモードで動作
    if (webglError) {
      console.log('[DiceRoller] In 2D mode, operating independently');
      setIsConnected(true);
      onConnected?.();
      return;
    }

    console.log('[DiceRoller] Room setup - isHost:', isHost, 'slug:', dddiceRoomSlug);

    const dddice = dddiceRef.current;
    if (!dddice) return;

    // スラッグがある → 参加
    // スラッグがない → ルーム作成（ホスト優先、ホストがWebGL失敗なら他の人が作成）
    const shouldJoinRoom = !!dddiceRoomSlug;
    const shouldCreateRoom = !dddiceRoomSlug;

    // 既に処理中なら重複実行を防ぐ
    if (isSettingUpRoom.current) return;
    isSettingUpRoom.current = true;

    const joinRoom = async (slug: string) => {
      // 参加者: 既存のルームに参加
      setConnectionStatus('参加中...');

      try {
        const joinResponse = await dddice.api?.room?.join(slug);

        // ダイス音を無効化（自分のparticipant設定を更新）
        const participants = joinResponse?.data?.participants || [];
        const myParticipant = participants[participants.length - 1]; // 最後に参加した人が自分
        if (myParticipant?.id) {
          try {
            await dddice.api?.room?.updateParticipant(slug, myParticipant.id, {
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
      dddice.connect(slug);
      setIsConnected(true);
      setConnectionStatus('接続完了');
      onConnectedRef.current?.();
    };

    const setupRoom = async () => {
      try {
        if (shouldCreateRoom) {
          // ホストでない場合は少し待つ（ホストが先にルーム作成する機会を与える）
          if (!isHost) {
            setConnectionStatus('ダイスを準備中...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            // 待機中にslugが設定されたかチェック
            const slugAfterWait = dddiceRoomSlugRef.current;
            if (slugAfterWait) {
              console.log('[DiceRoller] Slug was set while waiting, joining room:', slugAfterWait);
              await joinRoom(slugAfterWait);
              return;
            }
          }

          // ルームを作成
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
          await joinRoom(dddiceRoomSlug);
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
      setFallbackDice(null); // ロール開始時にクリア

      // アニメーション風に少し待つ
      setTimeout(() => {
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        setFallbackDice({ die1, die2 }); // 結果を保存して表示
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
    <div className="relative w-[280px] h-[280px] mx-auto">
      {/* フェルト部分（正方形） */}
      <div
        className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 overflow-hidden shadow-xl"
        style={{
          boxShadow: 'inset 0 4px 16px rgba(0,0,0,0.4), inset 0 -2px 8px rgba(255,255,255,0.1), 0 0 0 3px rgba(251, 191, 36, 0.3), 0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block', touchAction: 'none' }}
        />
      </div>

      {/* WebGLフォールバック表示 */}
      {webglError && !isRolling && (() => {
        // ローカルで振ったダイスを優先、なければゲーム状態から取得
        const diceToShow = fallbackDice || displayedDice;
        return (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl">
            {diceToShow ? (
              // ダイスの結果を表示
              <div className="flex items-center gap-4">
                <DiceIcon value={diceToShow.die1} className="w-20 h-20 text-white drop-shadow-lg" />
                <DiceIcon value={diceToShow.die2} className="w-20 h-20 text-white drop-shadow-lg" />
              </div>
            ) : (
              <div className="text-center">
                <p className="text-slate-400 text-sm">2Dモード（3Dダイスなし）</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* 2Dモードでロール中のアニメーション */}
      {webglError && isRolling && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl">
          <div className="flex items-center gap-4 animate-bounce">
            <Dice1 className="w-16 h-16 text-white/60 animate-spin" />
            <Dice6 className="w-16 h-16 text-white/60 animate-spin" style={{ animationDirection: 'reverse' }} />
          </div>
        </div>
      )}

      {/* 接続中表示 */}
      {!isConnected && !webglError && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50">
          <p className="text-amber-400 animate-pulse">{connectionStatus}</p>
        </div>
      )}
    </div>
  );
});

DiceRoller.displayName = 'DiceRoller';
