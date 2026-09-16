"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {browserAuth} from "@/lib/browser-auth";
import BrandBrain from "./brand-brain";
import {ContentCollection,ContentHome} from "./content-workspace";
import {LockedWorkflow} from "./workflow";
import PublishConnections from "./publish-connections";
import TeacherWorkbench from "./teacher-workbench";
import NewsFeed from "./news-feed";
import CloudDraftQueue from "./cloud-draft-queue";
import InspirationWorkspace from "./inspiration-workspace";
import InspirationHub from "./inspiration-hub";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { SupabaseClient } from "@supabase/supabase-js";
import {
  Home,
  Newspaper,
  Compass,
  Library,
  Palette,
  Presentation,
  GraduationCap,
  Youtube,
  Zap,
  ListChecks,
  MessagesSquare,
  Brain,
  ChartNoAxesCombined,
  Plug,
  Sparkles,
  Clapperboard,
  Mail,
  Coins,
  WandSparkles,
  Database,
  Map,
  Settings,
  Menu,
  X,
  ArrowUpRight,
  ArrowRight,
  LockKeyhole,
  RefreshCw,
  Check,
  ChevronRight,
  ChevronLeft,
  Search,
  Download,
  Link2,
  ShieldCheck,
  Sun,
  Moon,
  AlertCircle,
  Eye,
} from "lucide-react";
import {
  features,
  visibleFeatures,
  isCourseVisible,
  subroutes,
  getFeature,
  gateLabel,
  lessonFive,
  lessonSix,
} from "@/lib/catalog.mjs";
import { demoTables, demoResult } from "@/lib/demo.mjs";
const icons: Record<string, typeof Home> = {
  Home,
  Newspaper,
  Compass,
  Library,
  Palette,
  Presentation,
  GraduationCap,
  Youtube,
  Zap,
  ListChecks,
  MessagesSquare,
  Brain,
  ChartNoAxesCombined,
  Plug,
  Sparkles,
  Clapperboard,
  Mail,
  Coins,
  WandSparkles,
  Database,
  Map,
  Settings,
};
type Column = { name: string; type: string };
type Table = { name: string; columns: Column[]; origin: string };
type Result = {
  mode: string;
  projectRef: string;
  table: string;
  rows: Record<string, unknown>[];
  columns: Column[];
  total: number | null;
  page: number;
  pageSize: number;
  hasMore: boolean;
  checkedAt: string | null;
  writeActions: number;
};
type Conn = { url: string; publishableKey: string; projectRef: string };
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const I = icons[name] || Sparkles;
  return <I size={size} aria-hidden="true" />;
}
const message = (e: unknown) =>
  e instanceof Error ? e.message : "暫時無法完成。";
