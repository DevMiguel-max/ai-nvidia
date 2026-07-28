# NVIDIA Chat App

Chat privado estilo ChatGPT, rodando 100% na Vercel (sem banco, sem Docker, sem
backend externo), conectado ao modelo `nvidia/nemotron-3-ultra-550b-a55b` via
API server-side da NVIDIA. Feito para uso diário de 2 pessoas.

## Stack

- Next.js 15 (App Router) + TypeScript estrito
- Tailwind CSS v4
- SDK oficial da OpenAI, apontando pro endpoint da NVIDIA
- Streaming via Server-Sent Events
- Sem banco de dados — histórico de conversas fica no `localStorage` do navegador
- Sessão de login via cookie HttpOnly assinado com HMAC-SHA256 (Web Crypto)

## Rodando localmente

```bash
npm install
cp .env.local.example .env.local
# edite .env.local com suas chaves reais
npm run dev
```

Abra http://localhost:3000 — vai redirecionar pro login.

## Variáveis de ambiente

| Variável | O que é |
|---|---|
| `NVIDIA_API_KEY` | Chave da API da NVIDIA. Só existe no servidor. |
| `APP_PASSWORD` | Senha única compartilhada pelos 2 donos. |
| `SESSION_SECRET` | Assina o cookie de sessão. **Precisa ser diferente de `APP_PASSWORD`** — se a chave que assina o token é a mesma senha de login, vazou uma vazou as duas. Gere com `openssl rand -base64 32`. |

## Deploy na Vercel

1. Suba o projeto pro GitHub (o `.gitignore` já impede que `.env.local` vá junto).
2. Importe o repositório na Vercel.
3. Em **Project Settings → Environment Variables**, configure as 3 variáveis acima.
4. Deploy. Não precisa de mais nada — sem banco, sem Docker, sem servidor manual.

## O que foi implementado em segurança

- Senha única com comparação *timing-safe* (hash SHA-256 + `crypto.timingSafeEqual`).
- Cookie de sessão: `HttpOnly`, `Secure` em produção, `SameSite=Strict`, assinado com HMAC-SHA256 via Web Crypto — o mesmo módulo de assinatura roda tanto no middleware (Edge runtime) quanto nas rotas de API (Node runtime), sem depender de `Buffer` nem de duas implementações separadas.
- **Middleware bloqueia por padrão**: toda rota (página ou API) exige sessão válida, exceto `/login` e `/api/auth/login`. Qualquer rota nova que você adicionar já nasce protegida.
- Rate limiting em memória por IP (ver limitação abaixo).
- Validação de entrada: tamanho máximo de mensagem, tamanho máximo do array de mensagens, tipos checados antes de tocar na API da NVIDIA.
- Headers de segurança via `next.config.ts`: CSP, `X-Frame-Options: DENY`, HSTS, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`.
- `poweredByHeader: false` e `productionBrowserSourceMaps: false` — sem vazar stack, sem mapa de fonte em produção.
- Erros genéricos pro cliente sempre; detalhe técnico só vai pro `console.error` do servidor (logs da Vercel), nunca na resposta.
- `robots: { index: false, follow: false }` no layout — não é indexável, camada extra além do login.
- O servidor nunca grava nada em disco/banco. `/api/chat` é um relay stateless: recebe a conversa inteira a cada request, chama a NVIDIA, transmite de volta. Todo o histórico vive só no seu navegador.

## Limitações conhecidas (sem maquiagem)

- **Rate limit não é uma garantia distribuída.** O contador vive na memória da function serverless — um cold start zera tudo, e sob concorrência a Vercel pode rotear pra outra instância com contador zerado. Serve pra segurar loop de bug ou script bobo batendo numa instância quente; não é proteção dura contra abuso distribuído. Isso exigiria estado compartilhado (Vercel KV, Upstash) — que é exatamente o "serviço externo" que ficou fora de escopo. Se um dia quiser isso de verdade, só a implementação de `lib/rateLimit.ts` muda; a assinatura da função continua igual.
- **CSP usa `'unsafe-inline'`** em `script-src`/`style-src`. É a troca padrão pra não quebrar a hidratação do Next sem implementar CSP por nonce de ponta a ponta (dá pra evoluir depois).
- **`npm audit` não sai 100% limpo** — 3 avisos transitivos: `postcss`/`sharp` dentro de dependências internas do próprio Next (usadas por `next/image`, que este app nem usa) e `prismjs` dentro do `react-syntax-highlighter` (DOM clobbering — não explorável aqui porque o conteúdo do modelo vira `children` do React, nunca `dangerouslySetInnerHTML`). O "fix" automático do `npm audit fix --force` rebaixaria o Next pra uma versão `9.x` — não fiz isso. Revise periodicamente com `npm audit`.
- **Senha única para os 2 donos** = sem identidade individual, sem trilha de auditoria por pessoa. Simplificação deliberada e razoável pra uma ferramenta privada de 2 pessoas; se algum dia quiser contas separadas, isso é upgrade de escopo (NextAuth, Clerk, etc.), não um ajuste pequeno.

## Estrutura do projeto

```
app/
  api/chat/route.ts          → endpoint que fala com a NVIDIA (streaming SSE)
  api/auth/login/route.ts    → valida senha, emite cookie de sessão
  api/auth/logout/route.ts   → limpa o cookie
  login/                     → tela de login
  chat/                      → tela principal
components/
  chat/                      → bolha de mensagem, markdown, code block, thinking trace, input
  sidebar/                   → lista de conversas, novo chat
  ui/
hooks/
  useConversations.ts        → CRUD de conversas (localStorage)
  useChat.ts                 → envio/streaming/stop/regenerate, por conversa
  useLocalStorage.ts
  useAutoScroll.ts
lib/
  constants.ts               → modelo, limites, chaves de storage — tudo num lugar só
  systemPrompt.ts             → prompt do sistema, edite só este arquivo
  auth.ts / crypto.ts         → sessão assinada (Web Crypto, roda em Edge e Node)
  rateLimit.ts
  nvidiaClient.ts
  thinkTagSplitter.ts         → fallback defensivo caso o reasoning venha inline
middleware.ts                 → protege tudo por padrão
types/
utils/
```

## Troubleshooting

- **"Service temporarily unavailable"** → confira se `NVIDIA_API_KEY` está setada na Vercel (Project Settings → Environment Variables) e se o deploy foi refeito depois de adicionar a variável.
- **Resposta corta no meio** → aumente `maxDuration` em `app/api/chat/route.ts`, respeitando o teto do seu plano Vercel ([vercel.com/docs/functions/configuring-functions/duration](https://vercel.com/docs/functions/configuring-functions/duration)).
- **Login não persiste / desloga sozinho** → confirme que `SESSION_SECRET` está setada e é a mesma entre deploys (trocar o valor invalida todas as sessões ativas).
- **"Model not found" ou erro 404 da NVIDIA** → confira `NVIDIA_MODEL` em `lib/constants.ts` contra o catálogo atual em [build.nvidia.com](https://build.nvidia.com).
- **`npm install` reclamando de peer dependencies** → rode `npm install --legacy-peer-deps`.
