import {test} from 'node:test';
import assert from 'node:assert/strict';
import {retryAfterSeconds, OriginBackoff, OriginRateLimitError} from '../lib/rate-limit.ts';
import {remote} from '../lib/media.ts';
import {ResolutionCache} from '../lib/resolution-cache.ts';
test('honors Retry-After seconds, dates and missing headers',()=>{
 const now=Date.parse('2026-11-12T20:00:00Z');
 assert.equal(retryAfterSeconds('120',now),120);
 assert.equal(retryAfterSeconds('Thu, 12 Nov 2026 20:02:00 GMT',now),120);
 assert.equal(retryAfterSeconds(null,now),60);
 assert.equal(retryAfterSeconds('invalid',now),60);
});
test('origin backoff allows other sites and expires',()=>{
 let now=0;const limiter=new OriginBackoff(()=>now);
 limiter.record('https://example.com','30');
 assert.throws(()=>limiter.check('https://example.com'),OriginRateLimitError);
 assert.doesNotThrow(()=>limiter.check('https://other.com'));
 now=30000;assert.doesNotThrow(()=>limiter.check('https://example.com'));
});
test('a 429 stops requests to the same site without automatic retries',async t=>{
 let requests=0;
 t.mock.method(globalThis,'fetch',async (input:URL|string)=>{
  requests++;
  if(String(input).startsWith('https://cloudflare-dns.com/'))return Response.json({Answer:[{type:1,data:'8.8.8.8'}]});
  return new Response('limited',{status:429,headers:{'Retry-After':'120'}});
 });
 await assert.rejects(()=>remote('https://limited.example.com/post'),(e:unknown)=>e instanceof OriginRateLimitError&&e.retryAfter===120);
 assert.equal(requests,3);
 await assert.rejects(()=>remote('https://limited.example.com/another-post'),OriginRateLimitError);
 assert.equal(requests,3);
});
test('reuses successful metadata, merges concurrent requests, expires and never caches failures',async()=>{
 let now=0,calls=0;const cache=new ResolutionCache<number>(()=>now);
 const load=async()=>++calls;
 const results=await Promise.all([cache.get('post',load),cache.get('post',load)]);
 assert.deepEqual(results,[1,1]);assert.equal(calls,1);
 assert.equal(await cache.get('post',load),1);
 now=120001;assert.equal(await cache.get('post',load),2);
 await assert.rejects(()=>cache.get('failure',async()=>{throw new Error('blocked');}));
 assert.equal(await cache.get('failure',load),3);
});
