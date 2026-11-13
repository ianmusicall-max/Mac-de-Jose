import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertCompleteImage,assertFullResponse,readImage} from '../lib/image-file.ts';
const jpeg=new Uint8Array([255,216,255,224,0,4,0,0,255,217]);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMmcAAAAASUVORK5CYII=','base64');
test('rejects truncated JPEG data and mismatched transport lengths',()=>{
 assert.doesNotThrow(()=>assertCompleteImage(jpeg,'image/jpeg',jpeg.length));
 assert.throws(()=>assertCompleteImage(jpeg.slice(0,-2),'image/jpeg'),/cortada/);
 assert.throws(()=>assertCompleteImage(jpeg,'image/jpeg',jpeg.length+100),/incompleta/);
});
test('requires the PNG end chunk',()=>{assert.doesNotThrow(()=>assertCompleteImage(png,'image/png'));assert.throws(()=>assertCompleteImage(png.subarray(0,png.length-12),'image/png'),/incompleta/);});
test('partial HTTP responses are never passed off as a complete image',()=>{
 assert.throws(()=>assertFullResponse(206,'bytes 0-99/1000'),/solo una parte/);assert.doesNotThrow(()=>assertFullResponse(206,'bytes 0-99/100'));
});
test('a complete streamed image is retained byte for byte',async()=>{
 const data=await readImage(new Response(jpeg,{headers:{'Content-Type':'image/jpeg','Content-Length':String(jpeg.length)}}));assert.deepEqual(data,jpeg);
});
test('a stream with a missing JPEG ending fails before a download can be created',async()=>{
 await assert.rejects(()=>readImage(new Response(jpeg.slice(0,-2),{headers:{'Content-Type':'image/jpeg'}})),/cortada/);
});
