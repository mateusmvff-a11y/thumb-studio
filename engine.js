// Motor de diagramação do Thumb Studio.
// Reproduz as regras fechadas com o Mateus (07/10/2026) para as thumbs do canal do Luís Ernesto Lacombe.
// Tudo em px de uma tela de 1920x1080.

export const SPEC = {
  W: 1920, H: 1080,
  left: 124,            // margem esquerda do texto
  bottom: 976,          // base do bloco (fundo da tinta, incluindo cedilha)
  fontMax: 265,         // teto de corpo (px)
  fontMin: 60,          // piso: abaixo disso avisa "texto pequeno"
  warnBelow: 170,       // abaixo disso a ferramenta avisa que o texto ficou pequeno
  pitchRatio: 0.975,    // distância entre linhas / corpo (medido nos PSDs)
  tol: 10,              // folga de largura (o Photoshop media pela caixa, não pela tinta)
  tracking: -0.02,      // -20/1000 em
  weights: { light: 300, accent: 900, accent800: 800 },
};

export async function loadFonts() {
  const faces = [
    ['Creato', 300, 'fonts/CreatoDisplay-Light.otf'],
    ['Creato', 400, 'fonts/CreatoDisplay-Regular.otf'],
    ['Creato', 700, 'fonts/CreatoDisplay-Bold.otf'],
    ['Creato', 800, 'fonts/CreatoDisplay-ExtraBold.otf'],
    ['Creato', 900, 'fonts/CreatoDisplay-Black.otf'],
  ];
  await Promise.all(faces.map(async ([family, weight, url]) => {
    const f = new FontFace(family, `url(${url})`, { weight: String(weight) });
    document.fonts.add(await f.load());
  }));
}

function setFont(ctx, weight, F) {
  ctx.font = `${weight} ${F}px Creato`;
  ctx.letterSpacing = `${(SPEC.tracking * F).toFixed(2)}px`;
}

