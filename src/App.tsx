import { useState, useEffect } from 'react';
import { Pencil, X } from 'lucide-react';
import { usePlayer } from './shared/hooks/usePlayer';
import { AoaGame } from './games/aoa/AoaGame';
import { MojiHuntGame } from './games/moji-hunt/MojiHuntGame';
import { JackalGame } from './games/jackal/JackalGame';
import { PolyformGame } from './games/polyform/PolyformGame';
import { DesperadoGame } from './games/desperado/DesperadoGame';
import { SparkGame } from './games/spark/SparkGame';
import { SokuJongGame } from './games/soku-jong/SokuJongGame';
import { AdminPage } from './admin/AdminPage';

type GameType = 'none' | 'aoa' | 'moji-hunt' | 'jackal' | 'polyform' | 'desperado' | 'spark' | 'soku-jong' | 'boards-dev' | 'admin';

// クエリパラメータを保持（?v=xxx などのキャッシュバスター用）
const getQueryString = (excludeKeys: string[] = []) => {
  const params = new URLSearchParams(window.location.search);
  excludeKeys.forEach(key => params.delete(key));
  const str = params.toString();
  return str ? `?${str}` : '';
};

// URL からゲームタイプを取得
const getGameFromPath = (): GameType => {
  // クエリパラメータ ?p= からリダイレクトされた場合
  const params = new URLSearchParams(window.location.search);
  const redirectPath = params.get('p');
  if (redirectPath) {
    // pパラメータを除いたクエリを保持
    const query = getQueryString(['p']);
    const newPath = `/hive/${redirectPath}${query}`;
    window.history.replaceState({}, '', newPath);
    if (redirectPath === 'aoa') return 'aoa';
    if (redirectPath === 'moji-hunt') return 'moji-hunt';
    if (redirectPath === 'jackal') return 'jackal';
    if (redirectPath === 'polyform') return 'polyform';
    if (redirectPath === 'desperado') return 'desperado';
    if (redirectPath === 'spark') return 'spark';
    if (redirectPath === 'soku-jong' || redirectPath.startsWith('soku-jong/')) return 'soku-jong';
    if (redirectPath === 'boards-dev') return 'boards-dev';
    if (redirectPath === 'admin') return 'admin';
  }

  // 通常のパスから取得（先頭・末尾のスラッシュを除去）
  const path = window.location.pathname.replace('/hive', '').replace(/^\/|\/$/g, '');
  if (path === 'aoa') return 'aoa';
  if (path === 'moji-hunt') return 'moji-hunt';
  if (path === 'jackal') return 'jackal';
  if (path === 'polyform') return 'polyform';
  if (path === 'desperado') return 'desperado';
  if (path === 'spark') return 'spark';
  if (path === 'soku-jong' || path.startsWith('soku-jong/')) return 'soku-jong';
  if (path === 'boards-dev') return 'boards-dev';
  if (path === 'admin') return 'admin';
  return 'none';
};

// URL を更新（クエリパラメータを保持）
const updatePath = (game: GameType) => {
  const query = getQueryString();
  const newPath = game === 'none' ? `/hive/${query}` : `/hive/${game}${query}`;
  window.history.pushState({}, '', newPath);
};

