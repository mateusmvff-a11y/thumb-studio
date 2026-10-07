/*
 * Tour de boas-vindas com area de foco.
 *
 * A tela escurece, e um recorte iluminado passeia pelos blocos que
 * importam, com um cartao explicando cada um. O recorte e um div com uma
 * sombra de 200vmax: a sombra e o escuro, o div e o buraco. Um div por
 * cima de tudo segura os cliques, para a pessoa nao sair apertando botao
 * no meio da explicacao.
 *
 * Uso: FZTour.iniciar({ passos, rotulos, chave, forcar, idiomas })
 *   passos:  [{ alvo: '#seletor' | null, titulo, texto, visual, largo }].
 *            Passo sem alvo vira um cartao no meio da tela; alvo que nao
 *            existe ou esta escondido e pulado. Se o seletor acha varios,
 *            vale o primeiro a vista (barra do computador ou do celular). visual e um desenho (SVG) acima do titulo, escrito no
 *            codigo e nunca vindo do usuario; largo abre o cartao mais.
 *   rotulos: { proximo, voltar, pular, fim, de, idioma }
 *   chave:   onde fica guardado que a pessoa ja viu (localStorage)
 *   forcar:  mostra mesmo que ja tenha visto
 *   idiomas: { atual: 'pt', lista: ['en','pt','es'], aoTrocar(l) } poe a
 *            lingua no primeiro cartao: se o portal errou a lingua, a
 *            pessoa troca ali mesmo, antes de comecar.
 */