// Medidas de uma linha de texto no corpo F: largura a partir da margem (origem) e altura da tinta.
const REF = 200;
const cache = new Map();
// Medidas de uma linha no corpo F. Tudo é linear no corpo (o espaçamento é em em), então mede uma vez em 200 px e escala.
export function measureLine(ctx, text, weight, F) {
  const key = weight + "|" + text;
  let b = cache.get(key);
  if (!b) {
    setFont(ctx, weight, REF);
    const m = ctx.measureText(text);
    b = { w: m.actualBoundingBoxRight, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
    cache.set(key, b);
  }
  const k = F / REF;
  return { w: b.w * k, asc: b.asc * k, desc: b.desc * k };
}

// lines: [{ text, kind: 'light' | 'accent' }]
// cfg: { bordaProt, queixoProt, limiteCorpo, topo, accentWeight }
//   bordaProt   x da borda esquerda do protagonista (cabelo/rosto); acima do queixo o texto para 45px antes dela
//   queixoProt  y do queixo; abaixo dele o texto pode entrar no corpo até limiteCorpo
//   limiteCorpo x máximo do texto nas linhas que começam abaixo do queixo (antes da camisa branca)
//   topo        y mínimo do bloco
export function layout(ctx, lines, cfg) {
  const aw = cfg.accentWeight || SPEC.weights.accent;
  const wt = (l) => (l.kind === 'accent' ? aw : SPEC.weights.light);
  const n = lines.length;
  const last = lines[n - 1];
  let chosen = null;
  for (let F = SPEC.fontMax; F >= SPEC.fontMin; F -= 0.5) {
    const pitch = SPEC.pitchRatio * F;
    const ms = lines.map((l) => measureLine(ctx, l.text, wt(l), F));
    const baseLast = SPEC.bottom - ms[n - 1].desc;           // base do texto da última linha
    const baselines = lines.map((_, i) => baseLast - (n - 1 - i) * pitch);
    const blockTop = baselines[0] - ms[0].asc;
    const blockH = SPEC.bottom - blockTop;
    if (blockTop < cfg.topo) continue;
    let ok = true;
    for (let i = 0; i < n; i++) {
      const yTopo = blockTop + (blockH * i) / n;               // faixa da linha i (partes iguais do bloco)
      const lim = yTopo <= cfg.queixoProt ? cfg.bordaProt - 45 : cfg.limiteCorpo;
      if (ms[i].w > lim - SPEC.left + SPEC.tol) { ok = false; break; }
    }
    if (ok) { chosen = { F, pitch, baselines, ms, blockTop, blockH }; break; }
  }
  if (!chosen) {
    const F = SPEC.fontMin; const pitch = SPEC.pitchRatio * F;
    const ms = lines.map((l) => measureLine(ctx, l.text, wt(l), F));
    const baseLast = SPEC.bottom - ms[n - 1].desc;
    const baselines = lines.map((_, i) => baseLast - (n - 1 - i) * pitch);
    chosen = { F, pitch, baselines, ms, blockTop: baselines[0] - ms[0].asc, blockH: 0, forced: true };
  }
  chosen.small = chosen.F < SPEC.warnBelow;
  return chosen;
}

// Divide a copy em linhas. Se o texto já tem quebras (Enter), respeita. Senão, testa todas as divisões
// em 3 linhas (2 se houver só 2 palavras) e fica com a de maior corpo; empate: linhas mais equilibradas.
export function autoBreak(ctx, text, cfg) {
  const clean = text.replace(/\r/g, '').trim().toLocaleUpperCase('pt-BR');
  if (!clean) return [];
  const manual = clean.split('\n').map((s) => s.trim()).filter(Boolean);
  const mk = (arr) => arr.map((t, i) => ({ text: t, kind: i === arr.length - 1 ? 'accent' : 'light' }));
  if (manual.length > 1) return mk(manual.map((t) => t.replace(/\*/g, '')));
  // Destaque escolhido pelo usuário: *palavra(s)* vira a última linha, em cor.
  const dm = clean.match(/^(.*?)\*+([^*]+)\*+(.*)$/s);
  if (dm) {
    const pre = dm[1].trim();
    const acc = `${dm[2]}${dm[3]}`.replace(/\s+/g, ' ').trim();
    const preWords = pre ? pre.split(/\s+/) : [];
    const accLine = { text: acc, kind: 'accent' };
    if (!preWords.length) return [accLine];
    const kk = Math.min(2, preWords.length);
    const cands = [];
    const rec2 = (st, left, a) => {
      if (left === 1) { cands.push([...a, preWords.slice(st).join(' ')]); return; }
      for (let e = st + 1; e <= preWords.length - (left - 1); e++) rec2(e, left - 1, [...a, preWords.slice(st, e).join(' ')]);
    };
    rec2(0, kk, []);
    let bestC = null;
    for (const c of cands) {
      const L = [...c.map((t) => ({ text: t, kind: 'light' })), accLine];
      const r = layout(ctx, L, cfg);
      const lens = c.map((x) => x.length);
      const sc = r.F - (Math.max(...lens) - Math.min(...lens)) * 0.05;
      if (!bestC || sc > bestC.sc) bestC = { L, sc };
    }
    return bestC.L;
  }
  const words = clean.split(/\s+/);
  if (words.length === 1) return mk(words);
  const k = Math.min(3, words.length);
  const splits = [];
  const rec = (start, left, acc) => {
    if (left === 1) { splits.push([...acc, words.slice(start).join(' ')]); return; }
    for (let e = start + 1; e <= words.length - (left - 1); e++) rec(e, left - 1, [...acc, words.slice(start, e).join(' ')]);
  };
  rec(0, k, []);
  let best = null;
  for (const s of splits) {
    const L = mk(s);
    const r = layout(ctx, L, cfg);
    const lens = s.map((x) => x.length);
    const spread = Math.max(...lens) - Math.min(...lens);
    const score = r.F - spread * 0.05;
    if (!best || score > best.score) best = { L, score, F: r.F };
  }
  return best.L;
}

export function draw(ctx, lines, r, colors, cfg) {
  const aw = cfg.accentWeight || SPEC.weights.accent;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  lines.forEach((l, i) => {
    setFont(ctx, l.kind === 'accent' ? aw : SPEC.weights.light, r.F);
    ctx.fillStyle = l.kind === 'accent' ? colors.accent : '#ffffff';
    ctx.fillText(l.text, SPEC.left, r.baselines[i]);
  });
}