function download(name: string, text: string) {
  const a = document.createElement("a");
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function StudentOS() {
  const router=useRouter();
  const [briefSource,setBriefSource]=useState<Record<string,unknown>|null>(null);
  const [briefText,setBriefText]=useState("");
  const [platforms,setPlatforms]=useState<string[]>(["Threads"]);
  const pathname = usePathname();
  const route = pathname === "/" ? "/dashboard" : pathname;
  const params = useSearchParams();
  const feature = isCourseVisible(route) ? getFeature(route) : null;
  const [menu, setMenu] = useState(false);
  const [demo, setDemo] = useState(false);
  const [brand, setBrand] = useState("我的 Personal OS");
  const [brandInput, setBrandInput] = useState("");
  const [saved, setSaved] = useState("");
  const [dark, setDark] = useState(false);
  const [conn, setConn] = useState<Conn | null>(null);
  const [status, setStatus] = useState("檢查設定中…");
  const [connected, setConnected] = useState(false);
  const [token, setToken] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const auth = useRef<SupabaseClient | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [column, setColumn] = useState("");
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (pathname === "/instagram-lab") router.replace("/creator-studio");
  }, [pathname, router]);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try {
      const b = localStorage.getItem("heyommi-student-brand");
      if (b) {
        setBrand(b);
        setBrandInput(b);
      }
      const d = localStorage.getItem("heyommi-student-theme") === "dark";
      setDark(d);
      document.documentElement.dataset.theme = d ? "dark" : "light";
    } catch {}
  }, []);
  useEffect(() => {
    setMenu(false);
  }, [route]);
  useEffect(() => {
    if (!menu) return;
    const previous = document.activeElement as HTMLElement | null;
    const links = Array.from(document.querySelectorAll<HTMLElement>(".sidebar a[href], .sidebar button:not([disabled])"));
    links[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setMenu(false); }
      if (event.key === "Tab" && links.length) {
        if (event.shiftKey && document.activeElement === links[0]) { event.preventDefault(); links[links.length-1].focus(); }
        else if (!event.shiftKey && document.activeElement === links[links.length-1]) { event.preventDefault(); links[0].focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [menu]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/connection", { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setConn(previous=>previous&&previous.url===d.url&&previous.publishableKey===d.publishableKey?previous:d);
          setStatus("已設定，等待讀取驗證");
        } else {
          setConn(null);
          setStatus(d.message);
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") setStatus("本地連線服務未能回應。");
      });
    return () => controller.abort();
  }, [refresh]);
  useEffect(() => {
    setToken("");
    if (!conn) { auth.current=null; return; }
    const client=browserAuth(conn.url,conn.publishableKey);
    auth.current=client;
    let active=true;
    const {data:{subscription}}=client.auth.onAuthStateChange((event,session)=>{
      if(!active)return;
      setToken(session?.access_token||"");
      setAuthMsg(session?"已登入；本機瀏覽器保持登入並自動更新session。":event==='SIGNED_OUT'?"已登出此裝置，已清除保存的登入狀態。":"未有有效登入；首次設定請登入。");
    });
    return ()=>{active=false;subscription.unsubscribe();};
  },[conn?.url,conn?.publishableKey]);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError("");
    setConnected(false);
    if (demo) {
      setTables(demoTables);
      setSelected("demo_sources");
      return;
    }
    setTables([]);
    setSelected("");
    if (!conn) return;
    setBusy(true);
    fetch("/api/tables", {
      headers: token ? { Authorization: "Bearer " + token } : {},
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.message);
        setTables(d.tables);
        setSelected(d.tables[0]?.name || "");
        setStatus(
          d.tables.length
            ? "已取得表格清單，讀取權限仍待驗證"
            : "沒有可讀表格；請核對現有 Data API／權限。",
        );
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(message(e));
          setStatus(message(e));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [conn, token, demo]);
  useEffect(() => {
    const controller = new AbortController();
    if (demo) {
      setResult(demoResult(query));
      setBusy(false);
      return;
    }
    if (!selected || !conn) return;
    setBusy(true);
    setError("");
    const params = new URLSearchParams({ table: selected, page: String(page) });
    if (query) {
      params.set("search", query);
      params.set("column", column);
    }
    const cols = tables.find((t) => t.name === selected)?.columns || [];
    const order = cols.find((c) =>
      ["id", "source_id", "created_at"].includes(c.name),
    );
    if (order) params.set("order", order.name);
    fetch("/api/records?" + params.toString(), {
      headers: token ? { Authorization: "Bearer " + token } : {},
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.message);
        setResult(d);
        setConnected(true);
        setStatus("Supabase已登入；已核實授權資料讀取");
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError(message(e));
          setConnected(false);
          setStatus(message(e));
          setResult(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [selected, page, query, demo, conn, token, refresh]);
  useEffect(() => {
    if (detail) dialog.current?.showModal();
    else dialog.current?.close();
  }, [detail]);
  function changeTable(name: string) {
    setSelected(name);
    setPage(0);
    setSearch("");
    setQuery("");
    setColumn("");
    setResult(null);
  }
  function switchMode() {
    setDemo(!demo);
    setPage(0);
    setSearch("");
    setQuery("");
    setColumn("");
    setDetail(null);
  }
  function theme() {
    const d = !dark;
    setDark(d);
    document.documentElement.dataset.theme = d ? "dark" : "light";
    try {
      localStorage.setItem("heyommi-student-theme", d ? "dark" : "light");
    } catch {}
  }
  const available = features.filter((f) => f.implemented).length;
  const groupNames: Record<string, string> = {
    main: "WORKSPACE",
    lesson5: "LESSON 5",
    development: "EXPLORE",
    workspace: "YOUR SPACE",
  };
  const children = feature
    ? (
        subroutes as Record<
          string,
          { href: string; label: string; lesson: number | null }[]
        >
      )[feature.href] || []
    : [];
  const currentHref =
    route + (params.toString() ? "?" + params.toString() : "");
  const selectedChild = children.find((c) => c.href === currentHref);
  const selectedLesson = selectedChild ? selectedChild.lesson : feature?.lesson;
  const gateTitle = selectedChild?.href.includes("?") ? `${feature?.label} · ${selectedChild.label}` : feature?.label;
  const noData = (
    <div className="empty">
      <Database size={30} />
      <h3>{demo ? "示範資料" : "接上你自己的資料"}</h3>
      <p>
        {error ||
          (!conn
            ? "設定 Supabase 連線後，呢度會顯示你已保存嘅市場資料。"
            : "尚未有可讀資料。現有表格及權限會保持原樣。")}
      </p>
      <Link className="button" href="/connections">
        檢查連線 <ArrowRight size={16} />
      </Link>
    </div>
  );
  const dataPanel = (
    <>
      <div className="section-heading">
        <div>
          <h2>
            {route === "/collection"
              ? "你的資料，已經有位置。"
              : "從一條真實來源開始。"}
          </h2>
          <p>讀取既有表格，保留原本欄位及資料。</p>
        </div>
        <button
          className="quiet"
          onClick={() => setRefresh((v) => v + 1)}
          disabled={busy || demo}
        >
          <RefreshCw size={15} className={busy ? "spin" : ""} /> 重新讀取
        </button>
      </div>
      {demo && (
        <div className="demo-banner">
          示範模式：以下係合成內容，不是 Supabase live data。
        </div>
      )}
      {tables.length > 0 && (
        <div className="data-toolbar">
          <label>
            資料表
            <select
              aria-label="資料表"
              value={selected}
              onChange={(e) => changeTable(e.target.value)}
            >
              {tables.map((t) => (
                <option key={t.name}>{t.name}</option>
              ))}
            </select>
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(0);
              setQuery(search);
            }}
          >
            <label className="sr-only" htmlFor="search-column">
              搜尋欄位
            </label>
            <select
              id="search-column"
              value={column}
              onChange={(e) => setColumn(e.target.value)}
              disabled={demo}
            >
              <option value="">選文字欄位</option>
              {(tables.find((t) => t.name === selected)?.columns || [])
                .filter((c) => c.type === "string")
                .map((c) => (
                  <option key={c.name}>{c.name}</option>
                ))}
            </select>
            <label className="search">
              <Search size={16} />
              <input
                aria-label="搜尋資料"
                placeholder="搜尋你保存的內容…"
                value={search}
                maxLength={120}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <button
              className="quiet"
              disabled={busy || (!demo && !!search && !column)}
            >
              搜尋
            </button>
          </form>
        </div>
      )}
      {busy ? (
        <div className="loading" role="status">
          <RefreshCw className="spin" /> 讀取中，沒有寫入資料…
        </div>
      ) : error ? (
        <div className="error" role="alert">
          <AlertCircle />
          {error}
        </div>
      ) : result ? (
        <>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {result.columns.slice(0, 5).map((c) => (
                    <th key={c.name}>{c.name}</th>
                  ))}
                  <th>內容</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={String(row.id ?? row.source_id ?? i)}>
                    {result.columns.slice(0, 5).map((c) => (
                      <td key={c.name}>
                        <span>
                          {typeof row[c.name] === "object"
                            ? JSON.stringify(row[c.name])
                            : String(row[c.name] ?? "—")}
                        </span>
                      </td>
                    ))}
                    <td>
                      <button
                        className="icon-button"
                        aria-label={"查看第" + (i + 1) + "筆資料"}
                        onClick={() => setDetail(row)}
                      >
                        <ArrowUpRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {result.rows.length === 0 && (
              <div className="empty small">
                <Search />
                <h3>未有符合嘅資料</h3>
                <p>
                  成功讀取但沒有可見結果；RLS 亦可能限制目前身份可見的記錄。
                </p>
              </div>
            )}
          </div>
          <div className="table-footer">
            <span>
              {demo ? "合成示範" : `${result.table} · 唯讀`}
              {result.total !== null
                ? ` · ${result.total} 筆可見記錄`
                : " · 總數未提供"}
              {result.checkedAt && (
                <small>
                  最後核對{" "}
                  {new Date(result.checkedAt).toLocaleTimeString("zh-HK")}
                </small>
              )}
            </span>
            <div>
              <button
                className="icon-button"
                aria-label="上一頁"
                disabled={page === 0 || demo}
                onClick={() => setPage((v) => v - 1)}
              >
                <ChevronLeft size={17} />
              </button>
              <span>第 {page + 1} 頁</span>
              <button
                className="icon-button"
                aria-label="下一頁"
                disabled={!result.hasMore || demo}
                onClick={() => setPage((v) => v + 1)}
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </>
      ) : (
        noData
      )}
    </>
  );
  return (
    <div className="app">
      <a className="skip" href="#main">
        跳到內容
      </a>
      {menu && (
        <button
          aria-label="關閉選單背景"
          className="scrim"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <Link href="/dashboard" className="wordmark">
          <img src="/brand/signal.svg" alt="" width="28" height="28" />
          Personal<span>OS</span>
          <small>STUDENT OS</small>
        </Link>
        <nav aria-label="Personal OS 導覽">
          {Object.entries(groupNames).filter(([group])=>visibleFeatures.some(f=>f.group===group)).map(([group, label]) => (
            <div key={group} className="nav-group">
              <p>{label}</p>
              {visibleFeatures
                .filter((f) => f.group === group)
                .map((f) => (
                  <div key={f.href}><Link
                    href={f.href}
                    className={
                      "nav-item " +
                      (!f.implemented ? "wip " : "") +
                      ((feature?.parentHref || feature?.href) === f.href
                        ? "active"
                        : "")
                    }
                    aria-current={
                      (feature?.parentHref || feature?.href) === f.href
                        ? "page"
                        : undefined
                    }
                  >
                    <Icon name={f.icon} />
                    <span>
                      {f.label}
                      {!f.implemented && <small>{gateLabel(f)}</small>}
                    </span>
                    {!f.implemented && (
                      <LockKeyhole size={12} className="lock" />
                    )}
                  </Link>{f.href==='/inspiration'&&route.startsWith('/inspiration')&&<div className="hub-subnav">{[['twitter','X (Twitter)'],['threads','Threads'],['reddit','Reddit'],['instagram','Instagram'],['tiktok','TikTok'],['xhs','小紅書']].map(([path,label])=><Link key={path} href={'/inspiration/'+path} aria-current={route==='/inspiration/'+path?'page':undefined}>{label}</Link>)}</div>}{f.href==='/voice'&&route==='/voice'&&<div className="hub-subnav">{[['voice','Voice'],['look','Look']].map(([id,label])=><Link key={id} href={id==='voice'?'/voice':'/voice?tab='+id} aria-current={(params.get('tab')||'voice')===id?'page':undefined}>{label}{(id==='sources'||id==='progress')?' · WIP':''}</Link>)}</div>}</div>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="avatar">我</div>
          <div>
            <strong>{brand}</strong>
            <small>一步一步，建成你嘅系統</small>
          </div>
        </div>
      </aside>
      <div className="workspace" inert={menu}>
        <header className={"topbar "+(route==='/voice'?'voice-topbar':'')}>
          <div>
            <button
              className="icon-button mobile-only"
              aria-label="打開主選單"
              onClick={() => setMenu(true)}
            >
              <Menu size={20} />
            </button>
            <span className="crumb">
              My workspace <ChevronRight size={13} />{" "}
              <strong>{feature?.label || "Page"}</strong>
            </span>
          </div>
          <div>
            <span
              className={
                "connection-chip " + (demo ? "demo" : connected ? "live" : "")
              }
            >
              <span />
              {demo ? "示範資料" : connected ? "Live · 已登入" : "尚未連線"}
            </span>
            <button
              className="icon-button"
              aria-label="切換深淺主題"
              onClick={theme}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="avatar mini">我</div>
          </div>
        </header>
        <main id="main" className="main">
          {!route.startsWith('/inspiration')&&route!=='/feed'&&route!=='/voice'&&route!=='/dashboard'&&route!=='/creator-studio'&&<div className="page-heading">
            <p>PERSONALOS / YOUR PERSONAL OS</p>
            <h1>{feature?.zh || "未提供的入口"}</h1>
          </div>}
          {!feature ? (
            <div className="empty">
              <h2>呢個入口未有提供</h2>
              <Link href="/dashboard">返回首頁</Link>
            </div>
          ) : route === "/dashboard" || route === "/creator-studio" ? (
            <ContentHome showImage={route==='/creator-studio'} token={token} source={briefSource} text={briefText} setText={setBriefText} platforms={platforms} setPlatforms={setPlatforms} clear={()=>{setBriefSource(null);setBriefText("");}}/>
          ) : route.startsWith('/feed') ? (
            <NewsFeed token={token} choose={r=>{setBriefSource(r);setBriefText(String((r.article as {text?:string}|undefined)?.text||r.caption||''));router.push('/creator-studio');}}/>
          ) : route === "/inspiration" ? (
            <InspirationHub token={token}/>
          ) : /^\/inspiration\/(instagram|tiktok|xhs|twitter|threads|reddit|all)$/.test(route) ? (
            <InspirationWorkspace key={route} initialPlatform={route.endsWith('/xhs')?'xiaohongshu':route.split('/').at(-1)} token={token} choose={r=>{setBriefSource(r);setBriefText(String((r.article as {text?:string}|undefined)?.text||r.caption||''));router.push('/creator-studio');}}/>
          ) : route === "/voice" ? (
            <BrandBrain tab={params.get("tab") || "voice"} token={token}/>
          ) : route === "/collection" ? (
            <><ContentCollection rows={demo?(result?.rows||[]).map(r=>({...r,post_id:r.id,caption:r.title,__demo:true})):selected==="posts"?result?.rows||[]:[]} busy={busy} error={demo?"":error||(!conn?status:selected!=="posts"?"目前進階檢查選咗其他表，請下方選 posts 返回來源卡片。":"")} inspect={setDetail} select={r=>{setBriefSource(r);setBriefText(String(r.caption||""));router.push('/dashboard');}}/><details className="panel"><summary>進階：資料表、搜尋與分頁檢查</summary>{dataPanel}</details></>
          ) : route === "/connections" ? (
            <>
              <PublishConnections/>
              <div className="connection-layout">
                <section className="panel">
                  <div className="section-heading">
                    <div>
                      <h2>接回你嘅 Supabase</h2>
                      <p>使用現有項目；不建立表格、不調整欄位。</p>
                    </div>
                    <Database />
                  </div>
                  <div className="project-id">
                    <small>你的Supabase project</small>
                    <code>{conn?.projectRef || "未設定"}</code>
                  </div>
                  <div
                    className={connected ? "success" : "notice"}
                    role="status"
                  >
                    {status}
                  </div>
                  <ol className="instructions">
                    <li>
                      由Codex完成本機或部署環境的Supabase設定，你不用手填API key。
                    </li>
                    <li>按「重新檢查連線」，核對是自己的project，再登入。</li>
                    <li>開 Feed，抓取 RSS 並核對 Supabase 讀回的新聞。</li>
                  </ol>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => setRefresh((v) => v + 1)}
                  >
                    <RefreshCw size={16} />
                    重新檢查連線
                  </button>
                  <p className="small-copy">
                    Key 不足權限時會停止讀取；唔會自動修改 RLS、policy 或
                    schema。
                  </p>
                </section>
                <section className="panel">
                  <h2>需要既有帳戶登入？</h2>
                  <p className="muted">
                    自己的workspace需要登入。初次使用前請按README執行固定bootstrap；首次登入會建立自己的workspace。請用此 project 的 Supabase Auth 帳戶。本機瀏覽器會保存session並自動續期；不保存密碼到文件。
                  </p>
                  <form
                    className="login"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!conn) return;
                      setAuthBusy(true);
                      setAuthMsg("登入中…");
                      const form = e.currentTarget;
                      const data = new FormData(form);
                      try {
                        auth.current = browserAuth(conn.url,conn.publishableKey);
                        const { data: session, error } =
                          await auth.current.auth.signInWithPassword({
                            email: String(data.get("email")),
                            password: String(data.get("password")),
                          });
                        if (error || !session.session)
                          throw new Error("登入未成功，請檢查既有帳戶資料。");
                        setToken(session.session.access_token);
                        setAuthMsg(
                          "已登入；本機瀏覽器保持登入並自動更新session。",
                        );
                        form.reset();
                      } catch (e) {
                        setAuthMsg(message(e));
                      } finally {
                        setAuthBusy(false);
                      }
                    }}
                  >
                    <label>
                      Email
                      <input
                        name="email"
                        type="email"
                        autoComplete="username"
                        required
                        disabled={!conn || authBusy}
                      />
                    </label>
                    <label>
                      Password
                      <input
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        disabled={!conn || authBusy}
                      />
                    </label>
                    <button className="quiet" disabled={!conn || authBusy}>
                      使用既有帳戶登入
                    </button>
                  </form>
                  <p role="status" className="small-copy">
                    {authMsg}
                  </p>
                  {token && (
                    <button
                      className="quiet"
                      disabled={authBusy}
                      onClick={async () => {
                        setAuthBusy(true);
                        try {
                          const result=await auth.current?.auth.signOut({scope:'local'});
                          if(result?.error){setAuthMsg("登出未完成，請重試；未聲稱已清除session。");return;}
                          setToken("");setConnected(false);setResult(null);
                          setAuthMsg("已登出此裝置，已清除保存的登入狀態。");
                        } catch {setAuthMsg("登出未完成，請重試。");}
                        finally {setAuthBusy(false);}
                      }}
                    >
                      登出此裝置
                    </button>
                  )}
                </section>
              </div>
              <section className="panel demo-choice">
                <div>
                  <h2>先看看空間點用</h2>
                  <p>
                    可切換合成示範資料，試搜尋同查看記錄。示範唔會當成你的 live
                    data。
                  </p>
                </div>
                <button className="quiet" onClick={switchMode}>
                  <Eye size={17} />
                  {demo ? "返回真實連線模式" : "使用示範資料預覽"}
                </button>
              </section>
            </>
          ) : route === "/settings" ? (
            <section className="panel settings">
              <h2>換成你嘅工作空間</h2>
              <p className="muted">設定只保存在這個瀏覽器，不寫入 Supabase。</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const value = brandInput.trim().slice(0, 60);
                  if (!value) return;
                  try {
                    localStorage.setItem("heyommi-student-brand", value);
                    setBrand(value);
                    setSaved("已保存到此瀏覽器。");
                  } catch {
                    setSaved("瀏覽器儲存不可用，未保存。");
                  }
                }}
              >
                <label>
                  工作空間名稱
                  <input
                    required
                    value={brandInput}
                    maxLength={60}
                    onChange={(e) => setBrandInput(e.target.value)}
                    placeholder="例如：我的品牌工作室"
                  />
                </label>
                <button className="button">保存名稱</button>
                <p role="status">{saved}</p>
              </form>
              <hr />
              <h3>可帶走的課程地圖</h3>
              <p className="muted">
                匯出功能入口、課堂標籤及目前實作狀態，不包含密鑰或來源資料。
              </p>
              <button
                className="quiet"
                onClick={() =>
                  download(
                    "my-personal-os-roadmap.json",
                    JSON.stringify(
                      {
                        workspace: brand,
                        features: visibleFeatures,
                        exportedAt: new Date().toISOString(),
                      },
                      null,
                      2,
                    ),
                  )
                }
              >
                <Download size={16} />
                匯出課程地圖
              </button>
            </section>
          ) : route === "/course" ? (
            <>
              <section className="journey-hero">
                <span className="tag">ONE OS · KEEP BUILDING</span>
                <h2>每次解鎖，都留喺你嘅系統。</h2>
                <p>
                  清水樓已備好工作區入口。功能實作完成後先開放，課堂標籤唔會自動觸發操作。
                </p>
                <div className="lesson-track">
                  <div className="present">
                    <Check size={17} />
                    <strong>你的起點</strong>
                    <span>{available} 個基礎入口</span>
                  </div>
                  <div>
                    <LockKeyhole size={17} />
                    <strong>Lesson 5</strong>
                    <span>{lessonFive.length} 項內容成果</span>
                  </div>
                  <div>
                    <LockKeyhole size={17} />
                    <strong>Lesson 6</strong>
                    <span>審批與版本記錄</span>
                  </div>
                  <div>
                    <LockKeyhole size={17} />
                    <strong>Lesson 7</strong>
                    <span>展示自己的 Personal OS</span>
                  </div>
                </div>
              </section>
              <div className="outcomes">
                {lessonFive.map((o, i) => (
                  <Link href={o.href} className="outcome" key={o.label}>
                    <span className="outcome-number">0{i + 1}</span>
                    <Icon name={o.icon} size={24} />
                    <div>
                      <h3>{o.label}</h3>
                      <p>{o.description}</p>
                      <small>WIP 🚧 Lesson 5</small>
                    </div>
                    <ArrowUpRight size={17} />
                  </Link>
                ))}
              </div>
              <h2>Lesson 6 · 審批與版本</h2>
              <div className="outcomes">{lessonSix.map(o => <Link href={o.href} className="outcome" key={o.label}><Icon name={o.icon} size={24}/><div><h3>{o.label}</h3><p>{o.description}</p><small>WIP 🚧 Lesson 6</small></div><ArrowUpRight size={17}/></Link>)}</div>
              <p className="small-copy">
                這些成果依老師最新確認的課程範圍。其餘 PersonalOS
                功能保留入口，未確認課堂前不承諾解鎖日期。
              </p>
            </>
          ) : (route.startsWith('/feed')||route.startsWith('/inspiration')||route==='/queue') ? (
            <>{route==='/queue'?<><CloudDraftQueue key={token} token={token}/><details><summary>老師進階測試工具</summary><TeacherWorkbench/></details></>:<LockedWorkflow route={route}/>}</>
          ) : !feature.implemented ? (
            <>
              <nav className="subnav" aria-label={feature.label + " 子入口"}>
                {children.map((c) => (
                  <Link key={c.href} href={c.href}>
                    {c.label}
                    <LockKeyhole size={12} />
                  </Link>
                ))}
              </nav>
              <section className="locked-page">
                <div className="locked-art">
                  <Icon name={feature.icon} size={50} />
                  <span>
                    <LockKeyhole size={18} />
                  </span>
                </div>
                <span className="tag neutral">
                  {selectedLesson
                    ? `WIP 🚧 Lesson ${selectedLesson}`
                    : "WIP 🚧 課堂待定"}
                </span>
                <h2>
                  {gateTitle}
                  <br />
                  <span>
                    {[...lessonFive, ...lessonSix].find((o) => o.href === feature.href)?.label ||
                      "你嘅下一種工作能力"}
                  </span>
                </h2>
                <p>
                  {[...lessonFive, ...lessonSix].find((o) => o.href === feature.href)
                    ?.description ||
                    "保留 PersonalOS 功能入口。課堂安排同接駁完成後，就會喺呢個工作區繼續。"}
                </p>
                <div className="unlock-note">
                  <ShieldCheck size={19} />
                  <span>
                    目前只可查看功能介紹。未接上生成、發布或任何付費 API。
                  </span>
                </div>
                <Link className="button" href="/course">
                  查看解鎖路線 <ArrowRight size={16} />
                </Link>
                <Link href="/feed" className="text-link">
                  先整理自己的資料
                </Link>
              </section>
            </>
          ) : null}

          <footer className="footer">
            <span>PersonalOS · 每一堂，建好一部分。</span>
            <span>Source code belongs to your workspace.</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        onCancel={() => setDetail(null)}
        className="record-dialog"
      >
        <div className="section-heading">
          <div>
            <small>{demo ? "示範記錄" : "Supabase · 唯讀"}</small>
            <h2>原始資料</h2>
          </div>
          <button
            autoFocus
            className="icon-button"
            aria-label="關閉資料詳情"
            onClick={() => setDetail(null)}
          >
            <X />
          </button>
        </div>
        <p className="muted">保留原欄位與內容。以下不是改寫結果。</p>
        <pre>{JSON.stringify(detail, null, 2)}</pre>
        <button className="quiet" onClick={() => setDetail(null)}>
          關閉
        </button>
      </dialog>
    </div>
  );
}
