import {test} from 'node:test';
import assert from 'node:assert/strict';
import {downloadName} from '../lib/download-name.ts';

test('gives extensionless CDN videos their actual file extension',()=>{
 assert.equal(downloadName('123456789','video/mp4'),'123456789.mp4');
 assert.equal(downloadName('','video/mp4'),'videovault.mp4');
});
test('repairs misleading names from older archived videos',()=>{
 assert.equal(downloadName('video.bin','video/mp4'),'video.mp4');
 assert.equal(downloadName('clip.mp4','video/webm'),'clip.webm');
 assert.equal(downloadName('clip.MP4','Video/MP4; codecs=avc1'),'clip.mp4');
 assert.equal(downloadName('clip.mov','video/quicktime'),'clip.mov');
});
test('keeps names safe for Content-Disposition and preserves audio formats',()=>{
 assert.equal(downloadName('bad"\r\nname','video/mp4'),'bad___name.mp4');
 assert.equal(downloadName('sound.bin','audio/mp4'),'sound.m4a');
 assert.equal(downloadName('photo.jpg','image/jpeg'),'photo.jpg');
});
