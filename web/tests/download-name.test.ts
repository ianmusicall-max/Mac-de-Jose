import {test} from 'node:test';
import assert from 'node:assert/strict';
import {attachment,dispositionFilename,downloadName,namedDownload,readableFilename} from '../lib/download-name.ts';

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


test('keeps the original Unicode name and correct extension for downloads and sharing',()=>{
 const original=dispositionFilename("attachment; filename=video.mp4; filename*=UTF-8''Mi%20canci%C3%B3n.mp4");
 assert.equal(original,'Mi canción.mp4');
 const name=namedDownload(original!,'audio/mp4');
 assert.equal(name,'Mi canción.m4a');
 assert.equal(dispositionFilename(attachment(name)),name);
});

test('keeps punctuation and visible words in titles and neutralizes unsafe filenames',()=>{
 assert.equal(namedDownload('Tour 2.0 — París','video/mp4'),'Tour 2.0 — París.mp4');
 assert.equal(namedDownload('../Fiesta\r\nColombia.png','image/jpeg'),'_Fiesta Colombia.jpg');
 assert.equal(readableFilename('7156398672610577666.mp4'),undefined);
 assert.equal(readableFilename('Mi viaje.mp4'),'Mi viaje.mp4');
});
