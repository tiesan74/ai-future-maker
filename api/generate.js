
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
    const rank = rankFromAvg(avg);


    const danger = Math.max(scores.ghost, scores.love, 40);
    const avoid = Math.max(5, 100 - danger);

const prompt = `
あなたはTikTokやXで拡散される日本語の診断AIです。
以下の情報から、スクショして友達に送りたくなる診断結果を作ってください。

名前:${name}
年齢:${age}
願望:${worry}
ジャンル:${genre}

金運:${scores.money}%
恋愛運:${scores.love}%
バズ運:${scores.viral}%
怪異遭遇率:${scores.ghost}%
未来ランク:${rank}

必ず次の形式だけで出力してください。
見出しだけで終わることは禁止。
全項目を必ず埋めてください。
文字数は700〜1000字

未来ランクがZの場合:

- 非常に厳しい未来を書く
- ただし回避方法は必ず書く
- ネタではなく少し怖い内容にする
- 人間関係、お金、後悔のどれかを含める

未来ランクがEXの場合:

- 人生が大きく好転する未来を書く
- ただし代償を1つ付ける
- 読んだ人が羨ましくなる内容にする

重要:

- 全ての項目を必ず埋めること
- 見出しだけ出力して終わることは禁止
- 箇条書きは全て埋めること
- 「・」だけを出力してはいけない
- 出力途中で終わらせない
- 必ず最後の「一言:」まで出力すること
- 当たり障りのない占いは禁止
- 読んだ人が「え？」と思う内容を入れる
- 少し不穏にする
- 良い未来には必ず代償を付ける
- 悪い未来には必ず回避方法を付ける
- 人物を必ず1人登場させる
- 必ず具体的な月や季節を書く
- SNSで保存したくなる内容にする
- 抽象的な占いは禁止
- 「ありそう」で終わらせない
- 最後は必ず【未来を変える鍵】まで出力すること

未来ランク別ルール:

EX:
人生逆転レベル。羨ましがられる未来。ただし大きな代償も書く。

SS:
非常に良い未来。成功の裏に失うものも書く。

S:
大きなチャンスが来る。人間関係の変化も書く。

A:
順調な未来。選択次第で大成功も可能。

B:
普通。努力次第で大きく変わる。

C:
注意が必要。後悔しやすい選択を1つ書く。

D:
かなり危険。お金、人間関係、裏切りのどれかを必ず入れる。

Z:
最悪クラス。ただし必ず回避方法を書く。少し怖くする。

出力形式:

【結論】

【3年以内に起こること】
・1
・2
・3

【この未来を壊す人物】

【最大のチャンス】

【最大のリスク】

【未来を変える鍵】

一言:
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
