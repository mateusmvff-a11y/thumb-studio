import { SPEC, loadFonts, autoBreak, layout, draw, drawCanal, drawImagem } from './engine.js';

const $ = (id) => document.getElementById(id);
const cv = $('tela');
const ctx = cv.getContext('2d');

// Estado de edição da thumb aberta: uma entrada por camada.
const state = { thumbs: [], atual: null, paletas: {}, img: null, ref: null, sel: 'titulo', ed: null };

const loadImg = (src) => new Promise((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = err; i.src = src; });
const j = (u) => fetch(u, { cache: 'no-store' }).then((r) => r.json());
const APOIO_PADRAO = { weight: 300, gap: 0.17, fitLast: true };
const escHtml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

async function init() {
  await loadFonts();
  state.paletas = await j('palettes.json');
  const ids = await j('thumbs/index.json');
  state.thumbs = await Promise.all(ids.map((id) => j(`thumbs/${id}.json`)));
  $('selThumb').innerHTML = state.thumbs.map((t) => `<option value="${t.id}">${t.titulo}</option>`).join('');
  $('selThumb').addEventListener('change', () => abrir($('selThumb').value));
  $('btnReset').addEventListener('click', () => abrir(state.atual.id));
  $('btnBaixar').addEventListener('click', baixar);
  $('chkRef').addEventListener('change', render);
  $('chkGuias').addEventListener('change', render);
  ligaArrasto();
  await abrir(state.thumbs[0].id);
}

async function abrir(id) {
  const t = state.thumbs.find((x) => x.id === id);
  state.atual = t;
  $('selThumb').value = id;
  state.img = await loadImg(t.base);
  state.ref = t.referencia ? await loadImg(t.referencia).catch(() => null) : null;
  const ap = t.layout.apoio;
  state.ed = {
    titulo: { visivel: true, texto: t.texto, escala: 1, dx: 0, dy: 0 },
    sub: { visivel: !!ap, texto: ap ? ap.text : '', escala: 1 },
    canal: { visivel: true, texto: t.canal || 'Luís Ernesto Lacombe' },
    imagem: { visivel: true, escala: 1, x: 0, y: 0 },
    destaque: t.destaque,
  };
  state.sel = 'titulo';
  camadas();
  render();
}

const NOMES = { titulo: 'Título', sub: 'Subtítulo', canal: 'Nome do canal', imagem: 'Imagem' };
const OLHO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';

function camadas() {
  const ul = $('camadas');
  ul.innerHTML = Object.keys(NOMES).map((k) => `<li class="cam ${state.sel === k ? 'sel' : ''}">
    <button type="button" class="olho" data-olho="${k}" aria-pressed="${state.ed[k].visivel}" aria-label="Mostrar ou esconder ${NOMES[k]}" ${k === 'imagem' ? 'disabled' : ''}>${OLHO}</button>
    <button type="button" class="nome" data-sel="${k}">${NOMES[k]}</button></li>`).join('');
  ul.querySelectorAll('[data-sel]').forEach((b) => b.addEventListener('click', () => { state.sel = b.dataset.sel; camadas(); }));
  ul.querySelectorAll('[data-olho]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.olho;
    state.ed[k].visivel = !state.ed[k].visivel;
    if (k === 'sub' && state.ed.sub.visivel && !state.ed.sub.texto.trim()) state.ed.sub.texto = 'SUBTÍTULO AQUI';
    camadas(); render();
  }));
  props();
}

const slider = (id, rot, min, max, val) => `<label class="campo"><span>${rot} <b id="${id}V">${val}%</b></span><input id="${id}" type="range" min="${min}" max="${max}" value="${val}"></label>`;
const setas = (a, b, c, d) => `<div class="setas"><button type="button" class="btn btn-2" data-mv="${a[0]}" aria-label="${a[1]}">${a[1]}</button><button type="button" class="btn btn-2" data-mv="${b[0]}" aria-label="${b[1]}">${b[1]}</button><button type="button" class="btn btn-2" data-mv="${c[0]}" aria-label="${c[1]}">${c[1]}</button><button type="button" class="btn btn-2" data-mv="${d[0]}" aria-label="${d[1]}">${d[1]}</button></div>`;

