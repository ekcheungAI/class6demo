# 圖片分析 → 品牌模板 → 生圖 → Queue

核心主線已實作，並於2026-09-15以IG來源完成真實雲端驗收。上載／貼圖、小紅書／X各入口的完整瀏覽器驗收、手機實機仍待抽驗；不把這份結果當整堂已可發班。

## 使用
1. 在Creator Studio上載／貼圖（原圖10MB內，轉JPEG及最長邊2048px），或貼IG圖片帖、小紅書、X單一帖子連結。TikHub來源carousel只揀一張，保存到private Storage。
2. 自動或七類模式分析。qwen3.5-flash實際讀取圖片，保存觀察、可重用風格、中文／英文建議prompt、品牌方向及不確定事項。不宣稱取得原prompt或真實相機參數。
3. 檢查及編輯結果，選保留風格、命名保存；模板可重開、修改、另存或封存。原圖重建prompt與新題材生圖分開，生圖只取可重用風格及已確認品牌方向。
4. 選模板、沿用模板品牌或最新Ommi Brain、選Queue草稿或獨立圖片、設定比例。先按「預覽最終Prompt（不收費）」，再生成一張Flare1K。
5. 圖片永久保存後自動附到預先選定的Queue平台草稿。草稿版本衝突時保留圖片，重新選草稿後手動附圖，不重生。附圖會退回Draft，須重新確認排期。

## 保存及權限
沿用media-images private bucket、sources.metadata的image-template命名空間、runs.metadata的analysis/image任務。模板在sources以版本CAS更新，與Feed／Inspiration追蹤來源分開。所有API核對workspace owner；不新增表、不關RLS。

新增/api/image-template（上載、分析／恢復、模板保存／列表）、/api/image-reference（TikHub圖片列表／選圖）；/api/image支援模板、品牌版本、免費prompt預覽及Queue目標；/api/content支援已保存圖片附圖。生成結果支援task模式及供應商即時URL回應，重入恢復不重新生成。

## 模型與成本
文字deepseek-v4-flash；圖片分析qwen3.5-flash；生圖gpt-image-2.5-flare，1K。共用100credits雲端上限；每筆模型請求暫預留20，不是實際費用。模板重用不重新分析；保存、預覽及Queue附圖不呼叫模型。未知實際扣費維持待核對，不按shared帳戶餘額差估算。

## 真實驗收
IG carousel5張→選1張→Storage→分析5737tokens（image1430）→保存模板→刷新後選用→不同題材Flare1K圖片→Storage975855bytes→Queue自動附圖→刷新讀回，全部成功。參考圖原產品未帶入最終配圖。TikHub新版image_versions.items解析已修復。一次真實分析及一張生圖，沒有自動重試。

## 仍待驗證
上載流程首次實測捉到multipart被JSON驗證阻擋，已修復並有回歸測試；原生選檔與使用者桌面操作衝突，修復後未完成全套瀏覽器上載／貼圖。小紅書及X使用官方OpenAPI端點及fixture驗證，未作本輪真實取圖。手機、全部七類分析品質及跨裝置瀏覽器抽驗尚未全部完成。
