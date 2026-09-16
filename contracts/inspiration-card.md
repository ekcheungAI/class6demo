# inspiration-card.md — 靈感卡合約（ek-research.v1 精簡版）

「搵靈感」每次最多出五張卡。每張卡係一行；欄位唔准少，AI 唔准自己加欄。

## 欄位

| 欄 | 必填 | 值 |
|---|---|---|
| `card_id` | ✓ | uuid |
| `source_id` | ✓ | `S-NN`，跟卡走到 Rewrite、Composer、Queue |
| `title` `url` | ✓ | 原文標題同網址（一定係原文，唔係搜尋結果頁或轉載聚合頁） |
| `published_at` | | 原文發布時間；不明就留空，**唔用抓取時間代替** |
| `fetched_at` | ✓ | 抓取時間 |
| `source_role` | ✓ | `primary`（官方頁／文件／changelog／直接產物）· `independent`（第三方報道／測試）· `signal`（社交帖、討論、engagement）· `marketing`（廠商自己講，未經核實） |
| `confidence` | ✓ | `high`（primary + 第二來源，或可重現）· `medium`（一個權威 primary，或兩個 independent）· `low`（一個 signal 或 marketing） |
| `claim_risk` | ✓ | `low`（可逆嘅產品描述、有出處嘅意見）· `medium`（價格、供應、效能比較、會花時間金錢嘅操作建議）· `high`（具名人物、職位、安全事故、法律、醫療財務、寫死嘅配額） |
| `why_now` | ✓ | 一句：點解今個星期先有價值 |
| `persona_score` | ✓ | 0–1，對住 Ommi Brain 嘅讀者同主題 |
| `persona_reason` | ✓ | 一句廣東話：「同我讀者有乜關」 |
| `excerpt` | | 原文一段（≤400 字），用嚟核對事實 |
| `collector` | ✓ | `exa` / `firecrawl` / `tavily` / `manual` |
| `credits_used` | ✓ | 本張卡用咗幾多 credits；免費來源寫 0 |
| `mode` | ✓ | `LIVE` / `DEMO` |

## 邊個填邊欄

| 欄 | 邊個填 |
|---|---|
| `title` `url` `published_at` | Exa 出候選、Firecrawl scrape 確認 |
| `excerpt` | Firecrawl markdown |
| `source_role` `claim_risk` | 你嘅 LLM 按下面規則判 |
| `confidence` | Tavily 有冇搵到第二獨立來源先定 |
| `persona_score` `persona_reason` | Ommi Brain |

呢條路由 `skills/personalos-research` 執行，唔好手砌 request。

## 規則（不可刪）

1. **Engagement 升優先次序，永遠唔升 confidence。** 幾多 like 都仲係 `signal`／`low`。
2. **搜尋結果嘅摘要係線索，唔係證據。** 要引用事實，先用 Firecrawl `/v2/scrape` 讀返 `url` 原文。
3. `claim_risk = high` 嘅卡，冇 `primary` 就唔可以入 Rewrite；標「待核實」。
4. 同一 `url` 或近似標題視為同一張卡；唔會出現兩次。
5. 每輪上限：Exa 1 次 search ≤8 結果、Firecrawl scrape ≤3 頁、Tavily ≤2 次；超額停，唔為湊數擴大。
6. 冇新結果係一次正常嘅 run：log `no_new_sources`，唔硬造三張卡。

## 搜尋 query 點砌

`query = 讀者要決定嘅事 + 範圍詞 + 時間窗`
例：「小店 用 AI 出 Threads 帖 值唔值得」+ `tbs: qdr:w`（一星期內）。唔係「AI 新聞」。

## 成功定義

「Codex 話搵到五張」唔係成功。成功 = Inspiration 頁重新整理後仍有 ≤5 張卡，每張四樣嘢齊（角色、信心、why_now、persona_score+理由），`published_at` 同 `fetched_at` 分開，runs log 有 credits 數。