function props() {
  const k = state.sel, e = state.ed[k], box = $('props');
  const ligaEsc = () => $('pEsc').addEventListener('input', () => { e.escala = $('pEsc').value / 100; $('pEscV').textContent = $('pEsc').value + '%'; render(); });
  const ligaMv = (fn) => box.querySelectorAll('[data-mv]').forEach((b) => b.addEventListener('click', () => { const [dx, dy] = b.dataset.mv.split(',').map(Number); fn(dx, dy); render(); }));
  if (k === 'titulo') {
    box.innerHTML = `<label class="campo"><span>Texto do título</span><textarea id="pTexto" rows="3" spellcheck="false">${escHtml(e.texto)}</textarea>
      <small>A quebra em linhas é automática. Para escolher o destaque coloque asteriscos: <b>A CAMPANHA *DO AMOR*</b></small></label>
      ${slider('pEsc', 'Tamanho (100% = automático)', 60, 140, Math.round(e.escala * 100))}
      <div class="campo"><span>Mover o bloco</span>${setas(['0,-10', '↑'], ['-10,0', '←'], ['10,0', '→'], ['0,10', '↓'])}</div>
      <div class="campo"><span>Cor do destaque</span><div id="paleta" class="paleta"></div></div>
      <button type="button" class="btn btn-2" id="pAuto">Voltar ao automático</button>`;
    let deb; $('pTexto').addEventListener('input', () => { e.texto = $('pTexto').value; clearTimeout(deb); deb = setTimeout(render, 90); });
    ligaEsc(); ligaMv((dx, dy) => { e.dx += dx; e.dy += dy; });
    $('pAuto').addEventListener('click', () => { e.escala = 1; e.dx = 0; e.dy = 0; props(); render(); });
    paleta();
  } else if (k === 'sub') {
    box.innerHTML = `<label class="campo"><span>Texto do subtítulo</span><input id="pTexto" type="text" value="${escHtml(e.texto)}" maxlength="80" placeholder="Sem subtítulo: deixe desligado"></label>
      <small>Por padrão a linha termina onde termina a última linha do título.</small>
      ${slider('pEsc', 'Tamanho (100% = igual à última linha)', 60, 150, Math.round(e.escala * 100))}`;
    $('pTexto').addEventListener('input', () => { e.texto = $('pTexto').value.toLocaleUpperCase('pt-BR'); e.visivel = !!e.texto.trim(); olhos(); render(); });
    ligaEsc();
  } else if (k === 'canal') {
    box.innerHTML = `<label class="campo"><span>Nome do canal</span><input id="pTexto" type="text" value="${escHtml(e.texto)}" maxlength="40"></label>`;
    $('pTexto').addEventListener('input', () => { e.texto = $('pTexto').value; render(); });
  } else {
    box.innerHTML = `${slider('pEsc', 'Zoom da imagem', 100, 180, Math.round(e.escala * 100))}
      <div class="campo"><span>Mover a imagem</span>${setas(['0,20', '↓'], ['40,0', '→'], ['-40,0', '←'], ['0,-20', '↑'])}
      <small>Ou arraste a imagem na tela. O texto se reorganiza sozinho para não cobrir os rostos.</small></div>
      <button type="button" class="btn btn-2" id="pAuto">Voltar ao enquadramento original</button>`;
    ligaEsc(); ligaMv((dx, dy) => { e.x += dx; e.y += dy; });
    $('pAuto').addEventListener('click', () => { e.escala = 1; e.x = 0; e.y = 0; props(); render(); });
  }
}
function olhos() { document.querySelectorAll('#camadas .olho').forEach((b) => b.setAttribute('aria-pressed', String(state.ed[b.dataset.olho].visivel))); }

function paleta() {
  const box = $('paleta'); if (!box) return;
  box.innerHTML = '';
  for (const c of state.paletas[state.atual.padrao] || []) {
    const b = document.createElement('button');
    b.className = 'sw'; b.type = 'button'; b.title = c.nome; b.style.background = c.hex;
    b.setAttribute('aria-label', c.nome);
    b.setAttribute('aria-pressed', String(c.hex.toLowerCase() === state.ed.destaque.toLowerCase()));
    b.addEventListener('click', () => { state.ed.destaque = c.hex; paleta(); render(); });
    box.appendChild(b);
  }
}

