import { useState } from 'react';
import { Check, Loader2, FlaskConical, RefreshCw, Pencil } from 'lucide-react';
import type { Player, GameSettings, LocalPlayerState } from '../types/game';
import { validateWord, normalizeWord } from '../lib/hiragana';

interface WordInputPhaseProps {
  settings: GameSettings;
  currentTopic: string;
  players: Player[];
  currentPlayerId: string;
  isReady: boolean;
  onSubmitWord: (originalWord: string, normalizedWord: string) => void;
  onCancelReady?: () => void; // 入力完了を取り消す
  // お題チェンジ投票
  topicChangeVotes: string[];
  onVoteTopicChange: () => void;
  // ターン順
  turnOrder: string[];
  // デバッグ用
  debugMode?: boolean;
  debugLocalStates?: Record<string, LocalPlayerState>;
  onDebugWordSubmit?: (playerId: string, originalWord: string, normalizedWord: string) => void;
  onDebugVoteTopicChange?: (playerId: string) => void;
}

export const WordInputPhase = ({
  settings,
  currentTopic,
  players,
  currentPlayerId,
  isReady,
  onSubmitWord,
  onCancelReady,
  topicChangeVotes,
  onVoteTopicChange,
  turnOrder,
  debugMode = false,
  debugLocalStates = {},
  onDebugWordSubmit,
  onDebugVoteTopicChange,
}: WordInputPhaseProps) => {
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validation = validateWord(word, settings.minWordLength, settings.maxWordLength);
  const normalizedPreview = word ? normalizeWord(word) : '';

  // プレイヤーをターン順にソート
  const sortedPlayers = [...players].sort((a, b) => {
    const aIndex = turnOrder.indexOf(a.id);
    const bIndex = turnOrder.indexOf(b.id);
    return aIndex - bIndex;
  });

  const handleSubmit = () => {
    if (!validation.isValid) {
      setError(validation.errors[0]);
      return;
    }

    setError(null);
    onSubmitWord(word, validation.normalizedWord);
  };

  const readyPlayers = players.filter(p => p.isReady);
  const waitingPlayers = players.filter(p => !p.isReady);

  const hasVoted = topicChangeVotes.includes(currentPlayerId);
  const voteCount = topicChangeVotes.length;

  // 既に入力完了している場合
  if (isReady) {
    const canEdit = waitingPlayers.length > 0 && onCancelReady;

    return (
      <div className="space-y-6">
        <div className="bg-white/10 rounded-xl p-8 text-center">
          <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">入力完了</h2>
          <p className="text-white/60 mb-4">他のプレイヤーを待っています...</p>
          {canEdit && (
            <button
              onClick={onCancelReady}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20
                rounded-lg text-white/80 text-sm transition-all"
            >
              <Pencil className="w-4 h-4" />
              修正する
            </button>
          )}
        </div>

        {/* お題チェンジ投票 */}
        <div className="bg-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/60">
              <RefreshCw className="w-4 h-4" />
              <span>お題チェンジ ({voteCount}/{players.length})</span>
            </div>
            <button
              onClick={onVoteTopicChange}
              disabled={hasVoted}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                hasVoted
                  ? 'bg-white/20 text-white/60 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              {hasVoted ? '投票済み' : '投票する'}
            </button>
          </div>
        </div>

        {/* 待機状況 */}
        <div className="bg-white/10 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">
            入力状況 ({readyPlayers.length}/{players.length})
          </h3>
          <div className="space-y-2">
            {sortedPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg"
              >
                {player.isReady ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                )}
                <span className={player.isReady ? 'text-white' : 'text-white/60'}>
                  {player.name}
                </span>
                {player.id === currentPlayerId && (
                  <span className="text-white/40 text-sm">(あなた)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* お題表示 */}
      <div className="bg-white/10 rounded-xl p-6 text-center">
        <p className="text-white/60 mb-2">お題</p>
        <h2 className="text-3xl font-bold text-white">
          {currentTopic}
        </h2>
        <p className="text-white/40 text-sm mt-2">
          自由にお題を考えてもOK!
        </p>
        {/* お題チェンジ投票 */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-2 text-white/60 text-sm">
              <RefreshCw className="w-4 h-4" />
              <span>お題チェンジ ({voteCount}/{players.length})</span>
            </div>
            <button
              onClick={onVoteTopicChange}
              disabled={hasVoted}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                hasVoted
                  ? 'bg-white/20 text-white/60 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              {hasVoted ? '投票済み' : '投票する'}
            </button>
          </div>
        </div>
      </div>

      {/* 入力フォーム */}
      <div className="bg-white/10 rounded-xl p-6">
        <p className="text-white/60 text-center mb-4">
          {settings.minWordLength}〜{settings.maxWordLength}文字のひらがなで言葉を入力してください
        </p>
        <div className="mb-4">
          <input
            type="text"
            value={word}
            onChange={(e) => {
              setWord(e.target.value);
              setError(null);
            }}
            placeholder="ひらがなで入力..."
            className="w-full px-4 py-4 bg-white/10 text-white text-2xl text-center rounded-lg
              focus:outline-none focus:ring-2 focus:ring-pink-500
              placeholder:text-white/30"
            maxLength={settings.maxWordLength + 3} // 小文字考慮
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && validation.isValid) {
                handleSubmit();
              }
            }}
          />
        </div>

        {/* プレビュー */}
        {normalizedPreview && (
          <div className="mb-4 text-center">
            <p className="text-white/60 text-sm mb-1">正規化後（{normalizedPreview.length}文字）</p>
            <div className="flex justify-center gap-1">
              {Array.from(normalizedPreview).map((char, i) => (
                <span
                  key={i}
                  className="w-10 h-10 flex items-center justify-center bg-white/20 rounded text-white text-lg font-bold"
                >
                  {char}
                </span>
              ))}
            </div>
            <p className="text-white/40 text-xs mt-2">
              ※濁点・半濁点は除去、小文字は大文字に変換されます
            </p>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="mb-4 text-red-300 text-center text-sm">
            {error}
          </div>
        )}

        {/* 決定ボタン */}
        <button
          onClick={handleSubmit}
          disabled={!validation.isValid}
          className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-500
            hover:from-pink-600 hover:to-orange-600 disabled:from-gray-500 disabled:to-gray-600
            rounded-lg text-white font-bold transition-all text-lg"
        >
          決定
        </button>
      </div>

      {/* 待機状況 */}
      {waitingPlayers.length < players.length && (
        <div className="bg-white/10 rounded-xl p-4">
          <p className="text-white/60 text-sm text-center">
            入力完了: {readyPlayers.map(p => p.name).join(', ') || 'なし'}
          </p>
        </div>
      )}

      {/* デバッグ用: 全プレイヤーの言葉入力 */}
      {debugMode && onDebugWordSubmit && (
        <DebugWordInputPanel
          players={players}
          currentPlayerId={currentPlayerId}
          settings={settings}
          debugLocalStates={debugLocalStates}
          onDebugWordSubmit={onDebugWordSubmit}
          topicChangeVotes={topicChangeVotes}
          onDebugVoteTopicChange={onDebugVoteTopicChange}
        />
      )}
    </div>
  );
};

