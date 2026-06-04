
const genreMap = {
  daily: "今日の未来",
  future: "未来予想",
  money: "金運未来",
  love: "恋愛未来",
  shadow: "裏人格診断",
  ghost: "怪異未来",
  viral: "バズ未来",
  millionaire: "億万長者未来",
  forbidden: "禁断の未来",

  darkfuture: "見たくない未来",
  pastlife: "前世診断",
  enemy: "あなたを裏切る人",
  talent: "隠された才能",
  fate: "運命の相手",
  deathflag: "人生最大の危機"
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
あなたはTikTokやXでシェアされる未来診断AIです。

ユーザー情報:
名前:${name}
年齢:${age}
願望:${worry}

診断データ:
金運:${scores.money}%
恋愛運:${scores.love}%
バズ運:${scores.viral}%
怪異遭遇率:${scores.ghost}%
未来ランク:${rank}

以下のルールを厳守してください。

【目的】
読んだ人が
「これ友達に送りたい」
と思う診断結果を作る。

【出力形式】

【${genre}】

最初の1行で衝撃的な結論を書く。

その後、
120〜220文字程度で未来の出来事を書く。

内容には必ず

・良い出来事
・悪い出来事
・具体的な時期
・感情が動く要素

を入れる。

最後に

回避率: ○%

一言: ○○

で締める。

【禁止事項】
・箇条書き禁止
・前置き禁止
・AIとして説明しない
・途中で終わらない
・抽象的すぎる表現禁止

【重要】
ホラー、恋愛、お金、SNS、承認欲求のうち最低1つを必ず含める。
`;


const model = "gemini-2.0-flash-lite";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        contents: [{role: "user", parts: [{text: prompt}]}],
        generationConfig: {temperature: 0.85,maxOutputTokens: 500}
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
