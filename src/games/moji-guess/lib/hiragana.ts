// 50音ボードの配置（横並び: あかさたな...）
export const HIRAGANA_ROWS: (string | null)[][] = [
  ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'],
  ['い', 'き', 'し', 'ち', 'に', 'ひ', 'み', null, 'り', 'を'],
  ['う', 'く', 'す', 'つ', 'ぬ', 'ふ', 'む', 'ゆ', 'る', 'ん'],
  ['え', 'け', 'せ', 'て', 'ね', 'へ', 'め', null, 'れ', null],
  ['お', 'こ', 'そ', 'と', 'の', 'ほ', 'も', 'よ', 'ろ', 'ー'],
];

// 有効なひらがな文字リスト
export const VALID_HIRAGANA = HIRAGANA_ROWS.flat().filter((c): c is string => c !== null);

// 濁点・半濁点を清音に変換
const DAKUTEN_MAP: Record<string, string> = {
  'が': 'か', 'ぎ': 'き', 'ぐ': 'く', 'げ': 'け', 'ご': 'こ',
  'ざ': 'さ', 'じ': 'し', 'ず': 'す', 'ぜ': 'せ', 'ぞ': 'そ',
  'だ': 'た', 'ぢ': 'ち', 'づ': 'つ', 'で': 'て', 'ど': 'と',
  'ば': 'は', 'び': 'ひ', 'ぶ': 'ふ', 'べ': 'へ', 'ぼ': 'ほ',
  'ぱ': 'は', 'ぴ': 'ひ', 'ぷ': 'ふ', 'ぺ': 'へ', 'ぽ': 'ほ',
  'ゔ': 'う',
};

// 小文字を大文字に変換
const SMALL_TO_LARGE_MAP: Record<string, string> = {
  'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お',
  'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ',
  'っ': 'つ',
  'ゎ': 'わ',
};

// 1文字を正規化（濁点除去 + 小文字→大文字）
export const normalizeChar = (char: string): string => {
  let c = char;
  if (DAKUTEN_MAP[c]) c = DAKUTEN_MAP[c];
  if (SMALL_TO_LARGE_MAP[c]) c = SMALL_TO_LARGE_MAP[c];
  return c;
};

// 言葉を正規化（濁点除去 + 小文字→大文字）
export const normalizeWord = (word: string): string => {
  return Array.from(word).map(normalizeChar).join('');
};

// 入力がひらがなのみかチェック（濁点・半濁点・小文字・長音も許可）
export const isValidHiraganaInput = (word: string): boolean => {
  // ひらがな範囲: U+3040-U+309F + 長音記号 U+30FC
  const hiraganaRegex = /^[\u3040-\u309F\u30FC]+$/;
  return hiraganaRegex.test(word);
};

// 正規化後の文字が有効な50音かチェック
export const isValidNormalizedChar = (char: string): boolean => {
  return VALID_HIRAGANA.includes(char);
};

// 言葉のバリデーション
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  normalizedWord: string;
}

export const validateWord = (
  word: string,
  minLength: number,
  maxLength: number
): ValidationResult => {
  const errors: string[] = [];

  // 空チェック
  if (!word || word.trim() === '') {
    return { isValid: false, errors: ['言葉を入力してください'], normalizedWord: '' };
  }

  // ひらがなチェック
  if (!isValidHiraganaInput(word)) {
    errors.push('ひらがなのみ使用できます');
  }

  // 正規化
  const normalizedWord = normalizeWord(word);

  // 文字数チェック（正規化後）
  if (normalizedWord.length < minLength) {
    errors.push(`${minLength}文字以上で入力してください`);
  }
  if (normalizedWord.length > maxLength) {
    errors.push(`${maxLength}文字以下で入力してください`);
  }

  // 正規化後の各文字が有効かチェック
  for (const char of normalizedWord) {
    if (!isValidNormalizedChar(char)) {
      errors.push(`「${char}」は使用できません`);
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalizedWord,
  };
};

// 攻撃文字が言葉に含まれているかチェックし、位置を返す
export const findCharacterPositions = (
  normalizedWord: string,
  targetChar: string
): number[] => {
  const positions: number[] = [];
  for (let i = 0; i < normalizedWord.length; i++) {
    if (normalizedWord[i] === targetChar) {
      positions.push(i);
    }
  }
  return positions;
};
