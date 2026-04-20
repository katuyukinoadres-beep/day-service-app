/**
 * リタリコ h-navi 連絡帳「活動の様子」欄に貼付けるテキストを生成する。
 *
 * 4ブロック構造（2026-04-20 h-navi 実機調査で確定した実運用フォーマット）:
 *   【取組内容】 活動1／活動2／活動3
 *   【活動の様子】 {本文（段落ごとに空行区切り）}
 *   【その他】 {特記事項}
 *   担当：{記録者名}
 *
 * データ駆動 ON/OFF:
 *   - 活動マスタ未選択なら【取組内容】省略
 *   - 本文が空なら【活動の様子】セクション自体を省略（通常は発生しない）
 *   - notes 空なら【その他】省略
 *   - recorderName 空なら担当署名を省略
 */
export function buildRitalicoDailyReport(params: {
  recorderName: string;
  selectedActivityNames: string[];
  notes: string;
  aiText: string;
}): string {
  const { recorderName, selectedActivityNames, notes, aiText } = params;

  const blocks: string[] = [];

  if (selectedActivityNames.length > 0) {
    blocks.push(`【取組内容】 ${selectedActivityNames.join("／")}`);
  }

  if (aiText.trim()) {
    blocks.push(`【活動の様子】\n${aiText.trim()}`);
  }

  if (notes.trim()) {
    blocks.push(`【その他】\n${notes.trim()}`);
  }

  if (recorderName) {
    blocks.push(`担当：${recorderName}`);
  }

  return blocks.join("\n\n");
}

/** リタリコ転記コピー出力の推奨ソフトリミット（字数）。保護者が読み疲れない目安。 */
export const LITALICO_SOFT_LIMIT = 500;
