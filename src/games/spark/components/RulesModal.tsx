import { X } from 'lucide-react';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal = ({ onClose }: RulesModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-slate-800 rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="sticky top-0 bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">SPARKの遊び方</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 space-y-6 text-slate-300">
          {/* 概要 */}
          <section>
            <h3 className="text-lg font-bold text-cyan-400 mb-2">ゲーム概要</h3>
            <p className="text-sm leading-relaxed">
              宝石を奪い合う「バッティング」系ゲーム。全員が同時に「どの宝石を狙うか」を選択し、
              <span className="text-yellow-400">誰とも被らなければ</span>宝石を獲得できます。
              被ったら誰も取れません。
            </p>
          </section>

          {/* 宝石の種類 */}
          <section>
            <h3 className="text-lg font-bold text-cyan-400 mb-2">宝石の種類</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-slate-700/50 p-2 rounded flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-500" />
                <span>青: 1点</span>
              </div>
              <div className="bg-slate-700/50 p-2 rounded flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-yellow-400" />
                <span>黄: 2点</span>
              </div>
              <div className="bg-slate-700/50 p-2 rounded flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-red-500" />
                <span>赤: 3点</span>
              </div>
              <div className="bg-slate-700/50 p-2 rounded flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-white" />
                <span>白: 個数²点</span>
              </div>
            </div>
          </section>

          {/* アクション */}
          <section>
            <h3 className="text-lg font-bold text-cyan-400 mb-2">アクション</h3>
            <ul className="text-sm space-y-2">
              <li className="bg-slate-700/50 p-2 rounded">
                <span className="font-bold text-white">場を指す:</span> 宝石台を選んで宝石を獲得（被りなしの場合）
              </li>
              <li className="bg-slate-700/50 p-2 rounded">
                <span className="font-bold text-white">金庫を指す:</span> 他プレイヤーの金庫から宝石を奪う（被りなし＆バリアなし）
              </li>
              <li className="bg-slate-700/50 p-2 rounded">
                <span className="font-bold text-white">バリア:</span> 自分の金庫を守り、宝石を確定。ただし次ラウンド休み
              </li>
            </ul>
          </section>

          {/* 得点計算 */}
          <section>
            <h3 className="text-lg font-bold text-cyan-400 mb-2">得点計算</h3>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>色付き宝石: 青1点、黄2点、赤3点</li>
              <li><span className="text-yellow-400">3色セットボーナス:</span> 青黄赤各1個 = +4点</li>
              <li><span className="text-white">白宝石:</span> 個数の2乗（1個=1点、2個=4点、3個=9点...）</li>
            </ul>
          </section>

          {/* ゲーム終了 */}
          <section>
            <h3 className="text-lg font-bold text-cyan-400 mb-2">ゲーム終了</h3>
            <p className="text-sm">
              袋から最後の宝石を取り出したラウンド終了時にゲーム終了。
              合計得点が最も高いプレイヤーの勝利！（同点は宝石数で判定）
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
