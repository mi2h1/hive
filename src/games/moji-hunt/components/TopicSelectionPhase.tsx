import { useState } from 'react';
import { RefreshCw, Loader2, PenLine } from 'lucide-react';
import type { Player } from '../types/game';
import { getRandomTopicCandidates } from '../types/game';

interface TopicSelectionPhaseProps {
  players: Player[];
  currentPlayerId: string;
  topicSelectorId: string;
  roundNumber: number;
  onSelectTopic: (topic: string) => void;
}

const CANDIDATE_COUNT = 5;

export const TopicSelectionPhase = ({
  players,
  currentPlayerId,
  topicSelectorId,
  roundNumber,
  onSelectTopic,
}: TopicSelectionPhaseProps) => {
  const isSelector = currentPlayerId === topicSelectorId;
  const selectorName = players.find(p => p.id === topicSelectorId)?.name ?? '???';

  if (!isSelector) {
    return <WaitingView selectorName={selectorName} roundNumber={roundNumber} />;
  }

  return (
    <SelectorView
      roundNumber={roundNumber}
      onSelectTopic={onSelectTopic}
    />
  );
};

// 担当プレイヤー向け: お題を選択/入力するUI
const SelectorView = ({
  roundNumber,
  onSelectTopic,
}: {
  roundNumber: number;
  onSelectTopic: (topic: string) => void;
}) => {
  const [candidates, setCandidates] = useState(() => getRandomTopicCandidates(CANDIDATE_COUNT));
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  const refreshCandidates = () => {
    setCandidates(getRandomTopicCandidates(CANDIDATE_COUNT));
    setSelectedTopic(null);
  };

  const handleConfirm = () => {
    if (isCustomMode) {
      const trimmed = customTopic.trim();
      if (trimmed) onSelectTopic(trimmed);
    } else if (selectedTopic) {
      onSelectTopic(selectedTopic);
    }
  };

  const canConfirm = isCustomMode ? customTopic.trim().length > 0 : selectedTopic !== null;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white/10 rounded-xl p-6 text-center">
        <p className="text-white/60 mb-1">第{roundNumber + 1}回戦</p>
        <h2 className="text-xl font-bold text-white">あなたがお題を決める番です</h2>
      </div>

      {/* 候補一覧 or 自由記述 */}
      {!isCustomMode ? (
        <div className="bg-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/60 text-sm">候補から選択</p>
            <button
              onClick={refreshCandidates}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 text-sm transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              別の候補
            </button>
          </div>
          <div className="space-y-2">
            {candidates.map((topic) => (
              <button
                key={topic}
                onClick={() => setSelectedTopic(selectedTopic === topic ? null : topic)}
                className={`w-full px-4 py-3 rounded-lg text-lg font-bold transition-all ${
                  selectedTopic === topic
                    ? 'bg-pink-500 text-white ring-2 ring-pink-300'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>

          {/* 自由記述モードへ切替 */}
          <button
            onClick={() => { setIsCustomMode(true); setSelectedTopic(null); }}
            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 text-sm transition-all"
          >
            <PenLine className="w-4 h-4" />
            自分でお題を入力する
          </button>
        </div>
      ) : (
        <div className="bg-white/10 rounded-xl p-6">
          <p className="text-white/60 text-sm mb-4">自由にお題を入力</p>
          <input
            type="text"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="お題を入力..."
            className="w-full px-4 py-4 bg-white/10 text-white text-xl text-center rounded-lg
              focus:outline-none focus:ring-2 focus:ring-pink-500
              placeholder:text-white/30"
            maxLength={20}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customTopic.trim()) {
                handleConfirm();
              }
            }}
          />

          {/* 候補選択モードへ切替 */}
          <button
            onClick={() => { setIsCustomMode(false); setCustomTopic(''); }}
            className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 text-sm transition-all"
          >
            候補から選ぶ
          </button>
        </div>
      )}

      {/* 決定ボタン */}
      <button
        onClick={handleConfirm}
        disabled={!canConfirm}
        className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-orange-500
          hover:from-pink-600 hover:to-orange-600 disabled:from-gray-500 disabled:to-gray-600
          rounded-lg text-white font-bold transition-all text-lg"
      >
        決定
      </button>
    </div>
  );
};

// 他プレイヤー向け: 待機画面
const WaitingView = ({
  selectorName,
  roundNumber,
}: {
  selectorName: string;
  roundNumber: number;
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-white/10 rounded-xl p-8 text-center">
        <p className="text-white/60 mb-1">第{roundNumber + 1}回戦</p>
        <Loader2 className="w-12 h-12 text-pink-400 mx-auto mb-4 animate-spin" />
        <h2 className="text-xl font-bold text-white mb-2">
          {selectorName}さんがお題を選んでいます...
        </h2>
        <p className="text-white/40 text-sm">しばらくお待ちください</p>
      </div>
    </div>
  );
};
