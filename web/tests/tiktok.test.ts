import assert from 'node:assert/strict';
import test from 'node:test';
import { isTikTok, isTikTokCdn, resolveTikTok, tikTokMediaHeaders } from '../lib/tiktok.ts';
import { remote } from '../lib/media.ts';
import { OriginRateLimitError } from '../lib/rate-limit.ts';

const page = new URL('https://www.tiktok.com/@creador/video/123');
const mp4 = 'https://video.example.com/signed';
const item = { id: '123', desc: 'Mi vídeo', video: { playAddr: mp4 } };
const html = (itemStruct: unknown) =>
  `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">${JSON.stringify({
    __DEFAULT_SCOPE__: { 'webapp.video-detail': { statusCode: 0, itemInfo: { itemStruct } } },
  })}</script>`;

test('resuelve un MP4 publicado y conserva la URL firmada', async () => {
  const url = mp4 + '?token=a%2Fb&v=2';
  const result = await resolveTikTok(page, html({ ...item, video: { playAddr: url } }), async candidate => {
    assert.equal(candidate, url);
    return new Response(null, { status: 206, headers: { 'Content-Type': 'video/mp4' } });
  });
  assert.deepEqual(result, { title: 'Mi vídeo', items: [{ url, kind: 'video', contentType: 'video/mp4', title: 'Mi vídeo' }] });
});

test('prueba otro archivo cuando la primera versión no es MP4', async () => {
  const download = 'https://video.example.com/download';
  const result = await resolveTikTok(page, html({ ...item, video: { playAddr: mp4, downloadAddr: download } }), async candidate =>
    new Response(null, { headers: { 'Content-Type': candidate === download ? 'video/mp4' : 'text/html' } }));
  assert.equal(result.items[0]?.url, download);
});

test('rechaza fotos, vídeos privados y datos que pertenecen a otra publicación', async () => {
  for (const invalid of [{ ...item, imagePost: {} }, { ...item, privateItem: true }, { ...item, id: '999' }]) {
    await assert.rejects(resolveTikTok(page, html(invalid), async () => {
      assert.fail('No debe consultar el archivo');
    }), /no entregó un vídeo público/);
  }
});

test('propaga la espera por límite del origen', async () => {
  await assert.rejects(resolveTikTok(page, html(item), async () => {
    throw new OriginRateLimitError(60);
  }), OriginRateLimitError);
});

test('reconoce enlaces cortos de TikTok y rechaza dominios que lo imitan', () => {
  assert.ok(isTikTok(new URL('https://vm.tiktok.com/codigo/')));
  assert.ok(isTikTok(new URL('https://www.tiktok.com/t/codigo/')));
  assert.equal(isTikTok(new URL('https://tiktok.com.example.org/@creador/video/123')), false);
});

test('reconoce los dominios de CDN que exigen Referer', () => {
  assert.ok(isTikTokCdn('v16-webapp-prime.tiktok.com'));
  assert.ok(isTikTokCdn('v9-tiktok.ibyteimg.com'));
  assert.equal(isTikTokCdn('video.example.com'), false);
});


test('accepts TikTok playback links while skipping ordinary post pages', async () => {
  const playback = 'https://www.tiktok.com/aweme/v1/play/?video_id=test';
  const result = await resolveTikTok(page, html({ ...item, video: { playAddr: [page.href, playback] } }), async candidate => {
    assert.equal(candidate, playback);
    return new Response(null, { headers: { 'Content-Type': 'video/mp4' } });
  });
  assert.equal(result.items[0]?.url, playback);
  assert.equal(isTikTokCdn('tiktokcdn.com.example.org'), false);
});


test('keeps the playback Referer through a TikTok CDN redirect only', async context => {
  const playback = 'https://www.tiktok.com/aweme/v1/play/?video_id=test';
  const cdn = 'https://v16-web-newkey.tiktokcdn.com/video.mp4';
  const external = 'https://tiktokcdn.com.example.org/final';
  context.mock.method(globalThis, 'fetch', async (input: URL | string, init?: RequestInit) => {
    const url = new URL(input);
    if (url.hostname === 'cloudflare-dns.com') {
      return Response.json({ Answer: [{ type: 1, data: '8.8.8.8' }] });
    }
    const headers = new Headers(init?.headers);
    if (url.href === playback) {
      assert.equal(headers.get('referer'), 'https://www.tiktok.com/');
      return Response.redirect(cdn);
    }
    assert.equal(headers.has('authorization'), false);
    if (url.href === cdn) {
      assert.equal(headers.get('referer'), 'https://www.tiktok.com/');
      assert.equal(headers.get('accept-encoding'), 'identity');
      return Response.redirect(external);
    }
    assert.equal(url.href, external);
    assert.equal(headers.has('referer'), false);
    return new Response(null, { headers: { 'Content-Type': 'video/mp4' } });
  });
  const response = await remote(playback, { headers: { ...tikTokMediaHeaders(new URL(playback)), Authorization: 'test' } }, 1_000, undefined, tikTokMediaHeaders);
  assert.equal(response.headers.get('content-type'), 'video/mp4');
});


test('checks the official playback link even when it comes after the first four CDN URLs', async () => {
  const playback = 'https://www.tiktok.com/aweme/v1/play/?video_id=test';
  const urls = Array.from({ length: 10 }, (_, index) => `https://video.example.com/${index}.mp4`);
  const video = { bitrateInfo: [{ PlayAddr: { UrlKey: 'video_h264_720p', UrlList: [...urls, playback] } }] };
  const result = await resolveTikTok(page, html({ ...item, video }), async candidate => {
    assert.equal(candidate, playback);
    return new Response(null, { headers: { 'Content-Type': 'video/mp4' } });
  });
  assert.equal(result.items[0]?.url, playback);
});


test('checks official playback URLs without a rendition codec label', async () => {
  const playback = 'https://www.tiktok.com/aweme/v1/play/?video_id=test';
  const video = { bitrateInfo: [{ PlayAddr: { UrlList: [playback] } }] };
  const result = await resolveTikTok(page, html({ ...item, video }), async candidate => {
    assert.equal(candidate, playback);
    return new Response(null, { headers: { 'Content-Type': 'video/mp4' } });
  });
  assert.equal(result.items[0]?.url, playback);
});
