import { SPEC, loadFonts, autoBreak, layout, draw } from './engine.js';

const $ = (id) => document.getElementById(id);
const cv = $('tela');
const ctx = cv.getContext('2d');

const state = { thumbs: [], atual: null, paletas: {}, texto: '', destaque: '#940000', img: null, ref: null };

const loadImg = (src) => new Promise((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = err; i.src = src; });
const j = (u) => fetch(u, { cache: 'no-store' }).then((r) => r.json());

async function init() {
  await loadFonts();
  state.paletas = await j('palettes.json');
  const ids = await j('thumbs/index.json');
  state.thumbs = await Promise.all(ids.map((id) => j(`thumbs/${id}.json`)));
  $('selThumb').innerHTML = state.thumbs.map((t) => `<option value="${t.id}">${t.titulo}</option>`).join('');
  $('selThumb').addEventListener('change', () => abrir($('selThumb').value));
  let deb; $('txtCopy').addEventListener('input', () => { state.texto = $('txtCopy').value; clearTimeout(deb); deb = setTimeout(render, 90); });
  $('btnReset').addEventListener('click', () => abrir(state.atual.id));
  $('btnBaixar').addEventListener('click', baixar);
  $('chkRef').addEventListener('change', render);
  $('chkGuias').addEventListener('change', render);
  await abrir(state.thumbs[0].id);
}

async function abrir(id) {
  const t = state.thumbs.find((x) => x.id === id);
  state.atual = t;
  $('selThumb').value = id;
  state.img = await loadImg(t.base);
  state.ref = t.referencia ? await loadImg(t.referencia).catch(() => null) : null;
  state.texto = t.texto;
  state.destaque = t.destaque;
  $('txtCopy').value = t.texto;
  paleta();
  render();
}

function paleta() {
  const box = $('paleta');
  box.innerHTML = '';
  for (const c of state.paletas[state.atual.padrao] || []) {
    const b = document.createElement('button');
    b.className = 'sw'; b.type = 'button'; b.title = c.nome; b.style.background = c.hex;
    b.setAttribute('aria-label', c.nome);
    b.setAttribute('aria-pressed', String(c.hex.toLowerCase() === state.destaque.toLowerCase()));
    b.addEventListener('click', () => { state.destaque = c.hex; paleta(); render(); });
    box.appendChild(b);
  }
}

function render() {
  const t = state.atual; if (!t) return;
  ctx.clearRect(0, 0, SPEC.W, SPEC.H);
  const mostrarRef = $('chkRef').checked && state.ref;
  ctx.drawImage(mostrarRef ? state.ref : state.img, 0, 0, SPEC.W, SPEC.H);

  const linhas = autoBreak(ctx, state.texto, t.layout);
  let r = null;
  if (linhas.length) {
    r = layout(ctx, linhas, t.layout);
    if (!mostrarRef) draw(ctx, linhas, r, { accent: state.destaque }, t.layout);
  }
  if ($('chkGuias').checked) guias(t.layout);

  $('infoPadrao').textContent = t.padrao === 'live' ? 'Live' : 'Thumbnail';
  $('infoCorpo').textContent = r ? `${Math.round(r.F)} px` : '—';
  $('infoLinhas').textContent = linhas.length ? linhas.map((l) => l.text).join(' / ') : '—';
  const av = $('aviso');
  if (r && r.forced) { av.hidden = false; av.textContent = 'Esse texto não cabe nas regras da thumb. Encurte a frase.'; }
  else if (r && r.small) { av.hidden = false; av.textContent = 'O texto ficou pequeno para ler no celular. Tente uma frase mais curta (até 3 palavras por linha).'; }
  else av.hidden = true;
}

function guias(cfg) {
  ctx.save();
  ctx.strokeStyle = 'rgba(0,200,255,.9)'; ctx.fillStyle = 'rgba(0,200,255,.12)'; ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
  ctx.fillRect(cfg.bordaProt - 45, 0, SPEC.W - (cfg.bordaProt - 45), cfg.queixoProt);          // rosto: sem texto
  ctx.strokeRect(cfg.bordaProt - 45, 0, SPEC.W - (cfg.bordaProt - 45), cfg.queixoProt);
  ctx.strokeStyle = 'rgba(255,200,0,.9)';
  ctx.beginPath(); ctx.moveTo(cfg.limiteCorpo, cfg.queixoProt); ctx.lineTo(cfg.limiteCorpo, SPEC.H); ctx.stroke(); // limite no corpo
  ctx.restore();
}

function baixar() {
  const t = state.atual;
  const d = new Date(); const pad = (n) => String(n).padStart(2, '0');
  const data = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const slug = state.texto.replace(/\s+/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\s-]/g, '').trim().toLowerCase();
  const nome = `${data} [C] ${slug.charAt(0).toUpperCase() + slug.slice(1)}_THUMB${t.padrao === 'live' ? '' : ''}.jpg`;
  const guias = $('chkGuias').checked, ref = $('chkRef').checked;
  $('chkGuias').checked = false; $('chkRef').checked = false; render();
  cv.toBlob((b) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nome; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    $('chkGuias').checked = guias; $('chkRef').checked = ref; render();
  }, 'image/jpeg', 0.95);
}

init().catch((e) => { console.error(e); document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f88;padding:20px">${e}</pre>`); });
window.__ts = { render, state };

// ---- Pedido de nova imagem (briefing) ----
function montaPedido() {
  const nomePadrao = $('pdPadrao').value === 'live' ? 'LIVE (convidados em cor, destaque dourado)' : 'THUMBNAIL (P&B, destaque vermelho)';
  const fotos = [...($('pdFotos').files || [])].map((f) => f.name);
  const linhas = [
    `NOVA THUMB, padrão ${nomePadrao}`,
    `Descrição da imagem: ${$('pdDescricao').value.trim() || '(a definir)'}`,
    `Em evidência: ${$('pdPessoas').value.trim() || '(a definir)'}`,
    `Texto da thumb: ${$('pdCopy').value.trim() || '(sugerir 3 opções)'}`,
    `Fotos anexadas: ${fotos.length ? fotos.join(', ') : 'não, buscar no Google'}`,
  ];
  return linhas.join('\n');
}
function atualizaPedido() { $('pdPreview').textContent = montaPedido(); $('pdMsg').hidden = true; }
['pdPadrao', 'pdDescricao', 'pdPessoas', 'pdCopy', 'pdFotos'].forEach((id) => $(id).addEventListener('input', atualizaPedido));
$('pdPadrao').addEventListener('change', atualizaPedido);
$('btnPedido').addEventListener('click', async () => {
  const t = montaPedido();
  try { await navigator.clipboard.writeText(t); $('pdMsg').hidden = false; }
  catch { $('pdPreview').textContent = t; }
});
atualizaPedido();
