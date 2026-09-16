# HOW-TO-RESTORE — 三步

所有幕嘅完成版 code 都喺同一個 branch：`l6-release`（PersonalOS/ 入面）。
Checkpoint 唔係五份唔同嘅 code，係「同一份 code ＋ 你部機資料庫行到邊」。

1. 喺你部 app 嘅 repo（或者 clone `class6demo`）：
   ```bash
   git fetch origin && git checkout l6-release
   cd PersonalOS && npm ci && npm test        # 104/104
   ```
2. `.env.local` 照舊（`npm run setup:env` → 填值 → `npm run check:env`）；**`STUDENT_TOAPI_BUDGET_CREDITS=100`**。
   如果你之前用過 `20`，刪咗 `.student-data/_toapi-budget.json` 先，佢會記住舊上限。
3. `npm run dev`，登入，由對應嗰幕嘅 Step 繼續：

| 你追唔切邊幕 | 由邊個 Step 繼續 | 資料庫要有乜（頁面撳一次就有） |
|---|---|---|
| 第一幕 | Step 03 | Inspiration → 搵靈感（冇 key 會出 DEMO 五張）→ 標一張今日來源 |
| 第二幕 | Step 06 | Settings → 三條 voice rules 保存 |
| 第三幕 | Step 09 | Connections 頁讀到身份（或 fixture）；`THREADS_*`／`UPLOAD_POST_API_KEY` 入 env |
| 第四／五幕 | Step 16 | Composer → 我把聲 → Queue 見三張 draft；一張 dry-run → 批準 |

唔想真出帖但想行齊成條路：
```bash
node scripts/mock-publish-api.mjs &     # 假 Threads + 假 Upload-Post，port 4802
THREADS_BASE=http://127.0.0.1:4802 UPLOAD_POST_BASE=http://127.0.0.1:4802 \
THREADS_USER_ACCESS_TOKEN=MOCK THREADS_USER_ID=2362669794238644 UPLOAD_POST_API_KEY=MOCK npm run dev
```
