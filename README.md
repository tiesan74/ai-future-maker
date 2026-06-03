# AI未来予想メーカー Viral V2

バズ狙いの5要素を実装したVercel公開用MVPです。

## 追加した5要素

1. スクショ用診断カード
2. 金運・恋愛運・バズ運・怪異遭遇率の%表示
3. 水晶玉ロード演出
4. SNS共有用テキストコピー
5. 結果後のおすすめ診断3件

追加で、禁断の未来を目立たせ、今日の未来も入れています。

## 公開手順

1. ZIPを解凍
2. GitHubリポジトリに中身をアップ
3. VercelでImport
4. Environment Variablesに以下を追加

```text
OPENAI_API_KEY = あなたのOpenAI APIキー
OPENAI_MODEL = gpt-5.4-mini
```

5. Deploy

## ローカル確認

```bash
npm install
cp .env.example .env
npm run dev
```

## 次に入れると強いもの

- Supabaseで無料回数制限
- 広告を見ると+1回
- Stripe月額300円
- Canvasで結果カード画像保存
- Google Analytics / Vercel Analytics
