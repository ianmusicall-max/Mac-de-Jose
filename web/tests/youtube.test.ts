import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveYouTube, youtubeVideoId } from '../lib/youtube.ts';

const id = 'dQw4w9WgXcQ';
const mp4 = 'https://rr1.googlevideo.com/videoplayback?sig=a%2Fb';
const player = (formats: unknown[], status = 'OK') =>
  `<script>var ytInitialPlayerResponse = ${JSON.stringify({
    playabilityStatus: { status },
    videoDetails: { videoId: id, title: 'Vídeo de prueba' },
    streamingData: { formats },
  })};</script>`;

test('reconoce vídeos, enlaces cortos y Shorts en dominios de YouTube', () => {
  for (const link of [
    `https://www.youtube.com/watch?v=${id}&t=12`,
    `https://youtu.be/${id}?si=abc`,
    `https://m.youtube.com/shorts/${id}`,
  ]) assert.equal(youtubeVideoId(new URL(link)), id);
  assert.equal(youtubeVideoId(new URL(`https://youtube.com.example.org/watch?v=${id}`)), undefined);
});

test('devuelve el MP4 directo después de comprobar su tipo de contenido', async () => {
  const result = await resolveYouTube(id, player([{ url: mp4, mimeType: 'video/mp4; codecs="avc1, mp4a"' }]), async url => {
    assert.equal(url, mp4);
    return new Response(null, { status: 206, headers: { 'Content-Type': 'video/mp4' } });
  });
  assert.deepEqual(result.items, [{ url: mp4, kind: 'video', contentType: 'video/mp4', title: 'Vídeo de prueba' }]);
});

test('omite formatos cifrados, hosts ajenos y vídeos que requieren iniciar sesión', async () => {
  const fetchVideo = async () => assert.fail('No debe consultar el archivo');
  await assert.rejects(resolveYouTube(id, player([
    { signatureCipher: 'sig=example', mimeType: 'video/mp4' },
    { url: 'https://googlevideo.com.example.net/video', mimeType: 'video/mp4' },
  ]), fetchVideo), /MP4 directo/);
  await assert.rejects(resolveYouTube(id, player([{ url: mp4, mimeType: 'video/mp4' }], 'LOGIN_REQUIRED'), fetchVideo), /vídeo público/);
});
