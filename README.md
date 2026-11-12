# KageFlix

Plataforma de streaming de animes com identidade visual preta, vermelha e branca.

## Stack

- Next.js 15 (App Router)
- React 19 + TypeScript
- Tailwind CSS
- Neon PostgreSQL
- Vercel

## Configuração

1. Instale as dependências: `npm install`.
2. Copie `.env.example` para `.env.local`.
3. Configure `DATABASE_URL`, `AUTH_SECRET` e `NEXT_PUBLIC_APP_URL`.
4. Execute em desenvolvimento: `npm run dev`.
5. Gere o build de produção: `npm run build`.

## PWA

O KageFlix inclui Web App Manifest, registro de Service Worker, modo de exibição standalone e uma tela de contingência quando o dispositivo estiver offline.

- A instalação/PWA deve ser testada em HTTPS (a Vercel já fornece HTTPS).
- Android/Chrome: use a opção **Instalar app** ou **Adicionar à tela inicial** do navegador.
- iPhone/iPad: abra no Safari, toque em **Compartilhar** e escolha **Adicionar à Tela de Início**.
- O Service Worker é registrado apenas em produção para evitar cache durante o desenvolvimento.
- Arquivos estáticos essenciais e a tela offline podem ser reaproveitados; autenticação, APIs, catálogo dinâmico e reprodução de vídeos não são armazenados offline.
- A reprodução de conteúdo continua exigindo conexão com a internet.

## Banco de dados

Execute o arquivo `db/schema.sql` no banco Neon novo antes do primeiro acesso. Não inclua usuários, senhas, sessões ou dados pessoais na migração.

## Deploy na Vercel

Importe o repositório, configure as variáveis de ambiente e faça o deploy usando o comando padrão `npm run build`.
