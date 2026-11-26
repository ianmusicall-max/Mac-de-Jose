import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isFacebook, resolveFacebook } from '../lib/facebook.ts';

const page = new URL('https://www.facebook.com/reel/123');
const hd = 'https://video.xx.fbcdn.net/hd.mp4?a=1&b=2';
const sd = 'https://video.xx.fbcdn.net/sd.mp4';

test('accepts Facebook shares and rejects lookalike hosts', () => {
  assert.equal(isFacebook(new URL('https://fb.watch/example/')), true);
  assert.equal(isFacebook(new URL('https://www.facebook.com.example.org/reel/123')), false);
});

test('returns distinct verified HD and SD MP4s in quality order', async () => {
  const html = `<title>Public reel</title><script>{"browser_native_sd_url":"${sd}","browser_native_hd_url":"${hd.replace('&', '\\u0026')}"}</script>`;
  const result = await resolveFacebook(page, html, async () =>
    new Response(null, { status: 206, headers: { 'Content-Type': 'video/mp4' } }));
  assert.deepEqual(result.items.map(item => [item.quality, item.url]), [['HD', hd], ['SD', sd]]);
});

test('rejects HTML player URLs and does not probe off-site metadata', async () => {
  const html = `<meta property="og:video" content="https://elsewhere.example/video.mp4"><script>{"playable_url":"${sd}"}</script>`;
  const probes: string[] = [];
  await assert.rejects(resolveFacebook(page, html, async url => {
    probes.push(url);
    return new Response(null, { headers: { 'Content-Type': 'text/html' } });
  }), /MP4 público/);
  assert.deepEqual(probes, [sd]);
});


test('returns a downloadable cover alongside video and excludes generic Facebook assets', async () => {
  const cover = 'https://scontent.xx.fbcdn.net/reel.jpg';
  const logo = 'https://static.xx.fbcdn.net/logo.png';
  const html = `<meta property="og:image" content="${cover}"><meta property="og:image" content="${logo}"><script>{"playable_url":"${sd}"}</script>`;
  const result = await resolveFacebook(page, html, async url => {
    assert.notEqual(url, logo);
    return new Response(null, { headers: { 'Content-Type': url === cover ? 'image/jpeg' : 'video/mp4' } });
  });
  assert.deepEqual(result.items.map(item => [item.kind, item.isPreview]), [['video', undefined], ['image', true]]);
  assert.equal(result.facebookImagesChecked, true);
});

test('resolves a public photo with no video', async () => {
  const photo = new URL('https://www.facebook.com/photo/?fbid=321');
  const html = '<meta property="og:image" content="https://scontent.xx.fbcdn.net/photo.jpg">';
  const result = await resolveFacebook(photo, html, async () =>
    new Response(null, { headers: { 'Content-Type': 'image/jpeg' } }));
  assert.deepEqual(result.items.map(item => [item.kind, item.isPreview]), [['image', false]]);
});
