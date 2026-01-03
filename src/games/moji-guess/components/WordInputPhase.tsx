import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { Player, GameSettings } from '../types/game';
import { TOPIC_LABELS } from '../types/game';
import { validateWord, normalizeWord } from '../lib/hiragana';

interface WordInputPhaseProps {
  settings: GameSettings;
  players: Player[];
  currentPlayerId: string;
  isReady: boolean;
  onSubmitWord: (originalWord: string, normalizedWord: string) => void;
}

export const WordInputPhase = ({
  settings,
  players,
  currentPlayerId,
  isReady,
  onSubmitWord,
}: WordInputPhaseProps) => {
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validation = validateWord(word, settings.minWordLength, settings.maxWordLength);
  const normalizedPreview = word ? normalizeWord(word) : '';

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

  // 既に入力完了している場合
  if (isReady) {
    return (
      <div className="space-y-6">
        <div className="bg-white/10 rounded-xl p-8 text-center">
          <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">入力完了</h2>
          <p className="text-white/60">他のプレイヤーを待っています...</p>
        </div>

        {/* 待機状況 */}
        <div className="bg-white/10 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">
            入力状況 ({readyPlayers.length}/{players.length})
          </h3>
          <div className="space-y-2">
            {players.map((player) => (
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
          「{TOPIC_LABELS[settings.topic]}」
        </h2>
        <p className="text-white/60 mt-4">
          {settings.minWordLength}〜{settings.maxWordLength}文字のひらがなで言葉を入力してください
        </p>
      </div>

      {/* 入力フォーム */}
      <div className="bg-white/10 rounded-xl p-6">
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
    </div>
  );
};
