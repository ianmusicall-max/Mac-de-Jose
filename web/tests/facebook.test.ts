import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isFacebook, resolveFacebook, resolveFacebookPage } from '../lib/facebook.ts';

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
  assert.equal(result.facebookEmbedChecked, true);
});

test('resolves a public photo with no video', async () => {
  const photo = new URL('https://www.facebook.com/photo/?fbid=321');
  const html = '<meta property="og:image" content="https://scontent.xx.fbcdn.net/photo.jpg">';
  const result = await resolveFacebook(photo, html, async () =>
    new Response(null, { headers: { 'Content-Type': 'image/jpeg' } }));
  assert.deepEqual(result.items.map(item => [item.kind, item.isPreview]), [['image', false]]);
});


test('checks the public embedded player when a reel page only exposes its cover', async () => {
  const cover = 'https://scontent.xx.fbcdn.net/reel.jpg';
  const stages: string[] = [];
  const result = await resolveFacebookPage(page, async (url, stage) => {
    stages.push(stage);
    if (stage === 'embed') {
      const endpoint = new URL(url);
      assert.equal(endpoint.origin + endpoint.pathname, 'https://www.facebook.com/plugins/video.php');
      assert.equal(endpoint.searchParams.get('href'), page.href);
    }
    const html = stage === 'page'
      ? `<title>Reel público</title><meta property="og:image" content="${cover}">`
      : `<script>{"hd_src":"${hd}","sd_src":"${sd}"}</script>`;
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }, async url => new Response(null, {
    headers: { 'Content-Type': url === cover ? 'image/jpeg' : 'video/mp4' },
  }));
  assert.deepEqual(stages, ['page', 'embed']);
  assert.deepEqual(result.items.map(item => [item.kind, item.quality, item.title]), [
    ['video', 'HD', 'Reel público'], ['video', 'SD', 'Reel público'], ['image', undefined, 'Reel público'],
  ]);
});

test('recovers the video from the public player when the reel permalink fails', async () => {
  const result = await resolveFacebookPage(page, async (_url, stage) => {
    if (stage === 'page') throw new Error('El sitio respondió HTTP 400.');
    return new Response(`<script>{"progressive_url":"${sd}"}</script>`, { headers: { 'Content-Type': 'text/html' } });
  }, async () => new Response(null, { headers: { 'Content-Type': 'video/mp4' } }));
  assert.deepEqual(result.items.map(item => item.url), [sd]);
});
