/**
 * Checked-in Lucide-style SVG allowlist (Doc #1380 — no remote icon code).
 * Paths are 24×24 stroke icons; unknown names fall back via category.
 */

/** @typedef {{ tag: string, attrs: Record<string, string> }} IconNode */

/** @type {Record<string, IconNode[]>} */
export const ICON_GLYPHS = {
  accessibility: [
    { tag: "circle", attrs: { cx: "16", cy: "4", r: "1" } },
    { tag: "path", attrs: { d: "m18 19 1-7-6 1" } },
    { tag: "path", attrs: { d: "m5 8 3-3 5.5 3-2.36 3.5" } },
    { tag: "path", attrs: { d: "M4.24 14.5a5 5 0 0 0 6.88 6" } },
    { tag: "path", attrs: { d: "M13.76 17.5a5 5 0 0 0-6.88-6" } },
  ],
  "arrow-right": [{ tag: "path", attrs: { d: "M5 12h14" } }, { tag: "path", attrs: { d: "m12 5 7 7-7 7" } }],
  bell: [
    { tag: "path", attrs: { d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" } },
    { tag: "path", attrs: { d: "M10.3 21a1.94 1.94 0 0 0 3.4 0" } },
  ],
  box: [
    { tag: "path", attrs: { d: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" } },
    { tag: "path", attrs: { d: "m3.3 7 8.7 5 8.7-5" } },
    { tag: "path", attrs: { d: "M12 22V12" } },
  ],
  building: [
    { tag: "rect", attrs: { width: "16", height: "20", x: "4", y: "2", rx: "2", ry: "2" } },
    { tag: "path", attrs: { d: "M9 22v-4h6v4" } },
    { tag: "path", attrs: { d: "M8 6h.01" } },
    { tag: "path", attrs: { d: "M16 6h.01" } },
    { tag: "path", attrs: { d: "M12 6h.01" } },
    { tag: "path", attrs: { d: "M12 10h.01" } },
    { tag: "path", attrs: { d: "M12 14h.01" } },
    { tag: "path", attrs: { d: "M16 10h.01" } },
    { tag: "path", attrs: { d: "M16 14h.01" } },
    { tag: "path", attrs: { d: "M8 10h.01" } },
    { tag: "path", attrs: { d: "M8 14h.01" } },
  ],
  calculator: [
    { tag: "rect", attrs: { width: "16", height: "20", x: "4", y: "2", rx: "2" } },
    { tag: "line", attrs: { x1: "8", x2: "16", y1: "6", y2: "6" } },
    { tag: "line", attrs: { x1: "16", x2: "16", y1: "14", y2: "18" } },
    { tag: "path", attrs: { d: "M16 10h.01" } },
    { tag: "path", attrs: { d: "M12 10h.01" } },
    { tag: "path", attrs: { d: "M8 10h.01" } },
    { tag: "path", attrs: { d: "M12 14h.01" } },
    { tag: "path", attrs: { d: "M8 14h.01" } },
    { tag: "path", attrs: { d: "M12 18h.01" } },
    { tag: "path", attrs: { d: "M8 18h.01" } },
  ],
  camera: [
    { tag: "path", attrs: { d: "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" } },
    { tag: "circle", attrs: { cx: "12", cy: "13", r: "3" } },
  ],
  car: [
    { tag: "path", attrs: { d: "M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" } },
    { tag: "circle", attrs: { cx: "7", cy: "17", r: "2" } },
    { tag: "path", attrs: { d: "M9 17h6" } },
    { tag: "circle", attrs: { cx: "17", cy: "17", r: "2" } },
  ],
  cat: [
    { tag: "path", attrs: { d: "M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.14 1 2.4 1 3.74C21 17.2 16.97 21 12 21s-9-3.8-9-8.26c0-1.34.43-2.6 1-3.74 0 0-1.82-6.42-.42-7C4.97 2.16 8.22 3 10 5c.65-.17 1.33-.26 2-.26Z" } },
    { tag: "path", attrs: { d: "M8 14v.5" } },
    { tag: "path", attrs: { d: "M16 14v.5" } },
    { tag: "path", attrs: { d: "M11.25 16.25h1.5L12 17l-.75-.75Z" } },
  ],
  "chart-line": [
    { tag: "path", attrs: { d: "M3 3v18h18" } },
    { tag: "path", attrs: { d: "m19 9-5 5-4-4-3 3" } },
  ],
  "check-circle": [
    { tag: "path", attrs: { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" } },
    { tag: "path", attrs: { d: "m9 11 3 3L22 4" } },
  ],
  "circle-check": [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
    { tag: "path", attrs: { d: "m9 12 2 2 4-4" } },
  ],
  "circle-dot": [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "1", fill: "currentColor" } },
  ],
  "circle-dollar-sign": [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
    { tag: "path", attrs: { d: "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" } },
    { tag: "path", attrs: { d: "M12 18V6" } },
  ],
  circle: [{ tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } }],
  clock: [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
    { tag: "path", attrs: { d: "M12 6v6l4 2" } },
  ],
  cloud: [{ tag: "path", attrs: { d: "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" } }],
  code: [
    { tag: "path", attrs: { d: "m16 18 6-6-6-6" } },
    { tag: "path", attrs: { d: "m8 6-6 6 6 6" } },
  ],
  "cooking-pot": [
    { tag: "path", attrs: { d: "M2 12h20" } },
    { tag: "path", attrs: { d: "M20 12v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" } },
    { tag: "path", attrs: { d: "m4 8 16-4" } },
    { tag: "path", attrs: { d: "m8.86 6.78-.45-1.81a2 2 0 0 1 1.45-2.43l1.94-.48a2 2 0 0 1 2.43 1.46l.45 1.8" } },
  ],
  "dollar-sign": [
    { tag: "line", attrs: { x1: "12", x2: "12", y1: "2", y2: "22" } },
    { tag: "path", attrs: { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" } },
  ],
  file: [
    { tag: "path", attrs: { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" } },
    { tag: "path", attrs: { d: "M14 2v4a2 2 0 0 0 2 2h4" } },
  ],
  gamepad: [
    { tag: "line", attrs: { x1: "6", x2: "10", y1: "12", y2: "12" } },
    { tag: "line", attrs: { x1: "8", x2: "8", y1: "10", y2: "14" } },
    { tag: "line", attrs: { x1: "15", x2: "15.01", y1: "13", y2: "13" } },
    { tag: "line", attrs: { x1: "18", x2: "18.01", y1: "11", y2: "11" } },
    { tag: "rect", attrs: { width: "20", height: "12", x: "2", y: "6", rx: "2" } },
  ],
  "heart-pulse": [
    { tag: "path", attrs: { d: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" } },
    { tag: "path", attrs: { d: "M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" } },
  ],
  home: [
    { tag: "path", attrs: { d: "m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" } },
    { tag: "polyline", attrs: { points: "9 22 9 12 15 12 15 22" } },
  ],
  house: [
    { tag: "path", attrs: { d: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" } },
    { tag: "path", attrs: { d: "M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" } },
  ],
  layout: [
    { tag: "rect", attrs: { width: "18", height: "18", x: "3", y: "3", rx: "2" } },
    { tag: "path", attrs: { d: "M3 9h18" } },
    { tag: "path", attrs: { d: "M9 21V9" } },
  ],
  leaf: [
    { tag: "path", attrs: { d: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" } },
    { tag: "path", attrs: { d: "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" } },
  ],
  mail: [
    { tag: "rect", attrs: { width: "20", height: "16", x: "2", y: "4", rx: "2" } },
    { tag: "path", attrs: { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" } },
  ],
  "map-pin": [
    { tag: "path", attrs: { d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" } },
    { tag: "circle", attrs: { cx: "12", cy: "10", r: "3" } },
  ],
  "message-square": [
    { tag: "path", attrs: { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" } },
  ],
  microscope: [
    { tag: "path", attrs: { d: "M6 18h8" } },
    { tag: "path", attrs: { d: "M3 22h18" } },
    { tag: "path", attrs: { d: "M14 22a7 7 0 1 0 0-14h-1" } },
    { tag: "path", attrs: { d: "M9 14h2" } },
    { tag: "path", attrs: { d: "M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" } },
    { tag: "path", attrs: { d: "M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" } },
  ],
  "mouse-pointer": [
    { tag: "path", attrs: { d: "m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" } },
    { tag: "path", attrs: { d: "m13 13 6 6" } },
  ],
  music: [
    { tag: "path", attrs: { d: "M9 18V5l12-2v13" } },
    { tag: "circle", attrs: { cx: "6", cy: "18", r: "3" } },
    { tag: "circle", attrs: { cx: "18", cy: "16", r: "3" } },
  ],
  package: [
    { tag: "path", attrs: { d: "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" } },
    { tag: "path", attrs: { d: "M12 22V12" } },
    { tag: "path", attrs: { d: "m3.3 7 8.7 5 8.7-5" } },
    { tag: "path", attrs: { d: "m7.5 4.27 9 5.15" } },
  ],
  palette: [
    { tag: "circle", attrs: { cx: "13.5", cy: "6.5", r: ".5", fill: "currentColor" } },
    { tag: "circle", attrs: { cx: "17.5", cy: "10.5", r: ".5", fill: "currentColor" } },
    { tag: "circle", attrs: { cx: "8.5", cy: "7.5", r: ".5", fill: "currentColor" } },
    { tag: "circle", attrs: { cx: "6.5", cy: "12.5", r: ".5", fill: "currentColor" } },
    { tag: "path", attrs: { d: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" } },
  ],
  plane: [
    { tag: "path", attrs: { d: "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" } },
  ],
  rocket: [
    { tag: "path", attrs: { d: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" } },
    { tag: "path", attrs: { d: "m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" } },
    { tag: "path", attrs: { d: "M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" } },
    { tag: "path", attrs: { d: "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" } },
  ],
  "share-2": [
    { tag: "circle", attrs: { cx: "18", cy: "5", r: "3" } },
    { tag: "circle", attrs: { cx: "6", cy: "12", r: "3" } },
    { tag: "circle", attrs: { cx: "18", cy: "19", r: "3" } },
    { tag: "line", attrs: { x1: "8.59", x2: "15.42", y1: "13.51", y2: "17.49" } },
    { tag: "line", attrs: { x1: "15.41", x2: "8.59", y1: "6.51", y2: "10.49" } },
  ],
  shield: [
    { tag: "path", attrs: { d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" } },
  ],
  "shopping-cart": [
    { tag: "circle", attrs: { cx: "8", cy: "21", r: "1" } },
    { tag: "circle", attrs: { cx: "19", cy: "21", r: "1" } },
    { tag: "path", attrs: { d: "M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" } },
  ],
  smartphone: [
    { tag: "rect", attrs: { width: "14", height: "20", x: "5", y: "2", rx: "2", ry: "2" } },
    { tag: "path", attrs: { d: "M12 18h.01" } },
  ],
  smile: [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
    { tag: "path", attrs: { d: "M8 14s1.5 2 4 2 4-2 4-2" } },
    { tag: "line", attrs: { x1: "9", x2: "9.01", y1: "9", y2: "9" } },
    { tag: "line", attrs: { x1: "15", x2: "15.01", y1: "9", y2: "9" } },
  ],
  star: [
    { tag: "path", attrs: { d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" } },
  ],
  sun: [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "4" } },
    { tag: "path", attrs: { d: "M12 2v2" } },
    { tag: "path", attrs: { d: "M12 20v2" } },
    { tag: "path", attrs: { d: "m4.93 4.93 1.41 1.41" } },
    { tag: "path", attrs: { d: "m17.66 17.66 1.41 1.41" } },
    { tag: "path", attrs: { d: "M2 12h2" } },
    { tag: "path", attrs: { d: "M20 12h2" } },
    { tag: "path", attrs: { d: "m6.34 17.66-1.41 1.41" } },
    { tag: "path", attrs: { d: "m19.07 4.93-1.41 1.41" } },
  ],
  target: [
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "10" } },
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "6" } },
    { tag: "circle", attrs: { cx: "12", cy: "12", r: "2" } },
  ],
  "tree-pine": [
    { tag: "path", attrs: { d: "m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z" } },
    { tag: "path", attrs: { d: "M12 22v-3" } },
  ],
  "trending-up": [
    { tag: "polyline", attrs: { points: "22 7 13.5 15.5 8.5 10.5 2 17" } },
    { tag: "polyline", attrs: { points: "16 7 22 7 22 13" } },
  ],
  trophy: [
    { tag: "path", attrs: { d: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6" } },
    { tag: "path", attrs: { d: "M18 9h1.5a2.5 2.5 0 0 0 0-5H18" } },
    { tag: "path", attrs: { d: "M4 22h16" } },
    { tag: "path", attrs: { d: "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" } },
    { tag: "path", attrs: { d: "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" } },
    { tag: "path", attrs: { d: "M18 2H6v7a6 6 0 0 0 12 0V2Z" } },
  ],
  type: [
    { tag: "polyline", attrs: { points: "4 7 4 4 20 4 20 7" } },
    { tag: "line", attrs: { x1: "9", x2: "15", y1: "20", y2: "20" } },
    { tag: "line", attrs: { x1: "12", x2: "12", y1: "4", y2: "20" } },
  ],
  user: [
    { tag: "path", attrs: { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" } },
    { tag: "circle", attrs: { cx: "12", cy: "7", r: "4" } },
  ],
  "user-minus": [
    { tag: "path", attrs: { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" } },
    { tag: "circle", attrs: { cx: "9", cy: "7", r: "4" } },
    { tag: "line", attrs: { x1: "22", x2: "16", y1: "11", y2: "11" } },
  ],
  users: [
    { tag: "path", attrs: { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" } },
    { tag: "circle", attrs: { cx: "9", cy: "7", r: "4" } },
    { tag: "path", attrs: { d: "M22 21v-2a4 4 0 0 0-3-3.87" } },
    { tag: "path", attrs: { d: "M16 3.13a4 4 0 0 1 0 7.75" } },
  ],
  wifi: [
    { tag: "path", attrs: { d: "M12 20h.01" } },
    { tag: "path", attrs: { d: "M2 8.82a15 15 0 0 1 20 0" } },
    { tag: "path", attrs: { d: "M5 12.859a10 10 0 0 1 14 0" } },
    { tag: "path", attrs: { d: "M8.5 16.429a5 5 0 0 1 7 0" } },
  ],
  wrench: [
    { tag: "path", attrs: { d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" } },
  ],
};

/** Semantic category → representative allowlisted glyph (upstream categoryFallbacks). */
export const CATEGORY_FALLBACKS = Object.freeze({
  accessibility: "accessibility",
  account: "user",
  animals: "cat",
  arrows: "arrow-right",
  brands: "box",
  buildings: "building",
  charts: "chart-line",
  communication: "message-square",
  connectivity: "wifi",
  cursors: "mouse-pointer",
  design: "palette",
  development: "code",
  devices: "smartphone",
  emoji: "smile",
  files: "file",
  finance: "dollar-sign",
  "food-beverage": "cooking-pot",
  gaming: "gamepad",
  home: "house",
  layout: "layout",
  mail: "mail",
  math: "calculator",
  medical: "heart-pulse",
  multimedia: "music",
  nature: "tree-pine",
  navigation: "map-pin",
  notifications: "bell",
  people: "users",
  photography: "camera",
  science: "microscope",
  seasons: "sun",
  security: "shield",
  shapes: "circle",
  shopping: "shopping-cart",
  social: "share-2",
  sports: "trophy",
  sustainability: "leaf",
  text: "type",
  time: "clock",
  tools: "wrench",
  transportation: "car",
  travel: "plane",
  weather: "cloud",
});

export const DEFAULT_FALLBACK_ICON = "circle-dot";

/**
 * Normalize PascalCase / spaces to kebab-case candidates.
 * @param {string} name
 * @returns {string[]}
 */
export function toKebabIconCandidates(name) {
  const base = String(name || "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Za-z])(\d)/g, "$1-$2")
    .toLowerCase();
  if (!base) return [];
  const digitSplit = base.replace(/(\d)(?=\d)/g, "$1-");
  return [...new Set([base, digitSplit])];
}

/**
 * @param {string | undefined} category
 * @returns {string}
 */
export function getFallbackIconName(category) {
  const key = String(category ?? "")
    .trim()
    .toLowerCase();
  return CATEGORY_FALLBACKS[key] ?? DEFAULT_FALLBACK_ICON;
}

/**
 * Resolve an allowlisted glyph name (exact → kebab candidates → category → default).
 * @param {string} name
 * @param {string} [category]
 * @returns {{ resolved: string, exact: boolean, glyphs: IconNode[] }}
 */
export function resolveIconGlyph(name, category) {
  const raw = String(name || "").trim();
  if (raw && ICON_GLYPHS[raw]) {
    return { resolved: raw, exact: true, glyphs: ICON_GLYPHS[raw] };
  }
  for (const cand of toKebabIconCandidates(raw)) {
    if (ICON_GLYPHS[cand]) {
      return { resolved: cand, exact: true, glyphs: ICON_GLYPHS[cand] };
    }
  }
  const fallback = getFallbackIconName(category);
  const glyphs = ICON_GLYPHS[fallback] ?? ICON_GLYPHS[DEFAULT_FALLBACK_ICON];
  return { resolved: fallback, exact: false, glyphs };
}

/**
 * @param {string} name
 * @returns {boolean}
 */
export function isAllowlistedIcon(name) {
  if (!name) return false;
  if (ICON_GLYPHS[name]) return true;
  return toKebabIconCandidates(name).some((c) => Boolean(ICON_GLYPHS[c]));
}
