import { useState } from 'react';
import { FlaskConical, UserPlus, Crown, Link } from 'lucide-react';
import type { Player, RuleSet, RuleSetType } from '../types/game';
import { RULE_SET_NAMES } from '../types/game';

// ルールに応じた設定
const THEME_CONFIG = {
  atlantis: {
    bg: '/boards/images/bg_aoa.jpg',
    overlay: 'bg-blue-950/40',
    logo: '/boards/images/vec_logo_aoa_w.svg',
    accent: 'cyan',
    buttonActive: 'bg-cyan-600',
    buttonGradient: 'from-cyan-500 to-teal-600',
    buttonGradientHover: 'hover:from-cyan-600 hover:to-teal-700',
    focusRing: 'focus:ring-cyan-500',
    hoverText: 'hover:text-cyan-300',
  },
  incan_gold: {
    bg: '/boards/images/bg_incan.png',
    overlay: 'bg-amber-950/40',
    logo: '/boards/images/vec_logo_incangold.svg',
    accent: 'amber',
    buttonActive: 'bg-amber-600',
    buttonGradient: 'from-amber-500 to-orange-600',
    buttonGradientHover: 'hover:from-amber-600 hover:to-orange-700',
    focusRing: 'focus:ring-amber-500',
    hoverText: 'hover:text-amber-300',
  },
};

interface LobbyProps {
  // プレイヤー名入力
  hasName: boolean;
  playerName: string | null;
  onSetName: (name: string) => void;
  onClearName: () => void;
  // ルーム操作
  roomCode: string | null;
  players: Player[];
  isHost: boolean;
  isLoading: boolean;
  error: string | null;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onLeaveRoom: () => void;
  onStartGame: () => void;
  // ルール設定
  ruleSet?: RuleSet;
  onUpdateRuleSet?: (ruleSetType: RuleSetType) => void;
  // デバッグ用
  debugMode?: boolean;
  onAddTestPlayer?: () => void;
  // 戻るボタン
  onBack?: () => void;
}

