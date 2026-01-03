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
              お題に沿った言葉をひらがなで設定し、他のプレイヤーに当てられないように守りながら、
              相手の言葉を当てるゲームです。
            </p>
          </section>

          <section>
            <h3 className="text-white font-bold mb-2">ゲームの流れ</h3>
            <ol className="list-decimal list-inside space-y-1">
              <li>お題が発表される</li>
              <li>各プレイヤーがお題に沿った言葉を入力</li>
              <li>順番にひらがな1文字を宣言して攻撃</li>
              <li>宣言した文字が含まれるプレイヤーは公開</li>
              <li>全文字が公開されたら脱落</li>
              <li>最後まで残ったプレイヤーが勝利</li>
            </ol>
          </section>

          <section>
            <h3 className="text-white font-bold mb-2">攻撃ルール</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>自分の言葉もヒット対象になる</li>
              <li>他プレイヤーにヒットしたら連続攻撃（1回まで）</li>
              <li>自分だけヒットした場合は連続攻撃なし</li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-bold mb-2">特殊ルール</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>
                2人残りで未公開が1文字ずつ、かつ同じ文字の場合、
                宣言したプレイヤーが勝利
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-bold mb-2">お題チェンジ</h3>
            <p>
              言葉入力中、全員が「お題チェンジ」に投票すると、
              新しいお題でやり直しになります。
            </p>
          </section>

          <section>
            <h3 className="text-white font-bold mb-2">文字の正規化</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>濁点・半濁点は除去される（が→か、ぱ→は）</li>
              <li>小文字は大文字に変換（ゃ→や、っ→つ）</li>
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
