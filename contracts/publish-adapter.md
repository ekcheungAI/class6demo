# publish-adapter.md — 發布層要點樣接

> 呢份係 `publish-approval.md` 嘅落地版。嗰份講「乜嘢先算出咗街」，呢份講「實際 call 邊個 API、攞返邊個 id」。
> **AI 唔准自己發明 endpoint、欄位名或者重試邏輯。** 對唔上就停低問人，唔好估。

## 零、成個 adapter 只做三件事

```
approved 卡  ──▶  送出（provider 唔同，步驟唔同）  ──▶  submitted_id
                                                        │
                                                  verify 查一次
                                                        │
                                          查到 → published_id + public_url
                                          查唔到 → UNKNOWN（唔再發）
```

**adapter 唔負責批準、唔負責排程、唔負責重試。** 佢收一張已經 approved 嘅卡，送一次，然後老實報結果。

## 一、Threads（`publish_route = threads_direct`）

Threads 出帖係**兩步**，呢個分兩步嘅事實就係第五幕嘅教學重點：容器 ≠ 出街。

**步驟 1｜建立容器**

```
POST https://graph.threads.net/v1.0/{THREADS_USER_ID}/threads
  media_type   = TEXT | IMAGE | VIDEO
  text         = 帖文全文
  image_url    = 公開可讀嘅圖片 URL（media_type=IMAGE 先要）
  access_token = {THREADS_USER_ACCESS_TOKEN}
→ { "id": "..." }     ← 呢個就係 submitted_id（creation_id）
```

**呢一刻乜都未出街。** 容器係一個未公開嘅草稿盒。收到 id 之後唔好慶祝。

**步驟 2｜發布**

```
POST https://graph.threads.net/v1.0/{THREADS_USER_ID}/threads_publish
  creation_id  = 步驟 1 嘅 id
  access_token = {THREADS_USER_ACCESS_TOKEN}
→ { "id": "..." }     ← 呢個先係 published_id（media id）
```

**步驟 3｜verify（唔可以省）**

```
GET https://graph.threads.net/v1.0/{published_id}
  ?fields=id,permalink,timestamp
  &access_token={THREADS_USER_ACCESS_TOKEN}
→ permalink 就係 public_url
```

讀到 permalink 且手機開得到 = `published`。讀唔到 = `unknown`，**唔好再發**。

### 兩個要求嘅權限

| scope | 冇佢會點 |
|---|---|
| `threads_basic` | 連 `/me` 都讀唔到，Connections 頁空白 |
| `threads_content_publish` | 讀到你個名，但步驟 1 就 403 |

**「讀到自己個名」唔代表出到帖。** 呢兩個 scope 係分開發嘅——呢句就係 V2 成張 slide。

### Token 壽命

Threads 嘅 user token 有短期（約 1 個鐘）同長期（60 日）兩種。**堂上用短期 token，跑到一半會死。**
換長期：用 app secret 行一次 `th_exchange_token`（做法對返官方文件，唔好靠記憶）。
App secret **唔係出帖需要**——出帖淨係要 user token ＋ user id。佢只係用嚟換長期 token。

## 二、Upload-Post（`publish_route = upload_post`）

一次過送去多個平台，所以佢係「一個來源 → 多個平台」唯一真正落地嘅路。

**唔好靠呢份檔寫 code。叫 Codex 自己讀官方文件。**

1. 條 key 喺 `https://app.upload-post.com/api-keys` 撳 Create（只完整顯示一次）。
2. 平台喺 Upload-Post 個後台先連好；你嘅 app 只攞住一條 key。
3. 叫 Codex 去 Upload-Post 官網搵 API 文件，**讀完先講返用邊個 endpoint、邊個認證 header**，
   你 OK 咗佢先寫 code。呢個就係今日要養成嘅習慣：**唔好靠記憶改欄位名，對返文件。**

**已核實（2026-09-16，對住 `https://docs.upload-post.com/openapi.json`）：**

```
base           https://api.upload-post.com/api
認證 header    Authorization: Apikey <UPLOAD_POST_API_KEY>      ← 唔係 Bearer
讀 profile     GET  /uploadposts/users                          → { profiles:[{username, social_accounts:{threads:{handle…}, instagram:"" …}}] }
出文字帖       POST /upload_text      multipart: user, platform[], title
出圖           POST /upload_photos    multipart: user, platform[], photos[], title
                 → 同步：{ success, results:{ <platform>:{ success, url, post_id } } }
                 → 非同步（async_upload=true）：{ request_id }
查狀態         GET  /uploadposts/status?request_id=…            → { status: pending|in_progress|completed, results:[…] }
```

`social_accounts` 入面某平台係空字串 ＝ 個位有、未連。Instagram 一定要行 `/upload_photos`。

呢份合約只鎖住**行為**，唔鎖 endpoint：

- 送出之前先讀一次已連帳戶清單，確認目標平台狀態係「已連」——**未連就唔好送**。
- 一次送出 → 攞返一個 request id（= `submitted_id`）。
- 查狀態 → **每個平台各攞一個** post id／url（= `published_id` / `public_url`）。
  **送咗兩個平台就要兩組 ID；一組 ID 對兩個平台 = 有嘢錯咗。**
- Instagram 只行呢條路，而且**一定要有圖**——冇 attachment 嘅 IG 卡唔可以離開 draft。

## 三、三條唔准破嘅規矩

1. **一張卡一次。** 發之前核 `idempotency_key = sha256(workspace_id + card_id + content_hash)`。
   撞 key → log `duplicate, skipped`，唔發。**收唔到回應 ≠ 未發出去。**
2. **UNKNOWN 唔准自動重發。** 查唔到就查多一次，仍然唔知就留 `unknown` 等人。
   重發嘅代價係公開重複帖，收唔返。
3. **唔准喺 log、UI 或者錯誤訊息印任何 token 或 key 值。** 只印變數名同狀態。

## 四、今日點擺

| 幕 | 做乜 | 發布掣 |
|---|---|---|
| 第三幕（Step 06/07） | 接好線：token 入 env、adapter 裝好、只讀身份 | **關住**（`publishingEnabled = false`） |
| 第五幕（Step 12） | 老師示範發一次，三個 ID 一齊睇 | 老師台開 |
| 第五幕（Step 13） | 你發一次，只發一次 | 你自己開，發完關返 |

**接好線同開掣係兩件事。** 今日先接線、後開掣，就係點解第三幕叫「接線」唔叫「出街」。
