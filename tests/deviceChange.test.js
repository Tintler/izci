import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readEventCode,
  isDriveChangeEvent,
  createCoalescer,
  DBT_DEVICEARRIVAL,
  DBT_DEVICEREMOVECOMPLETE,
  DBT_DEVNODES_CHANGED,
} from '../src/core/deviceChange.js';

function bufferOf(code, size = 8) {
  const b = Buffer.alloc(size);
  b.writeUInt32LE(code, 0);
  return b;
}

test('readEventCode: 64 ve 32 bit Buffer ile sayi', () => {
  assert.equal(readEventCode(bufferOf(DBT_DEVICEARRIVAL, 8)), DBT_DEVICEARRIVAL);
  assert.equal(readEventCode(bufferOf(DBT_DEVICEARRIVAL, 4)), DBT_DEVICEARRIVAL);
  assert.equal(readEventCode(0x8004), 0x8004);
  assert.equal(readEventCode(null), null);
  assert.equal(readEventCode(Buffer.alloc(2)), null);
});

test('isDriveChangeEvent: takma/cikarma/degisim olaylari', () => {
  assert.equal(isDriveChangeEvent(bufferOf(DBT_DEVICEARRIVAL)), true);
  assert.equal(isDriveChangeEvent(bufferOf(DBT_DEVICEREMOVECOMPLETE)), true);
  assert.equal(isDriveChangeEvent(bufferOf(DBT_DEVNODES_CHANGED)), true);
  // DBT_DEVICEQUERYREMOVE (0x8001) liste degistirmez.
  assert.equal(isDriveChangeEvent(bufferOf(0x8001)), false);
  assert.equal(isDriveChangeEvent(undefined), false);
});

// Elle ilerletilen sahte zamanlayici.
function fakeTimers() {
  let next = 1;
  const pending = new Map();
  return {
    setTimeout(fn) { const id = next++; pending.set(id, fn); return id; },
    clearTimeout(id) { pending.delete(id); },
    async fire() {
      const entries = [...pending.entries()];
      pending.clear();
      for (const [, fn] of entries) await fn();
    },
    get size() { return pending.size; },
  };
}

test('createCoalescer: olay yagmuru tek cagri', async () => {
  const timers = fakeTimers();
  let calls = 0;
  const c = createCoalescer(() => { calls++; }, 1000, timers);
  c.trigger(); c.trigger(); c.trigger();
  assert.equal(timers.size, 1);
  await timers.fire();
  assert.equal(calls, 1);
});

test('createCoalescer: calisirken gelen olay sonra bir kez daha calistirir', async () => {
  const timers = fakeTimers();
  let calls = 0;
  let release;
  const c = createCoalescer(async () => {
    calls++;
    if (calls === 1) await new Promise((r) => { release = r; });
  }, 1000, timers);

  c.trigger();
  const first = timers.fire();      // 1. cagri basladi, bekliyor
  c.trigger();
  await timers.fire();              // calisirken tetiklendi -> pending
  assert.equal(calls, 1);
  release();
  await first;
  assert.equal(timers.size, 1);     // pending yeniden zamanlandi
  await timers.fire();
  assert.equal(calls, 2);
});

test('createCoalescer: hata zamanlayiciyi bozmaz, cancel bekleyeni iptal eder', async () => {
  const timers = fakeTimers();
  let calls = 0;
  const c = createCoalescer(() => { calls++; throw new Error('x'); }, 1000, timers);
  c.trigger();
  await timers.fire();
  c.trigger();
  await timers.fire();
  assert.equal(calls, 2);
  c.trigger();
  c.cancel();
  assert.equal(timers.size, 0);
});
