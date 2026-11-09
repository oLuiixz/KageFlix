# KageFlix

Plataforma de streaming de animes com identidade visual preta, vermelha e branca.

## Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Neon PostgreSQL (autenticação e dados)
- Vercel

## Status

Fundação inicial do projeto. O acesso será restrito a contas previamente cadastradas e habilitadas no servidor. Não haverá cadastro público.

## Desenvolvimento

1. Instale as dependências com `npm install`.
2. Configure as variáveis de ambiente conforme `.env.example`.
3. Execute `npm run dev`.

Nunca armazene senhas em texto puro. A autenticação deverá validar hashes no servidor e emitir sessão segura em cookie HttpOnly.