// Diagramação já transformada pelo zoom e posição da imagem (os rostos mudam de lugar junto com ela).
function cfgAtual() {
  const L = state.atual.layout, ed = state.ed;
  const mostrarRef = $('chkRef').checked && state.ref;
  let tr = { s: 1, ox: 0, oy: 0 };
  if (mostrarRef) ctx.drawImage(state.ref, 0, 0, SPEC.W, SPEC.H);
  else tr = drawImagem(ctx, state.img, ed.imagem);
  const cfg = { ...L, bordaProt: L.bordaProt * tr.s + tr.ox, queixoProt: L.queixoProt * tr.s + tr.oy, limiteCorpo: Math.min(1900, L.limiteCorpo * tr.s + tr.ox) };
  if (ed.sub.visivel && ed.sub.texto.trim()) cfg.apoio = { ...APOIO_PADRAO, ...(L.apoio || {}), text: ed.sub.texto.trim() };
  else delete cfg.apoio;
  return { cfg, mostrarRef };
}

function render() {
  const t = state.atual; if (!t) return;
  ctx.clearRect(0, 0, SPEC.W, SPEC.H);
  ctx.fillStyle = '#050810'; ctx.fillRect(0, 0, SPEC.W, SPEC.H);
  const ed = state.ed;
  const { cfg, mostrarRef } = cfgAtual();
  const linhas = autoBreak(ctx, ed.titulo.texto, cfg);
  let r = null;
  if (linhas.length) {
    r = layout(ctx, linhas, cfg, { headScale: ed.titulo.escala, apoioScale: ed.sub.escala, dx: ed.titulo.dx, dy: ed.titulo.dy });
    if (!mostrarRef) draw(ctx, linhas, r, { accent: ed.destaque, titulo: ed.titulo.visivel, sub: ed.sub.visivel }, cfg);
  }
  if (ed.canal.visivel && !mostrarRef) drawCanal(ctx, ed.canal.texto);
  if ($('chkGuias').checked) guias(cfg);

  $('infoPadrao').textContent = t.padrao === 'live' ? 'Live' : 'Thumbnail';
  $('infoCorpo').textContent = r ? `${Math.round(r.F)} px${r.autoF && Math.abs(r.F - r.autoF) > 1 ? ` (automático: ${Math.round(r.autoF)})` : ''}` : '—';
  $('infoLinhas').textContent = linhas.length ? linhas.map((l) => l.text).join(' / ') : '—';
  const av = $('aviso');
  if (r && r.forced) { av.hidden = false; av.textContent = 'Esse texto não cabe nas regras da thumb. Encurte a frase.'; }
  else if (r && r.overflow) { av.hidden = false; av.textContent = 'O texto passou da área livre e pode cobrir um rosto. Diminua o tamanho ou volte ao automático.'; }
  else if (r && r.small) { av.hidden = false; av.textContent = 'O texto ficou pequeno para ler no celular. Tente uma frase mais curta (até 3 palavras por linha).'; }
  else av.hidden = true;
}

function guias(cfg) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0,200,255,.9)'; ctx.fillStyle = 'rgba(0,200,255,.12)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
  ctx.fillRect(cfg.bordaProt - 45, 0, SPEC.W - (cfg.bordaProt - 45), cfg.queixoProt);
  ctx.strokeRect(cfg.bordaProt - 45, 0, SPEC.W - (cfg.bordaProt - 45), cfg.queixoProt);
  ctx.strokeStyle = 'rgba(255,200,0,.9)';
  ctx.beginPath(); ctx.moveTo(cfg.limiteCorpo, cfg.queixoProt); ctx.lineTo(cfg.limiteCorpo, SPEC.H); ctx.stroke();
  ctx.restore();
}

