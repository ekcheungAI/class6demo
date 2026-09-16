# GITHUB-LINKS — 按幕安裝，唔係開頭一次過

安裝 prompt 一律：「已有就唔好重裝；完成後話我知實際安裝位置。」未證實公開安裝路徑嘅 Skill，唔要求學生安裝。

## 第一幕（搵靈感）
- Skill：`skills/personalos-research`（已喺項目 ZIP 入面）。Prompt：「裝 `skills/personalos-research`，已有就唔好重裝；完成後話我知實際安裝位置。」
- 老師派 `CLASS06-API-KEYS.env` → `private-credentials/`；Codex 只合併變數名（`EXA_API_KEY`／`FIRECRAWL_API_KEY`／`TAVILY_API_KEY`／`TOPAPIS_API_KEY`），唔顯示值。

## 第二幕（Rewrite）
- 模板更新：`git fetch` 老師 upstream 嘅 `lesson-06` tag（老師課前公布）。Prompt：「拉老師 lesson-06 更新到我嘅 branch，唔好覆蓋我自己改過嘅檔；有衝突列出嚟等我。」
- Rewrite 引擎：**唔使裝、唔使換。** 你部機而家已經行緊 `deepseek-v4-flash`，經 `TOAPI_API_KEY` 呢條 key。設定喺 `config/course-models.json`，今日唔郁佢。
- Skill：`humanizer-zh-tw`（可選，第三幕圈套話用）— 位置：TBC（老師課前確認）

## 第三幕（Connect）
- 唔安裝任何嘢。Threads token 由學生自己喺 Meta 開發者後台攞；Upload-Post key 由 Pro 同學自己喺 Upload-Post 攞。**唔貼落任何 chat。**

## 第四幕（Composer）
- 唔安裝任何嘢；用 `contracts/composer-state-machine.md`。

## 第五幕（Post + Image）
- Threads／Upload-Post adapter：由老師 release build 提供（`checkpoints/act-5-done/` 內），學生唔安裝第三方套件。
- 圖：沿用 L5 嘅 TopAPIs 設定（`TOPAPIS_API_KEY` ↔ 模板 `TOPAPI_API_KEY`）。

## 第六幕（Queue + Schedule）
- Vercel cron：`vercel.json` 已喺老師 release build；學生功課先啟用。

## 課後（可選）
- Remotion / Seedance 片路線：TBC（老師課前確認）
