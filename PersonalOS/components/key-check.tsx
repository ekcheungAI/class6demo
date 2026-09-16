"use client";
import { useCallback, useEffect, useState } from "react";

type Row = {
  id: string;
  label: string;
  act: string;
  status: "ok" | "fail" | "missing" | "skip";
  detail: string;
  next: string;
};
type Report = {
  rows: Row[];
  summary: { ok: number; fail: number; missing: number; skip: number };
  readyForClass: boolean;
  checkedAt: string;
};

const TRACK_KEY = "personalos-l6-track";
const MARK: Record<Row["status"], string> = { ok: "✓", fail: "✗", missing: "－", skip: "·" };
const COLOR: Record<Row["status"], string> = {
  ok: "#7ed957",
  fail: "#ff6b6b",
  missing: "#ffb454",
  skip: "#8a8a99",
};

/**
 * 課前 Key 檢查 — 開堂前一眼睇晒六幕要用嘅每一條 key 通唔通。
 *
 * 每行係一個免費 read-only 呼叫嘅結論；唔會生成、唔會出帖、唔會扣額度，
 * 亦唔會喺畫面出現任何 key。同 `npm run check:keys` 係同一個函數。
 */
export default function KeyCheck() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [track, setTrack] = useState<"pro" | "free" | "dry-run">("pro");

  useEffect(() => {
    try {
      const t = localStorage.getItem(TRACK_KEY);
      if (t === "pro" || t === "free" || t === "dry-run") setTrack(t);
    } catch {
      /* private mode: choice will not persist */
    }
  }, []);

  const run = useCallback(async (t: typeof track) => {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/connection/keys?track=${t}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);
      setReport(j as Report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "叫唔到本機 API");
    }
    setBusy(false);
  }, []);

  useEffect(() => {
    void run(track);
  }, [run, track]);

  const choose = (t: typeof track) => {
    setTrack(t);
    try {
      localStorage.setItem(TRACK_KEY, t);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="panel" id="key-check">
      <div className="section-heading">
        <div>
          <h2>課前 Key 檢查</h2>
          <p>每條 key 一個免費嘅只讀呼叫：有冇、通唔通、下一步。唔生成、唔出帖、唔顯示任何值。</p>
        </div>
        <button className="button" onClick={() => void run(track)} disabled={busy}>
          {busy ? "檢查緊…" : "重新檢查"}
        </button>
      </div>

      <p className="muted" style={{ margin: "0 0 10px", display: "flex", flexWrap: "wrap", alignItems: "center" }}>
        我行邊條 track：
        {(["pro", "free", "dry-run"] as const).map((t) => (
          <label key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 14, whiteSpace: "nowrap" }}>
            <input type="radio" name="l6-track" checked={track === t} onChange={() => choose(t)} />{" "}
            {t === "pro" ? "Pro（Threads + Upload-Post）" : t === "free" ? "Free（只 Threads）" : "Dry-run（唔出街）"}
          </label>
        ))}
      </p>

      {error ? (
        <p role="status">{error}</p>
      ) : !report ? (
        <p className="muted">讀緊…</p>
      ) : (
        <>
          <div
            className={report.readyForClass ? "success" : "notice"}
            role="status"
            style={{ marginBottom: 12 }}
          >
            {report.readyForClass
              ? `READY · 五條必要嘅全部通過（${report.summary.ok} ✓）。可以開堂。`
              : `NOT READY · ${report.summary.fail} 條 ✗、${report.summary.missing} 條未填——下面「下一步」逐條搞掂再撳重新檢查。`}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, tableLayout: "fixed" }}>
            <colgroup><col style={{ width: 28 }} /><col style={{ width: "24%" }} /><col style={{ width: "13%" }} /><col /><col style={{ width: "27%" }} /></colgroup>
            <thead>
              <tr style={{ textAlign: "left", color: "#8a8a99" }}>
                <th style={{ padding: "4px 6px" }}></th>
                <th style={{ padding: "4px 6px" }}>邊條</th>
                <th style={{ padding: "4px 6px" }}>邊幕用</th>
                <th style={{ padding: "4px 6px" }}>結果</th>
                <th style={{ padding: "4px 6px" }}>下一步</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #2a2a36" }}>
                  <td style={{ padding: "6px", color: COLOR[r.status], fontWeight: 700 }}>{MARK[r.status]}</td>
                  <td style={{ padding: "6px", overflowWrap: "anywhere" }}>
                    <strong>{r.label}</strong>
                  </td>
                  <td style={{ padding: "6px" }} className="muted">
                    {r.act}
                  </td>
                  <td style={{ padding: "6px" }}>{r.detail}</td>
                  <td style={{ padding: "6px" }} className="muted">
                    {r.next}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: 10 }}>
            檢查時間 {report.checkedAt.replace("T", " ").slice(0, 19)}　·　同一個檢查亦可以喺終端跑：<code>npm run check:keys</code>
          </p>
        </>
      )}
    </section>
  );
}
