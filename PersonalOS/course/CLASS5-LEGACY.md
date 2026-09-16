呢個 `course/` 資料夾（`index.html`、`prompts.json`、`flow.json`、`PROMPTS.md`、`theme.css`、`runtime.js`）
係第五堂遺留嘅生成工具＋輸出，`prompts.json` 入面只有 p1–p15，內容係第五堂（Vault／Sheet／Supabase／GitHub）,
唔係第六堂嘅 21 條 prompt。

第六堂唔好跑 `npm run course:build`（會用呢批舊 `prompts.json`／`flow.json` 重新生成第五堂內容，蓋唔到 `index.html` 頂
已經加嘅提示 banner）。第六堂真正嘅 21 條 prompt 同步驟入面：repo 根目錄嘅 `START-HERE.html`。
