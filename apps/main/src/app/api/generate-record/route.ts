import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const { childName, mood, activities, phrases, memo } = await request.json();

  const moodText = mood === "good" ? "良好" : mood === "neutral" ? "普通" : mood === "bad" ? "不調" : "未選択";

  const systemPrompt = `あなたは放課後等デイサービスの経験豊富な支援員です。保護者が読む支援記録を作成します。

文体ルール：
- 「です・ます」調の丁寧語で統一
- 3〜5文で具体的なエピソードを交えてまとめる
- 児童の名前は「○○さん」と表記
- 活動の様子→本人の反応や頑張り→今後への前向きな一言、の流れで書く
- 定型的・機械的にならず、その子らしさが伝わる温かみのある文章にする
- 文章のみを出力（見出し・箇条書き・括弧書きの補足は不要）

良い例：
「本日は工作活動でペットボトルロケットの制作に取り組みました。太郎さんは設計図を描く段階からとても意欲的で、羽の角度を何度も調整しながら丁寧に仕上げていました。完成したロケットを飛ばした際にはとても嬉しそうな表情を見せてくれました。集中して最後まで取り組む姿に成長を感じます。」`;

  const userPrompt = `以下の情報をもとに支援記録を作成してください。

児童名：${childName}
本日の気分：${moodText}
活動内容：${activities?.length > 0 ? activities.join("、") : "未選択"}
記録フレーズ：${phrases?.length > 0 ? phrases.join("。") : "なし"}
スタッフメモ：${memo || "なし"}`;

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Anthropic API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI generation failed" },
      { status: 500 }
    );
  }
}
