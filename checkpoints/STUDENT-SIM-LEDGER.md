# Student-sim ledger — clean clone of class6demo main e40b11b · real keys · fresh student account · agent = fresh-context Claude Opus (stand-in for Codex)

| Step | 時間 | Before | Agent 做咗 | Checkpoint（我用 API 核對） | 判定 |
|---|---|---|---|---|---|
| 00 | 2.4 min | env 得 Class 5 嘅 7 條；Brain unconfigured；Queue 0 | 只 append 三條搜尋 key + PREVIEW=1；TOPAPIS→TOAPI 對返；冇印值 | check:env PASS；`/api/content` enabled:true | ✅ |
| 01 | 10 min（中途 agent API error 斷一次，「繼續」後完成） | 冇 research 功能 | 裝 skill、`lib/research.mjs`、`/api/inspiration/research`、Inspiration 頁尾「搵靈感」區、9 個 test；存入現有 sources/posts/runs 表 | API 讀回 5 張 LIVE 卡（exa 1／firecrawl 3／tavily 1）；`/inspiration` 200；tests 106/106 | ✅（persona_score 係規則版，冇用 LLM 打分——合約容許） |
| 02 | 12 min | 5 張卡，冇「今日來源」概念 | 出咗五張對照表（唔幫揀）；學生揀完，agent 加咗 `markToday`（posts.metadata.today_source）＋ panel ★ 標記＋綠框；tests 106/106 | 學生揀「score 最高」打和兩張 → agent 用理由對返 S-04，並問「想要 S-01 講聲」 | ✅（第一、二幕合共 ~25 min，run sheet 28 min——用 Codex 加人手操作會爆時） |
| 03 | 13 min（slot 6 min） | Brain unconfigured；voice-rules.md 係 TBC 骨架 | 用 fixtures/brain-sample.md 抽三條 R1–R3（DEMO），先俾睇、學生改 R2 一個字後存去 `work/voice/voice-rules.filled.md`，CONFIRMED | 檔案存在、三條規則各有適用／唔適用／正反例、本人確認欄有改字 | ✅ 但慢：agent 花咗大量時間讀 Brain／合約 |
| 04 | 21 min（slot 6 min） | Rewrite 只識 RSS 來源、通用 respin | 新 `lib/voice-rules.mjs`（讀 filled.md、事實核對）、rewrite route 加 today/cardId 路徑、panel 加「用三條規則改寫」＋並排＋核對表；tests 111/111 | Queue 有 Instagram＋Threads 草稿（deepseek-v4-flash），開場係讀者問題，末行「來源：S-04」；但多咗一份廢 DEMO 草稿（agent 第一次 reader 讀唔到網域） | ✅ 功能；⚠️ 時間 3.5×、多用 3 次 ToAPI、留咗廢稿 |
| 05 | ~1 min | — | 三欄表 10 行，兩行標紅（改述超出原文），冇改稿；Quiz 2 答啱 | 表最少三行 ✓；「事實」欄有紅 → 學生要決定叫佢改返（教材預期咁樣） | ✅ |
| 06 | ~1 min | 我故意將 THREADS_USER_ID 改做舊 run sheet 個錯數字（2362…） | agent 只 call /me + debug_token，分清三個可能，正確指出「id 貼錯（16 位 vs 17 位）」，冇印 token；仲提醒呢條係老師示範帳戶 | matchesEnv false → 學生照指示改返 → true | ✅ 診斷 prompt 好用 |
| 07 | ~1 min | key 已入 | 報 Apikey 入到、profile 88cashbackhk 連咗 x/threads/ig；冇幫連；提醒係老師示範帳戶 | 面板顯示 profile + 認證格式 ✓ | ✅ |
| 08 | — | 導師示範（只讀） | 跳過（同 06/07 已核） | — | — |
| 09 | 27 min（slot 12 min） | 冇 Composer／content_hash | `lib/composer.mjs`、`components/composer-panel.tsx`（掛喺 Inspiration 頁）、record 加 `composer.cards[]`（合約欄位齊）、queueEdit 會重算 hash 並退 draft；tests 114/114 | Queue 讀返 1 張 threads 卡 `a19bbf41d738` draft（只出 Threads，按學生揀）；舊兩份草稿冇 hash | ✅ 功能；⚠️ 時間 2.3× |
| 10 | 4 min | 冇 dry-run | `lib/publish-dryrun.mjs`、`/api/publish/dry-run`、Queue 卡「發布預演」摺疊區；204/500 字、idempotency、兩條路線各自帳戶同「公開後會發生咩」、阻擋清單（未揀路線）；tests 117/117 | 預演包齊帳戶／全文／hash／附件；冇 call 公開 API | ✅ |
| 11 | 6 min（含補批準掣） | **冇「批準」掣**——Step 10 prompt 只叫做 dry-run，notes Step 11「跟住做」卻叫學生按批準 | 學生講「搵唔到批準掣」→ agent 認漏，加咗 `/api/publish/approve` + 預演包底部「批準呢個版本（本人按）」；我以學生身份 dry-run→批準→改一個字→保存；agent 讀返舊 hash a19b… → 新 4f6d…，approved → draft，approval_hash 清空；tests 118/118 | 兩個 hash 唔同、批準狀態跌返未批 ✓ | ✅ 但 **教材要改**：Step 10 prompt 加「並加一個『批準』掣」或 Step 11 跟住做寫明「冇掣就叫 Codex 加」 |
| 12 | — | 導師示範 | 跳過 | — | — |
| 13 | 4.4 min（slot 11） | **冇 publish 入口**（template 冇） | agent 由 contracts/publish-adapter.md 起 `lib/publish-threads.mjs` + `/api/publish/send`（confirm:true、submitted 先落庫、verify、再查一次、409 防重發、kill switch env），先用 mock 測，再真出一次 | **真出街** submitted 18113517047060734 → published 18169600993404774 → https://www.threads.com/@88cashback/post/DdV8qgolZ_u（Graph API 讀返 ✓）；再發 → 409 | ✅ 出色——證明 contract 寫得夠清楚 |
| 14 | 6 min | Brain 未存雲端（fresh clone）、fixtures 冇 brand-image-sample.png | **生唔到圖**：`/api/image` 要求「先在 Ommi Brain 保存品牌摘要到雲端」，而 fresh clone 嘅 Brain PUT 又要求先接 Vault → 死鎖；fixture 圖又唔存在 → agent 照 prompt 寫 `SKIP · IMAGE`，冇扣額度 | 卡冇圖 | ⚠️ **教材／template 要改**：(1) `fixtures/brand-image-sample.png` 要放入；(2) fresh clone 要有得存 DEMO Brain 到雲端，否則 Step 14／19 同第五堂生圖全部行唔到 |
| 15 | — | 導師示範 | 跳過 | — | — |
| 16 | 7 min | Queue 兩欄 | 讀返 DRAFT 5／SCHEDULED 0；用現有 schedule 動作排 3d3a6c49 Threads 明日 21:00 HKT（UTC 13:00）；publishingEnabled false | 重新整理仍喺 SCHEDULED ✓；我以學生身份取消 → 返 draft ✓（呢步靠 main 上嘅 `content:` row fix，否則會「找不到此workspace請求」） | ✅ |
| 17 | 11.4 min（slot 15） | 冇設定頁 | `sources` 表 `system:student-settings` 一行；`/settings` 加「第六堂設定」四段；rewrite／feed／publish 每次執行前讀；autopilot 強制關（PUT true → 403）；預設 40 個 RSS 照留；tests 124/124 | settings 讀返三條 rules、cap 1、kill 關；feed 仍 40 來源 | ✅ |
| 18／19 | — | 選做 | 未跑（時間） | — | — |
