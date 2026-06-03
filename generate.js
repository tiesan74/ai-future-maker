const genreMap = {
  future: "未来予想",
  money: "金運未来",
  love: "恋愛未来",
  shadow: "裏人格診断",
  ghost: "怪異未来",
  viral: "バズる未来",
  millionaire: "億万長者未来",
  forbidden: "禁断の未来",
  daily: "今日の未来"
};

function clean(value, max = 400) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, max);
}

function hashScore(seed, offset = 0) {
  let h = 0;
  const s = String(seed) + offset;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return Math.abs(h % 101);
}

function rankFromAvg(avg) {
  if (avg >= 92) return "S+";
  if (avg >= 84) return "S";
  if (avg >= 74) return "A";
  if (avg >= 62) return "B";
  if (avg >= 50) return "C";
  return "D";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POSTのみ対応しています。" });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "OPENAI_API_KEY が未設定です。VercelのEnvironment Variablesに設定してください。"
      });
    }

    const body = req.body || {};
    const name = clean(body.name, 40) || "あなた";
    const age = clean(body.age, 10) || "今";
    const worry = clean(body.worry, 400) || "人生を変えたい";
    const genreKey = clean(body.genre, 30) || "future";
    const genre = genreMap[genreKey] || "未来予想";
    const tone = clean(body.tone, 40) || "普通";
    const intensity = clean(body.intensity, 40) || "普通";

    const seed = `${name}|${age}|${worry}|${genreKey}|${new Date().toISOString().slice(0,10)}`;
    const scores = {
      money: hashScore(seed, 1),
      love: hashScore(seed, 2),
      viral: hashScore(seed, 3),
      ghost: hashScore(seed, 4)
    };
    const avg = Math.round((scores.money + scores.love + scores.viral + scores.ghost) / 4);
    const rank = rankFromAvg(avg);

    const prompt = `
あなたは日本語SNS向けの診断コンテンツ作家です。
「AI未来予想メーカー」というWebサービスの診断結果を作ってください。

ジャンル: ${genre}
名前: ${name}
年齢: ${age}
悩み・願望: ${worry}
文章トーン: ${tone}
濃さ: ${intensity}

スコア:
金運: ${scores.money}%
恋愛運: ${scores.love}%
バズ運: ${scores.viral}%
怪異遭遇率: ${scores.ghost}%
未来ランク: ${rank}

出力条件:
- 日本語
- 380〜580字
- TikTok/Xでシェアしたくなる文章
- 占い風だが、断定しすぎない
- 怖さ、面白さ、前向きさを混ぜる
- 医療・法律・投資の具体的断定助言はしない
- 個人情報を推測しすぎない
- 最初に12〜24文字の強いキャッチコピーを1行
- 「あなたの分岐点」という見出しを入れる
- 最後に必ず以下を入れる
  未来ランク: ${rank}
  今日の一手:
  #AI未来予想メーカー

ジャンル別の味付け:
- 未来予想: 万人向け、少し不思議
- 金運未来: お金、挑戦、副収入。ただし投資断定はしない
- 恋愛未来: 執着、運命、未練を少し混ぜる
- 裏人格診断: 表人格/裏人格/隠れた欲望を診断風に
- 怪異未来: 都市伝説・怪談風。ただし怖すぎない
- バズる未来: SNS投稿、創作、拡散
- 億万長者未来: 大金を目指す妄想と現実的な一手
- 禁断の未来: 見てはいけない雰囲気、最もクリックしたくなる文体
- 今日の未来: 今日1日の軽い予言、毎日遊びたくなる文体
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
        input: prompt,
        max_output_tokens: 1100
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI APIでエラーが発生しました。"
      });
    }

    const text = data.output_text ||
      data.output?.flatMap(item => item.content || []).map(c => c.text || "").join("\n").trim() ||
      "生成に失敗しました。もう一度試してください。";

    return res.status(200).json({ text, genre, scores, rank });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
