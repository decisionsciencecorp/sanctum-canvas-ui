import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../../src/Browser/runtime/store.js";
import { createBindingManager } from "../../src/Browser/runtime/bindings.js";
import { createLifecycleOwner } from "../../src/Browser/runtime/lifecycle.js";
import { createQueryManager } from "../../src/Browser/runtime/queryManager.js";
import { createMutationManager } from "../../src/Browser/runtime/mutations.js";
import { createActionRunner } from "../../src/Browser/runtime/actionRunner.js";

describe("bindings", () => {
  it("registers form fields and preserves values", () => {
    const store = createStore();
    const bm = createBindingManager(store);
    bm.registerField("f", "email", "Input", "");
    bm.setFieldValue("f", "email", "a@b.c");
    assert.equal(bm.getFieldValue("f", "email"), "a@b.c");
    bm.unregisterField("f", "email");
    const b = bm.bind("$x");
    b.set(1);
    assert.equal(b.get(), 1);
    bm.dispose();
    assert.equal(bm._fieldCount(), 0);
  });
});

describe("lifecycle disposal", () => {
  it("returns counters to zero after dispose", () => {
    const life = createLifecycleOwner();
    let hits = 0;
    const stop = life.track(() => {
      hits += 1;
    });
    const tid = life.setTimeoutTracked(() => {}, 10_000);
    const ctl = life.trackAbortController();
    assert.equal(life.snapshot().listeners, 1);
    assert.equal(life.snapshot().timers, 1);
    assert.equal(life.snapshot().controllers, 1);
    life.clearTimeoutTracked(tid);
    assert.equal(life.snapshot().timers, 0);
    stop();
    assert.equal(hits, 1);
    assert.equal(life.snapshot().listeners, 0);
    life.track(() => {});
    life.setTimeoutTracked(() => {}, 10_000);
    life.trackAbortController();
    life.dispose();
    assert.ok(ctl.signal.aborted);
    assert.deepEqual(life.snapshot(), {
      listeners: 0,
      timers: 0,
      controllers: 0,
      disposed: true,
    });
  });

  it("dispose-safe track and timeout helpers", () => {
    const life = createLifecycleOwner();
    life.dispose();
    let ran = false;
    const stop = life.track(() => {
      ran = true;
    });
    assert.equal(ran, true);
    stop();
    assert.equal(life.setTimeoutTracked(() => {}, 1), 0);
    const ctl = life.trackAbortController();
    assert.ok(ctl.signal.aborted);
    life.clearTimeoutTracked(999);
  });

  it("swallows throwing unsubscribers", () => {
    const life = createLifecycleOwner();
    life.track(() => {
      throw new Error("boom");
    });
    life.dispose();
    const life2 = createLifecycleOwner();
    life2.dispose();
    const stop = life2.track(() => {
      throw new Error("boom2");
    });
    stop();
  });

  it("fires setTimeoutTracked callback", async () => {
    const life = createLifecycleOwner();
    await new Promise((resolve) => {
      life.setTimeoutTracked(resolve, 5);
    });
    life.dispose();
  });

  it("repeated mount/dispose with query+mutation managers", () => {
    for (let i = 0; i < 3; i++) {
      const life = createLifecycleOwner();
      const store = createStore();
      store.initialize({ $a: 1 }, {});
      life.track(store.subscribe(() => {}));
      const qm = createQueryManager({ callTool: async () => ({ ok: true }) });
      const mm = createMutationManager({ callTool: async () => ({ ok: true }) });
      createActionRunner({ store, mutations: mm });
      life.track(() => {
        qm.dispose?.();
      });
      life.track(() => {
        mm.dispose();
      });
      life.dispose();
      assert.equal(life.snapshot().listeners, 0);
    }
  });
});
