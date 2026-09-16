# class6demo — 第六堂：app 正本 ＋ 課堂材料

呢個 repo 有**兩件嘢**，兩件都要：

| | 係乜 | 你點用 |
|---|---|---|
| [`PersonalOS/`](PersonalOS) | **app 正本。唯一一個。** Next.js 專案，第五堂嗰部機 | Clone 落嚟，行 `npm install`，接返你自己嘅 Supabase／Vercel |
| 其餘所有資料夾 | **今堂嘅合約、示例同步驟**。唔係 app，冇 code | 放喺 app 隔籬，堂上逐步跟 |

**第一件事：用瀏覽器打開 [`START-HERE.html`](START-HERE.html)。** 19 步、19 條 prompt、可以逐條複製；填一次你嘅判斷，全部 prompt 自動代入。

---

## 邊個要 clone `PersonalOS/`？

- **你第五堂部機行得好好** → 唔使碰 `PersonalOS/`。繼續用你自己嗰部。呢度只係一份對照正本。
- **你部機壞咗／未部署／想由一個乾淨基準開始** → clone `PersonalOS/`，接返你自己嘅 Supabase 同 Vercel，就當係你第五堂嘅成果。

無論邊種情況，**app 正本只有 `PersonalOS/` 一個**。冇第二個 template、冇舊 zip、冇其他 branch。

## 其餘資料夾

```
START-HERE.html          ← 由呢度開始。19 步、19 條 prompt、記得低你做到邊
AGENTS.md                今堂附加規則（AI 嘅規則書）
contracts/               五份合約：靈感卡、voice rules、Composer 狀態機、批準定義、Queue 欄位
                         AI 唔准自己發明 schema
fixtures/                教學示例：五張靈感卡、一篇文章、身份樣本、舊 id、runs log、分析 CSV
                         全部 DEMO，唔係真資料。冇 key 嗰陣用呢啲一樣行到成堂
skills/                  personalos-research：Exa 搵 → Firecrawl 讀 → Tavily 核，一條路、有上限
tools/six-box.html       六格拆解。離線開得到，唔使帳戶。功課要用
checkpoints/             每幕完成後嘅已知良好狀態
work/                    空殼，預設全部 TBC。未 build 前保持空白
homework/                Step 99
.env.example             變數名清單。**真 key 由老師堂上私下派，永遠唔入呢個 repo**
```

呢啲**唔係 code**，係**預先決定咗嘅 schema、合約同驗收條件**，令 AI 唔可以即場發明。

## 聽日點用

1. Clone 呢個 repo
2. 開 `START-HERE.html`
3. 上面填一次七格（你讀者今星期要決定乜、最想守住邊條 voice rule⋯）
4. 揀你今日行邊條 track
5. 跟住逐步做，每步複製 prompt、對返「見到呢個結果先繼續」

你今日改嘅 code 係改**你自己部機**（你第五堂嗰個 repo，或者你 clone 咗嘅 `PersonalOS/`）。唔係改呢個 repo。

## 三條 track

| Track | 你有乜 | 今日出到街？ |
|---|---|---|
| Pro | Upload-Post API key，已連 ≥2 平台 | 出多個平台 |
| Free | 自己 Meta App 嘅 Threads user token | 出 Threads |
| Dry-run | 當日冇匙或者卡住 | 行到「已批準」就停 |

**Dry-run 唔係失敗。** 每一步都有 fixtures 後備，你一樣行齊成個流程、一樣見到結果、一樣交到功課、一樣入到第七堂。

## Key 安全

- 真 key 只住三個地方：本機 `.env.local`、Vercel Environment Variables、老師私下派嗰個 env 檔
- **唔好**貼落 chat、群組、截圖、功課，**唔好**入 Git
- Codex 回覆入面出現 key 值 = 即刻換
- 呢批班級 key 課後會停用；功課第一件事就係換成你自己嗰條

## 更新

老師課前／堂上可能會更新呢個 repo：

```
git pull
```

有自己改過嘅檔就用 `git fetch origin && git merge origin/main`，有衝突列出嚟，唔好硬覆蓋自己啲嘢。
