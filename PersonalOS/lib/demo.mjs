export const demoTables = [
  {
    name: "demo_sources",
    columns: [
      { name: "id", type: "string" },
      { name: "platform", type: "string" },
      { name: "title", type: "string" },
      { name: "status", type: "string" },
    ],
    origin: "fixture",
  },
];
const records = [
  {
    id: "DEMO-001",
    platform: "Instagram",
    title: "示範：將一份公開筆記拆成內容方向",
    status: "待研究",
  },
  {
    id: "DEMO-002",
    platform: "Threads",
    title: "示範：由一條問題建立 Campaign Brief",
    status: "待確認",
  },
  {
    id: "DEMO-003",
    platform: "YouTube",
    title: "示範：由實作紀錄整理口播重點",
    status: "待研究",
  },
];
export function demoResult(search = "") {
  const filtered = records.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()));
  return {
    mode: "demo",
    projectRef: "synthetic-preview",
    table: "demo_sources",
    rows: filtered,
    columns: demoTables[0].columns,
    total: filtered.length,
    page: 0,
    pageSize: 25,
    hasMore: false,
    checkedAt: null,
    writeActions: 0,
  };
}
