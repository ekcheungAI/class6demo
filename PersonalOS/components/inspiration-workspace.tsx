'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import config from '../config/inspiration-demo.json';
import InspirationPostCard from './inspiration-post-card';
import {RefreshCw,ArrowLeft} from 'lucide-react';
type Source={source_id:string;platform:string;account:string;profile_url:string;metadata:{resolution?:string;kind?:string}};
const labels:Record<string,string>={all:'All',instagram:'Instagram',threads:'Threads',reddit:'Reddit',tiktok:'TikTok',xiaohongshu:'小紅書',twitter:'X'};
export default function InspirationWorkspace({token,choose,initialPlatform='all'}:{token:string;initialPlatform?:string;choose:(post:Record<string,unknown>)=>void}){
 const [posts,setPosts]=useState<Record<string,any>[]>([]);const [view,setView]=useState('posts');
 const [items,setItems]=useState<Source[]>([]),[platform,setPlatform]=useState(initialPlatform),[busy,setBusy]=useState(false),[error,setError]=useState(''),[verified,setVerified]=useState(false);const seq=useRef(0);
 async function load(save=false,syncPosts=false,details=false){const id=++seq.current;setBusy(true);setError('');try{const res=await fetch('/api/inspiration',{method:save?'POST':'GET',headers:{Authorization:'Bearer '+token,...(save?{'Content-Type':'application/json'}:{})},...(save?{body:JSON.stringify({action:details?'sync-details':syncPosts?'sync-posts':'setup-demo'})}:{}),cache:'no-store'});const data=await res.json();if(id!==seq.current)return;if(!res.ok)throw new Error(data.error);setItems(data.sources);setPosts(data.posts||[]);setVerified(true);}catch(e){if(id===seq.current){setItems([]);setPosts([]);setVerified(false);setError(e instanceof Error?e.message:'讀取失敗');}}finally{if(id===seq.current)setBusy(false);}}
 useEffect(()=>{setItems([]);setPosts([]);setVerified(false);void load();return()=>{seq.current++;};},[token]);
 const shown=items.filter(s=>platform==='all'||s.platform===platform);
 const visiblePosts=posts.filter(p=>platform==='all'||p.platform===platform);
 return <section className="inspo-workspace"><div className="inspo-topline"><Link href="/inspiration"><ArrowLeft size={15}/> 靈感總覽</Link><span>LESSON 5 · MY SOURCES</span></div><header className="inspo-heading"><div><h1>{platform==='all'?'所有靈感帖子':labels[platform]}</h1><p>睇原帖、了解內容，再用你嘅品牌角度創作。</p></div><button className="quiet" disabled={busy||!token} onClick={()=>void load()}><RefreshCw size={16}/> 重新讀取</button></header>
 <nav className="inspo-platforms" aria-label="切換靈感平台">{Object.entries(labels).map(([id,label])=><Link className={platform===id?'active':''} key={id} href={`/inspiration/${id==='xiaohongshu'?'xhs':id}`} aria-current={platform===id?'page':undefined}>{label}</Link>)}</nav>
 <div className="inspo-viewbar"><div><button className={view==='posts'?'active':''} aria-pressed={view==='posts'} onClick={()=>setView('posts')}>Posts <span>{visiblePosts.length}</span></button><button className={view==='accounts'?'active':''} aria-pressed={view==='accounts'} onClick={()=>setView('accounts')}>Accounts <span>{shown.length}</span></button></div><small>{verified?'Supabase 已讀回 · 已保存快照':'等待資料'} · 已保存</small></div>
 {error&&<p role="alert">{error} <Link href="/connections">檢查連線</Link></p>}{busy&&<p role="status">讀取中…</p>}
 {view==='posts'?<>{verified&&!busy&&!visiblePosts.length&&<p className="panel">此平台未有已保存帖子。</p>}<div className="inspo-grid">{visiblePosts.map(post=><InspirationPostCard key={post.post_id} post={post} choose={choose}/>)}</div></>:<><div className="source-cards">{shown.map(s=><article key={s.source_id}><span className="tag">{labels[s.platform]} · 已保存</span><h3>{s.account}</h3><p>{s.metadata.kind==='subreddit'?'追蹤社群':'示範帳號'} · {posts.filter(p=>p.source_id===s.source_id).length} 則已保存帖子</p><a href={s.profile_url} target="_blank" rel="noopener noreferrer">原始帳號 ↗</a><p><Link className="button" href={`/inspiration/${s.platform==='xiaohongshu'?'xhs':s.platform}`}>查看帖子</Link></p></article>)}</div><p><Link href="/connections">匯入自己的Sources／Posts資料 →</Link></p></>}
 </section>;
}
