# Student Template v0.1.0-rc1

## 第六堂 override（讀呢段先，先過落面舊規則）
第六堂（由 queue 出街／自訂設定）嘅 Step 09、16、17、18、19 明文要求加新 component、新 lib 檔、新 API route
（Composer 面板、排期、設定頁、追蹤社交帳戶、Brain 生圖）。呢幾步**獲授權修改／新增 `app/`、`components/`、`lib/`**，
跟對應嘅 `contracts/*.md` 做；唔改 `supabase/`schema、唔改 Auth／RLS、唔加 package 依賴。第六堂以外嘅其他規則（唔提交
.env、唔改 Vault／Sheet 匯入邏輯等）繼續有效。呢個 override 只適用於 `../START-HERE.html` 21 步當中明確要求「加」嘅步驟；
其他步驟（讀身份、只讀核對）跟返舊規則唔改功能。

先讀README及docs/EDITABLE.md。來源是學生自己的Vault及Sheet；不使用老師帳戶。
只可修改README列明的品牌/config設定，不新增功能或改導航、API、schema、Auth、保存或依賴。超出要求提出既有功能替代方案。
固定bootstrap僅用於已確認的全新空Supabase project；不得在老師project執行。保留RLS。正常App owner保存經既有API完成。Sheet遷移按docs/CODEX-DATA-SETUP.md，由Codex透過已授權Supabase工具執行固定驗證器產生的owner-scoped匯入批次；只改資料，不改schema。
不得commit .env.local/.student-data、原始CSV/JSON、私人Vault或生成紀錄。先核對diff再push。
現有試跑版已有Vercel部署與主線驗收。學生按docs/RELEASE-GATES.md的個人部署檢查繼續試跑；全課未驗項目照實記錄，不將歷史LOCAL REHEARSAL字樣當成一律禁止部署。

## API文件路由
處理任何provider的設定、測試、排錯或接駁前，先讀docs/API-PROVIDERS.md對應項目，再核對該provider最新相關官方文件；不猜endpoint、參數或模型。只讀今次需要的項目。備用provider不自動啟用，官方文件與key存在不授權花費或修改固定架構。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
