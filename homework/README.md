# Step 99｜下堂功課：出多兩篇、開自動、記三個數字

課後約 45–60 分鐘，加三日等數字。一件必做，其餘可選。

## 必做
1. 用自己嘅 Composer 再出兩篇：每篇 dry-run → 你批準 → 只發一次 → 查結果。
2. 兩篇都 published 之後，先開自動模式：cap = 1，kill switch 開一次畀自己睇 log。
3. 每篇帖手動記三個數字（觀看、回覆、保存），缺值留空，唔當零。用 `fixtures/analytics-sample.csv` 嘅欄位。

## 可選
- 品牌片：生成一條（同一 content_hash）、附到卡、重新批準。未做寫 `SKIP · VIDEO`。

## 完成定義
唔係交一份靚文件，而係你嘅 PersonalOS 喺你冇望住嘅時候出咗一篇，而且你知佢幾時、出咗乜、有冇人睇。

## 下堂入場
Queue ≥3 張 published 卡 ＋ 自動模式已開（cap 1）＋ 一張三行數字表。冇？用 checkpoints/act-5-done 同 analytics-sample.csv 跟住上堂，全部標 DEMO。

## 開始之前：換成你自己嗰條 key

老師派嘅 key 課後會停用。去 DeepSeek 開戶口攞你自己嗰條 `DEEPSEEK_API_KEY`（新戶口有一次性免費額度，唔使信用卡），換入 server env——同你今日 Step 04 做過嗰個動作一模一樣。換完 Rewrite 先跑得郁。

再出兩篇嗰陣**唔使重新搵料**，用你今日已經收集咗嘅卡就得。

## 冇 token／冇 key 嘅同學（Dry-run track）

你一樣有功課，而且一樣入到第七堂：

1. 用 `fixtures/feed-cards-sample.json` 再行兩次 Composer → dry-run → 你批準，停喺「已批準」。每次寫低「我而家差邊一件嘢先出到街」。
2. 開自動模式但 kill switch 保持開，睇 runs log 寫住停咗（對照 `fixtures/runs-log-sample.json`）。
3. 三行數字表用 `fixtures/analytics-sample.csv` 填，全部標 DEMO。
4. 六格：用 `tools/six-box.html` 打你自己嗰句，寫低邊幾格要新起。

DEMO 數字唔會當成你嘅成績；第七堂會用佢行一次 loop 嘅動作，你自己嘅數字幾時到，幾時換返入去。
