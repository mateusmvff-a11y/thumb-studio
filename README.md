# Thumb Studio — fase 1 (protótipo local)

Ferramenta para o cliente trocar a copy de uma thumb e a diagramação se refazer sozinha, seguindo as regras
fechadas com o Mateus (07/10/2026) para o canal do Luís Ernesto Lacombe.

## Rodar
```
node server.mjs 5177
```
Abrir http://localhost:5177 (ou clicar em `iniciar.bat`).

## Camadas editáveis (07/10)
Painel "Camadas": **Título**, **Subtítulo**, **Nome do canal** e **Imagem**, cada uma com o olho (mostrar/esconder).
- Título: texto (quebra automática; *asteriscos* = destaque), tamanho 60-140% do automático, mover o bloco, cor do destaque, "voltar ao automático".
- Subtítulo: opcional (liga/desliga ou texto vazio); por padrão termina onde termina a última linha do título; tamanho 60-150%.
- Nome do canal: texto próprio.
- Imagem: zoom 100-180%, mover (setas ou arrastar na tela). Os rostos mudam de lugar com a imagem e o texto se reorganiza para não cobri-los; se o ajuste manual passar das regras, aparece o aviso.
As bases em assets/ são exportadas do PSD SEM título, sub e nome do canal.

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

## Pedido de nova imagem
No painel, "Pedir uma nova imagem": nome, padrão, descrição em 1 linha, quem fica em evidência, texto (opcional) e até 3 fotos (opcional).
"Enviar pedido" manda para a função `thumb-pedido` do Supabase do Franzé Studio (código em franzestudio/supabase/functions/thumb-pedido):
o pedido ganha um código de 8 caracteres, o Mateus recebe e-mail, e o cliente acompanha em "Meus pedidos" (Recebido, Em criação, Pronto).
Quando fica pronto, aparece o botão "Abrir a thumb". O endereço da função está em config.js (vazio = envio desligado).
Fila do lado do estúdio: franzestudio/tools/thumb-pedidos.ps1.

## Falta (próximas fases)
Login e papéis (Mateus / cliente), versões, fila de pedidos (briefing), preparo automático da cena,
grão por cima do texto (no PSD o grão passa sobre o título), upload de foto opcional.