// デバッグ用: 各プレイヤーの言葉入力パネル
interface DebugWordInputPanelProps {
  players: Player[];
  currentPlayerId: string;
  settings: GameSettings;
  debugLocalStates: Record<string, LocalPlayerState>;
  onDebugWordSubmit: (playerId: string, originalWord: string, normalizedWord: string) => void;
  topicChangeVotes: string[];
  onDebugVoteTopicChange?: (playerId: string) => void;
}

const DebugWordInputPanel = ({
  players,
  currentPlayerId,
  settings,
  debugLocalStates,
  onDebugWordSubmit,
  topicChangeVotes,
  onDebugVoteTopicChange,
}: DebugWordInputPanelProps) => {
  const [inputs, setInputs] = useState<Record<string, string>>({});

  const handleSubmit = (player: Player) => {
    const word = inputs[player.id] || '';
    const validation = validateWord(word, settings.minWordLength, settings.maxWordLength);

    if (validation.isValid) {
      onDebugWordSubmit(player.id, word, validation.normalizedWord);
    }
  };

  // 自分以外のプレイヤーのみ表示
  const otherPlayers = players.filter(p => p.id !== currentPlayerId);

  if (otherPlayers.length === 0) return null;

  return (
    <div className="bg-orange-900/30 border border-orange-600/50 rounded-xl p-4">
      <h3 className="text-white font-bold mb-4 flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-orange-400" />
        デバッグ: 他プレイヤーの言葉入力
      </h3>
      <div className="space-y-3">
        {otherPlayers.map((player) => {
          const localState = debugLocalStates[player.id];
          const inputValue = inputs[player.id] || '';
          const validation = validateWord(inputValue, settings.minWordLength, settings.maxWordLength);

          const hasVoted = topicChangeVotes.includes(player.id);

          return (
            <div key={player.id} className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-bold">{player.name}</span>
                <div className="flex items-center gap-2">
                  {player.isReady && localState && (
                    <span className="text-green-400 text-sm flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {localState.originalWord}（{localState.normalizedWord.length}文字）
                    </span>
                  )}
                  {/* お題チェンジ投票ボタン */}
                  {onDebugVoteTopicChange && (
                    <button
                      onClick={() => onDebugVoteTopicChange(player.id)}
                      disabled={hasVoted}
                      className={`px-2 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                        hasVoted
                          ? 'bg-white/20 text-white/60 cursor-not-allowed'
                          : 'bg-orange-500 hover:bg-orange-600 text-white'
                      }`}
                    >
                      <RefreshCw className="w-3 h-3" />
                      {hasVoted ? '投票済' : '投票'}
                    </button>
                  )}
                </div>
              </div>
              {!player.isReady && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputs(prev => ({ ...prev, [player.id]: e.target.value }))}
                    placeholder="ひらがなで入力..."
                    className="flex-1 px-3 py-2 bg-white/10 text-white rounded-lg
                      focus:outline-none focus:ring-2 focus:ring-orange-500
                      placeholder:text-white/30 text-sm"
                    maxLength={settings.maxWordLength + 3}
                  />
                  <button
                    onClick={() => handleSubmit(player)}
                    disabled={!validation.isValid}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600
                      rounded-lg text-white text-sm font-bold transition-all"
                  >
                    決定
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
