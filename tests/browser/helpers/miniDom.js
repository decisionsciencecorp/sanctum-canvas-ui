/**
 * Minimal Document/Element stub for Node reconciler tests (no jsdom dependency).
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
  }

  get attributes() {
    return [...this._attrs.entries()].map(([name, value]) => ({ name, value }));
  }

  setAttribute(name, value) {
    this._attrs.set(String(name).toLowerCase(), String(value));
  }

  getAttribute(name) {
    const v = this._attrs.get(String(name).toLowerCase());
    return v === undefined ? null : v;
  }

  hasAttribute(name) {
    return this._attrs.has(String(name).toLowerCase());
  }

  removeAttribute(name) {
    this._attrs.delete(String(name).toLowerCase());
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
}

class FakeDocument {
  createElement(tag) {
    const el = new FakeElement(tag);
    el.ownerDocument = this;
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
  return { document, root };
}