function App() {
  const { playerName, setPlayerName, hasName, isLoading } = usePlayer();
  const [nameInput, setNameInput] = useState('');
  const [selectedGame, setSelectedGame] = useState<GameType>(getGameFromPath);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');

  // ブラウザの戻る/進むに対応
  useEffect(() => {
    const handlePopState = () => {
      setSelectedGame(getGameFromPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ゲーム一覧画面のタイトルを設定
  useEffect(() => {
    if (selectedGame === 'none') {
      document.title = 'HIVE';
    }
  }, [selectedGame]);

  // ゲーム選択時に URL を更新
  const selectGame = (game: GameType) => {
    setSelectedGame(game);
    updatePath(game);
  };

  // 管理者画面（名前入力・ローディング不要）
  if (selectedGame === 'admin') {
    return <AdminPage onBack={() => selectGame('none')} />;
  }

  // ローディング中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  // プレイヤー名入力画面
  if (!hasName) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-800/95 rounded-xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <img
              src="/hive/images/vec_logo_hive.svg"
              alt="HIVE"
              className="h-12 mx-auto mb-4"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            <p className="text-slate-400">オンラインボードゲーム</p>
          </div>

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
                  focus:outline-none focus:ring-2 focus:ring-indigo-500"
                maxLength={20}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nameInput.trim()) {
                    setPlayerName(nameInput);
                  }
                }}
              />
            </div>
            <button
              onClick={() => setPlayerName(nameInput)}
              disabled={!nameInput.trim()}
              className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600
                hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600
                rounded-lg text-white font-bold transition-all"
            >
              はじめる
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ゲームが選択されている場合
  if (selectedGame === 'aoa') {
    return <AoaGame onBack={() => selectGame('none')} />;
  }
  if (selectedGame === 'moji-hunt') {
    return <MojiHuntGame onBack={() => selectGame('none')} />;
  }
  if (selectedGame === 'jackal') {
    return <JackalGame onBack={() => selectGame('none')} />;
  }
  if (selectedGame === 'polyform') {
    return <PolyformGame onBack={() => selectGame('none')} />;
  }
  if (selectedGame === 'desperado') {
    return <DesperadoGame onBack={() => selectGame('none')} />;
  }
  if (selectedGame === 'spark') {
    return <SparkGame onBack={() => selectGame('none')} />;
  }
  if (selectedGame === 'soku-jong') {
    return <SokuJongGame onBack={() => selectGame('none')} />;
  }
  if (selectedGame === 'boards-dev') {
    // 開発版ゲーム一覧
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-4">
        <div className="max-w-4xl mx-auto">
          <header className="text-center py-8">
            <img
              src="/hive/images/vec_logo_hive.svg"
              alt="HIVE"
              className="h-10 mx-auto mb-3"
              style={{ filter: 'brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(350deg)' }}
            />
            <h1 className="text-2xl font-bold text-white mb-1">HIVE DEV</h1>
            <p className="text-slate-400">
              開発版ゲーム一覧（<span className="text-orange-300">{playerName}</span> さん）
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SPARK（開発中） */}
            <div className="bg-slate-800/80 rounded-xl overflow-hidden hover:ring-2 hover:ring-orange-500 transition-all">
              <div className="h-32 bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">SPARK DEV</span>
              </div>
              <div className="p-4">
                <button
                  onClick={() => selectGame('spark')}
                  className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500
                    hover:from-orange-600 hover:to-amber-600 rounded-lg text-white font-bold transition-all"
                >
                  開く
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => selectGame('none')}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
            >
              本番版一覧に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 名前変更ハンドラー
  const handleNameChange = () => {
    const trimmed = newNameInput.trim();
    if (trimmed) {
      setPlayerName(trimmed);
      setShowNameModal(false);
      setNewNameInput('');
    }
  };

  // ゲーム選択画面
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {/* 全幅ヘッダー */}
      <header className="bg-slate-800/80 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* 左側: ロゴ */}
          <div className="flex items-center">
            <img
              src="/hive/images/vec_logo_hive.svg"
              alt="HIVE"
              className="h-7"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          {/* 右側: ようこそ + 名前 + 変更ボタン */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm hidden sm:inline">ようこそ、</span>
            <span className="text-indigo-300 font-medium">{playerName}</span>
            <span className="text-slate-400 text-sm hidden sm:inline">さん</span>
            <button
              onClick={() => {
                setNewNameInput(playerName || '');
                setShowNameModal(true);
              }}
              className="ml-2 p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title="名前を変更"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 名前変更モーダル */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">名前を変更</h2>
              <button
                onClick={() => setShowNameModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              value={newNameInput}
              onChange={(e) => setNewNameInput(e.target.value)}
              placeholder="新しい名前を入力..."
              className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg
                focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              maxLength={20}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNameChange();
                }
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowNameModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleNameChange}
                disabled={!newNameInput.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600
                  hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600
                  rounded-lg text-white font-bold transition-all"
              >
                変更
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 pt-8">

        {/* ゲーム一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* アトランティスの深淵 */}
          <div className="bg-slate-800/80 rounded-xl overflow-hidden hover:ring-2 hover:ring-cyan-500 transition-all">
            <div
              className="h-40 bg-cover bg-center"
              style={{ backgroundImage: 'url(/hive/images/bg_aoa.jpg)' }}
            >
              <div className="h-full bg-blue-950/50 flex items-center justify-center">
                <img
                  src="/hive/images/vec_logo_aoa_w.svg"
                  alt="アトランティスの深淵"
                  className="h-12"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </div>
            </div>
            <div className="p-4">
              <h2 className="text-lg font-bold text-white mb-2">アトランティスの深淵</h2>
              <p className="text-slate-400 text-sm mb-4">
                深海の遺跡を探索するチキンレースゲーム。<br />
                宝石を集めて帰還するか、さらに奥へ進むか？
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => selectGame('aoa')}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-600
                    hover:from-cyan-600 hover:to-teal-700 rounded-lg text-white font-bold transition-all"
                >
                  遊ぶ
                </button>
              </div>
            </div>
          </div>

          {/* もじはんと */}
          <div className="bg-slate-800/80 rounded-xl overflow-hidden hover:ring-2 hover:ring-pink-500 transition-all">
            <div className="h-40 bg-gradient-to-br from-pink-600 to-orange-500 flex items-center justify-center">
              <img
                src="/hive/images/vec_logo_moji-hant.svg"
                alt="もじはんと"
                className="h-12"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </div>
            <div className="p-4">
              <h2 className="text-lg font-bold text-white mb-2">もじはんと</h2>
              <p className="text-slate-400 text-sm mb-4">
                ひらがなで言葉を当て合う推理パーティーゲーム。<br />
                相手の言葉を暴き、最後まで生き残れ！
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => selectGame('moji-hunt')}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-500
                    hover:from-pink-600 hover:to-orange-600 rounded-lg text-white font-bold transition-all"
                >
                  遊ぶ
                </button>
              </div>
            </div>
          </div>

          {/* ジャッカル */}
          <div className="bg-slate-800/80 rounded-xl overflow-hidden hover:ring-2 hover:ring-indigo-500 transition-all">
            <div className="h-40 bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <img
                src="/hive/images/vec_logo_jackal.svg"
                alt="ジャッカル"
                className="h-12"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </div>
            <div className="p-4">
              <h2 className="text-lg font-bold text-white mb-2">ジャッカル</h2>
              <p className="text-slate-400 text-sm mb-4">
                自分のカードだけ見えないブラフカードゲーム。<br />
                推理と駆け引きで相手を出し抜け！
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => selectGame('jackal')}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500
                    hover:from-indigo-600 hover:to-purple-600 rounded-lg text-white font-bold transition-all"
                >
                  遊ぶ
                </button>
              </div>
            </div>
          </div>

          {/* Polyform */}
          <div className="bg-slate-800/80 rounded-xl overflow-hidden hover:ring-2 hover:ring-teal-500 transition-all">
            <div className="h-40 bg-gradient-to-br from-teal-600 to-emerald-600 flex items-center justify-center">
              <img
                src="/hive/images/vec_logo_polyform.svg"
                alt="POLYFORM"
                className="h-8"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </div>
            <div className="p-4">
              <h2 className="text-lg font-bold text-white mb-2">POLYFORM</h2>
              <p className="text-slate-400 text-sm mb-4">
                ピースを集めてパズルを完成させる拡大再生産ゲーム。<br />
                効率よくピースを集め、高得点を狙え！
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => selectGame('polyform')}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500
                    hover:from-teal-600 hover:to-emerald-600 rounded-lg text-white font-bold transition-all"
                >
                  遊ぶ
                </button>
              </div>
            </div>
          </div>

          {/* デスペラード */}
          <div className="bg-slate-800/80 rounded-xl overflow-hidden hover:ring-2 hover:ring-amber-500 transition-all">
            <div className="h-40 bg-gradient-to-br from-amber-600 to-red-600 flex items-center justify-center">
              <img
                src="/hive/images/vec_logo_desperado.svg"
                alt="Desperado"
                className="h-12"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </div>
            <div className="p-4">
              <h2 className="text-lg font-bold text-white mb-2">デスペラード</h2>
              <p className="text-slate-400 text-sm mb-4">
                ダイス2個で勝負するサバイバルダイスゲーム。<br />
                最強の「デスペラード」を出して生き残れ！
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => selectGame('desperado')}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-red-500
                    hover:from-amber-600 hover:to-red-600 rounded-lg text-white font-bold transition-all"
                >
                  遊ぶ
                </button>
              </div>
            </div>
          </div>

          {/* SPARK */}
          <div className="bg-slate-800/80 rounded-xl overflow-hidden hover:ring-2 hover:ring-cyan-500 transition-all">
            <div className="h-40 bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
              <img
                src="/hive/images/vec_logo_spark.svg"
                alt="SPARK"
                className="h-12"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </div>
            <div className="p-4">
              <h2 className="text-lg font-bold text-white mb-2">SPARK</h2>
              <p className="text-slate-400 text-sm mb-4">
                宝石を奪い合う心理戦カードゲーム。<br />
                場の宝石を取るか、他人の金庫を狙うか？
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => selectGame('spark')}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500
                    hover:from-cyan-600 hover:to-blue-600 rounded-lg text-white font-bold transition-all"
                >
                  遊ぶ
                </button>
              </div>
            </div>
          </div>

          {/* 速雀 */}
          <div className="bg-slate-800/80 rounded-xl overflow-hidden hover:ring-2 hover:ring-emerald-500 transition-all">
            <div className="h-40 bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center">
              <span className="text-4xl font-bold text-white">速雀</span>
            </div>
            <div className="p-4">
              <h2 className="text-lg font-bold text-white mb-2">速雀</h2>
              <p className="text-slate-400 text-sm mb-4">
                索子＋發・中だけの簡易麻雀ゲーム。<br />
                2面子を揃えて和了を目指せ！
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => selectGame('soku-jong')}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500
                    hover:from-emerald-600 hover:to-green-600 rounded-lg text-white font-bold transition-all"
                >
                  遊ぶ
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
