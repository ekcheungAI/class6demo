# Student Template v0.1.0-rc1
先讀README及docs/EDITABLE.md。來源是學生自己的Vault及Sheet；不使用老師帳戶。
只可修改README列明的品牌/config設定，不新增功能或改導航、API、schema、Auth、保存或依賴。超出要求提出既有功能替代方案。
固定bootstrap僅用於已確認的全新空Supabase project；不得在老師project執行。保留RLS。正常App owner保存經既有API完成。Sheet遷移按docs/CODEX-DATA-SETUP.md，由Codex透過已授權Supabase工具執行固定驗證器產生的owner-scoped匯入批次；只改資料，不改schema。
不得commit .env.local/.student-data、原始CSV/JSON、私人Vault或生成紀錄。先核對diff再push。
現有試跑版已有Vercel部署與主線驗收。學生按docs/RELEASE-GATES.md的個人部署檢查繼續試跑；全課未驗項目照實記錄，不將歷史LOCAL REHEARSAL字樣當成一律禁止部署。

## API文件路由
處理任何provider的設定、測試、排錯或接駁前，先讀docs/API-PROVIDERS.md對應項目，再核對該provider最新相關官方文件；不猜endpoint、參數或模型。只讀今次需要的項目。備用provider不自動啟用，官方文件與key存在不授權花費或修改固定架構。
