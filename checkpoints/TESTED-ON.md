# TESTED-ON

| 日期 | 邊部機 | 結果 |
|---|---|---|
| 2026-09-16 | Elvin 部 Mac（Claude Code），乾淨 clone `a194869` → `l6-release`，Supabase `personal-os`（asbhpmkpcvthkreyfnlk，新 auth user `l6-sandbox@…`） | `npm test` 104/104 · `next build` 過 · Class 5 baseline（Brain → RSS → Rewrite 15s → Queue）通 · Act 1 DEMO 五張卡 + 標今日來源 + high-risk 卡拒絕 · Act 2 voice rules 入 Rewrite（R1 開場先講讀者問題 ✓，facts_check 三行事實冇變）· Act 4 Composer 38s 出三張卡三個 hash · dry-run → 批準 → 改一個字批準失效 · Act 5 mock Threads 出街三個 ID 分開、重覆發被擋、UNKNOWN 唔重發、再查一次；mock Upload-Post IG 冇圖拒絕、有圖出到 · Act 6 三欄、schedule/unschedule、未批準卡 runner 唔發、kill switch 停、cap 1 擋第二篇、加自訂 RSS 抓到 6 篇 |
| — | 真 Threads token／真 Upload-Post key | **未測**（key 未入沙盒）。`/connections` 面板同 adapter 對住官方文件寫，但真 endpoint 行為要今晚用真 key 行一次 |
