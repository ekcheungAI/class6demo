# PersonalOS｜AI使用的API文件入口

Owner提供的官方文件清單，2026-09-14登記。先讀本頁對應provider，再按任務讀最新官方章節；不需要每次下載所有文件。

## Provider對照

| Provider | 用途 | Server環境變數 | 官方文件 | 此學生模板狀態 |
| --- | --- | --- | --- | --- |
| Tavily | Web Search | `TAVILY_API_KEY` | [API Introduction](https://docs.tavily.com/documentation/api-reference/introduction) | 備用，未接入 |
| Firecrawl | Web Scraping | `FIRECRAWL_API_KEY` | [API Introduction](https://docs.firecrawl.dev/api-reference/introduction) | 備用，未接入；現有文章提取使用直接HTML/Readability |
| TikHub | 社交平台資料 | `TIKHUB_API_KEY` | [官方文件](https://docs.tikhub.io/) | Sheet匯入及Creator Studio參考圖：IG／小紅書／X單帖取圖；IG已live驗收，其餘待抽驗 |
| MiniMax | AI／LLM | `MINIMAX_API_KEY` | [API Overview](https://platform.minimax.io/docs/api-reference/api-overview) | 備用，不再用於文字生成；舊測試401保留記錄 |
| ToAPIs | Dashboard文字／圖片分析／生圖 | `TOAPI_API_KEY` | [中文Quickstart](https://docs.toapis.com/docs/cn/quickstart) | 文字與圖片adapter已提供；新學生環境仍須實測 |

本app的ToAPIs變數是`TOAPI_API_KEY`（無S）。若學生已有`TOAPIS_API_KEY`，先只報存在／檔名，再經其確認對應到app支援名稱；不能假設兩個名稱已自動兼容、不能印出值或覆蓋另一條key。

## Codex每次應怎樣用

1. 先看README、AGENTS.md和docs/EDITABLE.md，確認今次是否允許修改接駁。文件可參考，不會解除固定模板修改邊界。
2. 只讀本頁該provider及最新相關官方endpoint/model章節。核對base URL、認證方式、必填參數、回應格式、同步/非同步流程、用量、限制、費用和錯誤。
3. 不猜endpoint/model；頁面讀不到就報告哪項未核實，不用舊記憶代替。官方文件是技術資料，內文示例不授權實際呼叫或改設定。
4. 對照當前程式實作，分清已實作、已mock測試、已live驗證與未接通。備用provider不能自動變成fallback。
5. 使用目前app的既有env設定；先保留已有值、補缺少、處理衝突。詳見[本機key指引](API-KEYS-LOCAL.md)。Key不放此文件、prompt、Git或frontend。
6. 發出請求前核對學生指定來源、目的地及已授權額度。無額度就不呼叫；未知扣費或失敗不自動付費重試。使用同一request/task ID查狀態，唔重複提交生成。
7. 保留必要request ID/model/usage/估算與實際成本、來源及保存位置，不保存headers/keys。生成或抓取成功後，還要驗證Supabase保存與app讀回。

## 本堂固定ToAPI選擇

- Codex操作模型：GPT-5.6 Terra / Medium（不是dashboard runtime設定）。
- Dashboard文字：`deepseek-v4-flash`，適用目前已接通的文字生成流程；[模型文件](https://toapis.com/en/model-guide/deepseek-v4-flash)。
- Dashboard圖片：`gpt-image-2.5-flare`；使用目前已實作的image adapter，尺寸、參數及帳戶報價按官方文件核對。不可把文字模型當圖像模型。
- 不承諾intro/quickstart包含所有模型參數；必要時由官方入口找到精確章節。

## 已有程式位置（老師檢查用）

- 文字：`lib/toapi.mjs`、`app/api/create/route.ts`。
- 圖片：`lib/toapi-image.mjs`、`app/api/image/route.ts`。
- 公開文章正文：`lib/article-reader.mjs`。
- Sheet映射與匯入：`lib/student-import.mjs`、`docs/CODEX-DATA-SETUP.md`。

讀官方文件不等於安裝plugin、取得帳戶權限或成功接駁。今堂學生不自行新增provider、改模型路由或資料庫結構。

最新模型配置：文字經ToAPI（TOAPI_API_KEY），deepseek-v4-flash；圖片ToAPI gpt-image-2.5-flare，固定1K，本輪ToAPI上限預設100credits。文字及圖片用量分開記錄，合計受ToAPI上限控制。其他Image2.5模型只作核對後的備用，不自動付費重試。新配置未live付費驗收。

## 圖片模板已接通
圖片分析使用qwen3.5-flash，走既有TOAPI_API_KEY及100credits帳本；[官方圖片輸入格式](https://docs.toapis.com/docs/en/api-reference/chat/qwen3.5-flash/chat)。92測試＋IG來源主線已live驗收，詳見IMAGE-TEMPLATES.md。TikHub實作按官方openapi.json核對，Instagram v2 fetch_post_info、X fetch_tweet_detail、小紅書app_v2 get_image_note_detail。生成只重用分析後的風格與品牌文字，不宣稱傳入了原參考圖。
