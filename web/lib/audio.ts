import {createFile, type MP4BoxBuffer} from 'mp4box';
export const MAX_AUDIO_SOURCE_BYTES=32*1024*1024;
export class AudioExtractionError extends Error {}
/** Demuxes the original AAC track into an audio-only fragmented MP4/M4A file. */
export function extractM4a(data:ArrayBuffer):Uint8Array<ArrayBuffer>{
 if(data.byteLength>MAX_AUDIO_SOURCE_BYTES)throw new AudioExtractionError('La extracción de audio admite vídeos de hasta 32 MB.');
 if(data.byteLength<16)throw new AudioExtractionError('El archivo no es un vídeo MP4 válido.');
 const file=createFile(true);const chunks:ArrayBuffer[]=[];let failure:Error|undefined;let ready=false;let segments=0;
 file.onError=()=>{failure=new AudioExtractionError('No se pudo leer el vídeo MP4.');};
 file.onReady=info=>{
  ready=true;
  const audio=info.audioTracks.find(track=>/^mp4a(?:\.|$)/.test(track.codec));
  if(!info.audioTracks.length){failure=new AudioExtractionError('Este vídeo no contiene una pista de audio.');return;}
  if(!audio){failure=new AudioExtractionError('Esta pista de audio todavía no es compatible con la extracción M4A.');return;}
  file.onSegment=(id,_user,buffer)=>{if(id===audio.id){chunks.push(buffer);segments++;}};
  file.setSegmentOptions(audio.id,null,{nbSamples:1000,rapAlignement:true});
  file.initializeSegmentation();
  // This is a complete audio file, so preserve its known duration for players.
  if(file.moov){
   file.moov.mvhd.duration=audio.movie_duration||Math.round(audio.duration/audio.timescale*info.timescale);
   const track=file.getTrackById(audio.id);
   track.tkhd.duration=audio.movie_duration;
   track.mdia.mdhd.duration=audio.duration;
  }
  chunks.push(file.initializeSegmentation().buffer);
  file.start();
 };
 try{
  const input=Object.assign(data,{fileStart:0}) as MP4BoxBuffer;
  file.appendBuffer(input,true);file.flush();
 }catch(e){if(e instanceof AudioExtractionError)throw e;throw new AudioExtractionError('No se pudo extraer el audio de este vídeo.');}
 finally{file.stop();}
 if(failure)throw failure;
 if(!ready||!segments)throw new AudioExtractionError('No encontramos una pista de audio válida en este MP4.');
 const output=new Uint8Array(chunks.reduce((sum,chunk)=>sum+chunk.byteLength,0));let offset=0;
 for(const chunk of chunks){output.set(new Uint8Array(chunk),offset);offset+=chunk.byteLength;}
 return output;
}
