
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
あなたはTikTokで拡散される診断AIです。
「スクショしたくなる結論」と「少し読ませる詳細」を作ってください。

入力:
名前:${name}
年齢:${age}
願望:${worry}
ジャンル:${genre}

スコア:
金運:${scores.money}%
恋愛運:${scores.love}%
バズ運:${scores.viral}%
怪異遭遇率:${scores.ghost}%
未来ランク:${rank}

ジャンル別ルール:
- 禁断の未来: 見ない方がよかったと思う未来を書く
- 裏人格診断: 本人が隠している本性を書く
- 怪異未来: 深夜・視線・名前を呼ばれる系の不気味さを入れる
- 恋愛未来: 執着、すれ違い、未練を入れる
- 金運未来: 大金のチャンスと失敗リスクを書く
- バズる未来: SNSで伸びるが失うものも書く
- 未来予想: 成功と代償を書く

出力形式:

【${genre}】
20〜40文字の強い結論

2027年春。
2〜3文で、良い未来と悪い未来を両方書く。

特徴:
・1つ目
・2つ目
・3つ目

回避率:${Math.max(5, 100 - scores.ghost)}%

一言:
最後に短く刺さる一言

条件:
- 日本語のみ
- 全体で250〜420字
- 途中で終わらせない
- ありきたりな褒め言葉は禁止
- 読んだ人が友達に送りたくなる内容にする
- 怖さ、恋愛、お金、承認欲求のどれかを必ず混ぜる
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
