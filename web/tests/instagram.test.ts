import {test} from 'node:test';
import assert from 'node:assert/strict';
import {instagramPost, extractInstagram, resolveInstagram, publicInstagramQuery, extractPublicInstagram,bestImageCandidate} from '../lib/instagram.ts';
import {OriginRateLimitError} from '../lib/rate-limit.ts';
const url='https://www.instagram.com/p/DeNGui6BA5H/';
const cover='<title>Instagram</title><meta property="og:image" content="https://example.com/cover.jpg">';
test('recognizes only Instagram post URLs',()=>{
 assert.equal(instagramPost(url),'DeNGui6BA5H');assert.equal(instagramPost('https://example.com/p/DeNGui6BA5H/'),null);assert.equal(instagramPost('https://www.instagram.com/someone/'),null);
});
test('parses video versions without depending on field ordering',()=>{
 const result=extractInstagram('<script>{"video_versions":[{"url":"https://example.com/video.mp4?a=1\\u0026b=2","height":720,"width":1280}]}</script>','DeNGui6BA5H');
 assert.equal(result.items[0].kind,'video');assert.equal(result.items[0].url,'https://example.com/video.mp4?a=1&b=2');
});
test('uses a public embed when the original has only a cover',async()=>{
 let calls=0;
 const result=await resolveInstagram(url,cover,async target=>{calls++;assert.equal(target,url+'embed/captioned/');return '<script>{"video_url":"https://example.com/video.mp4"}</script>';});
 assert.equal(calls,1);assert.equal(result.items.filter(item=>item.kind==='video').length,1);assert.equal(result.warning,undefined);
});
test('does not claim a removed or login-gated embed provides video',async()=>{
 const result=await resolveInstagram(url,cover,async()=>'<p>The link to this photo or video may be broken, or the post may have been removed.</p>');
 assert.equal(result.items.some(item=>item.kind==='video'),false);assert.match(result.warning!,/Instagram no ha entregado/);
});
test('never tries additional endpoints after a rate limit',async()=>{
 await assert.rejects(()=>resolveInstagram(url,'',async()=>{throw new OriginRateLimitError(60);}),OriginRateLimitError);
});

const pageWithToken=cover+'<script>["LSD",[],{"token":"anonymous-test-token"}]</script>';
const publicVideo={data:{xig_polaris_media:{if_not_gated_logged_out:{user:{username:'example'},video_versions:[{url:'https://example.com/video.mp4',type:101}]}}}};
test('builds the anonymous query for the correct media id without account cookies',()=>{
 const query=publicInstagramQuery(pageWithToken,'DeNGui6BA5H')!;
 const body=new URLSearchParams(String(query.init.body));
 assert.deepEqual(JSON.parse(body.get('variables')!),{media_id:'4002885230657801799'});
 assert.equal(query.url,'https://www.instagram.com/api/graphql');
 assert.equal(new Headers(query.init.headers).has('Cookie'),false);
 assert.equal(publicInstagramQuery(cover,'DeNGui6BA5H'),null);
});
test('does not extract content outside the explicitly logged-out response',()=>{
 assert.equal(extractPublicInstagram({data:{xig_polaris_media:{video_versions:[{url:'https://example.com/private.mp4'}]}}},'DeNGui6BA5H'),null);
});
test('resolves public query videos before the embed fallback',async()=>{
 const result=await resolveInstagram(url,pageWithToken,async()=>{throw new Error('Embed must not be fetched');},async()=>publicVideo);
 assert.equal(result.items[0].url,'https://example.com/video.mp4');assert.equal(result.items[0].kind,'video');assert.equal(result.warning,undefined);
});
test('preserves rate limiting from the anonymous query',async()=>{
 let embeds=0;
 const result=await resolveInstagram(url,pageWithToken,async()=>{embeds++;return '';},async()=>{throw new OriginRateLimitError(120);});
 assert.equal(result.retryAfter,120);
 assert.equal(result.items[0].isPreview,true);
 assert.equal(embeds,0);
});

test('keeps a public photo when the embed responds with a rate limit',async()=>{
 const result=await resolveInstagram(url,'<script>{"display_url":"https://example.com/photo.jpg"}</script>',async()=>{throw new OriginRateLimitError(93);});
 assert.equal(result.retryAfter,93);
 assert.equal(result.items[0].url,'https://example.com/photo.jpg');
 assert.ok(result.albumWarning);
});

function publicPhotos(nodes:unknown[],count=nodes.length){return {data:{xig_polaris_media:{if_not_gated_logged_out:{carousel_media:nodes,carousel_media_count:count}}}};}
const photo=(i:number)=>({pk:String(i),media_type:1,original_width:1080,original_height:1350,image_versions2:{candidates:[{url:`https://example.com/crop-${i}.jpg`,width:1440,height:1440},{url:`https://example.com/full-${i}.jpg`,width:1080,height:1350}]}});
test('photo-only albums are returned completely without falling back to the cover',async()=>{
 const payload=publicPhotos(Array.from({length:20},(_,i)=>photo(i+1)));
 const result=await resolveInstagram(url,pageWithToken,async()=>{throw new Error('Embed must not replace a photo album');},async()=>payload);
 assert.equal(result.items.length,20);assert.equal(result.albumSize,20);assert.equal(result.resolvedAlbumItems,20);
 assert.equal(result.items[19].url,'https://example.com/full-20.jpg');assert.equal(result.albumWarning,undefined);
});
test('prefers the uncropped aspect ratio and then the highest image resolution',()=>{
 const result=bestImageCandidate(photo(1).image_versions2.candidates,1080,1350);assert.equal(result?.url,'https://example.com/full-1.jpg');
});
test('video posts retain their original cover image',()=>{
 const payload=publicPhotos([{...photo(1),media_type:2,video_versions:[{url:'https://example.com/video.mp4'}]}]);const result=extractPublicInstagram(payload,'DeNGui6BA5H')!;
 assert.equal(result.items.filter(i=>i.kind==='image').length,1);assert.equal(result.items.find(i=>i.kind==='image')!.isPreview,true);
});
test('large mixed albums are not cut off at forty rendition files',()=>{
 const nodes=Array.from({length:20},(_,i)=>({...photo(i+1),media_type:2,video_versions:[0,1,2].map(v=>({type:v+1,url:`https://example.com/video-${i}-${v}.mp4`}))}));
 const result=extractPublicInstagram(publicPhotos(nodes),'DeNGui6BA5H')!;assert.equal(result.items.length,80);assert.equal(result.items.filter(i=>i.kind==='image').length,20);
});
test('marks an origin response with missing album positions as incomplete',()=>{
 const result=extractPublicInstagram(publicPhotos([photo(1),photo(2)],5),'DeNGui6BA5H')!;assert.match(result.albumWarning!,/2 de 5/);
});
