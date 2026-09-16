# AGENTS.md — Lesson 6 專案規則（唯一有法律效力嘅檔）

學生唔需要學點寫呢份嘢；只需要知道佢係 AI 嘅規則書。呢份係附加規則，喺 PersonalOS 模板本身嘅 AGENTS.md 之上生效；衝突時以更嚴格嗰條為準。

## Before work

- 先讀 `contracts/`：voice-rules、composer-state-machine、publish-approval、queue-columns。合約定咗嘅欄位、狀態同成功定義，唔准自行發明。
- 未確認資料標 `TBC`；不可虛構價格、日期、案例、成效、Logo、連結、帳戶名或「已連接」。
- 每次只問學生一題；每個 Gate 完成後停低等簡短確認。
- 任何 fixture 都係教學示例，唔係真資料；輸出時標 `DEMO`。

## Work

- 你講目標，Agent 負責流程。檔案路徑、保存位置由本檔同模板 AGENTS.md 決定，唔喺 prompt 度重覆。
- Rewrite：事實、數字、來源 ID 不變；只改講法、角度、結構。改咗事實 = 失敗，要回報唔係靜靜雞出。
- Composer：每張平台卡自己一個 `content_hash` 同 `publish_status`，由 `draft` 開始。
- 批準 = `sha256(account_id + content_hash + attachment_ids)`；內容或附件一變，批準失效。
- 發布只經已測試嘅入口，一次一張卡；`submitted_id` 同 `published_id` 分開回傳；查唔到就 `unknown`，唔重發。
- 圖片：預覽免費、生成計費一次、保存到 Storage、附到卡。保存失敗恢復同一 task，唔重生。
- 每步結束列：artifact、evidence、TBC、external actions、owner、下一步。

## Safety、Done

- 預設 dry-run-no-write。發帖、排程啟用、Deploy、Domain、付費生成、真客戶資料，要本次明確批準及 destination read-back。
- Secrets 只放 server env（Vercel Environment Variables／`.env.local`）。永遠唔放 `NEXT_PUBLIC_`、chat、截圖、Git、Supabase rows、本 ZIP。唔准讀出、複製、記錄 key 值。
- 每日上限預設 1 帖；kill switch 開 → 下次 run 即停。缺少設定 = 關。
- `AI 話「完成」唔算證據`。完成 = 學生打開真實檔案／畫面／紀錄見到結果；`PASS / TBC / SKIP` 由學生填，唔由 Agent 填。
- 唔會替學生按「發」、「Generate」、「開自動」。
