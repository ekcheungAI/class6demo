# composer-state-machine.md — 排版台合約

## 平台卡欄位（每張卡一行；一個來源出 N 張）

| 欄 | 必填 | 說明 |
|---|---|---|
| `card_id` | ✓ | uuid |
| `source_id` | ✓ | 來源 ID（例 `S-06`），永遠帶住 |
| `platform` | ✓ | `threads` / `instagram` / `newsletter` / … |
| `content` | ✓ | 該平台版本全文 |
| `content_hash` | ✓ | `sha256(platform + "\n" + content)` 前 12 位；內容一改即變 |
| `attachment_ids` | | 圖／片嘅 Storage id 陣列；預設 `[]` |
| `publish_status` | ✓ | 見狀態機；預設 `draft` |
| `approval_hash` | | 見 `publish-approval.md`；預設空 |
| `provider` | | `threads_direct` / `upload_post`；批準時先填 |
| `submitted_id` `published_id` `public_url` `verified_at` | | 發布後由系統填；學生唔手填 |

## 狀態機

```
draft → approved → submitted → published
                 ↘           ↘ unknown → (verify) → published | unknown
   any edit to content/attachments → draft (approval_hash cleared)
```

- `draft`：Composer 出嚟就係咁；可改。
- `approved`：本人睇過 dry-run 並簽名；`approval_hash` 已填。
- `submitted`：發布入口收到；有 `submitted_id`；**未算出街**。
- `published`：verify 查到平台真係有；有 `published_id` + `public_url`。
- `unknown`：submitted 後 verify 查唔到；唯一下一步係再 verify；**唔准再 submit**。

## 成功定義（寫得刻薄啲）

「Composer 話已生成」唔係成功。成功 = 重新整理頁面後，Queue 讀返 N 張卡，每張 `content_hash` 唔同，`publish_status = draft`，`source_id` 一樣。

## 發布路線（publish_route）

| `platform` | `publish_route` | 規則 |
|---|---|---|
| `threads` | `threads_direct` 或 `upload_post` | 兩條路都得；兩個都設定咗，卡上要揀一條，唔准兩條一齊發 |
| `instagram` | `upload_post` | 只有呢條路。冇 Upload-Post key 就停喺 `draft`，UI 寫明原因 |
| `newsletter` | `none` | 存檔，永遠唔出街 |

**硬規則：`platform = instagram` 嘅卡，`attachments` 至少要有一張圖，先可以離開 `draft`。** 冇圖就唔准 `ready`、唔准 `approved`；UI 要講「Instagram 一定要有圖」，唔好靜靜雞失敗。

`publish_route` 同 `approval_id` 一齊鎖：改路線 = 改版本 = 舊批準失效。
