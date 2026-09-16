'use client';
import Link from 'next/link';
export const steps=[
 {href:'/feed',name:'Feed',zh:'發現市場訊號',input:'新聞／公開來源',output:'可追溯嘅來源',status:'WIP · Lesson 5'},
 {href:'/inspiration',name:'Inspiration',zh:'追蹤目標帳號',input:'目標帳號',output:'值得參考嘅內容',status:'WIP · Lesson 5'},
 {href:'/voice',name:'Ommi Brain',zh:'帶入品牌',input:'Company Vault',output:'Voice＋Look',status:'Lesson 5 · 已開放唯讀'},
 {href:'/dashboard',name:'Create',zh:'建立內容',input:'來源＋品牌＋平台',output:'品牌內容草稿',status:'WIP · Lesson 5'},
 {href:'/queue',name:'Queue',zh:'草稿與排期',input:'生成內容',output:'Draft／Scheduled（未發布）',status:'Lesson 5'}
];
export function WorkflowRail({active}:{active:string}){return <section className="flow-map" aria-label="內容工作流程"><div className="flow-top"><strong>由來源，走到你嘅內容。</strong><span>Feed／Inspiration 提供來源；Ommi Brain 為創作提供品牌設定。</span></div><div className="flow-nodes">{steps.map(s=><Link href={s.href} key={s.href} className={'flow-node '+(active===s.href?'current':'')} aria-current={active===s.href?'page':undefined}><small>{s.status}</small><strong>{s.name}</strong><span>{s.zh}</span></Link>)}</div><p className="flow-path">Feed／Inspiration → Create → Queue<br/>Company Vault → Ommi Brain → Create</p><details><summary>每個區塊點樣接起？</summary><div className="contract-grid">{steps.map(s=><div key={s.href}><strong>{s.name}</strong><p>{s.input} → {s.output}</p></div>)}</div><p>Feed／Inspiration → Create → Queue。Ommi Brain → Create。Collection係可選收藏，唔係必經站。Feed抓取待驗證；Terra生成已接老師測試。</p></details></section>}
export function LockedWorkflow({route}:{route:string}){
 const newsroom=route.startsWith('/feed'),inspiration=route.startsWith('/inspiration'),queue=route==='/queue';
 const node=steps.find(s=>route.startsWith(s.href))||steps[4];
 return <><WorkflowRail active={node.href}/><section className="panel"><div className="section-heading"><div><h2>{queue?'Review your content':newsroom?'Stories worth creating from':inspiration?'Accounts worth learning from':'你的下一個內容工具'}</h2><p>{queue?'草稿會喺呢度檢查、修改及批准。':newsroom?'由公開來源發現值得講嘅題目。':'保留原版操作位置，逐步接通工作流程。'}</p></div><span className="tag neutral">{node.status}</span></div><div className="work-tabs">{(queue?['Draft','Human Edit','Approved','Published']:newsroom?['Today','Trending','Explore']:['Accounts','Posts','Insights']).map(x=><button key={x} disabled>{x}</button>)}</div><div className="disabled-tools"><input disabled placeholder={queue?'搜尋草稿…':'搜尋內容、帳號或主題…'}/><button disabled>{queue?'批次批准':'新增來源'}</button><button disabled>{queue?'排程／發布':'更新內容'}</button></div><div className="empty"><h3>{queue?'等第一份草稿準備好':'工作區已留好位置'}</h3><p>{queue?'Create 產生嘅內容會連同來源同品牌版本帶入。現階段未產生草稿。':'完成收集 workflow 後，真實資料會顯示喺呢度；現階段未啟動抓取。'}</p><Link className="quiet" href={queue?'/dashboard':'/feed'}>{queue?'返回 Create 準備內容':'先查看已有素材'} →</Link></div></section></>;
}
