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
    b = { w: m.actualBoundingBoxRight, adv: m.width, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
    cache.set(key, b);
  }
  const k = F / REF;
  return { w: b.w * k, adv: b.adv * k, asc: b.asc * k, desc: b.desc * k };
}

// Uma linha tem segmentos [{ text, accent }]: tudo claro, tudo destaque, ou misto (ex.: A *CAMPANHA*).
const segsOf = (l) => l.segs || [{ text: l.text, accent: l.kind === "accent" }];
function measureSegs(ctx, l, aw, F) {
  const segs = segsOf(l); let x = 0, asc = 0, desc = 0, w = 0;
  segs.forEach((g, i) => {
    const m = measureLine(ctx, g.text, g.accent ? aw : SPEC.weights.light, F);
    asc = Math.max(asc, m.asc); desc = Math.max(desc, m.desc);
    w = x + m.w; x += m.adv;
  });
  return { w, asc, desc };
}

// lines: [{ text, kind: "light" | "accent", segs? }]
// cfg: { bordaProt, queixoProt, limiteCorpo, topo, accentWeight }
//   bordaProt   x da borda esquerda do protagonista (cabelo/rosto); acima do queixo o texto para 45px antes dela
//   queixoProt  y do queixo; abaixo dele o texto pode entrar no corpo até limiteCorpo
//   limiteCorpo x máximo do texto nas linhas que começam abaixo do queixo (antes da camisa branca)
//   topo        y mínimo do bloco
// Geometria do bloco para um corpo F. user: { apoioScale, dx, dy }
function geom(ctx, lines, cfg, F, user = {}) {
  const aw = cfg.accentWeight || SPEC.weights.accent;
  const n = lines.length;
  const dx = user.dx || 0, dy = user.dy || 0;
  const pitch = SPEC.pitchRatio * F;
  const ms = lines.map((l) => measureSegs(ctx, l, aw, F));
  const ap = cfg.apoio;
  let FA = 0, mA = null;
  if (ap) {   // fitLast: a sub tem a mesma largura da última linha do título
    FA = (ap.fitLast ? F * ms[n - 1].w / measureLine(ctx, ap.text, ap.weight, F).w : F * ap.ratio) * (user.apoioScale || 1);
    mA = measureLine(ctx, ap.text, ap.weight, FA);
  }
  const baseSup = ap ? SPEC.bottom - mA.desc : 0;
  const supTop = ap ? baseSup - mA.asc : SPEC.bottom;
  const baseLast = ap ? supTop - ap.gap * F - ms[n - 1].desc : SPEC.bottom - ms[n - 1].desc;
  const baselines = lines.map((_, i) => baseLast - (n - 1 - i) * pitch);
  const blockTop = baselines[0] - ms[0].asc;
  const blockH = SPEC.bottom - blockTop;
  let ok = blockTop + dy >= cfg.topo - 0.01;
  const lim = (y) => (y + dy <= cfg.queixoProt ? cfg.bordaProt - 45 : cfg.limiteCorpo);
  if (ap && mA.w > lim(supTop) - SPEC.left - dx + SPEC.tol) ok = false;
  for (let i = 0; i < n && ok; i++) {
    const yTopo = blockTop + (blockH * i) / n;
    if (ms[i].w > lim(yTopo) - SPEC.left - dx + SPEC.tol) ok = false;
  }
  return { F, pitch, baselines, ms, blockTop, blockH, FA, baseSup, mA, ok, dx, dy };
}

// Encontra o MAIOR corpo que respeita as regras (rosto livre). user.headScale multiplica esse corpo (ajuste manual);
// se o ajuste manual passar das regras, devolve overflow: true para a tela avisar.
export function layout(ctx, lines, cfg, user = {}) {
  const n = lines.length;
  let auto = null;
  for (let F = SPEC.fontMax; F >= SPEC.fontMin; F -= 0.5) {
    const g = geom(ctx, lines, cfg, F, { apoioScale: 1, dx: 0, dy: 0 });
    if (g.ok) { auto = g; break; }
  }
  let chosen;
  if (!auto) {
    chosen = geom(ctx, lines, cfg, SPEC.fontMin, user);
    chosen.forced = true; chosen.autoF = SPEC.fontMin;
  } else {
    const k = user.headScale || 1;
    chosen = k === 1 && !user.apoioScale && !user.dx && !user.dy ? auto : geom(ctx, lines, cfg, auto.F * k, user);
    chosen.autoF = auto.F;
    chosen.overflow = !chosen.ok;
  }
  chosen.small = chosen.F < SPEC.warnBelow;
  return chosen;
}


