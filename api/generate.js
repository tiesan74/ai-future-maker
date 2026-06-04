
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

const goodList = [
  "SNSで注目を集める",
  "思わぬ収入のチャンスを掴む",
  "今まで縁がなかった人から好意を向けられる",
  "小さな投稿や作品が想像以上に伸びる"
];

const badList = [
  "信頼していた人と距離ができる",
  "勢いでお金を使いすぎる",
  "嫉妬や誤解を受ける",
  "大事な場面で判断を焦る"
];

const good = goodList[hashScore(seed, 11) % goodList.length];
const bad = badList[hashScore(seed, 22) % badList.length];
const year = 2026 + (hashScore(seed, 33) % 4);
const danger = Math.max(scores.ghost, scores.love, 40);
const avoid = Math.max(8, 100 - danger);

const prompt = `
あなたはSNSで拡散される診断AIです。

次の診断結果に続く「AI解説」を120〜180文字で書いてください。

条件:
- 日本語のみ
- 少し不穏
- でも最後は行動すれば変えられる感じ
- 友達に送りたくなる文
- 前置き禁止
- 途中で終わらせない

診断:
名前:${name}
年齢:${age}
願望:${worry}
ジャンル:${genre}
未来ランク:${rank}
良い未来:${good}
悪い未来:${bad}
危険度:${danger}%
回避率:${avoid}%
`;

const model = "gemini-2.5-flash";
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

const response = await fetch(url, {
  method: "POST",
  headers: {"Content-Type": "application/json"},
  body: JSON.stringify({
    contents: [{role: "user", parts: [{text: prompt}]}],
    generationConfig: {temperature: 0.75, maxOutputTokens: 350}
  })
});

const raw = await response.text();
let data;
try {
  data = JSON.parse(raw);
} catch {
  return res.status(500).json({ error: raw.slice(0, 500) });
}

if (!response.ok) {
  return res.status(response.status).json({
    error: data?.error?.message || "Gemini APIでエラーが発生しました。"
  });
}

const aiText =
  data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\n").trim()
  || "この未来はまだ確定していません。今の選択次第で、大きく変わる可能性があります。";

const text = `【${genre}】

${year}年、あなたは${good}。

しかしその裏で、${bad}未来も見えています。

危険度:${danger}%
回避率:${avoid}%

AI解説:
${aiText}

一言:
成功より先に、誰を信じるかを間違えるな。`;


    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        contents: [{role: "user", parts: [{text: prompt}]}],
        generationConfig: {temperature: 0.85,maxOutputTokens: 500}
      })
    });
const raw = await response.text();
let data;
try {
  data = JSON.parse(raw);
} catch {
  return res.status(500).json({ error: raw.slice(0, 500) });
}
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || "Gemini APIでエラーが発生しました。" });

    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\n").trim()
      || "生成に失敗しました。もう一度試してください。";

    return res.status(200).json({ text, genre, scores, rank });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
