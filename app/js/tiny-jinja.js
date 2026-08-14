// tiny-jinja.js — bộ dựng template Jinja2 rút gọn, chạy trong trình duyệt.
//
// Chỉ hỗ trợ đúng tập cú pháp mà các file trong templates/ đang dùng:
//   {{ var }}, {{ var or "mặc định" }}
//   {% set x = expr %}
//   {% for x in y %}...{% endfor %}   (có loop.first / loop.last)
//   {% if expr %}...{% endif %}
//   filter: |batch(n)  |list  |length
// Nhờ vậy app đọc thẳng file .html gốc trong templates/ để render, luôn khớp 100%
// với bản mà generate.py tạo ra, không cần chép lại từng template một.

function tjEscapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Cú pháp kiểu markdown: [chữ hiển thị](link). Chỉ nhận link http(s)/mailto
// để tránh chèn mã (vd javascript:) qua href. Chạy SAU khi đã escape, nên
// ngoặc vuông/tròn giữ nguyên còn chữ/link bên trong đã an toàn để chèn thẳng.
const TJ_MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s()]+|mailto:[^\s()]+)\)/g;

function tjRenderText(str) {
  const escaped = tjEscapeHtml(str);
  return escaped.replace(TJ_MARKDOWN_LINK_RE, (m, label, url) =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
  );
}

function tjTokenize(src) {
  const re = /\{\{\s*([\s\S]*?)\s*\}\}|\{%\s*([\s\S]*?)\s*%\}/g;
  const tokens = [];
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    if (m.index > last) tokens.push({ type: 'text', value: src.slice(last, m.index) });
    if (m[1] !== undefined) tokens.push({ type: 'output', value: m[1] });
    else tokens.push({ type: 'tag', value: m[2] });
    last = re.lastIndex;
  }
  if (last < src.length) tokens.push({ type: 'text', value: src.slice(last) });
  return tokens;
}

function tjParse(tokens) {
  let i = 0;

  function parseNodes(stopWords) {
    const nodes = [];
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.type === 'text') { nodes.push({ type: 'text', value: t.value }); i++; continue; }
      if (t.type === 'output') { nodes.push({ type: 'output', expr: t.value }); i++; continue; }

      const tagText = t.value.trim();
      const word = tagText.split(/\s+/)[0];
      if (stopWords && stopWords.has(word)) return nodes;

      if (word === 'set') {
        const rest = tagText.slice(3).trim();
        const eq = rest.indexOf('=');
        nodes.push({ type: 'set', name: rest.slice(0, eq).trim(), expr: rest.slice(eq + 1).trim() });
        i++;
        continue;
      }
      if (word === 'for') {
        const m = tagText.match(/^for\s+(\w+)\s+in\s+([\s\S]+)$/);
        i++;
        const body = parseNodes(new Set(['endfor']));
        i++; // consume endfor
        nodes.push({ type: 'for', varName: m[1], expr: m[2].trim(), body });
        continue;
      }
      if (word === 'if') {
        const expr = tagText.slice(2).trim();
        i++;
        const body = parseNodes(new Set(['endif']));
        i++; // consume endif
        nodes.push({ type: 'if', expr, body });
        continue;
      }
      // tag lạ không hỗ trợ, bỏ qua
      i++;
    }
    return nodes;
  }

  return parseNodes(null);
}

function tjLookup(scopeStack, path) {
  const parts = path.split('.');
  let base;
  for (let i = scopeStack.length - 1; i >= 0; i--) {
    if (Object.prototype.hasOwnProperty.call(scopeStack[i], parts[0])) { base = scopeStack[i][parts[0]]; break; }
  }
  for (let i = 1; i < parts.length && base != null; i++) base = base[parts[i]];
  return base;
}

function tjApplyFilter(name, val, args) {
  if (name === 'batch') {
    const size = args[0];
    const out = [];
    const arr = val || [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }
  if (name === 'list') return val;
  if (name === 'length') return val == null ? 0 : val.length;
  return val;
}

function tjIsTruthy(v) {
  if (Array.isArray(v)) return v.length > 0;
  return !!v;
}

function tjTokenizeExpr(s) {
  const re = /\s*("(?:[^"\\]|\\.)*"|[A-Za-z_][A-Za-z0-9_.]*|[0-9]+|\||>|\(|\)|,)/g;
  const out = [];
  let m;
  while ((m = re.exec(s))) if (m[1]) out.push(m[1]);
  return out;
}

function tjEvalExpr(str, scopeStack) {
  const toks = tjTokenizeExpr(str);
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];

  function parseOr() {
    let left = parseCompare();
    while (peek() === 'or') { next(); const right = parseCompare(); left = tjIsTruthy(left) ? left : right; }
    return left;
  }
  function parseCompare() {
    const left = parsePipe();
    if (peek() === '>') { next(); const right = parsePipe(); return Number(left) > Number(right); }
    return left;
  }
  function parsePipe() {
    let val = parsePrimary();
    while (peek() === '|') {
      next();
      const name = next();
      const args = [];
      if (peek() === '(') {
        next();
        while (peek() !== ')') {
          args.push(parseOr());
          if (peek() === ',') next();
        }
        next();
      }
      val = tjApplyFilter(name, val, args);
    }
    return val;
  }
  function parsePrimary() {
    const t = next();
    if (t === undefined) return undefined;
    if (t[0] === '"') return t.slice(1, -1).replace(/\\"/g, '"');
    if (/^[0-9]+$/.test(t)) return Number(t);
    return tjLookup(scopeStack, t);
  }

  return parseOr();
}

function tjRenderNodes(nodes, scopeStack) {
  let out = '';
  for (const node of nodes) {
    if (node.type === 'text') { out += node.value; continue; }
    if (node.type === 'output') { out += tjRenderText(tjEvalExpr(node.expr, scopeStack)); continue; }
    if (node.type === 'set') {
      scopeStack[scopeStack.length - 1][node.name] = tjEvalExpr(node.expr, scopeStack);
      continue;
    }
    if (node.type === 'if') {
      if (tjIsTruthy(tjEvalExpr(node.expr, scopeStack))) out += tjRenderNodes(node.body, scopeStack);
      continue;
    }
    if (node.type === 'for') {
      const arr = tjEvalExpr(node.expr, scopeStack) || [];
      const n = arr.length;
      for (let idx = 0; idx < n; idx++) {
        const child = {};
        child[node.varName] = arr[idx];
        child.loop = { first: idx === 0, last: idx === n - 1, index: idx + 1, index0: idx, length: n };
        scopeStack.push(child);
        out += tjRenderNodes(node.body, scopeStack);
        scopeStack.pop();
      }
    }
  }
  return out;
}

function renderTemplate(src, ctx) {
  const ast = tjParse(tjTokenize(src));
  return tjRenderNodes(ast, [Object.assign({}, ctx)]);
}
