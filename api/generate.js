
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
  if (avg >= 95) return "EX";
  if (avg >= 88) return "SS";
  if (avg >= 78) return "S";
  if (avg >= 68) return "A";
  if (avg >= 55) return "B";
  if (avg >= 40) return "C";
  if (avg >= 25) return "D";
  return "Z";
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

    const seed = `${name}|${age}|${worry}|${genreKey}|${new Date().toISOString().slice(0,10)}`;
    const scores = {
      money: 20 + (hashScore(seed + "money", 1) % 81),
      love: 20 + (hashScore(seed + "love", 7) % 81),
      viral: 20 + (hashScore(seed + "viral", 13) % 81),
      ghost: 5 + (hashScore(seed + "ghost", 29) % 96),
    };

const avg = Math.round((scores.money + scores.love + scores.viral) / 3);
const rank = rankFromAvg(avg);

    const danger = Math.max(scores.ghost, scores.love, 40);
    const avoid = Math.max(5, 100 - danger);

const prompt = `
あなたはTikTokで拡散される日本語のAI未来診断ライターです。
抽象的な占いではなく、スクショしたくなる「3年後の未来」を書いてください。

名前:${name}
年齢:${age}
願望:${worry}
ジャンル:${genre}

金運:${scores.money}%
恋愛運:${scores.love}%
バズ運:${scores.viral}%
怪異遭遇率:${scores.ghost}%
未来ランク:${rank}

ルール:
- 日本語のみ
- 500〜800字
- 具体的な年月を入れる
- 必ず人物を1人登場させる
- 願望を必ず反映する
- 一番高いスコアを中心に書く
- 良い未来には代償を入れる
- 悪い未来には回避方法を入れる
- 抽象的なポエムは禁止
- 「流星群」「光と闇」「運命の歯車」「奇跡」「神秘」は禁止
- 保存したくなる内容にする
- 最後まで必ず書き切る

出力形式:

【結論】
1〜2文で強く書く

【3年後の未来】
具体的な年月から始めて、物語風に書く

【この未来を壊す人物】
特徴を具体的に書く

【最大のチャンス】
具体的に書く

【最大のリスク】
具体的に書く

【未来を変える鍵】
具体的な行動を書く

一言:
短く刺さる言葉
`;
`;

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
         maxOutputTokens: 2000
        }
      })
    });

    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(500).json({
        error: "GeminiからJSONではない応答: " + raw.slice(0, 500)
      });
    }

    console.log("GEMINI_RAW:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Gemini APIでエラーが発生しました。"
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map(p => p.text || "")
        .join("\n")
        .trim()
      || "生成に失敗しました。もう一度試してください。";

   console.log("TEXT_LENGTH:", text.length);
console.log("FINISH_REASON:", data?.candidates?.[0]?.finishReason);
    console.log(
  "SAFETY:",
  JSON.stringify(data?.candidates?.[0]?.safetyRatings)
);
console.log("TEXT:", text);

    return res.status(200).json({ text, genre, scores, rank });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
