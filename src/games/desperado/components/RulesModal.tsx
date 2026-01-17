import { X } from 'lucide-react';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal = ({ onClose }: RulesModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">遊び方</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4 text-slate-300">
          <section>
            <h3 className="text-amber-400 font-bold mb-2">ゲーム概要</h3>
            <p className="text-sm">
              サイコロ2個を振って出目の強さを競うゲーム。
              毎ラウンド、最も弱い出目を出したプレイヤーがライフを失います。
              最後まで生き残った人の勝ち！
            </p>
          </section>

          <section>
            <h3 className="text-amber-400 font-bold mb-2">出目の強さ（強い順）</h3>
            <ol className="text-sm space-y-2">
              <li className="flex items-center gap-2">
                <span className="bg-amber-600 text-white px-2 py-0.5 rounded text-xs font-bold">最強</span>
                <span>デスペラード（1と2の組み合わせ）</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-xs font-bold">ゾロ目</span>
                <span>6-6 &gt; 5-5 &gt; 4-4 &gt; 3-3 &gt; 2-2 &gt; 1-1</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="bg-slate-600 text-white px-2 py-0.5 rounded text-xs font-bold">バラ目</span>
                <span>合計値で比較（12が最強、4が最弱）</span>
              </li>
            </ol>
          </section>

          <section>
            <h3 className="text-amber-400 font-bold mb-2">ルール</h3>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>各プレイヤーはライフ5でスタート</li>
              <li>1回の番手で<span className="text-amber-400">最大3回まで</span>振れる（2回まで振り直し可能）</li>
              <li>振った後、「キープ」または「振り直す」を選択</li>
              <li>全員がキープしたら結果発表</li>
              <li>最弱の出目を出したプレイヤーが<span className="text-red-400">ライフ-1</span></li>
              <li>誰かがデスペラードを出していた場合、ペナルティは<span className="text-red-400">ライフ-2</span></li>
              <li>ライフが0になったら脱落</li>
              <li>最後まで残ったプレイヤーの勝利！</li>
            </ul>
          </section>

          <section>
            <h3 className="text-amber-400 font-bold mb-2">同点の場合</h3>
            <p className="text-sm">
              最弱が同点の場合、該当者全員がペナルティを受けます。
            </p>
          </section>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500
            hover:from-amber-600 hover:to-orange-600 rounded-lg text-white font-bold transition-all"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};
