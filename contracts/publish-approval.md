# publish-approval.md — 批準同三個 ID

## 批準

`approval_hash = sha256(account_id + content_hash + join(attachment_ids))`

- 批準前必須有 dry-run 包：目標帳戶、全文、`content_hash`、附件清單、「公開後會發生乜」。
- 任何一項變（改一個字、加一張圖、換帳戶）→ `approval_hash` 唔對 → 狀態跌返 `draft`。
- 批準係本人喺 UI 按，唔係 Agent 填。

## 發布（一次一張卡）

1. 執行層再核對：`approval_hash` 對得上、`publish_status = approved`、今日未超 cap、無同 `idempotency_key` 嘅紀錄。
   `idempotency_key = sha256(workspace_id + card_id + content_hash)`；撞 key → log `duplicate, skipped`，唔發。
2. 經 provider 發：
   - `threads_direct`：建立 container → 取 `creation_id`（= `submitted_id`）→ publish → 取 media id（= `published_id`）→ 讀 permalink。
   - `upload_post`：送一次 → 取 request id（= `submitted_id`）→ 查狀態 → 取平台 post id／url（= `published_id` / `public_url`）。
3. `submitted_id` 同 `published_id` **分開**寫入卡。
4. verify 查到 → `published`；查唔到 → `unknown` + 一次自動 re-verify；仍未知 → 留 `unknown`。

## 成功定義

「API 回 200」只代表 request 冇壞；「有 submitted_id」只代表對方收到。只有喺平台用同一個 `published_id` 讀返到帖，或者 `public_url` 手機開得到，先叫 published。

## 三個 ID 對照

| 名 | 邊度嚟 | 意思 |
|---|---|---|
| submitted_id | 發出後即時回傳 | 收到 |
| published_id | verify 查到 | 出咗街 |
| （無） | verify 查唔到 | UNKNOWN：先查，唔再發 |

## 路線同平台

- **Threads**：`threads_direct`（學生自己嘅 token）或 `upload_post`（Pro）。兩條路都要做同一個 dry-run，都要攞返三個 ID。
- **Instagram**：只走 Upload-Post，而且**Instagram 一定要有圖**——冇 attachment 嘅卡唔可以攞批準。
- **Newsletter**：存檔，冇發布動作，唔會產生 published id。

批準綁住 `platform` + `publish_route` + 內容版本。三者任何一樣改咗，舊批準即時失效，要重新 dry-run。
