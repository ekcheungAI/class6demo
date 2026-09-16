# contracts/ — 令 AI 唔可以即興嘅六份檔

| 檔 | 定咗乜 | 邊一步用 |
|---|---|---|
| `inspiration-card.md` | 靈感卡欄位、來源角色、信心、claim_risk、每輪上限；engagement 唔升信心 | Step 01–02 |
| `voice-rules.md` | 三條講法規則嘅格式、適用範圍、正反例；事實不變條款 | Step 03–05 |
| `composer-state-machine.md` | 平台卡欄位、`content_hash` 計法、狀態機 | Step 09–11 |
| `publish-adapter.md` | 實際 call 邊個 endpoint、攞返邊個 id：Threads 容器→發布→verify 三步、Upload-Post 一次送多平台；三條唔准破嘅規矩 | Step 06–07 裝，12–13 開 |
| `publish-approval.md` | 批準 = 帳戶+hash+附件；submitted／published／unknown 定義；成功定義（adversarial） | Step 10–13 |
| `queue-columns.md` | Queue 欄位對應狀態、必填欄位、UNKNOWN 放邊 | Step 16–17 |

合約係模；學生填嘅係內容。改合約 = 改咗全班嘅骨架，課堂唔改。
