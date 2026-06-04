
const genreMap = {
  daily: "今日の未来", future: "未来予想", money: "金運未来", love: "恋愛未来",
  shadow: "裏人格診断", ghost: "怪異未来", viral: "バズる未来",
  millionaire: "億万長者未来", forbidden: "禁断の未来"
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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY が未設定です。VercelのEnvironment Variablesに設定してください。" });

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
  money: 20 + (hashScore(seed + "money", 1) % 81),
  love: 20 + (hashScore(seed + "love", 7) % 81),
  viral: 20 + (hashScore(seed + "viral", 13) % 81),
  ghost: 5 + (hashScore(seed + "ghost", 29) % 96),
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
- 180〜320字
- TikTok/Xでスクショ共有したくなる文章
- 良い未来と悪い未来を両方書く
- 最初の1文で結論を書く
- 具体的な時期を入れる
- 驚きがある内容にする
- ありきたりな褒め言葉は禁止
- 読者を少し不安にさせる要素を入れる
- 最後に成功のヒントを1つ書く

出力形式:

【未来の結論】
（1文）

【3年以内に起こること】
・
・
・

【最大のチャンス】
（1つ）

【最大のリスク】
（1つ）

【成功のヒント】
（1つ）
`;

const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        contents: [{role: "user", parts: [{text: prompt}]}],
        generationConfig: {temperature: 0.9, maxOutputTokens: 1400}
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || "Gemini APIでエラーが発生しました。" });

    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\n").trim()
      || "生成に失敗しました。もう一度試してください。";

    return res.status(200).json({ text, genre, scores, rank });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
