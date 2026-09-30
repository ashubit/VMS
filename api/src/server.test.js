import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

test('server disables identifying header', async () => {
  const { app } = await import('./server.js');
  assert.equal(app.get('x-powered-by'), false);
});
