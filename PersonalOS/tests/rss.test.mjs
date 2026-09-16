import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFeedXml} from '../lib/rss-parser.mjs';
import {mapRss} from '../lib/rss-feed.mjs';
test('RSS and Atom parse previews; stable IDs survive subsequent collection',()=>{
 const rss=parseFeedXml('<rss><channel><item><guid>abc</guid><title>Hello</title><link>https://example.com/a</link><description>Preview</description></item></channel></rss>','https://example.com/feed');
 const atom=parseFeedXml('<feed><entry><id>abc</id><title>Hello</title><link href="https://example.com/a"/><summary>Preview</summary></entry></feed>','https://example.com/feed');
 assert.equal(rss.entries[0].url,atom.entries[0].url);
 const source={id:'demo',name:'Demo',url:'https://example.com/feed',template:'ai'};
 const a=mapRss(rss.entries,source,'w','2026-09-14T00:00:00Z','run-a');
 const b=mapRss(rss.entries,source,'w','2026-09-15T00:00:00Z','run-b');
 assert.equal(a.posts[0].post_id,b.posts[0].post_id);assert.equal(a.posts[0].metadata.feed.content_depth,'rss-summary');assert.equal(a.posts[0].workspace_id,'w');
});
