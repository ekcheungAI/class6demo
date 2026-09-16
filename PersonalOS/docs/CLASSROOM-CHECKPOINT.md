# 課堂交接｜資料庫及 Sheet 匯入已驗證

這是按實際證據更新的狀態；未驗證項目保留「未驗證」。不填任何 keys、私人資料或本機路徑。

- 模板版本：0.1.0-rc1；固定 schema lock：0.1.0-rc4（SHA-256 已核對）
- 自己的repo／branch：`Leo-LFAI/personalos-class05-leofongai`（private）；branch `main`；origin 已核對
- 課前整合及env：已驗證（指定 Supabase project、Google Sheet、GitHub、Vercel 只讀；本機 env 格式通過）
- 固定Supabase結構／app登入：固定 `01-bootstrap.sql` 已於全新空 project 成功執行；7 張 public 表均啟用 RLS、2 個 private Storage buckets、7 個 runtime functions 已讀回。自己的 App user 已登入，唯一 owner workspace 已由既有初始化函數建立並讀回。
- Sheet匯入／讀回：全批已驗證（2 Sources、4 Runs、12 Posts、34 Media）；試批及全批 owner-scoped SQL 重跑均無重複，ID、原文、帖子 URL、34 個 Drive links、5 份已有分析及反推 prompt 已讀回，關聯 orphan 為 0。PersonalOS Inspiration 重新整理後顯示 12 篇帖子及 2 個 accounts。
- Feed／RSS：已設定並驗證 5 個來源（Google AI Blog、OpenAI News、MIT Technology Review、Ars Technica、BBC Business）；每個手動抓取 3 篇，Supabase 讀回 5 個 RSS sources、5 個 runs、15 篇 posts，Feed 顯示 15 stories。Tavily key 未配置且模板未接入，未作 Tavily 呼叫；Finance 來源沿用現有 `news` 分類顯示於 World。
- 品牌保存／讀回：已連接指定 Company Vault；本機私有 company／voice／look 快照已建立，可分享的 brand context 及 `my-branding-skill` 已對齊確認摘要。Owner 確認的品牌設定已由 PersonalOS 既有保存流程寫入並讀回 Supabase：Ommi Brain 7/7、直接實幹、Instagram＋Threads、繁體中文（香港）、深黑＋紫色 Look、`leofongai` 文字 watermark。Vault 原始 `needs_review` 狀態保留，未改 Vault canonical files。
- 中途push：已驗證；private origin／`main`、92 tests、production build、敏感檔排除及本機／遠端 HEAD 一致均已核對（實際 commit 以 Git 讀回為準）
- 文字／圖片／腳本／Newsletter保存：單平台 Threads 文字 live test 已驗證；`deepseek-v4-flash` 回應 2470 tokens，Creator Studio 顯示結果、Supabase job completed／draft 已保存、Queue 重新讀取仍有 1 份 Draft。雲端 budget ledger committed 20、dashboard 顯示剩餘 80；實際 credits 尚未 settlement，費用待帳單核對。今次輸入為 dashboard 功能測試文字，並非已確認 Instagram 來源 brief；四輸出批次、Instagram、Video Script、Newsletter及圖片仍未驗證，未重複生成。
- 最後tests／build：未驗證
- 堂尾push：未驗證（最終commit從Git HEAD及遠端核對）
- 個人部署資格：按RELEASE-GATES的學生檢查核對；未核對
- 未完成項目／下一步：建立自己的 private GitHub repo，完成中途 commit／push checkpoint；之後按已確認品牌做一批文字成果。Performance advisor 對固定模板提示 `posts → runs` 複合 foreign key 缺 covering index；未改 schema，待老師決定。
