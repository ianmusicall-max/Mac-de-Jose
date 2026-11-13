import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFile,type Movie,type MP4BoxBuffer} from 'mp4box';
import {extractM4a,AudioExtractionError,MAX_AUDIO_SOURCE_BYTES} from '../lib/audio.ts';
const source=readFileSync(new URL('./fixtures/tone-with-video.mp4',import.meta.url));
function array(data:Uint8Array):ArrayBuffer{const output=new Uint8Array(data.length);output.set(data);return output.buffer;}
function inspect(data:ArrayBuffer){
 const file=createFile(true);let movie:Movie|undefined;const packets:Uint8Array[]=[];
 file.onReady=info=>{movie=info;const audio=info.audioTracks[0];if(audio){file.setExtractionOptions(audio.id,null,{nbSamples:1000});file.start();}};
 file.onSamples=(_id,_user,batch)=>{for(const sample of batch){assert.ok(sample.data);packets.push(sample.data);}};
 file.appendBuffer(Object.assign(data,{fileStart:0}) as MP4BoxBuffer,true);file.flush();
 return {movie:movie!,packets:Buffer.concat(packets)};
}
test('extracts the complete AAC track and removes every video track without changing audio packets',()=>{
 const original=inspect(array(source));assert.equal(original.movie.videoTracks.length,1);
 const audio=extractM4a(array(source));const result=inspect(array(audio));
 assert.equal(result.movie.audioTracks.length,1);assert.equal(result.movie.videoTracks.length,0);
 assert.equal(result.movie.audioTracks[0].codec,'mp4a.40.2');
 assert.deepEqual(result.packets,original.packets);
 assert.ok(Math.abs(result.movie.duration/result.movie.timescale-original.movie.duration/original.movie.timescale)<0.01);
});
test('reports a silent video instead of generating a false audio file',()=>{
 const video=createFile(true);const track=video.addTrack({type:'avc1',hdlr:'vide',timescale:1000,width:16,height:16});
 video.addSample(track,new Uint8Array([0,0,0,1,9,16]),{duration:1000,dts:0,cts:0,is_sync:true});
 assert.throws(()=>extractM4a(video.getBuffer().buffer),/no contiene una pista de audio/);
});
test('rejects malformed files and bounds source memory use',()=>{
 assert.throws(()=>extractM4a(new ArrayBuffer(8)),AudioExtractionError);
 assert.throws(()=>extractM4a(new ArrayBuffer(MAX_AUDIO_SOURCE_BYTES+1)),/32 MB/);
});

test('uses audio duration when a movie continues after its sound ends',()=>{
 const extended=Buffer.from(source);const box=extended.indexOf('mvhd');assert.ok(box>0);assert.equal(extended[box+4],0);
 extended.writeUInt32BE(extended.readUInt32BE(box+20)*2,box+20);
 const input=inspect(array(extended));const result=inspect(array(extractM4a(array(extended))));
 assert.ok(result.movie.duration/result.movie.timescale<input.movie.duration/input.movie.timescale);
 assert.ok(Math.abs(result.movie.duration/result.movie.timescale-input.movie.audioTracks[0].movie_duration/input.movie.timescale)<0.01);
});
