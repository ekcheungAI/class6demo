# queue-columns.md — Queue 三欄

| 欄 | 對應 `publish_status` | 卡上必須顯示 |
|---|---|---|
| DRAFT | `draft`, `approved` | platform · content_hash · 批準狀態（未批／已批）· 附件縮圖 |
| SCHEDULED | `scheduled`, `submitted`, `unknown` | 排期時間＋時區 · provider · submitted_id · `unknown` 標「待查」＋「再查一次」掣 |
| PUBLISHED | `published` | published_id · public_url（可撳）· verified_at |

規則：
- `scheduled` 只係已安排；到時由 runner 發（見 `runs`）。取消排期 → `draft`。
- **出街只有一條路：queue。** 卡離開 DRAFT 之前要揀定 `publish_route`（`threads_direct` 或 `upload_post`），一張卡一條路。
- `unknown` 卡**留喺 SCHEDULED 欄**，唔會自動跳去 PUBLISHED。
- 「重新讀取」由 Supabase 再讀；重新整理後仲喺度先算保存咗。

## runs（自動化紀錄，第五幕／功課）

`id · workspace_id · started_at · trigger(manual|cron) · idempotency_key · status · cards_published · cards_unknown · credits_used · log(jsonb)`

- 設定：`autopilot_enabled=false`（預設）· `daily_post_cap=1` · `kill_switch=false`
- 缺少設定 = 關。kill switch 開 → 下次 run 第一行 log `stopped by kill switch`，其他乜都唔做。
