/* Modo claro e escuro, em todas as telas (pedido do Mateus, 01/10/2026).

   Carrega no <head>, antes do CSS desenhar a pagina: o data-theme no
   <html> ja esta posto quando a primeira cor aparece, e quem escolheu o
   escuro nao ve um clarao branco ao abrir. Por isso e um arquivo
   pequeno e sem dependencia.

   Quem decide: o site sempre comeca no claro, mesmo em aparelho no modo
   escuro ("eu quero que sempre comece no claro", Mateus, 01/10/2026). O
   escuro so liga pelo botao, e a escolha vale ate fechar a aba
   (sessionStorage fz-tema = claro | escuro): troca de pagina e recarga
   mantem, visita nova comeca no claro de novo.

   O botao: cada pagina marca onde ele entra com um elemento [data-tema]
   (no cabecalho, perto da troca de idioma). O desenho do botao vem daqui,
   para ser o mesmo em todas as telas: so o icone, na cor do texto em
   volta, sol no escuro e lua no claro. Com data-tema="texto" o botao
   leva tambem o nome do modo para onde ele leva ("Modo claro"): e o do
   menu aberto no celular, onde um icone sozinho passava despercebido. */
(function () {
  var CHAVE = 'fz-tema';
  var raiz = document.documentElement;
  var ESCURO_META = '#171a19';

  // a primeira versao guardava a escolha para sempre (localStorage):
  // apaga, senao quem testou o escuro continuaria abrindo no escuro
  try { localStorage.removeItem(CHAVE) } catch (e) {}

  function salvo() {
    try { var v = sessionStorage.getItem(CHAVE); return v === 'claro' || v === 'escuro' ? v : null } catch (e) { return null }
  }
  function atual() {
    return salvo() || 'claro';
  }

  // a cor da barra do navegador no celular acompanha o fundo
  function meta(t) {
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) return;
    if (!m.hasAttribute('data-claro')) m.setAttribute('data-claro', m.getAttribute('content') || '#ffffff');
    m.setAttribute('content', t === 'escuro' ? ESCURO_META : m.getAttribute('data-claro'));
  }

  function aplicar(t) {
    raiz.setAttribute('data-theme', t === 'escuro' ? 'dark' : 'light');
    raiz.style.colorScheme = t === 'escuro' ? 'dark' : 'light';
    meta(t);
    atualizarBotoes();
  }

  // ---------------------------------------------------------------- botao
  var ROTULO = {
    pt: ['Mudar para o modo escuro', 'Mudar para o modo claro'],
    es: ['Cambiar al modo oscuro', 'Cambiar al modo claro'],
    en: ['Switch to dark mode', 'Switch to light mode']
  };
  var NOME = {
    pt: ['Modo escuro', 'Modo claro'],
    es: ['Modo oscuro', 'Modo claro'],
    en: ['Dark mode', 'Light mode']
  };
  var LUA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
  var SOL = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>';

  // o texto no idioma da pagina, apontando para o modo que o clique liga
  function noIdioma(tabela) {
    var l = (raiz.getAttribute('lang') || 'en').slice(0, 2).toLowerCase();
    var r = tabela[l] || tabela.en;
    return atual() === 'escuro' ? r[1] : r[0];
  }

  function atualizarBotoes() {
    if (!document.querySelectorAll) return;
    var escuro = atual() === 'escuro', txt = noIdioma(ROTULO), nome = noIdioma(NOME);
    var bs = document.querySelectorAll('.fz-tema');
    for (var i = 0; i < bs.length; i++) {
      var comTexto = bs[i].classList.contains('com-texto');
      bs[i].innerHTML = (escuro ? SOL : LUA) + (comTexto ? '<span>' + nome + '</span>' : '');
      // com o nome a mostra, o leitor de tela le o nome e nao repete
      if (comTexto) bs[i].removeAttribute('aria-label');
      else bs[i].setAttribute('aria-label', txt);
      bs[i].setAttribute('title', txt);
    }
  }

  function alternar() {
    var novo = atual() === 'escuro' ? 'claro' : 'escuro';
    try { sessionStorage.setItem(CHAVE, novo) } catch (e) {}
    // um fio de transicao so durante a troca, para as cores mudarem
    // juntas em vez de piscar; fora da troca, nada muda no CSS da pagina
    raiz.classList.add('fz-trocando');
    aplicar(novo);
    setTimeout(function () { raiz.classList.remove('fz-trocando') }, 380);
  }

  function estilo() {
    if (document.getElementById('fz-tema-css')) return;
    var s = document.createElement('style');
    s.id = 'fz-tema-css';
    s.textContent =
      '.fz-tema{display:inline-grid;place-items:center;width:34px;height:34px;padding:0;margin:0;border:0;border-radius:50%;' +
      'background:transparent;color:inherit;cursor:pointer;opacity:.82;transition:opacity .25s ease,background-color .25s ease;flex:none}' +
      '.fz-tema:hover{opacity:1;background:color-mix(in srgb,currentColor 12%,transparent)}' +
      '.fz-tema:focus-visible{outline:2px solid currentColor;outline-offset:2px;opacity:1}' +
      '.fz-tema svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}' +
      '.fz-tema.com-texto{display:inline-flex;align-items:center;gap:9px;width:auto;padding:0 16px 0 12px;border-radius:40px;font:inherit;white-space:nowrap}' +
      'html.fz-trocando,html.fz-trocando *,html.fz-trocando *::before,html.fz-trocando *::after{' +
      'transition:background-color .32s ease,color .32s ease,border-color .32s ease,fill .32s ease,stroke .32s ease!important}' +
      '@media (prefers-reduced-motion:reduce){html.fz-trocando,html.fz-trocando *{transition:none!important}}';
    (document.head || document.documentElement).appendChild(s);
  }

  function montar(alvo) {
    if (!alvo || alvo.querySelector('.fz-tema')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = alvo.getAttribute('data-tema') === 'texto' ? 'fz-tema com-texto' : 'fz-tema';
    b.addEventListener('click', alternar);
    alvo.appendChild(b);
    atualizarBotoes();
  }

  function montarTodos() {
    estilo();
    var alvos = document.querySelectorAll('[data-tema]');
    for (var i = 0; i < alvos.length; i++) montar(alvos[i]);
    meta(atual());
  }

  aplicar(atual());

  // as paginas trocam de idioma sem recarregar: o rotulo acompanha
  if (window.MutationObserver) {
    new MutationObserver(atualizarBotoes).observe(raiz, { attributes: true, attributeFilter: ['lang'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarTodos);
  else montarTodos();

  // para as paginas que desenham o cabecalho por JavaScript depois
  window.FZTema = { alternar: alternar, atual: atual, montar: montar, montarTodos: montarTodos };
})();
