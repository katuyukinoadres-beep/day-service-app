import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const { childName, birthDate, school, grade, mood, activities, phrases, topics, notes, memo } = await request.json();

  // 後方互換: topics/notes が未指定の場合は memo をフォールバックとして扱う
  const topicsText = topics || "";
  const notesText = notes || memo || "";

  const moodText = mood === "good" ? "良好" : mood === "neutral" ? "普通" : mood === "bad" ? "不調" : "未選択";

  // 生年月日から年齢を計算
  let ageText = "不明";
  if (birthDate) {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    ageText = `${age}歳`;
  }

  const systemPrompt = `あなたは放課後等デイサービスの経験豊富な支援員です。保護者が読む支援記録を作成します。

文体ルール：
- 「です・ます」調の丁寧語で統一
- 3〜5文で具体的なエピソードを交えてまとめる
- 児童の名前は「○○さん」と表記
- 活動の様子→本人の反応や頑張り→今後への前向きな一言、の流れで書く
- 定型的・機械的にならず、その子らしさが伝わる温かみのある文章にする
- 文章のみを出力（見出し・箇条書き・括弧書きの補足は不要）
- 児童の年齢や学年に合った表現を使う（年齢が低ければより平易に、高学年なら成長に触れるなど）

記録フレーズの扱い（最重要）：
- 記録フレーズは「健康・生活」「運動・感覚」「認知・行動」「言語・コミュニケーション」「人間関係・社会性」の5領域に基づく観察記録である
- 提供された記録フレーズすべてに満遍なく触れること。特定の領域だけに偏らないようにする
- 記録フレーズの内容を文章の骨格として使い、自然な流れでつなげる

「活動中のトピックス」と「特記事項」の扱い：
- 活動中のトピックスは補足情報として扱う。記録フレーズの内容を主軸にし、トピックスは背景情報や補足的なエピソードとして自然に織り込む程度にとどめる
- 特記事項は異常事態や重要な気づきを含むため、該当がある場合は適切に取り上げる。ただし、医療的判断や保護者への過度な不安を煽る表現は避ける
- 両フィールドが空の場合は、記録フレーズと活動内容のみで文章を組み立てる

良い例：
「本日は工作活動でペットボトルロケットの制作に取り組みました。太郎さんは設計図を描く段階からとても意欲的で、羽の角度を何度も調整しながら丁寧に仕上げていました。完成したロケットを飛ばした際にはとても嬉しそうな表情を見せてくれました。集中して最後まで取り組む姿に成長を感じます。」`;

  const userPrompt = `以下の情報をもとに支援記録を作成してください。

児童名：${childName}
年齢：${ageText}
学校：${school || "不明"}
学年：${grade || "不明"}
本日の気分：${moodText}
活動内容：${activities?.length > 0 ? activities.join("、") : "未選択"}
記録フレーズ：${phrases?.length > 0 ? phrases.join("。") : "なし"}
活動中のトピックス：${topicsText || "なし"}
特記事項：${notesText || "なし"}`;

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-opus-4-7",
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
