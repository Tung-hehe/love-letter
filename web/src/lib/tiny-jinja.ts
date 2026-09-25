// tiny-jinja.ts — bộ dựng template Jinja2 rút gọn, chạy trong trình duyệt.
// Port trực tiếp từ app/js/tiny-jinja.js (bản cũ), chỉ thêm kiểu dữ liệu.
//
// Chỉ hỗ trợ đúng tập cú pháp mà các file trong templates/ đang dùng:
//   {{ var }}, {{ var or "mặc định" }}
//   {% set x = expr %}
//   {% for x in y %}...{% endfor %}   (có loop.first / loop.last)
//   {% if expr %}...{% endif %}
//   filter: |batch(n)  |list  |length
// Nhờ vậy app đọc thẳng file .html gốc trong templates/ để render, luôn khớp 100%
// với bản mà generate.py tạo ra, không cần chép lại từng template một.

export type TemplateContext = Record<string, unknown>;

type Scope = Record<string, unknown>;

type Token =
  | { type: 'text'; value: string }
  | { type: 'output'; value: string }
  | { type: 'tag'; value: string };

type Node =
  | { type: 'text'; value: string }
  | { type: 'output'; expr: string }
  | { type: 'set'; name: string; expr: string }
  | { type: 'for'; varName: string; expr: string; body: Node[] }
  | { type: 'if'; expr: string; body: Node[] };

function escapeHtml(str: unknown): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => map[c]);
}

// Cú pháp kiểu markdown: [chữ hiển thị](link). Chỉ nhận link http(s)/mailto
// để tránh chèn mã (vd javascript:) qua href. Chạy SAU khi đã escape, nên
// ngoặc vuông/tròn giữ nguyên còn chữ/link bên trong đã an toàn để chèn thẳng.
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s()]+|mailto:[^\s()]+)\)/g;

function renderText(str: unknown): string {
  const escaped = escapeHtml(str);
  return escaped.replace(MARKDOWN_LINK_RE, (_m, label: string, url: string) =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`);
}

function tokenize(src: string): Token[] {
  const re = /\{\{\s*([\s\S]*?)\s*\}\}|\{%\s*([\s\S]*?)\s*%\}/g;
  const tokens: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) tokens.push({ type: 'text', value: src.slice(last, m.index) });
    if (m[1] !== undefined) tokens.push({ type: 'output', value: m[1] });
    else tokens.push({ type: 'tag', value: m[2] });
    last = re.lastIndex;
  }
  if (last < src.length) tokens.push({ type: 'text', value: src.slice(last) });
  return tokens;
}

function parse(tokens: Token[]): Node[] {
  let i = 0;

  function parseNodes(stopWords: Set<string> | null): Node[] {
    const nodes: Node[] = [];
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
        nodes.push({ type: 'for', varName: m![1], expr: m![2].trim(), body });
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

function lookup(scopeStack: Scope[], path: string): unknown {
  const parts = path.split('.');
  let base: unknown;
  for (let i = scopeStack.length - 1; i >= 0; i--) {
    if (Object.prototype.hasOwnProperty.call(scopeStack[i], parts[0])) { base = scopeStack[i][parts[0]]; break; }
  }
  for (let i = 1; i < parts.length && base != null; i++) base = (base as Scope)[parts[i]];
  return base;
}

function applyFilter(name: string, val: unknown, args: unknown[]): unknown {
  if (name === 'batch') {
    const size = args[0] as number;
    const out: unknown[][] = [];
    const arr = (val as unknown[]) || [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }
  if (name === 'list') return val;
  if (name === 'length') return val == null ? 0 : (val as { length: number }).length;
  return val;
}

function isTruthy(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0;
  return !!v;
}

function tokenizeExpr(s: string): string[] {
  const re = /\s*("(?:[^"\\]|\\.)*"|[A-Za-z_][A-Za-z0-9_.]*|[0-9]+|\||>|\(|\)|,)/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) if (m[1]) out.push(m[1]);
  return out;
}

function evalExpr(str: string, scopeStack: Scope[]): unknown {
  const toks = tokenizeExpr(str);
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];

  function parseOrExpr(): unknown {
    let left = parseCompare();
    while (peek() === 'or') { next(); const right = parseCompare(); left = isTruthy(left) ? left : right; }
    return left;
  }
  function parseCompare(): unknown {
    const left = parsePipe();
    if (peek() === '>') { next(); const right = parsePipe(); return Number(left) > Number(right); }
    return left;
  }
  function parsePipe(): unknown {
    let val = parsePrimary();
    while (peek() === '|') {
      next();
      const name = next();
      const args: unknown[] = [];
      if (peek() === '(') {
        next();
        while (peek() !== ')') {
          args.push(parseOrExpr());
          if (peek() === ',') next();
        }
        next();
      }
      val = applyFilter(name, val, args);
    }
    return val;
  }
  function parsePrimary(): unknown {
    const t = next();
    if (t === undefined) return undefined;
    if (t[0] === '"') return t.slice(1, -1).replace(/\\"/g, '"');
    if (/^[0-9]+$/.test(t)) return Number(t);
    return lookup(scopeStack, t);
  }

  return parseOrExpr();
}

function renderNodes(nodes: Node[], scopeStack: Scope[]): string {
  let out = '';
  for (const node of nodes) {
    if (node.type === 'text') { out += node.value; continue; }
    if (node.type === 'output') { out += renderText(evalExpr(node.expr, scopeStack)); continue; }
    if (node.type === 'set') {
      scopeStack[scopeStack.length - 1][node.name] = evalExpr(node.expr, scopeStack);
      continue;
    }
    if (node.type === 'if') {
      if (isTruthy(evalExpr(node.expr, scopeStack))) out += renderNodes(node.body, scopeStack);
      continue;
    }
    if (node.type === 'for') {
      const arr = (evalExpr(node.expr, scopeStack) as unknown[]) || [];
      const n = arr.length;
      for (let idx = 0; idx < n; idx++) {
        const child: Scope = {
          [node.varName]: arr[idx],
          loop: { first: idx === 0, last: idx === n - 1, index: idx + 1, index0: idx, length: n },
        };
        scopeStack.push(child);
        out += renderNodes(node.body, scopeStack);
        scopeStack.pop();
      }
    }
  }
  return out;
}

export function renderTemplate(src: string, ctx: TemplateContext): string {
  const ast = parse(tokenize(src));
  return renderNodes(ast, [Object.assign({}, ctx) as Scope]);
}