// Divide a copy em linhas.
//   - Quebras manuais (Enter) são respeitadas; *marcadores* deixam em destaque o trecho, mesmo no meio da linha.
//   - Com *destaque* numa frase sem quebras, o destaque vira a última linha e o resto é dividido em até 2 linhas.
//   - Sem marcadores: testa as divisões em até 3 linhas e fica com a de maior corpo; a última linha leva a cor.
export function autoBreak(ctx, text, cfg) {
  const clean = text.replace(/\r/g, '').trim().toLocaleUpperCase('pt-BR');
  if (!clean) return [];
  const manual = clean.split('\n').map((s) => s.trim()).filter(Boolean);
  const mk = (arr) => arr.map((t, i) => ({ text: t, kind: i === arr.length - 1 ? 'accent' : 'light' }));
  if (manual.length > 1 && manual.some((t) => t.includes('*'))) {
    return manual.map((t) => {
      const segs = []; let acc = false;
      t.split('*').forEach((p) => { if (p) segs.push({ text: p, accent: acc }); acc = !acc; });
      return { text: segs.map((g) => g.text).join(''), kind: segs.every((g) => g.accent) ? 'accent' : 'light', segs };
    });
  }
  if (manual.length > 1) return mk(manual);
  const splitsOf = (words, k) => {
    const out = [];
    const rec = (st, left, a) => {
      if (left === 1) { out.push([...a, words.slice(st).join(' ')]); return; }
      for (let e = st + 1; e <= words.length - (left - 1); e++) rec(e, left - 1, [...a, words.slice(st, e).join(' ')]);
    };
    rec(0, Math.min(k, words.length), []);
    return out;
  };
  const dm = clean.match(/^(.*?)\*+([^*]+)\*+(.*)$/s);
  if (dm) {
    const pre = dm[1].trim();
    const acc = `${dm[2]}${dm[3]}`.replace(/\s+/g, ' ').trim();
    const preWords = pre ? pre.split(/\s+/) : [];
    const accLine = { text: acc, kind: 'accent' };
    if (!preWords.length) return [accLine];
    let bestC = null;
    for (const c of splitsOf(preWords, 2)) {
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
  let best = null;
  for (const sp of splitsOf(words, 3)) {
    const L = mk(sp);
    const r = layout(ctx, L, cfg);
    const lens = sp.map((x) => x.length);
    const score = r.F - (Math.max(...lens) - Math.min(...lens)) * 0.05;
    if (!best || score > best.score) best = { L, score };
  }
  return best.L;
}

export function draw(ctx, lines, r, colors, cfg) {
  const aw = cfg.accentWeight || SPEC.weights.accent;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const dx = r.dx || 0, dy = r.dy || 0;
  if (colors.titulo !== false) {
    lines.forEach((l, i) => {
      let x = SPEC.left + dx;
      for (const g of segsOf(l)) {
        const wt = g.accent ? aw : SPEC.weights.light;
        setFont(ctx, wt, r.F);
        ctx.fillStyle = g.accent ? colors.accent : '#ffffff';
        ctx.fillText(g.text, x, r.baselines[i] + dy);
        x += measureLine(ctx, g.text, wt, r.F).adv;
      }
    });
  }
  if (cfg.apoio && r.FA && colors.sub !== false) {
    setFont(ctx, cfg.apoio.weight, r.FA);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(cfg.apoio.text, SPEC.left + dx, r.baseSup + dy);
  }
}

// Nome do canal (camada própria): "Luís Ernesto" Regular + "Lacombe" Bold, canto superior esquerdo, calibrado no PSD.
export function drawCanal(ctx, texto = 'Luís Ernesto Lacombe') {
  const partes = texto.split(' ');
  const ult = partes.pop();
  const ini = partes.join(' ') + ' ';
  const F = 34;
  ctx.save();
  ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px'; ctx.fillStyle = '#ffffff';
  ctx.font = `400 ${F}px Creato`; const w1 = ctx.measureText(ini).width;
  ctx.font = `700 ${F}px Creato`; const w2 = ctx.measureText(ult).width;
  const f2 = F * (331 / (w1 + w2));   // largura medida no PSD
  ctx.font = `400 ${f2}px Creato`; ctx.fillText(ini, 121, 128);
  const w1b = ctx.measureText(ini).width;
  ctx.font = `700 ${f2}px Creato`; ctx.fillText(ult, 121 + w1b, 128);
  ctx.restore();
}

// Camada de imagem: zoom (>= 1) e deslocamento, sempre cobrindo a tela (sem mostrar borda).
export function drawImagem(ctx, img, im = {}) {
  const s = Math.max(1, im.scale || 1);
  const w = SPEC.W * s, h = SPEC.H * s;
  const x = Math.min(0, Math.max(SPEC.W - w, SPEC.W - w + (im.x || 0)));   // âncora: lado direito e topo
  const y = Math.min(0, Math.max(SPEC.H - h, im.y || 0));
  ctx.drawImage(img, x, y, w, h);
  return { s, ox: x, oy: y };
}
