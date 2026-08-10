# Gestão de Manutenção de Ativos

Sistema web para controlar ativos, manutenções realizadas, custos, históricos e
manutenções preventivas — com calendário, alertas de vencimento e relatórios em
PDF prontos para enviar no WhatsApp.

Feito com **Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + Supabase**.

---

## 1. Rodar o banco (faça isso primeiro)

1. Abra o painel do Supabase → **SQL Editor** → **New query**.
2. Cole **todo** o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Pronto. O script pode ser executado mais de uma vez sem quebrar nada.

O script cria:

| O quê | Detalhe |
|---|---|
| Tabelas | `organizacoes`, `profiles`, `org_membros`, `categorias`, `ativos`, `planos_manutencao`, `manutencoes`, `manutencao_anexos` |
| Segurança | RLS em todas as tabelas — cada empresa só enxerga os próprios dados |
| Cadastro automático | Ao criar conta, o usuário ganha empresa, perfil e as 6 categorias padrão |
| Storage | Bucket privado `manutencoes` para fotos e anexos |
| Views | `vw_planos_status` (em dia / vence em breve / atrasada) e `vw_manutencoes_completo` |
| Funções | `dashboard_resumo`, `adicionar_membro`, `remover_membro`, `criar_workspace` |

### Confirmação de e-mail

No projeto atual a confirmação de e-mail está **ligada**: depois de se cadastrar,
a pessoa precisa clicar no link enviado por e-mail para conseguir entrar.

Para testar mais rápido, desligue em **Authentication → Sign In / Providers →
Email → Confirm email**.

---

## 2. Rodar o aplicativo

```bash
npm install
npm run dev
```

Acesse **`http://localhost:3001`**, clique em **Criar conta grátis** e pronto.

> A porta é a 3001 porque a 3000 desta máquina já é usada por outro serviço.
> Para mudar, edite o script `dev` no `package.json`.

As variáveis já estão em `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3001   # base dos links enviados por e-mail
SUPABASE_SECRET_KEY=...                      # nunca use prefixo NEXT_PUBLIC_ aqui
```

Para publicar na Vercel, veja [DEPLOY.md](DEPLOY.md).

> A chave `sb_secret_...` dá acesso total ao banco, ignorando o RLS. Ela nunca é
> enviada ao navegador por este projeto. Como ela foi compartilhada em conversa,
> vale trocá-la em **Settings → API Keys → Rotate**.

---

## 3. O que tem em cada tela

| Menu | O que faz |
|---|---|
| **Dashboard** | Ativos cadastrados, manutenções vencendo, atrasadas, gasto do mês, gasto dos últimos 6 meses, gasto por categoria e últimas manutenções |
| **Ativos** | Categorias funcionam como pastas. Entrando na pasta, a lista de ativos com busca e filtro de situação |
| Ativo (detalhe) | Abas de **Histórico** (com fotos/anexos, peças, custo, garantia), **Manutenções periódicas** e **Dados do ativo** |
| **Manutenções** | Todas as preventivas com alertas de atraso/vencimento + histórico geral |
| **Calendário** | Mês a mês, com realizadas (verde), programadas (azul) e atrasadas (vermelho). Filtra por categoria e por situação |
| **Relatórios** | Filtra por período, categoria, ativo e tipo. Gera PDF e compartilha no WhatsApp |
| **Configurações** | Dados da empresa, perfil, troca de senha, equipe e empresa ativa |

### Manutenções periódicas

Podem ser por **dias**, **meses** ou **horas de uso** (horímetro/km):

- por data → alerta X dias antes do vencimento;
- por horas → alerta quando faltarem X horas para o horímetro alvo.

Ao registrar uma manutenção vinculada a um plano, o sistema **avança sozinho** a
próxima data (ou o próximo horímetro) e atualiza o horímetro do ativo.

### Relatórios e WhatsApp

- **Baixar PDF** — salva o arquivo.
- **WhatsApp** — no celular abre o menu de compartilhamento com o PDF anexado;
  no computador baixa o PDF e abre o WhatsApp Web com o resumo em texto
  (o WhatsApp não aceita anexo por link, então o arquivo vai junto manualmente).

---

## 4. Equipe

Em **Configurações → Equipe**, o proprietário ou gestor adiciona pessoas pelo
e-mail. A pessoa precisa ter criado a conta antes. Papéis: **gestor**,
**técnico** e **leitor**.

Quem participa de mais de uma empresa escolhe qual está ativa em
**Configurações → Empresa ativa**.

---

## 5. Estrutura do projeto

```
app/
  (app)/            telas internas (dashboard, ativos, manutenções, calendário, relatórios, configurações)
  auth/             server actions de login, cadastro, recuperação e logout
  login/ cadastro/ recuperar-senha/ nova-senha/
components/         UI, modais, formulários e listas
lib/
  actions/          server actions de dados (categorias, ativos, manutenções, planos, equipe)
  supabase/         clientes browser / server / proxy
  relatorio-pdf.ts  geração do PDF
  session.ts        usuário + empresa atual
proxy.ts            protege as rotas e renova a sessão (era o middleware.ts nas versões antigas)
supabase/schema.sql script único do banco
```

## 6. Comandos

```bash
npm run dev        # desenvolvimento
npm run build      # build de produção
npm start          # sobe o build
npm run typecheck  # checagem de tipos
```
