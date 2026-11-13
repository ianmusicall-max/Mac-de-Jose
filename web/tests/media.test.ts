import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicUrl, publicAddress, extract, boundedText} from '../lib/media.ts';
test('rejects local URLs, credentials and alternate protocols',()=>{
 for(const url of ['http://example.com/a','https://127.0.0.1/a','https://[::1]/','https://localhost/a','https://metadata.google.internal/','https://user:pass@example.com/','https://example.com:8080/']) assert.throws(()=>publicUrl(url));
 assert.equal(publicUrl('https://example.com/video.mp4').hostname,'example.com');
});
test('extracts and deduplicates relative media without playlists',()=>{
 const result=extract('<title>My &amp; video</title><meta content="/movie.mp4?a=1&amp;b=2" property="og:video"><video src="/movie.mp4?a=1&amp;b=2"></video><source src="/live.m3u8"><audio src="/song.mp3"></audio>', 'https://example.com/page');
 assert.equal(result.title,'My & video'); assert.equal(result.items.length,2); assert.equal(result.items[0].url,'https://example.com/movie.mp4?a=1&b=2'); assert.equal(result.items[1].kind,'audio');
});
test('caps HTML body size', async()=>{await assert.rejects(()=>boundedText(new Response('x'.repeat(4*1024*1024+1))),/demasiado grande/);});

test('blocks private and metadata DNS destinations',()=>{
 for(const ip of ['127.0.0.1','10.1.1.1','169.254.169.254','172.16.0.1','192.168.1.1','100.64.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1']) assert.equal(publicAddress(ip),false,ip);
 assert.equal(publicAddress('8.8.8.8'),true); assert.equal(publicAddress('2606:4700:4700::1111'),true);
});
test('distinguishes a page cover from an actual video',()=>{
 const result=extract('<title>Post</title><meta property="og:image" content="https://example.com/cover.jpg">','https://example.com/post');
 assert.equal(result.items.length,1);assert.equal(result.items[0].isPreview,true);assert.equal(result.items[0].kind,'image');
});
test('extracts an independent OpenGraph audio track',()=>{
 const result=extract('<meta property="og:audio" content="/track.mp3">','https://example.com/post');
 assert.equal(result.items[0].kind,'audio');assert.equal(result.items[0].url,'https://example.com/track.mp3');
});