// Arrastar a imagem na tela (só com a camada Imagem selecionada).
function ligaArrasto() {
  let ini = null;
  cv.addEventListener('pointerdown', (e) => {
    if (state.sel !== 'imagem') return;
    ini = { x: e.clientX, y: e.clientY, ox: state.ed.imagem.x, oy: state.ed.imagem.y };
    cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing';
  });
  cv.addEventListener('pointermove', (e) => {
    if (!ini) return;
    const k = SPEC.W / cv.getBoundingClientRect().width;
    state.ed.imagem.x = ini.ox + (e.clientX - ini.x) * k; state.ed.imagem.y = ini.oy + (e.clientY - ini.y) * k; render();
  });
  const fim = () => { ini = null; cv.style.cursor = ''; };
  cv.addEventListener('pointerup', fim); cv.addEventListener('pointercancel', fim);
}

function baixar() {
  const d = new Date(); const pad = (n) => String(n).padStart(2, '0');
  const data = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const slug = state.ed.titulo.texto.replace(/\*/g, '').replace(/\s+/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, '').trim().toLowerCase();
  const nome = `${data} [C] ${slug.charAt(0).toUpperCase() + slug.slice(1)}_THUMB.jpg`;
  const guiasOn = $('chkGuias').checked, ref = $('chkRef').checked;
  $('chkGuias').checked = false; $('chkRef').checked = false; render();
  cv.toBlob((b) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nome; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    $('chkGuias').checked = guiasOn; $('chkRef').checked = ref; render();
  }, 'image/jpeg', 0.95);
}

init().catch((e) => { console.error(e); document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f88;padding:20px">${e}</pre>`); });

// ---- Pedido de nova imagem ----
const CFG = window.THUMB_CFG || {};
const LS = 'ts_pedidos';
const lerLS = () => { try { return JSON.parse(localStorage.getItem(LS) || '[]'); } catch { return []; } };
const gravaLS = (v) => { try { localStorage.setItem(LS, JSON.stringify(v.slice(0, 30))); } catch { /* sem armazenamento: segue sem lembrar */ } };
const ROTULO = { novo: 'Recebido', em_criacao: 'Em criação', pronto: 'Pronto', cancelado: 'Cancelado' };
const ETAPA_PADRAO = { novo: [10, 'Pedido recebido, aguardando o estúdio'], em_criacao: [25, 'Em criação'], pronto: [100, 'Pronta'] };

async function api(corpo) {
  const r = await fetch(CFG.pedidos, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || 'falha no envio');
  return j;
}

// Reduz a foto no navegador (até 1600 px, JPEG) para o pedido ficar leve.
function reduz(file) {
  return new Promise((ok, err) => {
    const url = URL.createObjectURL(file); const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1600 / Math.max(im.width, im.height));
      const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      ok({ nome: file.name, tipo: 'image/jpeg', dados: c.toDataURL('image/jpeg', 0.85) });
    };
    im.onerror = () => { URL.revokeObjectURL(url); err(new Error('não consegui ler a foto ' + file.name)); };
    im.src = url;
  });
}

function textoDoPedido() {
  const fotos = [...($('pdFotos').files || [])].map((f) => f.name);
  return [
    `NOVA THUMB, padrão ${$('pdPadrao').value === 'live' ? 'LIVE (convidados em cor, destaque dourado)' : 'THUMBNAIL (P&B, destaque vermelho)'}`,
    `Pedido por: ${$('pdNome').value.trim() || '(não informado)'}`,
    `Descrição da imagem: ${$('pdDescricao').value.trim() || '(a definir)'}`,
    `Em evidência: ${$('pdPessoas').value.trim() || '(a definir)'}`,
    `Texto da thumb: ${$('pdCopy').value.trim() || '(sugerir 3 opções)'}`,
    `Fotos anexadas: ${fotos.length ? fotos.join(', ') : 'não, buscar na internet'}`,
  ].join('\n');
}

function mensagem(html, tipo) { const m = $('pdMsg'); m.hidden = !html; m.className = 'msg ' + (tipo || ''); m.innerHTML = html || ''; }
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

