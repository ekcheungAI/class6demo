# 課前插件與連線清單｜PersonalOS Class 5

Mac／Windows均在Codex app設定。只列本堂實際需要，不代表此電腦已全部安裝或授權。

## 四個必備整合

| 搜尋名稱 | 本堂用途 | 課前準備 | 只讀驗收 |
| --- | --- | --- | --- |
| Supabase | 固定SQL、資料匯入、核對資料 | 自己管理帳戶、已建立project及其Dashboard URL | Codex讀到指定project/table清單；新project無業務表正常 |
| Google Drive | 讀Class4素材資料庫Sheet | 有權限讀自己Sheet的Google帳戶 | Codex讀到指定Sheet分頁、header及少量樣本 |
| GitHub | 自己private repo、版本及push/pull | 自己GitHub帳戶；必要repo授權 | 核對實際username、可見repo及本機Git remote；不以讀取成功冒稱push已驗證 |
| Vercel | 堂尾部署自己的網站 | 自己Vercel帳戶/team及GitHub整合 | Codex核對登入身份／team及可見projects；不以身份讀取冒稱部署已驗證 |

GitHub在部分版本可能顯示為Apps／Connections／Git整合，不一定是一個獨立可安裝plugin。使用現有同名連線，不重複安裝。實際入口以學生版本為準。

## 每個整合照同一流程做

1. 打開Codex的Plugins／Apps／Connections相關頁面，搜尋名稱；已存在就開其設定，不重複添加。
2. 按介面提供的Install／啟用，再Connect／Sign in／Authenticate。沒有該按鈕或工具時先讓Codex檢查版本／可用整合，不猜它已連接。
3. 學生自己在瀏覽器完成OAuth及必要同意，核對正確帳戶與project/team。不要把密碼、OAuth token或service-role key貼進聊天。
4. 返回Codex；如介面提示重新載入／開新對話，照提示做。
5. 貼下方檢查prompt，必須有實際只讀成功證據。安裝、登入、讀取、寫入權限及實際執行是不同狀態。

Supabase若使用自訂MCP，可用官方project-scoped設定；先核對[Supabase MCP指南](https://supabase.com/docs/guides/getting-started/mcp)。若以read_only模式連線，建表時需另外處理寫入授權，不可把publishable key當管理工具授權。

## 可直接貼給Codex

請用廣東話逐題帶我做PersonalOS Class5課前插件檢查，只讀取，不建表、不匯入、不建立repo、不push、不部署、不付費。

先讀docs/PRECLASS-PLUGINS.md，檢查Supabase、Google Drive、GitHub、Vercel是否有可呼叫工具；已安裝或已連線不要重複要求安裝。缺少時指引我在目前Codex版本找到相應整合，由我自行完成瀏覽器登入。

沿用講義帶入的自己的Sheet URL及已確認Supabase project URL。缺少時一次只問一個；不要搜尋整個Drive或其他projects猜目標。

- Supabase：只讀指定project的table清單，空白新project正常。工具無權限則記錄，不要求secret key。
- Google Drive：讀指定Class4 Sheet的分頁、header及最多3行樣本，不修改Sheet。
- GitHub：讀實際登入username。若plugin與Git CLI帳戶不同，列帳戶名讓我選，不能自動推錯帳戶。核對本機git可用及既有remote，不做寫入測試。
- Vercel：讀已登入帳戶/team，若多個team只列實際候選让我用數字選。不建立project或部署。

最後用表格回報：工具可用／登入身份／實際只讀證據／未驗證的寫入能力／下一個最小步驟。不要顯示任何key或token，也不要把「工具存在」當作連線成功。

## 另外準備，但不是plugin

- Codex app登入及額度；本堂模型GPT-5.6 Terra / Medium。
- Node22+、Git、Python3：本機執行環境，由Codex核對。
- ToAPIs：老師分配的key及credits，按API-KEYS-LOCAL.md保留已有設定／补缺少，放本機env。
- 自己Company Vault及Class4 Sheet連結。

Tavily、Firecrawl、TikHub、MiniMax官方文件已列API-PROVIDERS.md；目前不要求安裝其插件或預先授權付費呼叫。Supabase/Google Drive插件已帶必要知識，不需要另裝舊Drive搬媒體skill。瀏覽器操作使用Codex已有能力；只有工具明確要求額外啟用時才處理，不把未知browser plugin加成全班必裝。

模型及額度統一見config/course-models.json：文字deepseek-v4-flash、圖片分析qwen3.5-flash、生圖gpt-image-2.5-flare／1K，全部使用TOAPI_API_KEY，共用100credits。帖文取圖另外使用TIKHUB_API_KEY；MiniMax不是主線必填。主線已有真實驗收，剩餘抽驗項目見RELEASE-GATES.md。
