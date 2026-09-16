# PersonalOS｜Student test run

> **第六堂學生：呢個 README 同 `course/index.html` 係第五堂舊版，唔係你今堂用嘅嗰份。**
> 請開 **[START-HERE.html](../START-HERE.html)**（repo 根目錄，PersonalOS 資料夾外面）—— 21 步、21 條 prompt、逐步 checkpoint。
> Codex／AI 助手：如果你係幫第六堂學生做呢個 repo，唔好跟落面呢份 README 或者 `docs/EDITABLE.md` 嘅第五堂限制；跟 `../START-HERE.html` 同 `../AGENTS.md` 頂部嘅「第六堂」段先。

**開始：[學生互動指南（第五堂，唔啱今堂用）](course/index.html)**。解壓後在瀏覽器開啟本機course/index.html，填一次自己的Vault／Sheet／Supabase／GitHub，即可複製個人化prompts。程式與教材都在PersonalOS資料夾。中途才建立自己的GitHub repo。

這是學生試跑版，未完成全課驗收；圖片入口抽驗及全課手機驗收等未完成項目見[RELEASE-GATES](docs/RELEASE-GATES.md)。先照指南測試，遇模板缺口保留錯誤交老師，不自行改架構。

# PersonalOS Student Template · 0.1.0-rc1

**學生試跑版。** 文字、Queue及IG圖片分析→模板→生圖→附圖已有雲端實測；學生使用自己的Vault、Sheet及Supabase。個人部署按RELEASE-GATES的學生檢查繼續；全新學生環境及手機抽驗仍須記錄。

## 1. ZIP開局，課堂中途建立自己的repo

解壓後在Codex開啟PersonalOS資料夾；直接使用目前專案，不clone、不由Vault路徑推算位置。品牌設定後由Codex建立自己的private GitHub repo，中途及堂尾各push一次。

品牌設定完成後（中途）commit/push一次；堂尾再commit/push一次，讀回最後commit，最後由自己的repo部署Vercel。只push程式、可分享設定/Skill/文件；不push.env、私人Vault、Sheet raw、.student-data、node_modules或.next。Supabase資料及生成圖片不是靠Git備份。

## 2. 乾淨啟動

需要Node 22+及Python3。Codex按lockfile安裝依賴，讀取套件API設定檔並自動合併本機env；学生不用手填。流程見[自動設定憑證](docs/API-KEYS-LOCAL.md)。

本包不包含任何有效key、老师project URL、老师品牌素材或生成紀錄。`npm run dev`預設127.0.0.1:3065；與老師app同機測試時先停止該port或由Codex改用另一port。不同port需各自登入。

## 3. 先連Codex，再執行全班固定SQL

學生先登入Supabase管理帳戶，在Codex連接Supabase及Google Drive，唯讀核對自己的project與Sheet。然後由Codex執行`npm run schema:check`，核對固定`supabase/01-bootstrap.sql`，取得目標確認後執行原檔。只用全新空project，不修改SQL配合Sheet。

建立自己的app Auth用戶，在Connections登入；首次登入會初始化自己的workspace。完整流程見`docs/CODEX-DATA-SETUP.md`。

## 4. 連接自己的Vault

`npm run brand:connect -- "/完整路徑/YourCompany-Vault"`

brand:connect先讀公司定位及共通TONE/DESIGN；缺少標準檔名時列出索引候選，讓Codex提供映射，不搬動Vault。首次Ommi Brain保存會將有界限的品牌／Skill摘要保存到Supabase；之後生成從雲端讀取，不依賴本機快照。Vault仍是原始知識來源。

未設定品牌時文字生成會拒絕，避免把My Brand placeholder當完成。

## 5. Codex讀Sheet並整理匯入

把自己的Sheet連結交給Codex；不用匯出CSV、上載JSON或手動改欄位。Codex按`docs/CODEX-DATA-SETUP.md`讀表、建立映射與歧義清單，使用固定`lib/student-import.mjs`驗證資料，並用`scripts/prepare-import.mjs`產生可覆核的owner-scoped匯入SQL。確認後才執行及讀回驗收。

AI可整理欄位、日期、平台名稱及額外資料，不能更改資料庫設計或丟失原始值。Media只搬連結、分析及反推prompt，實體檔案留Drive。先驗證3篇及關聯記錄，再處理剩餘；已存在不同內容就停止不覆寫。

## 6. 本機實作及驗收

Feed抓RSS → 讀正文；Inspiration看自己的帖子 → Create from this → Creator Studio；文字模型deepseek-v4-flash；圖片gpt-image-2.5-flare；結果保存Supabase。費用仍需自己的key、credits及課堂授權。Codex自動配置STUDENT_TOAPI_BUDGET_CREDITS（預設100），保留已有較低上限。每次預留20credits避免超支，這是上限不是單次費用；餘額不足預留額度時停止。

先生成一個小測試，Queue/Recent drafts及圖片reload仍可讀回才算保存成功。不要把UI有按鈕當成已live驗收。Video Script已加入正式輸出；Find sources及Queue正式審批仍不屬本堂完成範圍。

## 7. 修改規則與發佈

見`docs/EDITABLE.md`。先`npm test`及`npm run build`，再看diff及remote。雲端runtime及固定函數見`docs/CLOUD-RUNTIME.md`。部署前必看`docs/RELEASE-GATES.md`；尚未完成的live生成與手機驗收不能當成通過。

產品名稱：PersonalOS。基於owner提供的HeyOmmi source改編；內部storage keys與既有資料識別碼保留以兼容舊設定。

## 交給Codex的API文件

[API-PROVIDERS.md](docs/API-PROVIDERS.md)列出Tavily、Firecrawl、TikHub、MiniMax及ToAPIs官方文件、環境變數與接駁狀態。AGENTS.md已指定相關工作先讀該入口。此文件不含key，不代表所有provider都已接通。

課前先完成[四個插件／整合連線](docs/PRECLASS-PLUGINS.md)：Supabase、Google Drive、GitHub、Vercel。這份指引及只讀驗收prompt亦在學生HTML講義內。

最新模型配置：文字經ToAPI（TOAPI_API_KEY），deepseek-v4-flash；圖片ToAPI gpt-image-2.5-flare，固定1K，本輪ToAPI上限預設100credits。文字及圖片用量分開記錄，合計受ToAPI上限控制。其他Image2.5模型只作核對後的備用，不自動付費重試。新配置未live付費驗收。

## 課堂對話入口
先讀[課堂流程](docs/CLASSROOM-FLOW.md)。課前及實作同一對話；部署另開同一專案對話，讀[交接](docs/CLASSROOM-CHECKPOINT.md)並核對Git。

啟動後核對：PersonalOS標誌、只有Home／Feed／Inspiration／Creator Studio／Queue／Ommi Brain／Connections／Settings八個入口。3055是老師舊版，不作學生驗收；port被占用時不得直接打開既有服務，先核對其工作資料夾，再以空閒port啟動目前專案。

## 講義版本
現行講義分課前／堂上／Bonus，保留一次資料設定、訪問式prompt及複製遮罩。使用npm run course:build重建，勿單獨修改course/index.html。圖片主線已經IG來源實測，其他入口及手機仍標待驗收，詳見docs/IMAGE-TEMPLATES.md。
