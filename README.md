# KageFlix

Aplicação web privada para navegação e reprodução de filmes e séries/animes, com interface responsiva e suporte para instalação como PWA.

> Este repositório contém o código-fonte. Para executar uma cópia própria, cada instalação precisa usar seu próprio banco Neon, segredo de autenticação e variáveis de ambiente. **Nunca compartilhe arquivos `.env.local`, senhas, tokens ou strings de conexão.**

## 1. Tecnologias

- Next.js 15.5.28 (App Router)
- React 19 + TypeScript
- Tailwind CSS 3
- Neon PostgreSQL
- Autenticação por sessão JWT com cookie HTTP-only
- PWA (manifest, Service Worker e tela offline)
- Deploy recomendado: Vercel

## 2. Pré-requisitos

Instale:

- Node.js 20 LTS (mínimo recomendado: 20.x)
- npm (já vem com o Node.js)
- Git
- Uma conta no GitHub
- Uma conta no [Neon](https://neon.tech/) para o banco PostgreSQL
- Uma conta na [Vercel](https://vercel.com/) para publicar o projeto

Confira as versões no terminal:

```bash
node -v
npm -v
git --version
```

## 3. Baixar o projeto

Clone o repositório:

```bash
git clone https://github.com/oLuiixz/KageFlix.git
cd KageFlix
```

Se o responsável enviar um arquivo ZIP, extraia-o e abra o terminal dentro da pasta do projeto.

Instale as dependências:

```bash
npm install
```

## 4. Criar e configurar o banco de dados

1. Entre no [Neon](https://neon.tech/) e crie um projeto PostgreSQL.
2. Abra o projeto e copie a connection string (de preferência a opção pooled).
3. Acesse o SQL Editor do Neon.
4. Abra o arquivo `db/schema.sql` deste repositório.
5. Copie todo o conteúdo do arquivo e execute no SQL Editor.
6. Confirme que as tabelas foram criadas: `users`, `catalog_categories`, `user_iptv_sources`, `user_catalog_items` e `user_devices`.

O script cria a estrutura inicial e as categorias padrão. Execute-o no banco da instalação nova, não no banco de produção de outra pessoa.

## 5. Configurar as variáveis de ambiente

Na raiz do projeto, copie `.env.example` para `.env.local`.

Linux/macOS:

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Edite o arquivo `.env.local`:

```env
DATABASE_URL="COLE_AQUI_A_CONNECTION_STRING_DO_NEON"
AUTH_SECRET="COLE_AQUI_UM_SEGREDO_FORTE"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Gere um segredo forte com Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Copie o resultado para `AUTH_SECRET`. Gere um segredo exclusivo para esta instalação. **Mantenha o mesmo valor de `AUTH_SECRET` depois de publicar:** ele assina as sessões e também protege dados criptografados no banco. Trocar esse valor sem uma migração planejada invalida sessões e impede a leitura dos dados criptografados anteriormente.

Não envie `.env.local` pelo WhatsApp, não publique no GitHub e não coloque credenciais no código-fonte.

## 6. Executar localmente

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Para parar o servidor, use `Ctrl + C` no terminal.

## 7. Verificar e gerar a compilação de produção

Antes de publicar, execute:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Se os comandos terminarem sem erros, inicie localmente a versão compilada:

```bash
npm run start
```

A aplicação ficará disponível em [http://localhost:3000](http://localhost:3000).

> `npm run build` gera a compilação otimizada do Next.js na pasta `.next`. Essa pasta é gerada automaticamente e não deve ser enviada ao GitHub como código-fonte.

## 8. Publicar na Vercel

1. Entre na [Vercel](https://vercel.com/) com a conta que receberá o projeto.
2. Clique em **Add New → Project**.
3. Importe o repositório GitHub `oLuiixz/KageFlix` (ou o fork/cópia autorizado).
4. Mantenha o framework como **Next.js** e o comando de build padrão: `npm run build`.
5. Em **Environment Variables**, adicione:
   - `DATABASE_URL`: connection string do banco Neon desta instalação.
   - `AUTH_SECRET`: o segredo forte gerado para esta instalação.
   - `NEXT_PUBLIC_APP_URL`: URL pública final, por exemplo `https://seu-dominio.vercel.app`.
6. Selecione os ambientes **Production**, **Preview** e **Development** conforme necessário.
7. Clique em **Deploy**.
8. Depois do deploy, abra a URL gerada e teste o login e o catálogo.

Se alterar alguma variável de ambiente na Vercel, faça um novo deploy para que a alteração entre em vigor.

## 9. Primeiro acesso

- O login valida as credenciais no serviço de origem configurado no código.
- Um usuário comum é criado automaticamente no primeiro login bem-sucedido, desde que o serviço de origem confirme que a conta está ativa.
- O acesso depende de credenciais válidas e de uma assinatura ativa no serviço de origem.
- Cada instalação usa seu próprio banco e suas próprias credenciais de ambiente.

### Atenção sobre a integração de origem

Nesta versão, o endereço do serviço de origem está definido diretamente no código (`xmrs2.top`), e não em uma variável de ambiente. A aplicação foi preparada para essa integração específica. Para conectar outro provedor, é necessário revisar e alterar os pontos de autenticação, validação de URL e reprodução antes de colocar a instalação em produção. Use somente serviços e conteúdos para os quais você tenha autorização.

### Atenção sobre a área administrativa

Há rotas e operações protegidas por perfil administrativo, mas o fluxo de login disponibilizado nesta versão é voltado ao usuário comum. Não considere a área administrativa pronta para provisionamento independente sem implementar e testar um fluxo seguro de criação e autenticação de administradores.

## 10. Instalar como aplicativo (PWA)

A instalação do PWA requer HTTPS em produção.

- **Android/Chrome:** abra o site e escolha **Instalar app** ou **Adicionar à tela inicial**.
- **iPhone/iPad:** abra o site no Safari, toque em **Compartilhar** e escolha **Adicionar à Tela de Início**.

O Service Worker é registrado em produção. Ele pode reutilizar arquivos estáticos e a tela offline, mas não armazena sessões, APIs, catálogo dinâmico nem vídeos para reprodução offline. A reprodução continua exigindo internet.

## 11. Comandos úteis

| Comando | Função |
| --- | --- |
| `npm install` | Instala as dependências |
| `npm run dev` | Inicia o ambiente de desenvolvimento |
| `npm run lint` | Executa o ESLint |
| `npx tsc --noEmit` | Verifica os tipos TypeScript |
| `npm run build` | Gera a compilação de produção |
| `npm run start` | Inicia a compilação de produção |

## 12. Solução de problemas

- **Erro de conexão com o banco:** confira se `DATABASE_URL` está correta e se o schema foi executado no banco Neon.
- **Erro de sessão/autenticação não configurada:** confira `AUTH_SECRET` e faça novo deploy depois de alterar variáveis na Vercel.
- **Login recusado:** confirme se as credenciais estão corretas e se a conta está ativa no serviço de origem.
- **Catálogo não carrega:** verifique a conexão do serviço de origem e os logs da aplicação na Vercel.
- **PWA não oferece instalação:** confirme que o site está em HTTPS e abra pelo navegador compatível.

## 13. Segurança e manutenção

- Nunca compartilhe `.env.local`, connection strings, tokens ou credenciais de clientes.
- Não reutilize o banco de produção de outra instalação.
- Não altere `AUTH_SECRET` depois de armazenar dados sem planejar a migração.
- Mantenha Node.js e dependências atualizados.
- Faça backup do banco Neon antes de alterações de schema.
- Não armazene credenciais de acesso em commits, screenshots ou mensagens públicas.

---

Projeto: [KageFlix no GitHub](https://github.com/oLuiixz/KageFlix)
