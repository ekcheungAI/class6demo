# 逐堂顯示功能

Lesson5側欄只顯示Home、Feed、Inspiration、Creator Studio、Queue、Ommi Brain、Connections、Settings。Voice/Look保留；Memory/Progress隱藏。Newsletter是Creator Studio輸出，不另設導航；Models/Costs與Skill由既有工作流程和檔案處理。

所有其他模組程式/route保留，visible=false只控制導航。Queue在側欄，本堂支援Drafts、編輯、配圖及Scheduled，並保存修改版本；下堂才接社交帳戶及發布API。隱藏不是存取權限或功能已完成的證明。

建議同一模板repo維護lesson-5/lesson-6等release tags或更新branch。老師先完成/測好新功能，再發布含code與config/features.json visible變更的更新。學生在自己的repo先commit現有改動，再fetch老師upstream並合併指定版本；處理有衝突的品牌設定，唔reset --hard、唔覆蓋.env或資料。具體老師repo及refs須等發佈才填，不預設已存在。

不需要merge另一個獨立repo。兩個無共同歷史repo可能衝突更多；單純git pull自己的origin亦不會自動收到老師改動。

模型及額度統一見config/course-models.json：文字deepseek-v4-flash、圖片分析qwen3.5-flash、生圖gpt-image-2.5-flare／1K，全部使用TOAPI_API_KEY，共用100credits。帖文取圖另外使用TIKHUB_API_KEY；MiniMax不是主線必填。主線已有真實驗收，剩餘抽驗項目見RELEASE-GATES.md。
