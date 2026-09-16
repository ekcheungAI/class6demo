# fixtures/ — 學生嘅後備，唔只係老師嘅彩排資料

全部係教學示例，**唔係真資料**；用到嘅輸出一律標 `DEMO`。你自己動手嗰啲步驟，Step 01–13 每一步都可以用呢度嘅檔完成——rate limit、冇權限、token 過期都唔會令你做唔到堂。Step 14 嘅圖 fixture 由老師課前放入，缺就喺驗收台寫 `SKIP · IMAGE`。

| 檔 | 邊一步 | 來源／說明 |
|---|---|---|
| `feed-cards-sample.json` | Step 01–02（冇 key／被 rate limit） | 五張 DEMO 靈感卡，每種來源角色一張＋一張 high risk |
| `CLASS06-API-KEYS.env.example` | Step 00 | 只有變數名；真檔由老師私下派，唔喺 ZIP |
| `source-article-S-06.md` | Step 04, 09 | 虛構工具介紹，三個事實 F1–F3；用嚟證明 Rewrite 唔改事實 |
| `brain-sample.md` | Step 03（冇 Brain 者） | 一份 DEMO 品牌設定，抽得出三條規則 |
| `threads-identity-sample.json` | Step 06（冇 token 者） | `/me` 形狀嘅回傳，帳戶係 `demo_student`，已遮蔽 |
| `upload-post-integrations-sample.json` | Step 07（Free 同學睇） | 已連平台清單形狀；兩個已連、一個未連 |
| `stale-submitted-id.json` | Step 12 | 一個查唔到嘅舊 id，用嚟示範 UNKNOWN |
| `runs-log-sample.json` | Step 17 | 三行 runs log，最後一行係 kill switch 停 |
| `analytics-sample.csv` | Lesson 7 入場後備 | 三篇帖 × 三個數字，有缺值 |
| `brand-image-sample.png` | Step 14 後備 | **由老師課前放入**（唔喺本 pack 內；缺就標 `TBC · IMAGE FIXTURE`） |
| `brand-video-sample.mp4` | Step 15 | **由老師課前放入**（11s：logo／文案卡／CTA；缺就 Step 15 用口述） |

老師課前要親自打開每一個檔一次。
