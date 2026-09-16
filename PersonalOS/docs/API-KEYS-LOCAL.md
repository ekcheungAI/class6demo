# 由Codex設定本機env｜Mac／Windows共用

學生不用開啟或手填.env.local。Codex讀取已提供的設定檔，再寫入本機環境設定。

## 操作
1. 使用目前Codex專案。讀取專案旁private-credentials/CLASS05-API-KEYS.env；不存在才請學生提供該檔案路徑，不叫學生逐項貼key。
2. 盤點專案已有env設定，只處理模板允許的變數。老師檔案中的provider key：缺值補入、相同值略過、不同值只列變數名稱讓學生選保留自己或採用老師的。TOAPIS_API_KEY對應TOAPI_API_KEY。
3. Supabase使用學生預填的project URL。從已授權的Supabase工具或已登入管理頁取得該project的publishable／anon key；不得使用老師project或service-role key。如果目前工具不能取得，只說明缺少哪個存取權並帶學生授權，不把整份env交回學生手填。
4. 由Codex建立／合併.env.local，保留不相關欄位。檢查development／production的優先順序及衝突，不以空值蓋掉已有有效設定。來源檔保留。
5. ToAPI總上限100 credits；已有較低值保留。文字deepseek-v4-flash經ToAPI，使用TOAPI_API_KEY；圖片ToAPI Flare 1K。文字及圖片合計。
6. 執行npm run check:env，核對Git忽略規則，必要時重啟app。只回報已合併／保留／需選擇／缺權限的變數名稱，不顯示值。格式檢查不代表live API或付費測試已完成。

## 可直接貼給Codex
請讀取套件提供的API設定檔，按本文件合併到本專案.env.local。Supabase使用我已提供的project，透過已授權連線取得其公開連接key。全程由你操作檔案，不叫我手填env或把key貼入對話；只有既有值衝突或需要我登入授權時才問我。完成後核對設定及Git忽略，只回報結果。

## 保存
真實設定只放本機env或部署平台的server環境變數；不提交Git、不顯示於對話或日誌。私人交接ZIP內的API設定檔已由owner授權提供，亦不可提交Git。部署時由Codex配置所需Vercel環境變數，不要求學生重新抄寫。
