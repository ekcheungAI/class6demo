---
name: personalos-research
description: Use when PersonalOS needs to find, verify and score source material for the Inspiration feed — searching the web for a topic, reading a page into clean text, cross-checking a claim, or turning findings into inspiration cards. Wraps Exa (discover), Firecrawl (read), Tavily (cross-check) behind one routine with a fixed order, per-run caps and an evidence contract. Do not use for publishing, scheduling, or rewriting.
---

# PersonalOS Research

三個搜尋 API，一條路。呢個 skill 唔係「搵多啲嘢」，係**用最少 credits 搵到可以引用嘅嘢**。

輸出永遠係 `contracts/inspiration-card.md` 定義嘅靈感卡；唔會直接寫帖。

## 一條路，三個分工

| 步 | 用邊個 | 做乜 | 唔做乜 |
|---|---|---|---|
| ① 搵候選 | **Exa** | 語意搜尋：用你讀者要決定嘅事做 query，搵返「講緊同一件事」嘅頁 | 唔係讀全文；回傳只當線索 |
| ② 讀正文 | **Firecrawl** `/v2/scrape` | 只讀你留低嗰 2–3 條，轉成乾淨 markdown，攞到 `published_at` | 唔會爬全站、唔跟連結 |
| ③ 交叉核對 | **Tavily** | 對 claim_risk = medium／high 嘅講法，搵第二個獨立來源 | 唔會升 confidence，除非真係搵到第二來源 |
| ④ 打分出卡 | 你嘅 LLM + Ommi Brain | persona_score 0–1 ＋ 一句理由；填來源角色、信心、why_now、claim_risk | 唔會幫你揀；人揀 |

Firecrawl 亦有 `/v2/search`；**當 Exa 唔可用先用佢做 ①**，唔好兩個都跑。

## 環境變數

`EXA_API_KEY` · `FIRECRAWL_API_KEY` · `TAVILY_API_KEY`

全部只讀 server env。唔顯示、唔複製、唔記錄值；唔放 `NEXT_PUBLIC_`、chat、截圖、Git。

## 每輪上限（硬性，超額即停）

```
EXA:       1 次 search · results ≤ 8
FIRECRAWL: scrape ≤ 3 頁
TAVILY:    ≤ 2 次 cross-check（只為 claim_risk medium/high）
出卡:      ≤ 5 張
```

超過就停、寫 log、交返已有嘅卡。唔為咗湊夠五張而擴大範圍。

## Query 點砌

```
query = 讀者要決定嘅事 + 範圍詞 + 時間窗
```

- ✅「小店 用 AI 出 Threads 帖 值唔值得 過去一星期」
- ❌「AI 新聞」「最新 AI 工具」

Query 收窄一格，相關度升一級，credits 用少一半。Query 由 Ommi Brain 嘅讀者同主題砌出嚟，唔係人手作。

## 呼叫形狀（實作前再對一次官方文件）

```http
POST https://api.exa.ai/search
x-api-key: $EXA_API_KEY
{ "query": "<query>", "numResults": 8, "startPublishedDate": "<ISO>" }

POST https://api.firecrawl.dev/v2/scrape
Authorization: Bearer $FIRECRAWL_API_KEY
{ "url": "<url>", "formats": ["markdown"], "onlyMainContent": true }

POST https://api.tavily.com/search
Authorization: Bearer $TAVILY_API_KEY
{ "query": "<claim in one line>", "search_depth": "basic", "max_results": 3 }
```

> 呢啲服務會改 request shape 同 rate limit。行唔通就讀返官方文件，唔好靠記憶改欄位名。

## Fallback 次序

1. Exa 失敗 → Firecrawl `/v2/search`（`sources: ["web","news"]`, `tbs: "qdr:w"`, `limit: 5`）
2. Firecrawl scrape 失敗 → 用 search result 嘅 description，卡標 `excerpt: null`、confidence 降一級
3. Tavily 失敗 → 卡照出，但 `confidence` 唔准升，log 寫 `cross_check_unavailable`
4. 全部失敗 → 用 `fixtures/feed-cards-sample.json`，`mode: DEMO`，UI 要見到 DEMO 字樣

任何一步失敗都唔會令成個 run 失敗。冇新結果係一次**正常**嘅 run：log `no_new_sources`，唔硬造卡。

## 評分規則（唔准改）

- `source_role`：官方頁／文件／changelog = `primary`；第三方報道或測試 = `independent`；社交帖、討論 = `signal`；廠商自己講 = `marketing`
- `confidence`：primary + 第二來源（或可重現）= `high`；一個權威 primary 或兩個 independent = `medium`；一個 signal 或 marketing = `low`
- **Engagement 升優先次序，永遠唔升 confidence。**
- `claim_risk` = `high`（具名人物、裁員、安全事故、法律、醫療財務、寫死嘅配額）而又冇 `primary` → 卡標「待核實」，唔准入 Rewrite
- `published_at` 不明就留空，**唔用 `fetched_at` 代替**

## 完成定義

唔係「搵到五張」。係：重新整理頁面之後，Inspiration 仲有 ≤5 張卡，每張四樣嘢齊（來源角色、信心、why_now、persona_score + 一句理由），`published_at` 同 `fetched_at` 分開，runs log 有每個 provider 用咗幾多 credits。

## 唔做

唔發帖、唔排程、唔改寫、唔上傳、唔記錄 key、唔喺 `data/` 以外寫嘢。改寫交 `Rewrite`，出街交 `publish-approval` 合約。
