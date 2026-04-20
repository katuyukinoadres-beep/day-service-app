import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const { text, targetChars = 380 } = await request.json();

  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const systemPrompt = `あなたは放課後等デイサービスで保護者向けに支援記録を書く支援員です。受け取った本文を、保護者視点の温度感・丁寧語・その子らしさのニュアンスを保ったまま指定字数以内に圧縮します。

圧縮ルール:
- 「です・ます」調を厳守
- 段落構造（空行区切り）を可能な限り維持する。複数の活動を扱う場合は活動ごとに段落を保つ
- 具体的なエピソードの核（何に取り組んだか、どう頑張ったか）は必ず残す
- 形容詞・副詞の重複や冗長な接続を削る
- **見出し（【...】）・箇条書き・括弧書き・注釈・署名（担当：○○）は一切追加しない**
- 出力は圧縮された本文テキストのみ。前置き・説明・区切り線などは付けない`;

  const userPrompt = `以下の本文を ${targetChars} 字以内に圧縮してください。段落構造と温度感を保ち、見出しや署名は付けず本文のみを返してください。

---
${text}
---`;

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const summarized = message.content[0].type === "text" ? message.content[0].text.trim() : "";

    return NextResponse.json({ text: summarized, chars: summarized.length });
  } catch (error) {
    console.error("Anthropic summarize API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI summarization failed" },
      { status: 500 }
    );
  }
}
