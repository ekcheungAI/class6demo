"use client";
import { useCallback, useEffect, useState } from "react";

type ThreadsState = {
  ok?: boolean;
  username?: string;
  userId?: string;
  matchesEnv?: boolean;
  canPublish?: boolean | null;
  expiresAt?: string | null;
  note?: string;
  message?: string;
};
type Profile = { username: string; platforms: string[]; unconnected: string[] };
type UploadState = { ok?: boolean; authHeader?: string; profiles?: Profile[]; message?: string };

const PICK_KEY = "personalos-upload-post-profile";

/**
 * Act 3 「接線」: read who you are on each publishing route, and nothing else.
 * No container is created, no post is sent, no key is ever rendered.
 *
 * The Threads card answers the question that otherwise ambushes people in
 * Act 5 — whether this token may publish at all — while there is still time
 * to do something about it.
 */
export default function PublishConnections() {
  const [threads, setThreads] = useState<ThreadsState | null>(null);
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState("");

  useEffect(() => {
    try {
      setPicked(localStorage.getItem(PICK_KEY) || "");
    } catch {
      /* private mode: the choice simply will not persist */
    }
  }, []);

  const check = useCallback(async () => {
    setBusy(true);
    const read = async (path: string) => {
      try {
        const r = await fetch(path, { cache: "no-store" });
        return await r.json();
      } catch {
        return { ok: false, message: "叫唔到本機 API" };
      }
    };
    const [t, u] = await Promise.all([
      read("/api/connection/threads"),
      read("/api/connection/uploadpost"),
    ]);
    setThreads(t);
    setUpload(u);
    setBusy(false);
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const choose = (name: string) => {
    setPicked(name);
    try {
      localStorage.setItem(PICK_KEY, name);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>發行部接線</h2>
          <p>只讀身份同權限。呢一版唔會建立容器、唔會發帖、唔會顯示任何 key。</p>
        </div>
        <button className="button" onClick={() => void check()} disabled={busy}>
          {busy ? "檢查緊…" : "重新檢查"}
        </button>
      </div>

      <h3>Threads（自己嘅 token）</h3>
      {!threads ? (
        <p className="muted">讀緊…</p>
      ) : threads.ok ? (
        <ul>
          <li>
            帳戶：<strong>@{threads.username}</strong>（id {threads.userId}）
            {threads.matchesEnv === false && " ⚠️ 同 THREADS_USER_ID 唔一致"}
          </li>
          <li>
            出帖權限：
            <strong>
              {threads.canPublish === true
                ? "有"
                : threads.canPublish === false
                  ? "冇"
                  : "查唔到"}
            </strong>
          </li>
          {threads.expiresAt && <li>條 token 到期：{threads.expiresAt.slice(0, 10)}</li>}
          <li className="muted">{threads.note}</li>
        </ul>
      ) : (
        <p role="status">{threads.message}</p>
      )}

      <hr />

      <h3>Upload-Post（一條 key，多個 profile）</h3>
      {!upload ? (
        <p className="muted">讀緊…</p>
      ) : upload.ok ? (
        <>
          <p className="muted">
            認證格式：<code>{upload.authHeader}</code>　·　揀一個 profile 做今日出帖嘅目標。
          </p>
          {(upload.profiles || []).map((p) => (
            <label key={p.username} style={{ display: "block", margin: "6px 0" }}>
              <input
                type="radio"
                name="up-profile"
                checked={picked === p.username}
                onChange={() => choose(p.username)}
              />{" "}
              <strong>{p.username}</strong>
              {"　已連："}
              {p.platforms.length ? p.platforms.join("、") : "冇"}
              {p.unconnected.length ? `　未連：${p.unconnected.join("、")}` : ""}
            </label>
          ))}
          <p className="muted">
            {picked ? `今日出帖用：${picked}` : "未揀 profile — 揀咗先入到第五幕。"}
          </p>
        </>
      ) : (
        <p role="status">{upload.message}</p>
      )}

      <hr />
      <p className="small-copy">
        兩條路都係「接好線、掣關住」。發布掣第五幕先開，而且一次只發一張卡。
      </p>
    </section>
  );
}
