# START HERE — Lesson 6 專案形狀

呢個 ZIP **唔係** starter app。你嘅 app 係上堂嘅 PersonalOS。呢個資料夾放喺 PersonalOS 旁邊（或者 `docs/lesson-06/` 入面），作用係：

1. `AGENTS.md` — 今堂附加規則（AI 嘅規則書）。
2. `contracts/` — 五份合約：靈感卡、voice rules、Composer 狀態機、批準定義、Queue 欄位。AI 唔准自己發明 schema。
3. `fixtures/` — 教學示例：五張靈感卡、一篇文章、身份樣本、舊 id、runs log、分析 CSV、key 變數名範例。全部 DEMO，唔係真資料。
4. `checkpoints/` — 每幕完成後嘅已知良好狀態；跟唔切就 copy 入去，全班對返同一個位。
5. `skills/personalos-research` — 一個 skill 包住三個搜尋 API：**Exa 搵候選 → Firecrawl 讀正文 → Tavily 核對 → 打分出卡**，每輪有硬上限（Exa 1 次、scrape ≤3 頁、Tavily ≤2 次、≤5 張卡）。第一幕安裝，唔好手砌 request。
6. `work/` — 空殼，全部預設 `TBC`；未 build 前保持空白。
7. `homework/` — Step 99。

## 三個 track

| Track | 你有乜 | 今日出到街？ |
|---|---|---|
| Pro | Upload-Post API key，已連 ≥2 平台 | 出多個平台 |
| Free | 自己 Meta App 嘅 Threads user token | 出 Threads |
| Dry-run | 當日冇匙或卡住 | 行到「已批準」就停，寫 `SKIP · DRY-RUN TRACK` |

## 老師派嘅 key

`CLASS06-API-KEYS.env`（`EXA_API_KEY`／`FIRECRAWL_API_KEY`／`TAVILY_API_KEY`／`DEEPSEEK_API_KEY`／`TOPAPIS_API_KEY`）放 `private-credentials/`。Codex 只會合併變數名入 env，唔會顯示值。唔貼 chat、群組、截圖；唔入 Git。

## 卡住

貼學生筆記頂嗰條救援 prompt。不要亂按、不要重裝、不要自行授權、不要貼 key。
