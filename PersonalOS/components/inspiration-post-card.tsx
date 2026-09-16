'use client';
import {useState} from 'react';
import {Heart,MessageCircle,Eye,Repeat2,Bookmark,ExternalLink,ImageOff,Play} from 'lucide-react';
const labels:Record<string,string>={instagram:'Instagram',threads:'Threads',twitter:'X',tiktok:'TikTok',reddit:'Reddit',xiaohongshu:'小紅書'};
const metrics=[['like_count','讚好',Heart],['score','分數',Heart],['comment_count','留言',MessageCircle],['view_count','觀看',Eye],['share_count','分享',Repeat2],['save_count','收藏',Bookmark]] as const;
const date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Intl.DateTimeFormat('zh-HK',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'未提供時間';
export default function InspirationPostCard({post,choose}:{post:Record<string,any>;choose:(p:Record<string,unknown>)=>void}){
 const [expanded,setExpanded]=useState(false),[failed,setFailed]=useState(false);
 const text=String(post.caption||'');const image=post.image_url;const values=metrics.filter(([key])=>typeof post.metrics?.[key]==='number');
 return <article className="inspo-post"><header className="inspo-author"><span className="inspo-avatar">{String(post.account||'?').slice(0,1).toUpperCase()}</span><div><strong>{post.account}</strong><span>{labels[post.platform]||post.platform} · 已保存</span></div><a href={post.post_url} target="_blank" rel="noopener noreferrer" aria-label="開啟原始帖子"><ExternalLink size={17}/></a></header>
 {image?<div className="inspo-media">{!failed?<img src={image} alt={`${post.account} 帖子${post.media_type==='video'?'影片封面':'圖片'}`} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<div className="inspo-media-error"><ImageOff size={28}/><span>圖片連結暫時無法載入</span><a href={post.post_url} target="_blank" rel="noopener noreferrer">到原帖查看 ↗</a></div>}{post.media_type==='video'&&<span className="inspo-media-badge"><Play size={12}/> 影片封面 {post.duration_seconds?`${Math.round(post.duration_seconds)}s`:''}</span>}</div>:<div className="inspo-text-type">文字帖 · 此批資料未提供圖片</div>}
 <div className="inspo-content"><time>{date(post.published_at)}</time><p className={expanded||text.length<=240?'inspo-caption expanded':'inspo-caption'}>{text}</p>{text.length>240&&<button className="inspo-expand" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)}>{expanded?'收起內容':'展開完整內容'}</button>}{post.content_depth==='title-only'&&<p className="inspo-preview-note">此來源只提供標題／預覽，未取得完整內文。</p>}</div>
 <div className="inspo-metrics">{values.length?values.map(([key,label,Icon])=><span key={key} title={`${label}：${post.metrics[key].toLocaleString()}`}><Icon size={15}/><span>{new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(post.metrics[key])}</span><small>{label}</small></span>):<small>此來源未提供互動數據</small>}</div>
 <footer className="inspo-actions"><a href={post.post_url} target="_blank" rel="noopener noreferrer">原始帖子 <ExternalLink size={13}/></a><button className="button" onClick={()=>choose(post)}>Create from this →</button></footer>
 <details className="inspo-provenance"><summary>來源記錄</summary><dl><dt>收集時間</dt><dd>{date(post.fetched_at)}</dd><dt>帖子ID</dt><dd>{post.post_id}</dd><dt>數據範圍</dt><dd>首批已保存快照，非即時數據</dd></dl></details>
 </article>;
}
