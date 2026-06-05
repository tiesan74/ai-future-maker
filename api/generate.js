
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

const avg = Math.round(
  (
    scores.money +
    scores.love +
    scores.viral +
    (100 - scores.ghost)
  ) / 4
);

const rank = rankFromAvg(avg);

    const danger = Math.max(scores.ghost, scores.love, 40);
    const avoid = Math.max(5, 100 - danger);

const genreInstruction = {
daily: "今日24時間以内に起こる未来を書く。全体200〜350字。見出しは【結論】【今日の未来】【未来を変える鍵】一言: のみ。",
  future: "3年後の未来を書く。500〜750字。見出しは全て使う。",
  money: "お金や収入を中心に未来を書く。400〜650字。",
  love: "恋愛や出会いを中心に未来を書く。400〜650字。",
  ghost: "不穏な出来事や違和感を中心に未来を書く。300〜500字。",
  viral: "SNSや動画投稿を中心に未来を書く。400〜650字。",
  millionaire: "大金や成功を中心に未来を書く。500〜750字。",
  forbidden: "人には言えない未来を書く。300〜500字。"
};

    const futureTitle =
  genreKey === "daily"
    ? "今日の未来"
    : "3年後の未来";

const now = new Date();
const currentHour = now.getHours();

let timeHint;

if (currentHour < 12) {
  timeHint = "今日の昼〜夜";
} else if (currentHour < 18) {
  timeHint = "今日の夕方〜深夜";
} else {
  timeHint = "今夜〜明日の朝";
}

const todayText =
  `${now.getMonth() + 1}月${now.getDate()}日`;

const tomorrow = new Date(now);
tomorrow.setDate(now.getDate() + 1);

const tomorrowText =
  `${tomorrow.getMonth() + 1}月${tomorrow.getDate()}日`;

    const formatMap = {

daily: `
出力形式:

【結論】

【今日の未来】

【未来を変える鍵】

一言:
`,

future: `
出力形式:

【結論】

【3年後の未来】

【この未来を壊す人物】

【最大のチャンス】

【最大のリスク】

【未来を変える鍵】

一言:
`,

ghost: `
出力形式:

【結論】

【今夜起こること】

【見てはいけないもの】

【回避方法】

一言:
`,

love: `
出力形式:

【結論】

【恋愛の転機】

【相手の特徴】

【最大のチャンス】

【注意点】

一言:
`,

money: `
出力形式:

【結論】

【金運の流れ】

【増えるお金】

【失いやすいお金】

【未来を変える鍵】

一言:
`
};

    const commonInfo = `
名前:${name}
年齢:${age}
願望:${worry}
ジャンル:${genre}

金運:${scores.money}%
恋愛運:${scores.love}%
バズ運:${scores.viral}%
怪異遭遇率:${scores.ghost}%
未来ランク:${rank}

今日の日付:${todayText}
明日の日付:${tomorrowText}
現在時刻:${currentHour}時
現在の時間帯:${timeHint}
`;

