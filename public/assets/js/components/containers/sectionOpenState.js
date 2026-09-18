/**
 * SectionBlock open-state machine (upstream genui-lib SectionBlock intent).
 *
 * Rules:
 * 1. During streaming, when a new section arrives and the user has not intervened,
 *    auto-open the newest section (accumulate with prior opens).
 * 2. If open set is empty, open the first section.
 * 3. When streaming ends, collapse to the first section only if the user has not
 *    intervened — never override a manual choice.
 * 4. User toggle/select sets userSelected and owns openItems thereafter.
 */

/**
 * @typedef {{
 *   openItems: string[],
 *   userSelected: boolean,
 *   prevLength: number,
 *   prevIsStreaming: boolean,
 * }} SectionOpenState
 */

/**
 * @returns {SectionOpenState}
 */
export function createSectionOpenState() {
  return {
    openItems: [],
    userSelected: false,
    prevLength: 0,
    prevIsStreaming: false,
  };
}

/**
 * @param {string[]} open
 * @param {string} value
 * @returns {string[]}
 */
function ensureIncludes(open, value) {
  if (!value) return open.slice();
  return open.includes(value) ? open.slice() : [...open, value];
}

/**
 * Apply a stream/chunk tick (section list + streaming flag).
 * Pure mutation of `state`; returns the new openItems array.
 *
 * @param {SectionOpenState} state
 * @param {{
 *   sectionValues: string[],
 *   isStreaming: boolean,
 * }} input
 * @returns {string[]}
 */
export function applySectionStreamTick(state, input) {
  const values = Array.isArray(input.sectionValues) ? input.sectionValues : [];
  const isStreaming = input.isStreaming === true;
  const first = values[0];
  const len = values.length;

  // Streaming ended this tick → collapse to first unless user intervened.
  if (state.prevIsStreaming && !isStreaming && !state.userSelected && len > 0) {
    state.openItems = first ? [first] : [];
  } else if (isStreaming && len > state.prevLength && !state.userSelected) {
    // New section arrived while streaming → auto-reveal newest.
    const last = values[len - 1];
    if (last) {
      state.openItems = ensureIncludes(state.openItems, last);
    }
  } else if (!state.userSelected) {
    // Ensure something is open when empty (initial / non-growth ticks).
    if (state.openItems.length === 0 && first) {
      state.openItems = [first];
    }
  }

  // Drop open ids that no longer exist (stable otherwise).
  if (values.length > 0) {
    const allowed = new Set(values);
    state.openItems = state.openItems.filter((v) => allowed.has(v));
    if (!state.userSelected && state.openItems.length === 0 && first) {
      state.openItems = [first];
    }
  } else if (!state.userSelected) {
    state.openItems = [];
  }

  state.prevLength = len;
  state.prevIsStreaming = isStreaming;
  return state.openItems.slice();
}

/**
 * User toggled open sections — permanently opts out of auto stream control.
 * @param {SectionOpenState} state
 * @param {string[] | string | undefined | null} next
 * @returns {string[]}
 */
export function applySectionUserChange(state, next) {
  state.userSelected = true;
  if (Array.isArray(next)) {
    state.openItems = next.map(String);
  } else if (next == null || next === "") {
    state.openItems = [];
  } else {
    state.openItems = [String(next)];
  }
  return state.openItems.slice();
}

/**
 * Toggle one section value in a multiple-open accordion.
 * @param {SectionOpenState} state
 * @param {string} value
 * @returns {string[]}
 */
export function toggleSectionValue(state, value) {
  const v = String(value);
  const cur = state.openItems.slice();
  const idx = cur.indexOf(v);
  if (idx >= 0) cur.splice(idx, 1);
  else cur.push(v);
  return applySectionUserChange(state, cur);
}

/**
 * Steps current-index machine: auto-advance to newest while streaming unless
 * the user has selected a step; never override after intervention.
 *
 * @typedef {{
 *   currentIndex: number,
 *   userSelected: boolean,
 *   prevLength: number,
 *   prevIsStreaming: boolean,
 * }} StepsProgressState
 */

/**
 * @returns {StepsProgressState}
 */
export function createStepsProgressState() {
  return {
    currentIndex: -1,
    userSelected: false,
    prevLength: 0,
    prevIsStreaming: false,
  };
}

/**
 * @param {StepsProgressState} state
 * @param {{ itemCount: number, isStreaming: boolean }} input
 * @returns {number} currentIndex (0-based, or -1 if empty)
 */
export function applyStepsStreamTick(state, input) {
  const count = Math.max(0, Number(input.itemCount) || 0);
  const isStreaming = input.isStreaming === true;

  if (count === 0) {
    if (!state.userSelected) state.currentIndex = -1;
    state.prevLength = 0;
    state.prevIsStreaming = isStreaming;
    return state.currentIndex;
  }

  if (!state.userSelected) {
    if (isStreaming && count > state.prevLength) {
      // Newly streamed step becomes current (accessible progress).
      state.currentIndex = count - 1;
    } else if (state.currentIndex < 0 || state.currentIndex >= count) {
      state.currentIndex = 0;
    }
    // Stream end: leave current on last completed step (no collapse override).
  } else if (state.currentIndex >= count) {
    // Clamp if items shrank; still respect user selection when in range.
    state.currentIndex = count - 1;
  }

  state.prevLength = count;
  state.prevIsStreaming = isStreaming;
  return state.currentIndex;
}

/**
 * @param {StepsProgressState} state
 * @param {number} index
 * @returns {number}
 */
export function applyStepsUserSelect(state, index) {
  state.userSelected = true;
  state.currentIndex = Math.max(0, Number(index) || 0);
  return state.currentIndex;
}
