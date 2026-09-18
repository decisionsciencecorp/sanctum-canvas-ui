import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createStore, STORE_CHANGE } from "../../src/Browser/runtime/store.js";

describe("createStore", () => {
  it("starts empty until initialize applies defaults", () => {
    const store = createStore();
    assert.equal(store.get("$x"), undefined);
    assert.deepEqual(store.getSnapshot(), {});

    store.initialize({ $x: 1, $y: "a" }, {});
    assert.equal(store.get("$x"), 1);
    assert.equal(store.get("$y"), "a");
    assert.deepEqual(store.getSnapshot(), { $x: 1, $y: "a" });
  });

  it("updates values and notifies subscribers", () => {
    const store = createStore();
    store.initialize({ $n: 0 }, {});
    let calls = 0;
    const unsub = store.subscribe(() => {
      calls += 1;
    });
    store.set("$n", 2);
    assert.equal(store.get("$n"), 2);
    assert.equal(calls, 1);
    store.set("$n", 2);
    assert.equal(calls, 1);
    unsub();
    store.set("$n", 3);
    assert.equal(calls, 1);
  });

  it("skips notify for shallow-equal plain objects", () => {
    const store = createStore();
    const obj = { a: 1, b: 2 };
    store.set("form", obj);
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });
    store.set("form", { a: 1, b: 2 });
    assert.equal(calls, 0);
    store.set("form", { a: 1, b: 3 });
    assert.equal(calls, 1);
  });

  it("batches transactional updates into one notification", () => {
    const store = createStore();
    store.initialize({ $a: 1, $b: 2 }, {});
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });
    store.batch(() => {
      store.set("$a", 10);
      store.set("$b", 20);
    });
    assert.equal(calls, 1);
    assert.deepEqual(store.getSnapshot(), { $a: 10, $b: 20 });

    calls = 0;
    store.transaction(() => {
      store.set("$a", 11);
      store.set("$b", 22);
    });
    assert.equal(calls, 1);
  });

  it("does not notify when a batch makes no effective changes", () => {
    const store = createStore();
    store.initialize({ $a: 1 }, {});
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });
    store.batch(() => {
      store.set("$a", 1);
    });
    assert.equal(calls, 0);
  });

  it("reset restores declared defaults", () => {
    const store = createStore();
    store.initialize({ $x: 1, $y: 2 }, {});
    store.set("$x", 99);
    store.set("$y", 88);
    store.reset();
    assert.equal(store.get("$x"), 1);
    assert.equal(store.get("$y"), 2);

    store.set("$x", 5);
    store.reset(["$x"]);
    assert.equal(store.get("$x"), 1);
    assert.equal(store.get("$y"), 2);
  });

  it("hydration: persisted wins over stream defaults; streaming never wipes user edits", () => {
    const store = createStore();
    store.initialize({ $a: "default", $b: "stream-only" }, { $a: "saved" });
    assert.equal(store.get("$a"), "saved");
    assert.equal(store.get("$b"), "stream-only");

    store.set("$b", "user-edit");
    store.initialize(
      { $a: "new-default", $b: "new-stream", $c: "added" },
      { $a: "new-persisted" },
    );
    assert.equal(store.get("$a"), "new-persisted");
    assert.equal(store.get("$b"), "user-edit");
    assert.equal(store.get("$c"), "added");
  });

  it("dispose clears state and listeners", () => {
    const store = createStore();
    store.initialize({ $z: 1 }, {});
    let calls = 0;
    const unsub = store.subscribe(() => {
      calls += 1;
    });
    store.addEventListener(STORE_CHANGE, () => {
      calls += 1;
    });
    store.dispose();
    assert.deepEqual(store.getSnapshot(), {});
    store.set("$z", 2);
    assert.equal(calls, 0);
    unsub();
  });

  it("exposes EventTarget change events", () => {
    const store = createStore();
    let events = 0;
    const onChange = () => {
      events += 1;
    };
    store.addEventListener(STORE_CHANGE, onChange);
    store.set("$e", 1);
    assert.equal(events, 1);
    store.removeEventListener(STORE_CHANGE, onChange);
    store.set("$e", 2);
    assert.equal(events, 1);
    assert.equal(store.dispatchEvent(new Event(STORE_CHANGE)), true);
    assert.equal(events, 1);
  });

  it("ignores sets after dispose", () => {
    const store = createStore();
    store.initialize({ $q: 1 }, {});
    store.dispose();
    store.batch(() => store.set("$q", 9));
    assert.deepEqual(store.getSnapshot(), {});
  });
});
