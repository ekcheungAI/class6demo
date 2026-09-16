# Codex主導資料建置與遷移

## 學生只需三個動作

1. 登入自己的Supabase管理帳戶，確認自己全新project。
2. 在Codex啟用Supabase及Google Drive連線，各自完成登入授權。連線成功必須以指定project／Sheet只讀實測，不靠插件安裝圖示判斷。
3. 依序貼講義「建立自己的資料庫與App登入」及「把上堂素材帶入新系統」的prompt，回答少量選項，核對目標及報告。毋須匯出CSV或在app上載JSON。

管理帳戶、Codex MCP授權、app Auth用戶是不同身份。建表先完成；app登入及workspace初始化之後才做資料匯入。

## 第一份固定檔：全班一樣

`supabase/01-bootstrap.sql`，用`npm run schema:check`對照`supabase/schema-lock.json`。不因學生Sheet不同改SQL，不更改lock來通過檢查。這是意外改動檢查，不是安全沙箱或「永遠無bug」保證。

Codex先核對指定project沒有業務表，再展示SQL版本及將建立的7表／RLS／private buckets／初始化函數。確認後透過已授權Supabase工具執行原檔一次。工具沒有写入權限則由學生在SQL Editor執行同一原檔；不拿publishable key代替管理授權、不關RLS。不對已存在的資料庫drop/rebuild。

## AI調整的是資料，不是schema

Codex讀取使用者指定的Sheet：分頁名、header、值、連結及樣本。中文欄位、改名、不同排列、額外分析欄位，由AI整理到Sources/Posts/Media/Runs四組資料。每欄記錄來源欄位、轉換規則及信心；遇到真正歧義先提選項，不能猜測或丟棄。

- 保留原Sheet；原始值、額外欄位可存在各行metadata.original_fields。
- 大ID當字串；缺值不當0；已精度損失的ID不可靠補數字復原。
- 所有新增ID需要可重現映射；無法核實native ID時保留stable legacy映射並標記，不能冒充真實平台ID。
- 日期／平台名稱可標準化，但保留原值。不同記錄不能僅憑相似caption合併。
- Media分析、反推prompt、Drive ID/URL照搬，實體圖片／影片不搬。
- 整理稿及私人匯入SQL放.student-data/import/，不commit。

## 固定驗證與執行

Codex建立normalized.json，頂層四個key為Sources、Posts、Media、Runs（見lib/student-import.mjs的固定欄位）。學生不用操作這個檔案。

從app登入建立自己的workspace後，由Codex核對唯一owner及workspace UUID；不選第一個候選、不替別人建資料。

`node scripts/prepare-import.mjs .student-data/import/normalized.json WORKSPACE_UUID OWNER_UUID .student-data/import/import.sql`

此指令只產生SQL及數量，不執行。Codex負責代入已核實UUID。SQL固定table/column、owner guard、型別檢查、相同ID衝突檢查及筆數核對，transaction失敗rollback。字串以SQL literal轉義，來源文字不可當SQL指令。每表最多500筆，大批先分批規劃。

先最多3篇Posts＋相關Sources/Runs/Media讓學生核對，批准後由已授權Supabase工具執行；只對指定學生project。成功再讀回原文/ID/連結/數量，重跑同批無新增。其餘按同一映射續做，保留失敗/歧義清單。

最後在PersonalOS Inspiration顯示學生帖子，確認重新整理仍在。metadata.inspiration_origin=student-import及metadata.inspiration由固定mapper產生，避免DB有資料而UI看不到。手動匯入API/CSV工具僅保留作老師排錯後備，學生主線不用。

模型及額度統一見config/course-models.json：文字deepseek-v4-flash、圖片分析qwen3.5-flash、生圖gpt-image-2.5-flare／1K，全部使用TOAPI_API_KEY，共用100credits。帖文取圖另外使用TIKHUB_API_KEY；MiniMax不是主線必填。主線已有真實驗收，剩餘抽驗項目見RELEASE-GATES.md。

## 首次app用戶
固定SQL之後、Sheet匯入之前，在自己的Supabase Authentication → Users建立email/password用戶，再於PersonalOS Connections登入。學生直接在管理頁填密碼，不放env或對話。已有用戶沿用；自己的測試用戶可用介面提供的Auto Confirm，不關全域驗證。管理帳戶不等於app用戶；workspace讀回成功才匯入。
