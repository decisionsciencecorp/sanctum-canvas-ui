/**
 * Minimal Document/Element stub for Node reconciler tests (no jsdom dependency).
 * Supports focus / value / selection / scrollTop / open for A4.2 preserve tests.
 */

let nodeId = 0;

class FakeNode {
  constructor() {
    this.nodeId = ++nodeId;
    this.parentNode = null;
    this.childNodes = [];
    this.ownerDocument = null;
  }

  get firstChild() {
    return this.childNodes[0] ?? null;
  }

  get nextSibling() {
    if (!this.parentNode) return null;
    const sibs = this.parentNode.childNodes;
    const i = sibs.indexOf(this);
    return i >= 0 ? sibs[i + 1] ?? null : null;
  }

  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  removeChild(child) {
    const i = this.childNodes.indexOf(child);
    if (i < 0) throw new Error("not a child");
    this.childNodes.splice(i, 1);
    child.parentNode = null;
    return child;
  }

  insertBefore(child, ref) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    if (ref == null) {
      this.childNodes.push(child);
    } else {
      const i = this.childNodes.indexOf(ref);
      if (i < 0) throw new Error("ref not a child");
      this.childNodes.splice(i, 0, child);
    }
    return child;
  }
}

class FakeText extends FakeNode {
  constructor(data) {
    super();
    this.nodeType = 3;
    this.nodeName = "#text";
    this._data = String(data);
  }

  get textContent() {
    return this._data;
  }

  set textContent(v) {
    this._data = String(v);
  }
}

class FakeElement extends FakeNode {
  constructor(tagName) {
    super();
    this.nodeType = 1;
    this.tagName = String(tagName).toUpperCase();
    this.nodeName = this.tagName;
    /** @type {Map<string, string>} */
    this._attrs = new Map();
    this._value = "";
    this.selectionStart = 0;
    this.selectionEnd = 0;
    this.scrollTop = 0;
    this.scrollLeft = 0;
    this.open = false;
  }

  get attributes() {
    return [...this._attrs.entries()].map(([name, value]) => ({ name, value }));
  }

  setAttribute(name, value) {
    const key = String(name).toLowerCase();
    this._attrs.set(key, String(value));
    if (key === "value") this._value = String(value);
    if (key === "open") this.open = true;
  }

  getAttribute(name) {
    const v = this._attrs.get(String(name).toLowerCase());
    return v === undefined ? null : v;
  }

  hasAttribute(name) {
    return this._attrs.has(String(name).toLowerCase());
  }

  removeAttribute(name) {
    const key = String(name).toLowerCase();
    this._attrs.delete(key);
    if (key === "open") this.open = false;
  }

  get value() {
    return this._value;
  }

  set value(v) {
    this._value = String(v);
    this._attrs.set("value", this._value);
  }

  setSelectionRange(start, end) {
    this.selectionStart = start;
    this.selectionEnd = end;
  }

  focus() {
    if (this.ownerDocument) {
      this.ownerDocument.activeElement = this;
    }
  }

  blur() {
    if (this.ownerDocument && this.ownerDocument.activeElement === this) {
      this.ownerDocument.activeElement = this.ownerDocument.body ?? null;
    }
  }

  get textContent() {
    return this.childNodes.map((c) => c.textContent ?? "").join("");
  }

  set textContent(v) {
    this.childNodes = [];
    if (v != null && String(v) !== "") {
      const t = new FakeText(v);
      t.ownerDocument = this.ownerDocument;
      this.appendChild(t);
    }
  }

  get children() {
    return this.childNodes.filter((c) => c.nodeType === 1);
  }

  /** Detect accidental whole-tree wipes in tests. */
  get innerHTML() {
    return this.childNodes
      .map((c) => (c.nodeType === 3 ? c.textContent : `<${c.tagName}>`))
      .join("");
  }

  set innerHTML(_v) {
    throw new Error("miniDom: innerHTML assignment forbidden (A4.2)");
  }
}

class FakeDocument {
  constructor() {
    this.body = null;
    /** @type {FakeElement | null} */
    this.activeElement = null;
  }

  createElement(tag) {
    const el = new FakeElement(tag);
    el.ownerDocument = this;
    if (String(tag).toLowerCase() === "body" && !this.body) {
      this.body = el;
    }
    return el;
  }

  createTextNode(data) {
    const t = new FakeText(data);
    t.ownerDocument = this;
    return t;
  }
}

/**
 * @returns {{ document: FakeDocument, root: FakeElement }}
 */
export function createTestDom() {
  const document = new FakeDocument();
  const root = document.createElement("div");
  if (!document.body) {
    document.body = document.createElement("body");
  }
  document.activeElement = document.body;
  return { document, root };
}
