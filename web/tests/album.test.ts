import {test} from 'node:test';
import assert from 'node:assert/strict';
import {unzipSync} from 'fflate';
import {albumZip} from '../lib/album.ts';
test('the ZIP includes every image in the album without changing image bytes',()=>{
 const files=Array.from({length:20},(_,i)=>({data:new Uint8Array([255,216,i,255,217]),type:'image/jpeg',index:i+1}));
 const entries=unzipSync(albumZip(files));assert.equal(Object.keys(entries).length,20);
 assert.deepEqual(entries['imagen-020-20.jpg'],files[19].data);
});
test('an empty album is never reported as a successful download',()=>{assert.throws(()=>albumZip([]),/No hay imágenes/);});

test('keeps photo names and suffixes duplicate names in the ZIP',()=>{
 const data=new Uint8Array([1,2,3]);
 const files=[1,2,3].map(index=>({index,data,type:'image/jpeg',name:'Bogotá.jpg'}));
 assert.deepEqual(Object.keys(unzipSync(albumZip(files))),['Bogotá.jpg','Bogotá (2).jpg','Bogotá (3).jpg']);
});
