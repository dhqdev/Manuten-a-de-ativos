# Publicar o aplicativo na Vercel

O Supabase já está no ar cuidando de **banco, login e arquivos**. Falta hospedar
o aplicativo Next.js — é isso que este guia faz.

> O Supabase não hospeda aplicações Next.js. Ele entrega banco de dados,
> autenticação, storage e APIs. A parte visual/servidor do app vai para a Vercel.

---

## Passo 1 — Enviar o código para o GitHub

O repositório já está configurado (`github.com/dhqdev/Manuten-a-de-ativos`):

```bash
git add -A
git commit -m "Sistema de gestão de manutenção de ativos"
git push -u origin main
```

O arquivo `.env.local` **não sobe** (está no `.gitignore`). As chaves vão
direto na Vercel, no passo 3.

---

## Passo 2 — Criar o projeto na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new) e entre com o GitHub.
2. Escolha o repositório **Manuten-a-de-ativos** → **Import**.
3. Não mude nada em Framework/Build — o Next.js é detectado sozinho.
4. **Antes de clicar em Deploy**, abra *Environment Variables* e faça o passo 3.

---

## Passo 3 — Variáveis de ambiente na Vercel

Cadastre estas três, marcando **Production, Preview e Development**:

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xojpygcmdvuzklllobbb.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_sAGTpwLUXVSzmPIsnOfsCw_XZMz8yP8` |
| `NEXT_PUBLIC_SITE_URL` | a URL da Vercel, ex.: `https://manutencao-de-ativos.vercel.app` |

A `NEXT_PUBLIC_SITE_URL` é o endereço que aparece nos links de **redefinição de
senha** e **confirmação de e-mail**. Como você só descobre a URL depois do
primeiro deploy, faça assim:

1. Deploy sem ela.
2. Copie a URL que a Vercel gerou.
3. Volte em *Settings → Environment Variables*, adicione a variável.
4. *Deployments → ⋯ → Redeploy*.

> **Não** cadastre a `SUPABASE_SECRET_KEY` na Vercel. O aplicativo não usa essa
> chave em nenhum lugar — ela ignora todas as regras de segurança do banco.

---

## Passo 4 — Liberar a URL no Supabase

Sem isto, o link de recuperação de senha volta para o endereço errado.

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://sua-url.vercel.app`
- **Redirect URLs** — adicione uma por linha:

```
https://sua-url.vercel.app/**
http://localhost:3001/**
```

O `/**` cobre as rotas internas (`/auth/confirmar`, `/nova-senha`).
Mantenha o `localhost:3001` para continuar desenvolvendo na sua máquina.

Se depois você ligar um domínio próprio, adicione-o aqui também e atualize a
`NEXT_PUBLIC_SITE_URL` na Vercel.

---

## Passo 5 — Confirmação de e-mail

Enquanto estiver testando, deixe desligada:

Supabase → **Authentication → Sign In / Providers → Email** →
desmarcar **Confirm email** → **Save**.

Quando o sistema entrar em uso de verdade, ligue de novo — aí o Passo 4 passa a
ser obrigatório, porque é ele que faz o link do e-mail apontar para o lugar certo.

---

## Depois de publicar

Cada `git push` para a `main` gera um novo deploy automaticamente.

Checklist rápido do que testar na URL de produção:

- [ ] Criar conta e entrar
- [ ] As 6 categorias padrão aparecem em **Ativos**
- [ ] Cadastrar um ativo
- [ ] Registrar uma manutenção **com foto** (valida o Storage)
- [ ] Criar uma preventiva e conferir o alerta no Dashboard
- [ ] Gerar um PDF em **Relatórios**
