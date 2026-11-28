import assert from 'node:assert/strict';
import test from 'node:test';
import { agentSource } from '../lib/agent-source.ts';

test('TikTok jobs preserve the account path and strip tracking parameters', () => {
  assert.deepEqual(agentSource(new URL('https://m.tiktok.com/@Evony/video/7347581705299053826/?share=1')), {
    id: 'tt:v:7347581705299053826',
    platform: 'TikTok',
    url: 'https://www.tiktok.com/@Evony/video/7347581705299053826',
  });
  assert.equal(agentSource(new URL('https://www.tiktok.com/@Evony/video/' + '1'.repeat(33))), undefined);
  assert.equal(agentSource(new URL('https://www.tiktok.com.example.com/@Evony/video/123')), undefined);
});
