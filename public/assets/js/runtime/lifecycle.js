/**
 * Runtime lifecycle owner (A3.9) — tracks listeners/timers/fetches for clean remount.
 */

export function createLifecycleOwner() {
  const unsubs = new Set();
  const timers = new Set();
  const controllers = new Set();
  let disposed = false;

  function track(unsub) {
    if (disposed) {
      try {
        unsub();
      } catch {
        /* ignore */
      }
      return () => {};
    }
    unsubs.add(unsub);
    return () => {
      unsubs.delete(unsub);
      unsub();
    };
  }

  function setTimeoutTracked(fn, ms) {
    if (disposed) return 0;
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  }

  function clearTimeoutTracked(id) {
    clearTimeout(id);
    timers.delete(id);
  }

  function trackAbortController(ctl = new AbortController()) {
    if (disposed) {
      ctl.abort();
      return ctl;
    }
    controllers.add(ctl);
    return ctl;
  }

  function dispose() {
    disposed = true;
    for (const u of [...unsubs]) {
      try {
        u();
      } catch {
        /* ignore */
      }
    }
    unsubs.clear();
    for (const id of timers) clearTimeout(id);
    timers.clear();
    for (const c of controllers) c.abort();
    controllers.clear();
  }

  function snapshot() {
    return {
      listeners: unsubs.size,
      timers: timers.size,
      controllers: controllers.size,
      disposed,
    };
  }

  return {
    track,
    setTimeoutTracked,
    clearTimeoutTracked,
    trackAbortController,
    dispose,
    snapshot,
  };
}