$('formPedido').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('btnPedido');
  if (!CFG.pedidos) { mensagem('O envio ainda não está ligado. <button type="button" class="linklike" id="lkCopiar">Copiar o texto do pedido</button>', 'erro'); ligaCopiar(); return; }
  btn.disabled = true; btn.textContent = 'Enviando…'; mensagem('');
  try {
    const arquivos = [...($('pdFotos').files || [])].slice(0, 3);
    const fotos = await Promise.all(arquivos.map(reduz));
    const corpo = { acao: 'novo', solicitante: $('pdNome').value, padrao: $('pdPadrao').value, descricao: $('pdDescricao').value,
      pessoas: $('pdPessoas').value, copy: $('pdCopy').value, fotos, site: $('pdSite').value };
    const j = await api(corpo);
    const lista = lerLS(); lista.unshift({ codigo: j.codigo, descricao: corpo.descricao.trim(), padrao: corpo.padrao, status: 'novo' }); gravaLS(lista);
    mensagem(`Pedido enviado. Seu código é <span class="cod">${esc(j.codigo)}</span>. Acompanhe em "Meus pedidos" aqui embaixo.`, 'ok');
    $('formPedido').reset(); mostraPedidos();
  } catch (err) {
    mensagem(`Não consegui enviar agora (${esc(err.message)}). <button type="button" class="linklike" id="lkCopiar">Copiar o texto do pedido</button> para mandar por outro canal.`, 'erro');
    ligaCopiar();
  } finally { btn.disabled = false; btn.textContent = 'Enviar pedido'; }
});
function ligaCopiar() {
  const b = $('lkCopiar'); if (!b) return;
  b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(textoDoPedido()); b.textContent = 'Copiado'; } catch { b.textContent = 'Não foi possível copiar'; } });
}

function barra(p) {
  if (p.status === 'cancelado') return '';
  const pad = ETAPA_PADRAO[p.status] || [10, ''];
  const pct = p.status === 'pronto' ? 100 : Math.max(0, Math.min(100, Number.isFinite(+p.progresso) ? +p.progresso : pad[0]));
  const et = p.etapa || pad[1];
  return `<div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Andamento do pedido">
      <div class="prog-top"><span>${esc(et)}</span><b>${pct}%</b></div>
      <div class="prog-trilho"><div class="prog-fill ${p.status === 'pronto' ? 'ok' : ''}" style="width:${pct}%"></div></div>
    </div>`;
}

function mostraPedidos() {
  const lista = lerLS(); const box = $('meusPedidos'); box.hidden = !lista.length;
  $('listaPedidos').innerHTML = lista.map((p) => `<li data-cod="${esc(p.codigo)}">
    <div class="t">${esc(p.descricao)}</div>
    ${barra(p)}
    <div class="m"><span>Código ${esc(p.codigo)} · ${p.padrao === 'live' ? 'Live' : 'Thumbnail'}</span><span class="badge ${esc(p.status)}">${ROTULO[p.status] || esc(p.status)}</span></div>
    ${p.nota ? `<div class="nota">${esc(p.nota)}</div>` : ''}
    ${p.status === 'pronto' && p.thumb_id ? `<button type="button" class="btn btn-2 abrir" data-thumb="${esc(p.thumb_id)}">Abrir a thumb</button>` : ''}
  </li>`).join('');
  $('listaPedidos').querySelectorAll('.abrir').forEach((b) => b.addEventListener('click', () => abrirPronta(b.dataset.thumb)));
}

async function abrirPronta(id) {
  if (!state.thumbs.find((t) => t.id === id)) {
    const t = await j(`thumbs/${id}.json`);
    state.thumbs.push(t);
    $('selThumb').insertAdjacentHTML('beforeend', `<option value="${esc(t.id)}">${esc(t.titulo)}</option>`);
  }
  await abrir(id);
}