const promptMap = {
  daily: `
あなたはTikTokで拡散される日本語のAI診断ライターです。
今日24時間以内の小さな未来を書いてください。

${commonInfo}

ルール:
- 200〜350字
- 今日または明日の日付と時間を必ず入れる
- 現在時刻より後の出来事だけを書く
- 小さな偶然や選択を書く
- SNSやバズを無理に入れない
- 大金持ちや人生逆転は禁止
- 怪異遭遇率70%未満なら怪異表現は禁止
- 最後まで書き切る

出力形式:

【結論】

【今日の未来】

【未来を変える鍵】

一言:
`,

  future: `
あなたはTikTokで拡散される日本語のAI未来診断ライターです。
スクショしたくなる3年後の未来を書いてください。

${commonInfo}

ルール:
- 400〜700字
- 具体的な年月を書く
- 願望を反映する
- 人物を1人以上登場させる
- 良い未来には代償を入れる
- 悪い未来には回避方法を入れる
- 抽象表現は禁止
- 最後まで書き切る

出力形式:

【結論】

【3年後の未来】

【この未来を壊す人物】

【最大のチャンス】

【最大のリスク】

【未来を変える鍵】

一言:
`,

  money: `
あなたは金運に特化したAI未来診断ライターです。
お金・収入・出費・人間関係を中心に書いてください。

${commonInfo}

ルール:
- 400〜650字
- 収入と出費の両方を書く
- 甘い儲け話にはリスクを入れる
- 恋愛を主役にしない
- 願望を反映する
- 最後まで書き切る

出力形式:

【結論】

【金運の流れ】

【増えるお金】

【失いやすいお金】

【未来を変える鍵】

一言:
`,

  love: `
あなたは恋愛に特化したAI未来診断ライターです。
出会い・距離感・選択を中心に書いてください。

${commonInfo}

ルール:
- 400〜650字
- 恋愛を主役にする
- 相手の特徴を書く
- 叶うだけでなく代償や注意点も入れる
- SNSや仕事を主役にしない
- 最後まで書き切る

出力形式:

【結論】

【恋愛の転機】

【相手の特徴】

【最大のチャンス】

【注意点】

一言:
`,

  ghost: `
あなたは少し怖い未来診断ライターです。
不穏な出来事や違和感を中心に書いてください。

${commonInfo}

ルール:
- 250〜500字
- 怪異遭遇率70%未満なら軽い違和感まで
- 怪異遭遇率70%以上なら不穏な出来事を許可
- 怖くしすぎず、回避方法を書く
- 最後まで書き切る

出力形式:

【結論】

【今夜起こること】

【見てはいけないもの】

【回避方法】

一言:
`,

  shadow: `
あなたはTikTokで拡散される日本語のAI裏人格診断ライターです。
未来予想ではなく、本人が気づいていない裏の性格を診断してください。

${commonInfo}

ルール:
- 350〜550字
- 未来の出来事ではなく性格診断を書く
- 願望から隠れた欲望を読み取る
- 少し刺さるが、傷つけすぎない
- 人間関係で出る裏の顔を書く
- 抽象的なポエムは禁止
- 怪異・豪邸・月収・バズ成功を主役にしない
- 最後まで書き切る

出力形式:

【裏人格タイプ】

【表の顔】

【本当の欲望】

【人間関係で出る裏の顔】

【暴走する条件】

【扱い方】

一言:
`,

  forbidden: `
あなたはTikTokで拡散される日本語のAI診断ライターです。

禁断の未来とは、
「知らない方が幸せだったかもしれない未来」です。

${commonInfo}

ルール:

- 300〜500字
- 怖さより不気味さ重視
- 大金持ちや世界的成功は禁止
- 人間関係の代償を入れる
- 読んだ人が少しゾワッとする内容
- 怪異が主役ではない
- 必ず引き返せる期限を書く
- 必ず代償を書く

出力形式:

【結論】

【禁断の未来】

【代償】

【引き返せる期限】

一言:
`,

  viral: `
あなたはSNSでバズる未来診断ライターです。
動画投稿・発信・拡散を中心に書いてください。

${commonInfo}

ルール:
- 400〜650字
- 必ず数字を1つ入れる
- バズの代償も書く
- 願望を反映する
- 大げさすぎる表現は禁止
- 最後まで書き切る

出力形式:

【結論】

【バズるきっかけ】

【伸びる投稿】

【最大のリスク】

【未来を変える鍵】

一言:
`
};

const prompt = promptMap[genreKey] || promptMap.future;
  　
    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let response;
let raw;

for(let i = 0; i < 3; i++){

  response = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 4096
      }
    })
  });

  raw = await response.text();

  if(response.ok){
    break;
  }

  if(raw.includes("high demand")){
    console.log("Gemini混雑中。再試行:", i + 1);
    await new Promise(r => setTimeout(r, 1500));
    continue;
  }

  break;
}

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

  const msg = data?.error?.message || "";

  if (msg.includes("high demand")) {
    return res.status(503).json({
      error: "AIが混み合っています。30秒ほど待ってもう一度お試しください。"
    });
  }

  return res.status(response.status).json({
    error: msg || "Gemini APIでエラーが発生しました。"
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
    return res.status(500).json({
      error: String(e?.message || e)
    });
  }
}