export const Lobby = ({
  hasName,
  playerName,
  onSetName,
  onClearName,
  roomCode,
  players,
  isHost,
  isLoading,
  error,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onStartGame,
  ruleSet,
  onUpdateRuleSet,
  debugMode = false,
  onAddTestPlayer,
  onBack,
}: LobbyProps) => {
  const [nameInput, setNameInput] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [showLinkCopiedToast, setShowLinkCopiedToast] = useState(false);

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    }
  };

  const copyInviteLink = () => {
    if (roomCode) {
      const url = `${window.location.origin}/boards/aoa?room=${roomCode}`;
      navigator.clipboard.writeText(url);
      setShowLinkCopiedToast(true);
      setTimeout(() => setShowLinkCopiedToast(false), 2000);
    }
  };

  // プレイヤー名入力フォーム
  if (!hasName) {
    return (
      <div className="min-h-screen bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/boards/images/bg_aoa.jpg)' }}>
        <div className="min-h-screen bg-blue-950/40 flex items-center justify-center p-4">
        <div className="bg-slate-800/95 rounded-xl p-6 max-w-md w-full">
          <img
            src="/boards/images/vec_logo_aoa.svg"
            alt="アトランティスの深淵"
            className="h-28 mx-auto mb-6"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm mb-2">
                プレイヤー名を入力
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="名前を入力..."
                className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-cyan-500"
                maxLength={20}
                autoFocus
              />
            </div>
            <button
              onClick={() => onSetName(nameInput)}
              disabled={!nameInput.trim()}
              className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-600
                hover:from-cyan-600 hover:to-teal-700 disabled:from-gray-500 disabled:to-gray-600
                rounded-lg text-white font-bold transition-all"
            >
              決定
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // ルーム待機画面
  if (roomCode) {
    const currentTheme = THEME_CONFIG[ruleSet?.type || 'atlantis'];
    const isIncan = ruleSet?.type === 'incan_gold';

    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* 背景レイヤー（フェード切り替え） */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-fixed transition-opacity duration-500"
          style={{
            backgroundImage: `url(${THEME_CONFIG.atlantis.bg})`,
            opacity: isIncan ? 0 : 1,
          }}
        />
        <div
          className="absolute inset-0 bg-cover bg-center bg-fixed transition-opacity duration-500"
          style={{
            backgroundImage: `url(${THEME_CONFIG.incan_gold.bg})`,
            opacity: isIncan ? 1 : 0,
          }}
        />
        {/* オーバーレイ（色も切り替え） */}
        <div className={`absolute inset-0 transition-colors duration-500 ${isIncan ? 'bg-amber-950/40' : 'bg-blue-950/40'}`} />

        <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="bg-slate-800/95 rounded-xl p-6 max-w-2xl w-full">
          {/* ロゴ（ルールに応じてフェード切り替え） */}
          <div className="relative h-10 mb-4">
            <img
              src={THEME_CONFIG.atlantis.logo}
              alt="アトランティスの深淵"
              className="absolute left-1/2 -translate-x-1/2 h-10 transition-opacity duration-500"
              style={{ filter: 'brightness(0) invert(1)', opacity: isIncan ? 0 : 1 }}
            />
            <img
              src={THEME_CONFIG.incan_gold.logo}
              alt="インカの黄金"
              className="absolute left-1/2 -translate-x-1/2 h-10 transition-opacity duration-500"
              style={{ filter: 'brightness(0) invert(1)', opacity: isIncan ? 1 : 0 }}
            />
          </div>

          {/* ルームコード */}
          <div className="bg-slate-700 rounded-lg p-4 mb-4 text-center relative">
            <div className="text-slate-400 text-sm mb-1">ルームコード</div>
            <button
              onClick={copyRoomCode}
              className={`w-full flex items-center justify-center gap-2 text-4xl font-mono font-bold text-white tracking-widest transition-colors cursor-pointer ${currentTheme.hoverText}`}
              title="クリックでコピー"
            >
              {roomCode}
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            {/* コピー完了トースト */}
            {showCopiedToast && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-sm rounded-full animate-fade-in">
                コピーしました
              </div>
            )}
          </div>

          {/* 招待リンク */}
          <div className="mb-6 relative">
            <button
              onClick={copyInviteLink}
              className="w-full flex items-center justify-center gap-2 px-4 py-2
                bg-slate-600 hover:bg-slate-500 rounded-lg text-slate-200 text-sm transition-colors"
            >
              <Link className="w-4 h-4" />
              招待リンクをコピー
            </button>
            {showLinkCopiedToast && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-600 text-white text-sm rounded-full animate-fade-in whitespace-nowrap">
                リンクをコピーしました
              </div>
            )}
          </div>

          {/* ゲーム開始ボタン（通常モード・ホストのみ） */}
          {!debugMode && (
            <div className="mb-4">
              {isHost ? (
                <button
                  onClick={onStartGame}
                  disabled={players.length < 1}
                  className={`w-full px-6 py-3 bg-gradient-to-r ${currentTheme.buttonGradient}
                    ${currentTheme.buttonGradientHover} disabled:from-gray-500 disabled:to-gray-600
                    rounded-lg text-white font-bold transition-all`}
                >
                  ゲーム開始
                </button>
              ) : (
                <div className="text-center text-slate-400 py-3">
                  ホストの開始を待っています...
                </div>
              )}
            </div>
          )}

          {/* 参加者とルール選択（2列レイアウト） */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* 左列: プレイヤー追加（デバッグ時）+ プレイヤー一覧 */}
            <div>
              {/* デバッグ用: テストプレイヤー追加 */}
              {debugMode && onAddTestPlayer && players.length < 6 && (
                <button
                  onClick={onAddTestPlayer}
                  className="w-full mb-2 px-3 py-2 bg-orange-600 hover:bg-orange-700
                    rounded-lg text-white font-bold transition-all text-sm flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  プレイヤー追加 ({players.length}/6)
                </button>
              )}
              <div className="text-slate-400 text-sm mb-2">
                参加者 ({players.length}人)
              </div>
              <div className="space-y-1">
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-1 bg-slate-700 px-3 py-1.5 rounded-lg text-sm"
                  >
                    {index === 0 && <Crown className="w-4 h-4 text-yellow-400" />}
                    <span className="text-white truncate">{player.name}</span>
                    {player.name === playerName && (
                      <span className="text-slate-400 text-xs">(自分)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 右列: ゲーム開始（デバッグ時）+ ルール選択 */}
            <div>
              {/* デバッグ用: ゲーム開始ボタン */}
              {debugMode && isHost && (
                <button
                  onClick={onStartGame}
                  disabled={players.length < 1}
                  className={`w-full mb-2 px-3 py-2 bg-gradient-to-r ${currentTheme.buttonGradient}
                    ${currentTheme.buttonGradientHover} disabled:from-gray-500 disabled:to-gray-600
                    rounded-lg text-white font-bold transition-all text-sm`}
                >
                  ゲーム開始
                </button>
              )}
              <div className="text-slate-400 text-sm mb-2">ゲームルール</div>
              <div className="space-y-1">
                {(['atlantis', 'incan_gold'] as RuleSetType[]).map((type) => {
                  const isActive = ruleSet?.type === type;
                  const activeClass = type === 'atlantis' ? 'bg-cyan-600' : 'bg-amber-600';
                  return (
                    <button
                      key={type}
                      onClick={() => isHost && onUpdateRuleSet?.(type)}
                      disabled={!isHost}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                        isActive
                          ? `${activeClass} text-white`
                          : isHost
                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            : 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <div className="text-left">
                        <div className="font-bold text-sm">{RULE_SET_NAMES[type]}</div>
                      </div>
                      <img
                        src={type === 'atlantis' ? '/boards/images/vec_logo_aoa_w.svg' : '/boards/images/vec_logo_incangold.svg'}
                        alt=""
                        className={type === 'atlantis' ? 'h-4' : 'h-5'}
                        style={{ filter: 'brightness(0) invert(1)' }}
                      />
                    </button>
                  );
                })}
              </div>
              {!isHost && (
                <div className="text-slate-500 text-xs mt-1 text-center">
                  ホストのみ変更可
                </div>
              )}
            </div>
          </div>

          {/* 退出ボタン */}
          <div className="space-y-3">
            <button
              onClick={onLeaveRoom}
              className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600
                rounded-lg text-slate-300 font-bold transition-all"
            >
              退出
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // ルーム作成/参加画面
  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/boards/images/bg_aoa.jpg)' }}>
      <div className="min-h-screen bg-blue-950/40 flex items-center justify-center p-4">
      <div className="bg-slate-800/95 rounded-xl p-6 max-w-md w-full">
        <img
          src="/boards/images/vec_logo_aoa.svg"
          alt="アトランティスの深淵"
          className="h-24 mx-auto mb-2"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
        <div className="text-slate-400 text-center mb-6 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <span>ようこそ、{playerName}さん</span>
            <button
              onClick={onClearName}
              className="text-xs text-slate-500 hover:text-cyan-300 transition-colors"
              title="名前を変更"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
          {debugMode && (
            <span className="text-xs bg-orange-600 text-white px-2 py-0.5 rounded inline-flex items-center gap-1">
              <FlaskConical className="w-3 h-3" />
              デバッグモード
            </span>
          )}
        </div>

        {error && (
          <div className="bg-red-900/50 text-red-300 px-4 py-2 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* ルーム作成 */}
          <button
            onClick={onCreateRoom}
            disabled={isLoading}
            className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-teal-600
              hover:from-cyan-600 hover:to-teal-700 disabled:from-gray-500 disabled:to-gray-600
              rounded-lg text-white font-bold text-lg transition-all"
          >
            {isLoading ? '作成中...' : '新しいルームを作成'}
          </button>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-600" />
            <span className="text-slate-500">または</span>
            <div className="flex-1 h-px bg-slate-600" />
          </div>

          {/* ルーム参加 */}
          <div className="space-y-3">
            <input
              type="text"
              value={roomCodeInput}
              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
              placeholder="ルームコードを入力"
              className="w-full px-4 py-3 bg-slate-700 text-white text-center text-xl
                font-mono tracking-widest rounded-lg uppercase
                focus:outline-none focus:ring-2 focus:ring-cyan-500"
              maxLength={4}
            />
            <button
              onClick={() => onJoinRoom(roomCodeInput)}
              disabled={isLoading || roomCodeInput.length !== 4}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600
                hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-500 disabled:to-gray-600
                rounded-lg text-white font-bold transition-all"
            >
              {isLoading ? '参加中...' : 'ルームに参加'}
            </button>
          </div>

          {/* 戻るボタン */}
          {onBack && (
            <button
              onClick={onBack}
              className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600
                rounded-lg text-slate-300 font-bold transition-all"
            >
              ゲーム選択に戻る
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