(function () {
  var CSS =
    /* cores em variaveis, para o modo escuro (o tema.js poe data-theme no <html>) */
    '.fzt-cartao{--fzt-ink:#0e0e0e;--fzt-papel:#fff;--fzt-dim:#6f6f6b;--fzt-txt:#3d3d38;--fzt-hover:#3a3d3c;--fzt-borda:#c9c9c3;--fzt-ponto:#e4e5e0;--fzt-sobre:#fff;' +
      '--fzt-suave:#f1f2ee;--fzt-linha:#d9dad4;--fzt-escuro:#0e0e0e;--fzt-destaque:#b86a1b}' +
    '[data-theme="dark"] .fzt-cartao{--fzt-ink:#eef0ec;--fzt-papel:#1d211f;--fzt-dim:#9fa49c;--fzt-txt:#d6dad3;--fzt-hover:#cfd3cc;--fzt-borda:#3a3f3b;--fzt-ponto:#3a3f3b;--fzt-sobre:#111312;' +
      '--fzt-suave:#262a28;--fzt-linha:#3a3f3b;--fzt-escuro:#2c312e;--fzt-destaque:#e8a862}' +
    '.fzt-veu{position:fixed;inset:0;z-index:9000;background:transparent}' +
    '.fzt-foco{position:fixed;z-index:9001;border-radius:16px;pointer-events:none;' +
      'box-shadow:0 0 0 200vmax rgba(12,13,12,.74);transition:top .45s cubic-bezier(.22,1,.36,1),left .45s cubic-bezier(.22,1,.36,1),width .45s cubic-bezier(.22,1,.36,1),height .45s cubic-bezier(.22,1,.36,1)}' +
    '.fzt-foco.meio{box-shadow:0 0 0 200vmax rgba(12,13,12,.74)}' +
    '.fzt-cartao{position:fixed;z-index:9002;width:min(360px,calc(100vw - 32px));background:var(--fzt-papel);color:var(--fzt-ink);border-radius:16px;' +
      'padding:22px 22px 18px;box-shadow:0 24px 60px rgba(0,0,0,.28);font-family:"Hanken Grotesk",system-ui,sans-serif;' +
      'transition:top .45s cubic-bezier(.22,1,.36,1),left .45s cubic-bezier(.22,1,.36,1),opacity .25s}' +
    '.fzt-cartao .c{font-size:13px;color:var(--fzt-dim);margin-bottom:8px}' +
    '.fzt-cartao h3{font-family:"Bricolage Grotesque",sans-serif;font-weight:500;font-size:1.3rem;letter-spacing:-.015em;line-height:1.2;margin:0 0 8px}' +
    '.fzt-cartao p{margin:0;font-size:15.5px;line-height:1.55;color:var(--fzt-txt)}' +
    '.fzt-acoes{display:flex;align-items:center;gap:8px;margin-top:18px}' +
    '.fzt-acoes .pular{margin-right:auto;background:none;border:0;padding:6px 0;font:inherit;font-size:14px;color:var(--fzt-dim);cursor:pointer}' +
    '.fzt-acoes .pular:hover{color:var(--fzt-ink)}' +
    '.fzt-b{font:inherit;font-size:14.5px;font-weight:600;border-radius:40px;padding:10px 18px;cursor:pointer;border:1px solid var(--fzt-ink);' +
      'transition:background .25s,color .25s}' +
    '.fzt-b.p{background:var(--fzt-ink);color:var(--fzt-sobre)}.fzt-b.p:hover{background:var(--fzt-hover);border-color:var(--fzt-hover)}' +
    '.fzt-b.s{background:var(--fzt-papel);color:var(--fzt-ink);border-color:var(--fzt-borda)}.fzt-b.s:hover{border-color:var(--fzt-ink)}' +
    '.fzt-cartao.largo{width:min(440px,calc(100vw - 32px))}' +
    /* o desenho do passo: um icone num quadrado suave, ou uma ilustracao
       inteira; as cores vem das variaveis, entao seguem o claro e o escuro */
    '.fzt-visual{margin:0 0 14px}.fzt-visual svg{display:block;max-width:100%;height:auto}' +
    '.fzt-visual .s{fill:var(--fzt-suave)}.fzt-visual .l{fill:var(--fzt-linha)}.fzt-visual .k{fill:var(--fzt-ink)}' +
    '.fzt-visual .e{fill:var(--fzt-escuro)}.fzt-visual .d{fill:var(--fzt-destaque)}.fzt-visual .p{fill:var(--fzt-papel)}' +
    '.fzt-visual .cl{fill:#eef0ec;opacity:.85}.fzt-visual .cl2{fill:#eef0ec;opacity:.4}' +
    '.fzt-ico{width:46px;height:46px;border-radius:14px;background:var(--fzt-suave);display:grid;place-items:center}' +
    '.fzt-ico svg{width:22px;height:22px;fill:none;stroke:var(--fzt-ink);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}' +
    /* a lingua no primeiro cartao, do lado do "1 de 8", discreta como a do portal */
    '.fzt-cartao .c.com-linguas{display:flex;justify-content:space-between;align-items:center;gap:10px}' +
    '.fzt-linguas{display:flex;gap:2px;margin:-4px -6px -4px 0}' +
    '.fzt-linguas button{background:none;border:1px solid transparent;border-radius:40px;padding:4px 8px;font:inherit;font-size:12.5px;color:var(--fzt-dim);cursor:pointer;transition:color .25s}' +
    '.fzt-linguas button:hover{color:var(--fzt-ink)}' +
    '.fzt-linguas button[aria-pressed="true"]{color:var(--fzt-ink);border-color:var(--fzt-borda);cursor:default}' +
    '.fzt-pontos{display:flex;gap:5px;margin-top:14px}.fzt-pontos i{width:6px;height:6px;border-radius:50%;background:var(--fzt-ponto)}' +
    '.fzt-pontos i.on{background:var(--fzt-ink)}' +
    '@media (prefers-reduced-motion:reduce){.fzt-foco,.fzt-cartao{transition:none}}';

  function visivel(el) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  }
  // o primeiro que aparece na tela: o mesmo botao pode existir na barra
  // do computador e na do celular, e so um deles esta a vista
  function achar(sel) {
    var els = document.querySelectorAll(sel);
    for (var k = 0; k < els.length; k++) if (visivel(els[k])) return els[k];
    return null;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function iniciar(op) {
    try { if (!op.forcar && op.chave && localStorage.getItem(op.chave)) return; } catch (e) {}
    if (document.querySelector('.fzt-veu')) return;
    if (!document.getElementById('fzt-css')) {
      var st = document.createElement('style'); st.id = 'fzt-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    // so os passos cujo alvo existe e aparece; os sem alvo ficam
    var passos = op.passos.filter(function (p) { return !p.alvo || achar(p.alvo); });
    if (!passos.length) return;
    var R = op.rotulos, i = 0, alvo = null;

    var veu = document.createElement('div'); veu.className = 'fzt-veu';
    var foco = document.createElement('div'); foco.className = 'fzt-foco';
    var cart = document.createElement('div'); cart.className = 'fzt-cartao';
    cart.setAttribute('role', 'dialog'); cart.setAttribute('aria-modal', 'true');
    document.body.append(veu, foco, cart);
    var rolagemAntes = document.documentElement.style.overflow;

    function posicionar() {
      var folga = 10, vw = innerWidth, vh = innerHeight;
      if (alvo) {
        var r = alvo.getBoundingClientRect();
        foco.classList.remove('meio');
        foco.style.top = (r.top - folga) + 'px'; foco.style.left = (r.left - folga) + 'px';
        foco.style.width = (r.width + folga * 2) + 'px'; foco.style.height = (r.height + folga * 2) + 'px';
        var ch = cart.offsetHeight, cw = cart.offsetWidth, top;
        // abaixo do alvo se couber, senao acima, senao por cima do fim dele
        if (r.bottom + folga + 14 + ch < vh) top = r.bottom + folga + 14;
        else if (r.top - folga - 14 - ch > 0) top = r.top - folga - 14 - ch;
        else top = Math.max(16, vh - ch - 16);
        var left = Math.min(Math.max(16, r.left), vw - cw - 16);
        cart.style.top = top + 'px'; cart.style.left = left + 'px';
      } else {
        // sem alvo: o recorte encolhe no meio da tela e o cartao fica ali
        foco.classList.add('meio');
        foco.style.top = vh / 2 + 'px'; foco.style.left = vw / 2 + 'px'; foco.style.width = '0px'; foco.style.height = '0px';
        cart.style.top = Math.max(16, (vh - cart.offsetHeight) / 2) + 'px';
        cart.style.left = (vw - cart.offsetWidth) / 2 + 'px';
      }
    }

    function mostrar() {
      var p = passos[i];
      alvo = p.alvo ? achar(p.alvo) : null;
      var ultimo = i === passos.length - 1;
      var L = i === 0 && op.idiomas;
      cart.classList.toggle('largo', !!p.largo);
      cart.innerHTML =
        (p.visual ? '<div class="fzt-visual">' + p.visual + '</div>' : '') +
        '<div class="c' + (L ? ' com-linguas' : '') + '"><span>' + (i + 1) + ' ' + esc(R.de) + ' ' + passos.length + '</span>' +
          (L ? '<span class="fzt-linguas" role="group" aria-label="' + esc(R.idioma || 'Language') + '">' +
            (L.lista || ['en', 'pt', 'es']).map(function (l) {
              return '<button type="button" data-l="' + esc(l) + '" aria-pressed="' + (l === L.atual) + '">' + esc(l.toUpperCase()) + '</button>';
            }).join('') + '</span>' : '') + '</div>' +
        '<h3>' + esc(p.titulo) + '</h3><p>' + esc(p.texto) + '</p>' +
        '<div class="fzt-acoes">' + (ultimo ? '' : '<button class="pular">' + esc(R.pular) + '</button>') +
          (i ? '<button class="fzt-b s voltar">' + esc(R.voltar) + '</button>' : '') +
          '<button class="fzt-b p proximo">' + esc(ultimo ? R.fim : R.proximo) + '</button></div>' +
        '<div class="fzt-pontos">' + passos.map(function (_, k) { return '<i class="' + (k === i ? 'on' : '') + '"></i>'; }).join('') + '</div>';
      if (ultimo) cart.querySelector('.fzt-acoes').style.justifyContent = 'flex-end';
      cart.querySelector('.proximo').onclick = function () { ultimo ? fim() : (i++, mostrar()); };
      var v = cart.querySelector('.voltar'); if (v) v.onclick = function () { i--; mostrar(); };
      var s = cart.querySelector('.pular'); if (s) s.onclick = fim;
      if (L) cart.querySelectorAll('.fzt-linguas button').forEach(function (b) {
        b.onclick = function () { if (b.dataset.l !== L.atual && L.aoTrocar) L.aoTrocar(b.dataset.l); };
      });
      cart.setAttribute('aria-label', p.titulo);
      if (alvo) {
        // traz o bloco para o meio da tela e so entao ilumina
        alvo.scrollIntoView({ block: 'center' });
      }
      posicionar();
      cart.querySelector('.proximo').focus();
    }

    function fim() {
      try { if (op.chave) localStorage.setItem(op.chave, '1'); } catch (e) {}
      removeEventListener('resize', posicionar); removeEventListener('scroll', posicionar, true);
      document.removeEventListener('keydown', tecla);
      veu.remove(); foco.remove(); cart.remove();
      document.documentElement.style.overflow = rolagemAntes;
      if (op.aoFim) op.aoFim();
    }
    function tecla(e) {
      if (e.key === 'Escape') fim();
      else if (e.key === 'ArrowRight' && i < passos.length - 1) { i++; mostrar(); }
      else if (e.key === 'ArrowLeft' && i > 0) { i--; mostrar(); }
    }

    addEventListener('resize', posicionar); addEventListener('scroll', posicionar, true);
    document.addEventListener('keydown', tecla);
    mostrar();
  }

  window.FZTour = { iniciar: iniciar };
})();
