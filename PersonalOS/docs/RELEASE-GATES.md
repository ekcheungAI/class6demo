# PersonalOS｜目前驗收與學生部署

2026-09-15：現有老師試跑project已跑通文字、Queue及IG圖片主線，並已部署Vercel。這不代表每位學生的新project自動通過，也不代表全課已完成新手排練。

## 已有證據
- ToAPI deepseek-v4-flash生成兩平台、Video Script及Newsletter，Supabase保存、修改與讀回。
- Queue按平台顯示Drafts／Scheduled；排期、刷新讀回及取消排期已實測，不會自動發布。
- IG carousel選圖→private Storage→qwen3.5-flash分析→模板保存／重開→Flare1K生圖→Storage→Queue附圖／刷新，已有真實驗收，見IMAGE-TEMPLATES.md。
- 現行雲端runtime保存品牌、task及預算；owner驗證、版本衝突及重入恢復有自動測試。不是舊版只靠本機檔案的架構。
- 老師試跑版已由自己的GitHub commit部署Vercel；學生以ZIP開局，不要求clone老師repo。

## 每位學生部署前核對
- [ ] 自己的Supabase固定SQL及runtime版本一致；App用戶登入、workspace及素材可讀。
- [ ] Ommi Brain已保存到雲端；本次文案、模板及圖片可重新讀回。
- [ ] 自己的private repo／branch已push；tests及build通過；checkpoint列明未完成項目。
- [ ] 正確Vercel project配置server環境變數，沿用自己的Supabase；圖片／品牌不依賴本機Vault。

以上符合時，可以繼續個人試跑部署及記錄結果；不要因歷史RC1字樣或未勾選的老師全課抽驗項目，自動拒絕整個部署。實際缺權限、功能錯誤或本機依賴仍須先處理，不能刪掉防護。

## 老師發班前仍要補驗
- [ ] 全新學生project／ZIP由設定到匯入及部署的完整排練。
- [ ] 修復後上載／貼圖完整瀏覽器流程；X及小紅書真實取圖。
- [ ] 跨owner實際隔離及手機實機／跨裝置驗收。
- [ ] 全部分析分類品質及180分鐘新手節奏抽驗。

模型與預算見config/course-models.json：文字、分析及生圖共用100credits。已用／未知預留保留；沒有證據的項目維持未驗證。
