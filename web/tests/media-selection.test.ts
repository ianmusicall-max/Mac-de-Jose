import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectionMessage,mediaOptions} from '../lib/media-selection.ts';
const photo={url:'https://example.com/cover.jpg',kind:'image' as const,title:'Post',isPreview:true};
const video={url:'https://example.com/video.mp4',kind:'video' as const,title:'Post'};
test('photo-only results do not count as video success',()=>{assert.match(selectionMessage([photo],'video')!,/No encontramos un vídeo descargable/);assert.equal(selectionMessage([photo],'image'),null);});
test('video results offer audio extraction while keeping the original video',()=>{const result=mediaOptions([video]);assert.equal(result.length,2);assert.equal(result[1].kind,'audio');assert.equal(result[1].derivedFromVideo,true);assert.equal(selectionMessage([video],'audio'),null);assert.equal(selectionMessage([video],'video'),null);});
test('empty results explain no public files were found',()=>{assert.match(selectionMessage([],'video')!,/No encontramos archivos públicos/);});

test('audio options do not duplicate an existing independent track',()=>{const track={...video,kind:'audio' as const};assert.equal(mediaOptions([video,track]).filter(i=>i.kind==='audio').length,1);});
