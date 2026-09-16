import config from "../config/features.json" with { type: "json" };
export const features = config.items.map((f) => ({ ...f, parentHref: f.href }));
export const subroutes = config.subroutes;
export function isCourseVisible(path) { return !config.courseExcludedPrefixes.some(prefix => path === prefix || path.startsWith(prefix + '/')); }
export const visibleFeatures = features.filter(f => f.visible !== false && isCourseVisible(f.href));
export function getFeature(path) {
  const nested = Object.entries(config.subroutes).flatMap(
    ([parent, children]) =>
      children
        .filter((c) => !c.href.includes("?") && c.href !== parent)
        .map((c) => ({
          ...features.find((f) => f.href === parent),
          icon: features.find((f) => f.href === parent)?.icon || "Sparkles",
          group: features.find((f) => f.href === parent)?.group || "main",
          href: c.href,
          label: c.label,
          zh: c.label,
          lesson: c.lesson,
          implemented: false,
          parentHref: parent,
        })),
  );
  return (
    [...features, ...nested]
      .filter((f) => path === f.href || path.startsWith(f.href + "/"))
      .sort((a, b) => b.href.length - a.href.length || Number(isCourseVisible(b.parentHref)) - Number(isCourseVisible(a.parentHref)))[0] || null
  );
}
export function isImplemented(path) {
  return getFeature(path)?.implemented === true;
}
export function gateLabel(feature) {
  return feature.implemented
    ? "已開放"
    : feature.lesson
      ? `WIP 🚧 Lesson ${feature.lesson}`
      : "WIP 🚧 課堂待定";
}
export const allLessonFive = [
  {
    label: "品牌語氣設定",
    description: "定義你嘅作者身份、用字同寫作節奏。",
    href: "/voice",
    icon: "Brain",
  },
  {
    label: "品牌內容改寫 Skill",
    description: "將一次好嘅改寫方法，保存成可重用做法。",
    href: "/skills",
    icon: "WandSparkles",
  },
  {
    label: "多平台內容成果包",
    description: "同一份 Source，轉成適合不同平台嘅內容。",
    href: "/creator-studio",
    icon: "Palette",
  },
  {
    label: "Video Script",
    description: "由內容寫到完整口播同文字分鏡。",
    href: "/script-lab",
    icon: "Clapperboard",
  },
  {
    label: "Newsletter",
    description: "將有根據嘅重點編成一封品牌電子報。",
    href: "/newsletter",
    icon: "Mail",
  },
  {
    label: "Model / API 成本及選擇",
    description: "分清估算、實際用量同模型選擇理由。",
    href: "/model-costs",
    icon: "Coins",
  },
  {
    label: "內容版本及審批記錄",
    description: "保留每次修改，清楚知道邊版待審、邊版已確認。",
    href: "/queue",
    icon: "ListChecks",
  },
];

// Retain the original outcomes in source; the revised course excludes Video Script.
export const lessonFive = allLessonFive.filter(o => !['/script-lab','/queue'].includes(o.href));

export const lessonSix = allLessonFive.filter(o => o.href === "/queue");
