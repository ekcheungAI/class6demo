# Class 5｜老師時間表 · 新主線

## 發班狀態
講義流程已重排；圖片分析、模板及Queue附圖已經IG來源完成真實驗收；其他入口及手機仍待抽驗。不可將規劃畫面當可用功能。先完成docs/IMAGE-TEMPLATES.md對照的產品及真實測試，再移除試跑標示。

## 課前完成
唯一開局：ZIP解壓，Codex開目前PersonalOS專案。一次填Vault、Sheet、Supabase、GitHub；Codex合併老師提供的API設定檔，不叫學生手填env。四個整合：Supabase、Google Drive、GitHub、Vercel。固定SQL→建立app Auth用戶→Connections登入→Sheet匯入及讀回，都在課前完成。GitHub自己的repo在堂上中途建立。不存在clone老師repo開局。

| 分鐘 | 學生動作／驗收 |
|---|---|
| 0–10 | 完成品Demo：品牌→內容→模板→Queue→線上 |
| 10–20 | 核對自己的素材、workspace與App；補救走獨立課前流程 |
| 20–40 | Vault品牌訪問、確認受眾／語氣／Look |
| 40–50 | 保存Ommi Brain／Skill，建private repo，中途commit／push |
| 50–70 | 同一brief，兩平台＋Video Script＋Newsletter一批生成；Queue讀回 |
| 70–80 | 休息／補進度 |
| 80–100 | 示範上載／貼圖／IG、小紅書、X；每人一張圖分析 |
| 100–115 | 選保留風格、品牌化、命名保存模板 |
| 115–135 | 選模板生成一張1K圖片、保存並附Queue |
| 135–150 | 文案／配圖QA；修改一次，排期／取消排期，刷新讀回 |
| 150–155 | 堂尾tests/build、commit／push、非敏感交接 |
| 155–170 | 同一專案新部署對話；Codex配置Vercel並部署 |
| 170–180 | 關本機，手機登入、讀回成果；不為Demo重複生成 |

## 模型與費用
Codex操作模型每卡標GPT-5.6 Terra Medium，不塞進prompt正文。App文字deepseek-v4-flash；圖片分析qwen3.5-flash（IG主線已實測）；生圖gpt-image-2.5-flare／1K。三者ToAPI合計100credits，保留已用與未知預留。TikHub另計、沿用老師授權額度。每個付費步驟學生在App確認，Codex只協助設定／解釋／排錯。課堂一批四份文字＋一次分析＋一張圖片；不強制二次生成。

## 老師帶交接的五個停頓
1. Codex給出「貼入Creator Studio」區塊後，確認學生真的複製到App，來源卡仍正確。
2. 分析前確認已選一張參考圖；分析後先解讀及保存模板，不直接生圖。
3. 模板庫按「選用／編輯」，確認生圖卡的模板名及配圖目標。
4. 「預覽最終Prompt（不收費）」核對完成，才按Generate image。
5. Queue刷新後確認正確平台有配圖；附圖失敗用已保存圖片恢復，不重生。

## 邊界
八入口：Home、Feed、Inspiration、Creator Studio、Queue、Ommi Brain、Connections、Settings。學生只改內容及已有設定，不改核心、schema、RLS、API或導航。Scheduled不是Published；下堂才接社交帳戶與發布API。Bonus：媒體搬遷、品牌Skill private repo、同事共用workspace，不阻塞今堂。

## 交付前
- 乾淨ZIP、Mac／Windows路徑與prompt互動驗收。
- 圖片分析／模板／附圖真實驗收，不用Codex代操作冒充App功能。
- 180分鐘新手排練；網站離開本機仍能讀品牌、模板及成果。
- 手機實機驗收；清楚分實測／模擬／未完成。
