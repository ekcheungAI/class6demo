// Adapted from owner-provided HeyOmmi-main/lib/feed/rss.ts; parser only.
// Shared RSS/Atom reader.
//
// Extracted from collectRss() in lib/inspiration-sources.ts so the Ommi Official
// Feed ingest (lib/feed/collectors/rss.ts) and the per-account inspiration
// bundles read feeds through exactly one parser. RSS 2.0 (rss.channel.item),
// Atom (feed.entry) and RSS 1.0/RDF (rdf:RDF.item) shapes are all handled;
// callers get a neutral entry shape and do their own normalization into whatever
// row type they store.
//
// RSS 1.0 matters because its <item> elements are siblings of <channel>, not
// children: a parser that only looks at rss.channel.item returns zero entries
// for a perfectly valid feed, which reads downstream as a healthy empty source
// rather than a bug. Nikkei Asia is the feed that surfaced this.
import { XMLParser } from "fast-xml-parser";
const DEFAULT_LIMIT = 25;
const DEFAULT_TIMEOUT_MS = 12_000;
const USER_AGENT = "HeyOmmi/1.0 (+https://heyommi.com)";
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    trimValues: true,
});
// ── Small XML/text helpers ───────────────────────────────────────────────────
function textFromUnknown(value) {
    if (value === null || value === undefined)
        return "";
    if (typeof value === "string" || typeof value === "number")
        return String(value);
    if (typeof value === "object") {
        const obj = value;
        return textFromUnknown(obj["#text"] ?? obj.__cdata ?? obj.text ?? obj.value ?? "");
    }
    return "";
}
function arrayFromUnknown(value) {
    if (!value)
        return [];
    return Array.isArray(value) ? value : [value];
}
function isHttpUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    }
    catch {
        return false;
    }
}
function stripMarkup(value) {
    return value
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}
function parseFeedDate(value) {
    const text = textFromUnknown(value);
    if (!text)
        return null;
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
export function hostnameOf(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    }
    catch {
        return "Unknown";
    }
}
/**
 * Atom puts the URL in <link href> (sometimes several, distinguished by rel);
 * RSS puts it in the element text. Both shapes reach us as string | object | array.
 */
function entryUrl(linkRaw) {
    if (typeof linkRaw === "string")
        return linkRaw;
    if (Array.isArray(linkRaw)) {
        const links = linkRaw;
        const alternate = links.find((l) => l.rel === "alternate") ?? links[0];
        return textFromUnknown(alternate?.href ?? alternate);
    }
    const link = linkRaw;
    return textFromUnknown(link?.href ?? linkRaw);
}
function entryImage(entry) {
    const mediaContent = entry["media:content"];
    const media = Array.isArray(mediaContent) ? mediaContent[0] : mediaContent;
    const thumbnail = entry["media:thumbnail"];
    const enclosure = entry.enclosure;
    const image = textFromUnknown(media?.url ?? thumbnail?.url ?? enclosure?.url);
    return image && isHttpUrl(image) ? image : null;
}
function entryCategories(entry) {
    const seen = new Set();
    const out = [];
    for (const raw of arrayFromUnknown(entry.category)) {
        // Atom uses <category term="…"/>, RSS uses element text.
        const value = textFromUnknown(raw?.term ?? raw).trim();
        if (!value)
            continue;
        const key = value.toLowerCase();
        if (seen.has(key))
            continue;
        seen.add(key);
        out.push(value);
        if (out.length >= 8)
            break;
    }
    return out;
}
// ── Public API ───────────────────────────────────────────────────────────────
/** Parse feed XML into neutral entries. Never throws on malformed entries — they are skipped. */
export function parseFeedXml(xml, feedUrl, limit = DEFAULT_LIMIT) {
    const parsed = parser.parse(xml);
    const rss = parsed.rss;
    const channel = rss?.channel;
    const feed = parsed.feed;
    // RSS 1.0 keeps <channel> for metadata but hangs <item> off the root.
    const rdf = parsed["rdf:RDF"];
    const rdfChannel = rdf?.channel;
    const sourceName = textFromUnknown(channel?.title ?? feed?.title ?? rdfChannel?.title) || hostnameOf(feedUrl);
    const rssItems = arrayFromUnknown(channel?.item);
    const atomItems = arrayFromUnknown(feed?.entry);
    const rdfItems = arrayFromUnknown(rdf?.item);
    const entries = [];
    for (const entry of [...rssItems, ...atomItems, ...rdfItems].slice(0, limit)) {
        const url = entryUrl(entry.link);
        if (!url || !isHttpUrl(url))
            continue;
        const author = entry.author;
        entries.push({
            guid: textFromUnknown(entry.guid ?? entry.id) || url,
            url,
            title: stripMarkup(textFromUnknown(entry.title)),
            summary: stripMarkup(textFromUnknown(entry.description ?? entry.summary ?? entry["content:encoded"] ?? entry.content)),
            author: stripMarkup(textFromUnknown(entry["dc:creator"] ?? entry.creator ?? author?.name ?? entry.author)) || null,
            // dc:date is how RSS 1.0 (and some RSS 2.0 feeds) carry the timestamp.
            publishedAt: parseFeedDate(entry.pubDate ?? entry.published ?? entry.updated ?? entry["dc:date"]),
            imageUrl: entryImage(entry),
            categories: entryCategories(entry),
        });
    }
    return { sourceName, entries };
}
