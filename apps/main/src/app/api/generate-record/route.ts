import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const { childName, mood, activities, phrases, memo } = await request.json();

  const moodText = mood === "good" ? "良好" : mood === "neutral" ? "普通" : mood === "bad" ? "不調" : "未選択";

  const prompt = `あなたは放課後等デイサービスの支援員です。以下の情報をもとに、保護者向けの支援記録文章を作成してください。

【児童名】${childName}
【本日の気分】${moodText}
【活動内容】${activities?.length > 0 ? activities.join("、") : "未選択"}
【選択された記録フレーズ】${phrases?.length > 0 ? phrases.join("。") : "なし"}
【スタッフメモ】${memo || "なし"}

以下のルールに従ってください：
- 2〜4文程度で簡潔にまとめる
- 敬語で丁寧に書く
- 児童の様子や成長を前向きに記述する
- 具体的な活動内容に触れる
- 文章のみを出力し、見出しや箇条書きは使わない`;

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
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
