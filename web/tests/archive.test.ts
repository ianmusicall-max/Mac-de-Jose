import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MediaArchive,SharedBackoff,InstagramContext,digest,type ArchiveStorage} from '../lib/archive.ts';
import {OriginRateLimitError} from '../lib/rate-limit.ts';
function memory(){const data=new Map<string,string>();const files=new Set<string>();const storage:ArchiveStorage={read:async key=>data.get(key)||null,write:async(key,value)=>{data.set(key,value);},exists:async key=>files.has(key)};return {data,files,storage};}
const source='https://www.instagram.com/p/DeNGui6BA5H/';
const media={title:'Video',items:[{url:'https://example.com/video.mp4',kind:'video' as const,title:'Video'}]};
test('saved videos remain available after metadata expires and across instances',async()=>{
 const m=memory();let now=0;const first=new MediaArchive(m.storage,()=>now);const saved=await first.save(source,media);
 m.files.add('files/'+saved.items[0].assetId);now=86400000;
 const afterRestart=new MediaArchive(m.storage,()=>now);const result=await afterRestart.find('https://instagram.com/reel/DeNGui6BA5H/?utm_source=test');
 assert.equal(result?.fromArchive,true);assert.equal(result?.items[0].kind,'video');
});
test('expired signed URLs without a stored file are not served as ready',async()=>{
 const m=memory();let now=0;const archive=new MediaArchive(m.storage,()=>now);await archive.save(source,media);now=120001;
 assert.equal(await archive.find(source),null);
});
test('a saved Instagram cover does not permanently hide a missing video',async()=>{
 const m=memory();let now=0;const archive=new MediaArchive(m.storage,()=>now);
 const result=await archive.save(source,{title:'Post',items:[{url:'https://example.com/photo.jpg',kind:'image',title:'Photo',isPreview:true}]});m.files.add('files/'+result.items[0].assetId);now=120001;
 assert.equal(await archive.find(source),null);
});
test('an origin wait is shared by new Worker instances and permits other sites',async()=>{
 const m=memory();let now=1000;const first=new SharedBackoff(m.storage,()=>now);await first.record('https://www.instagram.com','120');
 const restarted=new SharedBackoff(m.storage,()=>now);
 await assert.rejects(()=>restarted.check('https://www.instagram.com'),OriginRateLimitError);
 await assert.doesNotReject(()=>restarted.check('https://example.com'));
 now=121001;await assert.doesNotReject(()=>restarted.check('https://www.instagram.com'));
});
test('repeated blocks without Retry-After increase the wait instead of retrying aggressively',async()=>{
 const m=memory();let now=0;const guard=new SharedBackoff(m.storage,()=>now);
 assert.equal((await guard.record('https://www.instagram.com',null)).retryAfter,60);now=60001;
 assert.equal((await guard.record('https://www.instagram.com',null)).retryAfter,120);
});

test('anonymous context is reused across instances and expires without account cookies',async()=>{
 const m=memory();let now=0;const context=new InstagramContext(m.storage,()=>now);
 await context.record('<script>["LSD",[],{"token":"anonymous-test"}]</script>');
 assert.equal(await new InstagramContext(m.storage,()=>now).read(),'anonymous-test');
 now=15*60_000+1;assert.equal(await context.read(),null);
});

test('reloading a partially downloaded photo album keeps every known photo',async()=>{
 const m=memory();let now=0;const archive=new MediaArchive(m.storage,()=>now);
 const saved=await archive.save(source,{title:'Album',albumSize:3,items:[1,2,3].map(i=>({url:`https://example.com/${i}.jpg`,kind:'image' as const,title:`Photo ${i}`,albumIndex:i}))});
 m.files.add('files/'+saved.items[0].assetId);now=86400000;
 const result=await new MediaArchive(m.storage,()=>now).find(source);assert.equal(result?.items.length,3);assert.equal(result?.items[0].isStored,true);assert.equal(result?.items[2].isStored,false);
});
test('refreshing image metadata preserves an already archived legacy video and its audio source id',async()=>{
 const m=memory();const archive=new MediaArchive(m.storage);
 await archive.save(source,{title:'Saved',items:[{...media.items[0],assetId:'legacy-video'}]});m.files.add('files/legacy-video');
 const result=await archive.save(source,{title:'Post',items:[{...media.items[0],url:'https://example.com/new-signed-video.mp4',mediaKey:'123:video:101'},{url:'https://example.com/cover.jpg',kind:'image',title:'Cover',isPreview:true}]});
 assert.equal(result.items[0].assetId,'legacy-video');assert.equal(result.items.length,2);
});
test('a refreshed higher-resolution photo replaces an older cached thumbnail',async()=>{
 const m=memory();const archive=new MediaArchive(m.storage);
 const old=await archive.save(source,{title:'Post',items:[{url:'https://example.com/small.jpg',kind:'image',title:'Photo',mediaKey:'1:image',width:320,height:400}]});m.files.add('files/'+old.items[0].assetId);
 const result=await archive.save(source,{title:'Post',items:[{url:'https://example.com/full.jpg',kind:'image',title:'Photo',mediaKey:'1:image',width:1080,height:1350}]});
 assert.notEqual(result.items[0].assetId,old.items[0].assetId);
});

test('a later cover-only origin response does not erase the cached video or its audio id',async()=>{
 const m=memory();const archive=new MediaArchive(m.storage);await archive.save(source,{title:'Saved',items:[{...media.items[0],assetId:'kept-video'}]});m.files.add('files/kept-video');
 const refreshed=await archive.save(source,{title:'Post',items:[{url:'https://example.com/cover.jpg',kind:'image',isPreview:true,title:'Cover'}]});
 assert.equal(refreshed.items.find(item=>item.kind==='video')?.assetId,'kept-video');assert.equal(refreshed.fromArchive,true);
});
