# 學生可改範圍

可使用現有UI更改Ommi Brain、平台、來源／brief；可編輯brand/context.json、brand/assets-manifest.json、自己的品牌資產、.agents/skills/my-branding-skill/SKILL.md、config/rss-sources.json內來源設定。先保留來源、權利與draft狀態。

.env.local只設定自己的憑證；不commit。.student-data全部本機私人資料，不commit。生成圖片由既有Storage流程保存。

不可由學生自由改app/、components/、lib/、supabase/、package依賴、API／Auth／RLS／資料結構／導航／設計系統。超出需求由老師修改母版並測試，唔叫學生關RLS或硬解disabled功能。

固定bootstrap只在已確認的全新空project執行。私人資料公開、付費API、push及deploy按具體目標與額度授權，唔從一個品牌偏好推算授權。

最新模型配置：文字經ToAPI（TOAPI_API_KEY），deepseek-v4-flash；圖片ToAPI gpt-image-2.5-flare，固定1K，本輪ToAPI上限預設100credits。文字及圖片用量分開記錄，合計受ToAPI上限控制。其他Image2.5模型只作核對後的備用，不自動付費重試。新配置未live付費驗收。

課堂交接可更新docs/CLASSROOM-CHECKPOINT.md，只記非敏感進度；對話及操作範圍見docs/CLASSROOM-FLOW.md。此例外不授權改其他核心規則。
