import { X } from 'lucide-react';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal = ({ onClose }: RulesModalProps) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">遊び方</h2>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ルール内容 */}
        <div className="space-y-4 text-white/80 text-sm">
          <section>
            <h3 className="text-white font-bold mb-2">ゲーム概要</h3>
            <p>
              自分のカードだけ見えない状態で、場の合計値を推理するブラフ＆心理戦ゲームです。
            </p>
          </section>

          <section>
            <h3 className="text-white font-bold mb-2">ゲームの流れ</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li>各プレイヤーに1枚カードが配られる</li>
              <li>自分のカードは見えない（他の人のは見える）</li>
              <li>順番に「場の合計値」を予想して宣言</li>
              <li>前の人より大きい数字を宣言する</li>
              <li>嘘だと思ったら「ジャッカル！」で勝負</li>
            </ol>
          </section>

          <section>
            <h3 className="text-white font-bold mb-2">ジャッカル判定</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <span className="text-red-400">宣言 {'>'} 合計値</span> → 宣言した人の負け
              </li>
              <li>
                <span className="text-green-400">宣言 ≦ 合計値</span> → ジャッカル宣言者の負け
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-bold mb-2">勝敗</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>負けるとライフが1減る</li>
              <li>ライフが0になったら脱落</li>
              <li>最後まで残ったプレイヤーが勝利</li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-bold mb-2">カードの種類</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>数字カード: -10 〜 20</li>
              <li>×2: 合計値を2倍にする</li>
              <li>MAX→0: 最大の数字を0にする</li>
              <li>?: 判定時に山札から1枚引く</li>
            </ul>
          </section>
        </div>

        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="w-full mt-6 px-6 py-3 bg-white/10 hover:bg-white/20
            rounded-lg text-white font-bold transition-all"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};