async function atualizaPedidos() {
  const lista = lerLS(); if (!CFG.pedidos || !lista.length) { mostraPedidos(); return; }
  try {
    const r = await api({ acao: 'status', codigos: lista.map((p) => p.codigo) });
    const por = Object.fromEntries((r.pedidos || []).map((p) => [p.codigo, p]));
    gravaLS(lista.map((p) => ({ ...p, ...(por[p.codigo] ? { status: por[p.codigo].status, progresso: por[p.codigo].progresso, etapa: por[p.codigo].etapa, thumb_id: por[p.codigo].thumb_id, nota: por[p.codigo].nota } : {}) })));
  } catch { /* sem rede: mostra o que já sabe */ }
  mostraPedidos();
}
mostraPedidos(); atualizaPedidos();
setInterval(() => { if (!document.hidden && lerLS().some((p) => p.status === 'novo' || p.status === 'em_criacao')) atualizaPedidos(); }, 20000);

// ---- Passo a passo guiado (mesmo componente do portal do Franzé Studio) ----
const GUIA_CHAVE = "ts-tour-v1";
function iniciaGuia(forcar) {
  if (!window.FZTour) return;
  $("pedido").open = true;
  state.sel = "titulo"; camadas();
  const P = [
    { alvo: null, largo: true, titulo: "Bem-vindo ao Thumb Studio", texto: "Aqui você pede a imagem de uma thumb, acompanha o andamento e ajusta o texto quando ela fica pronta. São poucos passos, cada um mostra o que clicar." },
    { alvo: "#pedido", titulo: "Comece pelo pedido", texto: "Tudo começa em “Pedir uma nova imagem”. É este bloco que você preenche para o estúdio criar a imagem." },
    { alvo: "#pdPadrao", titulo: "Escolha o padrão", texto: "Thumbnail é preto e branco com destaque vermelho. Live tem os convidados em cor e destaque dourado." },
    { alvo: "#pdDescricao", titulo: "Descreva em uma linha", texto: "Diga o que a imagem mostra. Exemplo: Lula e Flávio Bolsonaro frente a frente, com o STF ao fundo." },
    { alvo: "#pdPessoas", titulo: "Quem fica em evidência", texto: "Escreva os nomes. A primeira pessoa é a principal e aparece maior." },
    { alvo: "#pdFotos", titulo: "Foto é opcional", texto: "Anexe uma foto só se não houver uma boa na internet. Pode mandar até 3." },
    { alvo: "#btnPedido", titulo: "Envie o pedido", texto: "Ao enviar, você recebe um código de 8 letras e o estúdio é avisado na hora. Guarde o código." },
    { alvo: null, titulo: "Acompanhe o andamento", texto: "Depois do envio aparece “Meus pedidos”, com uma barra de porcentagem: recebido, gerando a imagem, tratando, pronto. Quando chegar a 100%, aparece o botão “Abrir a thumb”." },
    { alvo: "#camadas", titulo: "As camadas", texto: "A thumb é feita de camadas: Título, Subtítulo, Nome do canal e Imagem. O olho mostra ou esconde. Clique no nome para editar." },
    { alvo: "#props", titulo: "Ajuste a camada escolhida", texto: "No Título: troque o texto, o tamanho, a posição e a cor do destaque. Em Imagem: zoom e mover. O texto se reorganiza sozinho para não cobrir os rostos." },
    { alvo: ".moldura", titulo: "A prévia é o resultado", texto: "O que você vê aqui é exatamente o que será baixado. Marque “Mostrar áreas livres” para ver onde o texto não pode entrar." },
    { alvo: "#btnBaixar", titulo: "Baixe o JPG", texto: "O arquivo sai em 1920×1080, com o nome no padrão do estúdio. Para desfazer tudo, use “Voltar ao original”." },
    { alvo: "#btnTour", titulo: "Para rever", texto: "Clique em “Passo a passo” quando quiser ver isto de novo. O “Guia completo” explica cada detalhe." },
  ];
  FZTour.iniciar({
    passos: P, chave: GUIA_CHAVE, forcar,
    rotulos: { de: "de", proximo: "Próximo", voltar: "Voltar", pular: "Pular", fim: "Entendi", idioma: "Idioma" },
    aoFim: () => { $("pedido").open = false; },
  });
  if (!document.querySelector(".fzt-veu")) $("pedido").open = false;
}
$("btnTour").addEventListener("click", () => iniciaGuia(true));
setTimeout(() => iniciaGuia(false), 900);

window.__ts = { render, state };
