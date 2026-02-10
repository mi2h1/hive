# 開発規約

## コミットメッセージ

```
type: 簡潔な変更概要（日本語）

## 変更内容
- 具体的な変更点

Co-Authored-By: Claude <noreply@anthropic.com>
```

- type: `feat` / `fix` / `refactor` / `docs` / `style` / `chore`

---

## 命名規則

| 対象 | 規則 | 例 |
|------|------|----|
| ファイル名 | kebab-case | `game-board.tsx` |
| CSSクラス | kebab-case | `player-card` |
| 関数・変数 | camelCase | `handleClick`, `roomId` |
| コンポーネント | PascalCase | `GameBoard`, `PlayerCard` |
| 定数 | UPPER_SNAKE | `MAX_PLAYERS` |
| コード内の名前 | 英語 | — |
| コメント | 日本語 | — |

---

## 開発プラクティス

- **最小差分優先**: 変更は必要最小限にする
- **既存パターン準拠**: 新規追加は既存の構造・命名に合わせる
- **UI絵文字不可**: アイコンは Lucide React を使用（例外: 結果画面の勝者表示など演出目的）
- **ローカルサーバー不起動**: 変更は全てプッシュしてGitHub Pagesで確認する
