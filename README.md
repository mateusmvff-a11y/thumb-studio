# Thumb Studio — fase 1 (protótipo local)

Ferramenta para o cliente trocar a copy de uma thumb e a diagramação se refazer sozinha, seguindo as regras
fechadas com o Mateus (07/10/2026) para o canal do Luís Ernesto Lacombe.

## Rodar
```
node server.mjs 5177
```
Abrir http://localhost:5177 (ou clicar em `iniciar.bat`).

## Como funciona
- `assets/base-*.jpg` — a cena já tratada (exportada do PSD **sem o título**). A IA gera a cena; o cliente não mexe nela.
- `thumbs/*.json` — uma thumb: padrão (`thumbnail` ou `live`), cena, texto, cor do destaque e o **layout**:
  `bordaProt` (x do cabelo/rosto do protagonista), `queixoProt` (y do queixo), `limiteCorpo` (x máximo abaixo do queixo),
  `topo` (y mínimo do bloco), `accentWeight` (900 Black na thumbnail, 800 ExtraBold na live).
- `engine.js` — o motor: quebra em até 3 linhas, procura o MAIOR corpo que cabe (rosto livre acima do queixo, até o limite do corpo abaixo),
  base do bloco em y=976, margem 124. Linhas 1-2 em Light branco, última em Black/ExtraBold na cor de destaque.
- `palettes.json` — paleta de destaque por padrão.
- `_ref/` — exportações do Photoshop para comparar (caixa "Comparar com a versão do Photoshop").

## Destaque
`QUEM VAI GANHAR A *ELEIÇÃO*?` — o que está entre asteriscos vira a última linha, em cor.

## Calibração (07/10/2026)
Texto medido contra o PSD nas 3 thumbs: diferença de 1 a 15 px nas bordas de cada linha (≤ 1%).
Corpo máximo 265 px; abaixo de 170 px a ferramenta avisa que o texto ficou pequeno.

## Pedido de nova imagem (briefing)
No painel, "Pedir uma nova imagem": padrão (live/thumbnail), descrição da imagem em 1 linha, quem fica em evidência, texto (opcional) e fotos (opcional).
"Copiar pedido" gera o texto para colar na conversa com a IA, que cria a cena e a insere como nova thumb (assets/base-*.jpg + thumbs/*.json).

## Falta (próximas fases)
Login e papéis (Mateus / cliente), versões, fila de pedidos (briefing), preparo automático da cena,
grão por cima do texto (no PSD o grão passa sobre o título), upload de foto opcional.
