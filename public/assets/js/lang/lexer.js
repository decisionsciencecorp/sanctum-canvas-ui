import { T } from "./tokens.js";
function tokenize(src) {
  const tokens = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    while (i < n && (src[i] === " " || src[i] === "	" || src[i] === "\r")) i++;
    if (i >= n) break;
    const c = src[i];
    if (c === "\n") {
      tokens.push({ t: T.Newline });
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ t: T.LParen });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ t: T.RParen });
      i++;
      continue;
    }
    if (c === "[") {
      tokens.push({ t: T.LBrack });
      i++;
      continue;
    }
    if (c === "]") {
      tokens.push({ t: T.RBrack });
      i++;
      continue;
    }
    if (c === "{") {
      tokens.push({ t: T.LBrace });
      i++;
      continue;
    }
    if (c === "}") {
      tokens.push({ t: T.RBrace });
      i++;
      continue;
    }
    if (c === ",") {
      tokens.push({ t: T.Comma });
      i++;
      continue;
    }
    if (c === ":") {
      tokens.push({ t: T.Colon });
      i++;
      continue;
    }
    if (c === "=") {
      if (i + 1 < n && src[i + 1] === "=") {
        tokens.push({ t: T.EqEq });
        i += 2;
      } else {
        tokens.push({ t: T.Equals });
        i++;
      }
      continue;
    }
    if (c === "!") {
      if (i + 1 < n && src[i + 1] === "=") {
        tokens.push({ t: T.NotEq });
        i += 2;
      } else {
        tokens.push({ t: T.Not });
        i++;
      }
      continue;
    }
    if (c === ">") {
      if (i + 1 < n && src[i + 1] === "=") {
        tokens.push({ t: T.GreaterEq });
        i += 2;
      } else {
        tokens.push({ t: T.Greater });
        i++;
      }
      continue;
    }
    if (c === "<") {
      if (i + 1 < n && src[i + 1] === "=") {
        tokens.push({ t: T.LessEq });
        i += 2;
      } else {
        tokens.push({ t: T.Less });
        i++;
      }
      continue;
    }
    if (c === "&") {
      if (i + 1 < n && src[i + 1] === "&") {
        tokens.push({ t: T.And });
        i += 2;
      } else {
        tokens.push({ t: T.And });
        i++;
      }
      continue;
    }
    if (c === "|") {
      if (i + 1 < n && src[i + 1] === "|") {
        tokens.push({ t: T.Or });
        i += 2;
      } else {
        tokens.push({ t: T.Or });
        i++;
      }
      continue;
    }
    if (c === ".") {
      tokens.push({ t: T.Dot });
      i++;
      continue;
    }
    if (c === "?") {
      tokens.push({ t: T.Question });
      i++;
      continue;
    }
    if (c === "+") {
      tokens.push({ t: T.Plus });
      i++;
      continue;
    }
    if (c === "*") {
      tokens.push({ t: T.Star });
      i++;
      continue;
    }
    if (c === "/") {
      tokens.push({ t: T.Slash });
      i++;
      continue;
    }
    if (c === "%") {
      tokens.push({ t: T.Percent });
      i++;
      continue;
    }
    if (c === '"') {
      const start = i;
      i++;
      let isClosed = false;
      while (i < n) {
        if (src[i] === "\\") {
          i += 2;
        } else if (src[i] === '"') {
          i++;
          isClosed = true;
          break;
        } else {
          i++;
        }
      }
      const rawString = src.slice(start, i);
      try {
        const validJsonString = isClosed ? rawString : rawString + '"';
        tokens.push({ t: T.Str, v: JSON.parse(validJsonString) });
      } catch {
        const stripped = rawString.replace(/^"|"$/g, "");
        tokens.push({ t: T.Str, v: stripped });
      }
      continue;
    }
    if (c === "'") {
      i++;
      let result = "";
      let isClosed = false;
      while (i < n) {
        if (src[i] === "\\") {
          i++;
          if (i < n) {
            const esc = src[i];
            if (esc === "'") result += "'";
            else if (esc === "\\") result += "\\";
            else if (esc === "n") result += "\n";
            else if (esc === "t") result += "	";
            else result += esc;
            i++;
          }
        } else if (src[i] === "'") {
          i++;
          isClosed = true;
          break;
        } else {
          result += src[i];
          i++;
        }
      }
      void isClosed;
      tokens.push({ t: T.Str, v: result });
      continue;
    }
    if (c === "-") {
      const prev = tokens.length > 0 ? tokens[tokens.length - 1] : null;
      const afterValue = prev != null && (prev.t === T.Num || prev.t === T.Str || prev.t === T.Ident || prev.t === T.Type || prev.t === T.RParen || prev.t === T.RBrack || prev.t === T.True || prev.t === T.False || prev.t === T.Null || prev.t === T.StateVar || prev.t === T.BuiltinCall);
      if (!afterValue && i + 1 < n && src[i + 1] >= "0" && src[i + 1] <= "9") {
      } else {
        tokens.push({ t: T.Minus });
        i++;
        continue;
      }
    }
    const isDigit = c >= "0" && c <= "9";
    const isNegDigit = c === "-" && i + 1 < n && src[i + 1] >= "0" && src[i + 1] <= "9";
    if (isDigit || isNegDigit) {
      const start = i;
      if (src[i] === "-") i++;
      while (i < n && src[i] >= "0" && src[i] <= "9") i++;
      if (i < n && src[i] === "." && i + 1 < n && src[i + 1] >= "0" && src[i + 1] <= "9") {
        i++;
        while (i < n && src[i] >= "0" && src[i] <= "9") i++;
      }
      if (i < n && (src[i] === "e" || src[i] === "E")) {
        i++;
        if (i < n && (src[i] === "+" || src[i] === "-")) i++;
        while (i < n && src[i] >= "0" && src[i] <= "9") i++;
      }
      tokens.push({ t: T.Num, v: +src.slice(start, i) });
      continue;
    }
    if (c === "$" && i + 1 < n && (src[i + 1] >= "a" && src[i + 1] <= "z" || src[i + 1] >= "A" && src[i + 1] <= "Z" || src[i + 1] === "_")) {
      const start = i;
      i++;
      while (i < n && (src[i] >= "a" && src[i] <= "z" || src[i] >= "A" && src[i] <= "Z" || src[i] >= "0" && src[i] <= "9" || src[i] === "_"))
        i++;
      tokens.push({ t: T.StateVar, v: src.slice(start, i) });
      continue;
    }
    const isAlpha = c >= "a" && c <= "z" || c >= "A" && c <= "Z" || c === "_";
    if (isAlpha) {
      const start = i;
      while (i < n && (src[i] >= "a" && src[i] <= "z" || src[i] >= "A" && src[i] <= "Z" || src[i] >= "0" && src[i] <= "9" || src[i] === "_"))
        i++;
      const word = src.slice(start, i);
      if (word === "true") {
        tokens.push({ t: T.True });
        continue;
      }
      if (word === "false") {
        tokens.push({ t: T.False });
        continue;
      }
      if (word === "null") {
        tokens.push({ t: T.Null });
        continue;
      }
      const kind = c >= "A" && c <= "Z" ? T.Type : T.Ident;
      tokens.push({ t: kind, v: word });
      continue;
    }
    if (c === "@" && i + 1 < n && (src[i + 1] >= "a" && src[i + 1] <= "z" || src[i + 1] >= "A" && src[i + 1] <= "Z" || src[i + 1] === "_")) {
      i++;
      const start = i;
      while (i < n && (src[i] >= "a" && src[i] <= "z" || src[i] >= "A" && src[i] <= "Z" || src[i] >= "0" && src[i] <= "9" || src[i] === "_"))
        i++;
      tokens.push({ t: T.BuiltinCall, v: src.slice(start, i) });
      continue;
    }
    i++;
  }
  tokens.push({ t: T.EOF });
  return tokens;
}
export {
  tokenize
};
