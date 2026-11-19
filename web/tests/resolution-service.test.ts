import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ResolutionService} from '../lib/resolution-service.ts';
import {OriginRateLimitError} from '../lib/rate-limit.ts';
import type {ResolvedMedia} from '../lib/instagram.ts';
import {cooldownOrigin,readCooldown} from '../lib/cooldown.ts';
const post='https://www.instagram.com/p/Db3HH6AjaSn/';
const media:ResolvedMedia={title:'Test',items:[{url:'https://example.com/video.mp4',kind:'video',title:'Test'}]};
function storage(saved:ResolvedMedia|null=null){return {find:async()=>saved,save:async(_url:string,result:ResolvedMedia)=>result};}
test('tracking parameters, reel aliases and refreshes share the same in-flight request',async()=>{
  let calls=0;
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  const service=new ResolutionService(storage(),async url=>{calls++;assert.equal(url,post);await gate;return media;});
  const first=service.resolve(post+'?igsh=tracking');
  const second=service.resolve('https://instagram.com/reel/Db3HH6AjaSn/?utm_source=test',true);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(calls,1);release();
  assert.deepEqual(await Promise.all([first,second]),[media,media]);
  assert.deepEqual(await service.resolve(post),media);assert.equal(calls,1);
});
test('a rate-limited refresh retains files and exposes the remaining wait',async()=>{
  const service=new ResolutionService(storage(media),async()=>{throw new OriginRateLimitError(114);});
  const result=await service.resolve(post,true);
  assert.deepEqual(result.items,media.items);assert.equal(result.retryAfter,114);
  assert.match(result.warning!,/Conservamos/);
});
test('stored results stay accessible without making origin requests',async()=>{
  const service=new ResolutionService(storage(media),async()=>{throw new Error('Must not query Instagram');});
  assert.deepEqual(await service.resolve(post),media);
});
test('a partial result with a cooldown does not replace archived or cached metadata',async()=>{
  const partial:ResolvedMedia={title:'Test',items:[{url:'https://example.com/photo.jpg',kind:'image',title:'Test'}],retryAfter:93};
  const saves:ResolvedMedia[]=[];
  let calls=0;
  const service=new ResolutionService({
    find:async()=>null,
    save:async(_url,result)=>{saves.push(result);return result;},
  },async()=>++calls===1?partial:media);
  assert.deepEqual(await service.resolve(post),partial);
  assert.deepEqual(saves,[]);
  assert.deepEqual(await service.resolve(post),media);
  assert.deepEqual(saves,[media]);
});
test('failed loads do not leave a stuck pending request',async()=>{
  let calls=0;
  const service=new ResolutionService(storage(),async()=>{if(++calls===1)throw new OriginRateLimitError(60);return media;});
  await assert.rejects(()=>service.resolve(post),OriginRateLimitError);
  assert.deepEqual(await service.resolve(post),media);assert.equal(calls,2);
});
test('cooldowns survive reloads, expire and apply to canonical Instagram aliases',()=>{
  assert.equal(cooldownOrigin('https://instagram.com/reel/Db3HH6AjaSn/'),cooldownOrigin(post));
  assert.deepEqual(readCooldown('{"origin":"https://www.instagram.com","until":2000}',1000),{origin:'https://www.instagram.com',until:2000});
  assert.equal(readCooldown('{"origin":"https://www.instagram.com","until":2000}',2000),null);
  assert.equal(readCooldown('broken'),null);
});
