/* CEsim Boolean core: expression parser, Quine-McCluskey minimiser (SOP/POS), helpers. */
'use strict';
(function (root) {
  const popc = x => { let c = 0; while (x) { c += x & 1; x >>>= 1; } return c; };

  /* implicant = { v: value bits, m: mask of don't-care positions (1 = eliminated) } */
  function primes(ones, dcs, n) {
    const all = [...new Set(ones.concat(dcs))];
    let cur = new Map(); all.forEach(t => cur.set(t + '/0', { v: t, m: 0, cov: [t] }));
    const result = [];
    while (cur.size) {
      const used = new Set(), next = new Map(); const list = [...cur.values()];
      const groups = new Map(); list.forEach(it => { const k = it.m + ':' + popc(it.v & ~it.m); (groups.get(k) || groups.set(k, []).get(k)).push(it); });
      for (const a of list) {
        const ka = a.m + ':' + (popc(a.v & ~a.m) + 1); const gb = groups.get(ka); if (!gb) continue;
        for (const b of gb) { const diff = (a.v ^ b.v) & ~a.m; if (popc(diff) === 1 && (b.v & ~b.m & ~diff) === (a.v & ~a.m & ~diff)) { const v = a.v & ~diff, m = a.m | diff; const key = (v & ~m) + '/' + m; if (!next.has(key)) next.set(key, { v: v & ~m, m, cov: [...new Set(a.cov.concat(b.cov))] }); used.add(a); used.add(b); } }
      }
      list.forEach(it => { if (!used.has(it)) result.push(it); });
      cur = next;
    }
    const seen = new Set(); return result.filter(p => { const k = (p.v & ~p.m) + '/' + p.m; if (seen.has(k)) return false; seen.add(k); return true; });
  }
  const covers = (p, t) => ((t ^ p.v) & ~p.m) === 0;
  const lits = (p, n) => n - popc(p.m);

  function minimise(ones, dcs, n) {
    ones = [...new Set(ones)].sort((a, b) => a - b); dcs = [...new Set(dcs)].filter(d => !ones.includes(d));
    const full = 1 << n;
    if (!ones.length) return { terms: [], constant: 0 };
    if (ones.length + dcs.length === full) return { terms: [{ v: 0, m: full - 1 }], constant: 1 };
    const P = primes(ones, dcs, n);
    // essential prime implicants
    let left = new Set(ones); const chosen = [];
    let changed = true;
    while (changed) { changed = false; for (const t of [...left]) { const c = P.filter(p => covers(p, t)); if (c.length === 1 && !chosen.includes(c[0])) { chosen.push(c[0]); ones.forEach(o => { if (covers(c[0], o)) left.delete(o); }); changed = true; } } }
    if (left.size) {
      // Petrick's method (bounded), falling back to greedy for very large charts
      const rem = [...left]; const cand = P.filter(p => !chosen.includes(p) && rem.some(t => covers(p, t)));
      let sums = [new Set()];
      for (const t of rem) { const opts = cand.filter(p => covers(p, t)); const ns = []; for (const s of sums) for (const p of opts) { const z = new Set(s); z.add(p); ns.push(z); } // absorb
        ns.sort((a, b) => a.size - b.size); const kept = []; for (const z of ns) { if (!kept.some(k => [...k].every(x => z.has(x)))) kept.push(z); if (kept.length > 400) break; } sums = kept; if (!sums.length) break; }
      const cost = s => [...s].reduce((c, p) => c + 1000 + lits(p, n), 0);
      let best = sums.sort((a, b) => cost(a) - cost(b))[0];
      if (!best) { best = new Set(); const r2 = new Set(rem); while (r2.size) { let bp = null, bc = -1; for (const p of cand) { const c = [...r2].filter(t => covers(p, t)).length; if (c > bc || (c === bc && lits(p, n) < lits(bp, n))) { bp = p; bc = c; } } best.add(bp); [...r2].forEach(t => { if (covers(bp, t)) r2.delete(t); }); } }
      best.forEach(p => chosen.push(p));
    }
    chosen.sort((a, b) => lits(a, n) - lits(b, n) || (a.v - b.v));
    return { terms: chosen.map(p => ({ v: p.v & ~p.m, m: p.m })), constant: null, primes: P.length };
  }
  /* term to literals: bit (n-1-i) is variable i (first variable is the most significant) */
  function termLits(t, n) { const L = []; for (let i = 0; i < n; i++) { const bit = 1 << (n - 1 - i); if (t.m & bit) continue; L.push({ v: i, neg: !(t.v & bit) }); } return L; }
  function sopText(res, names, style) {
    const n = names.length; if (res.constant === 0) return '0'; if (res.constant === 1) return '1';
    const neg = s => style === 'code' ? '~' + s : s + "'"; const and = style === 'code' ? ' & ' : '';
    return res.terms.map(t => { const L = termLits(t, n); return L.map(l => l.neg ? neg(names[l.v]) : names[l.v]).join(and) || '1'; }).join(style === 'code' ? ' | ' : ' + ');
  }
  function posText(res0, names, style) { // res0 = minimisation of the zeros
    const n = names.length; if (res0.constant === 0) return '1'; if (res0.constant === 1) return '0';
    const neg = s => style === 'code' ? '~' + s : s + "'";
    return res0.terms.map(t => { const L = termLits(t, n); const s = L.map(l => l.neg ? names[l.v] : neg(names[l.v])).join(style === 'code' ? ' | ' : ' + '); return L.length > 1 ? '(' + s + ')' : s; }).join(style === 'code' ? ' & ' : '');
  }

  /* expression parser. Accepts AB, A·B, A*B, A&B, A AND B; + | OR; ' ~ ! ¬ NOT; ^ ⊕ XOR; parentheses; 0 1 */
  function parseExpr(src, names) {
    const s = String(src).replace(/[·∙∧]/g, '&').replace(/[∨]/g, '|').replace(/[⊕]/g, '^').replace(/[¬]/g, '!').replace(/[’`´]/g, "'");
    const sorted = names.map((n, i) => [n, i]).sort((a, b) => b[0].length - a[0].length);
    let i = 0; const toks = [];
    while (i < s.length) { const ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      const w = /^(AND|OR|XOR|NOT|NAND|NOR)\b/i.exec(s.slice(i)); if (w && !names.includes(w[1])) { toks.push({ t: 'op', v: { and: '&', or: '|', xor: '^', not: '!' }[w[1].toLowerCase()] || w[1].toLowerCase() }); i += w[1].length; continue; }
      if ('&*|+^!~()\''.includes(ch)) { toks.push({ t: 'op', v: ch === '*' ? '&' : ch === '+' ? '|' : ch === '~' ? '!' : ch }); i++; continue; }
      if (ch === '0' || ch === '1') { toks.push({ t: 'c', v: +ch }); i++; continue; }
      const m = sorted.find(([n]) => s.startsWith(n, i)); if (m) { toks.push({ t: 'v', v: m[1] }); i += m[0].length; continue; }
      throw new Error('Unknown symbol "' + ch + '" at position ' + (i + 1) + '. Variables are ' + names.join(', ') + '.');
    }
    let p = 0; const peek = () => toks[p], eat = v => { if (toks[p] && toks[p].t === 'op' && toks[p].v === v) { p++; return true; } return false; };
    function primary() { const t = toks[p]; if (!t) throw new Error('The expression ends too early.');
      let node;
      if (t.t === 'op' && t.v === '!') { p++; node = { k: 'not', a: primary() }; }
      else if (t.t === 'op' && t.v === '(') { p++; node = orE(); if (!eat(')')) throw new Error('A closing bracket ) is missing.'); }
      else if (t.t === 'v') { p++; node = { k: 'var', i: t.v }; }
      else if (t.t === 'c') { p++; node = { k: 'c', v: t.v }; }
      else throw new Error('Unexpected "' + t.v + '".');
      while (eat("'")) node = { k: 'not', a: node }; return node; }
    function andE() { let a = primary(); for (;;) { if (eat('&')) { a = { k: 'and', a, b: primary() }; continue; } const t = peek(); if (t && (t.t === 'v' || t.t === 'c' || (t.t === 'op' && (t.v === '(' || t.v === '!')))) { a = { k: 'and', a, b: primary() }; continue; } return a; } }
    function xorE() { let a = andE(); while (eat('^')) a = { k: 'xor', a, b: andE() }; return a; }
    function orE() { let a = xorE(); while (eat('|')) a = { k: 'or', a, b: xorE() }; return a; }
    if (!toks.length) throw new Error('Type an expression.');
    const tree = orE(); if (p < toks.length) throw new Error('Unexpected "' + toks[p].v + '".');
    return tree;
  }
  function evalTree(t, bits) { switch (t.k) { case 'var': return bits[t.i]; case 'c': return t.v; case 'not': return evalTree(t.a, bits) ? 0 : 1; case 'and': return evalTree(t.a, bits) & evalTree(t.b, bits); case 'or': return evalTree(t.a, bits) | evalTree(t.b, bits); case 'xor': return evalTree(t.a, bits) ^ evalTree(t.b, bits); } return 0; }
  function exprToValues(src, names) { const tree = parseExpr(src, names); const n = names.length, out = []; for (let m = 0; m < (1 << n); m++) { const bits = names.map((_, i) => (m >> (n - 1 - i)) & 1); out.push(evalTree(tree, bits)); } return out; }
  function parseMinterms(src, n) { // "1,3,5 d 0,2" or "Σm(1,3,5)+d(0,2)" or "m1 m3"
    const s = String(src); const full = 1 << n; const dIdx = s.search(/\bd\s*\(|\bdc\b|\bd\b|don'?t/i); const mPart = dIdx >= 0 ? s.slice(0, dIdx) : s, dPart = dIdx >= 0 ? s.slice(dIdx) : '';
    const nums = t => (t.match(/\d+/g) || []).map(Number);
    const ones = nums(mPart.replace(/Σ|sum|m(?=\s*\()/gi, ' ')), dcs = nums(dPart); const bad = ones.concat(dcs).filter(x => x >= full);
    if (bad.length) throw new Error('With ' + n + ' variables the numbers go from 0 to ' + (full - 1) + '.');
    const v = new Array(full).fill(0); ones.forEach(i => v[i] = 1); dcs.forEach(i => v[i] = 'x'); return v; }
  const gray = n => { const r = []; for (let i = 0; i < 1 << n; i++) r.push(i ^ (i >> 1)); return r; };

  const API = { minimise, termLits, sopText, posText, parseExpr, exprToValues, evalTree, parseMinterms, gray, covers, popc };
  if (typeof module !== 'undefined') module.exports = API; else root.BOOL = API;
})(typeof window !== 'undefined' ? window : globalThis);
