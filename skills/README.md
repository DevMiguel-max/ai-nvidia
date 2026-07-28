# Skills

Cada subpasta aqui é uma Skill carregada automaticamente pelo backend
(`lib/skills/`) quando a última mensagem do usuário bate com os `triggers`
declarados. Nada em `app/api/chat/route.ts` precisa mudar para adicionar,
remover ou editar uma skill — é só mexer nesta pasta.

## Estrutura mínima (skill estática)

```
skills/
└── minha-skill/
    ├── skill.json   # obrigatório: id, name, description, triggers
    └── SKILL.md      # obrigatório: conteúdo injetado no system prompt
```

`skill.json`:

```json
{
  "id": "minha-skill",
  "name": "Nome Legível",
  "description": "Uma linha explicando quando isso deve disparar.",
  "priority": 5,
  "triggers": ["palavra-chave-1", "outra frase gatilho"]
}
```

- `id` deve ser igual ao nome da pasta.
- `triggers` são comparados sem acento/maiúsculas, por palavra/frase
  inteira (não substring) — `"ui"` não vai disparar dentro de
  "conclu**i**r", por exemplo.
- `priority` (0 por padrão) só importa como desempate quando várias
  skills batem no mesmo request (o app injeta no máximo 2 por vez, ver
  `MAX_ACTIVE_SKILLS` em `lib/skills/index.ts`).
- `SKILL.md` é injetado **verbatim** como parte do system prompt sempre
  que a skill dispara. Escreva-o como instruções diretas para o modelo
  (2ª pessoa: "Você está gerando código React...", regras objetivas,
  checklists) — não como documentação para humanos.

Veja `skills/nextjs/` como exemplo mínimo funcionando.

## Estrutura avançada (skill executável)

Se a skill precisa de uma recomendação **dinâmica** por request (não só
regras fixas), adicione `run` ao `skill.json`:

```json
{
  "...": "...",
  "run": {
    "interpreter": "python3",
    "fallbackInterpreter": "python",
    "script": "vendor/scripts/algum_script.py",
    "args": ["{query}", "--algum-flag"],
    "timeoutMs": 8000
  }
}
```

- `script` é relativo à própria pasta da skill.
- `{query}` no array `args` é substituído pela mensagem do usuário
  (truncada a 300 caracteres) em tempo de request.
- O `stdout` do script é anexado depois do `SKILL.md`, sob o cabeçalho
  "### Dynamic recommendation for this request".
- Se o interpretador não existir, o script falhar ou estourar o timeout,
  o app **não quebra o request** — só segue com o `SKILL.md` estático.
  Isso é resolvido em `lib/skills/runSkill.ts`.

Veja `skills/ui-ux-pro-max/` — o `SKILL.md` traz as regras sempre-ativas
(prioridades de acessibilidade, toque, performance etc.) e `run` chama
`vendor/scripts/search.py --design-system`, que consulta o banco de
CSVs em `vendor/data/` (67 estilos, 161 paletas, 57 pares de fonte, 22
stacks) e devolve um sistema de design pronto (cores, tipografia,
efeitos) específico para a mensagem do usuário.

**Requisito**: `python3` precisa estar disponível no ambiente onde o
Next.js roda (funciona liso em dev local / servidor próprio; em
serverless tipo Vercel isso normalmente **não** está disponível por
padrão — nesse caso a skill cai automaticamente para o `SKILL.md`
estático, sem erro, mas sem a recomendação dinâmica).

## Adicionando as próximas skills do roadmap

Para `react`, `tailwind`, `typescript`, `python`, `discord`, `android`:
copie a pasta `skills/nextjs/` inteira, renomeie, ajuste `id`/`triggers`
em `skill.json` e escreva o `SKILL.md` com as regras que você quer que a
IA siga para aquele domínio. Nenhuma outra parte do código muda.
