# Segurança

Registro do que foi auditado, o que estava errado e como está hoje.

---

## Falhas encontradas e corrigidas

### 1. Vazamento de dados entre empresas (grave)

`whatsapp_pendencias()` era `SECURITY DEFINER` **sem checar quem chamava**.
Qualquer usuário autenticado podia passar o id de outra empresa e ler as
manutenções dela — ativos, placas, o que estava atrasado.

Corrigido: virou `SECURITY INVOKER`, então o RLS de quem chama passa a valer.

Testado com duas empresas e dois usuários:

```
ATACANTE (Empresa B) chamando whatsapp_pendencias(Empresa A) -> 0 linhas
DONA (Empresa A) chamando a mesma função                     -> 1 linha
```

### 2. Rotina de notificação inalcançável (grave, e silenciosa)

O proxy redirecionava **toda** requisição sem sessão para `/login` — inclusive
`/api/notificacoes/disparar`. Como o Vercel Cron não manda cookie de sessão, o
resumo diário nunca dispararia, e sem erro visível: o cron receberia um `307` e
consideraria sucesso.

Corrigido: rotas sob `/api/` não passam pelo redirecionamento; cada uma
autentica do seu jeito.

```
sem auth        -> 401
segredo errado  -> 401
Bearer correto  -> 200 {"verificadas":1,"enviadas":0,"puladas":1,"falhas":[]}
```

### 3. Open redirect no login

`/login?redirect=//site-falso.com` mandava o usuário recém-autenticado para
outro domínio. É o truque clássico de phishing: o link parte do domínio
legítimo, e a vítima cai numa cópia da tela de login.

Corrigido em `lib/url-segura.ts`, aplicado na página **e** na server action:

```
//evil.com        -> /dashboard
/\evil.com        -> /dashboard
https://evil.com  -> /dashboard
/relatorios       -> /relatorios   (caminho interno passa)
```

### 4. Funções internas ao alcance de qualquer usuário

No PostgreSQL, toda função nasce executável por `PUBLIC`. `seed_categorias_padrao()`
podia ser chamada por qualquer pessoa logada, em qualquer empresa.

Corrigido: `revoke execute on all functions in schema public from public`, com
liberação explícita só do que o app usa. Verificado:

```
seed_categorias_padrao(outra_empresa) -> ERROR: permission denied
```

### 5. Segredo em query string

O disparo aceitava `?segredo=...`, que aparece em log de acesso e no cabeçalho
`Referer`. Agora só o cabeçalho `Authorization`, com comparação de tempo
constante (`timingSafeEqual`) para não vazar o segredo por diferença de latência.

### 6. Anexos sem validação de dono

`registrarAnexo` aceitava qualquer `manutencaoId`. O RLS impedia a leitura, mas
dava para sujar o banco de outra empresa. Agora valida dono, tipo de arquivo e
se o caminho começa pela pasta da própria empresa.

### 7. Sem cabeçalhos de segurança

Nenhum. Hoje, em produção:

```
content-security-policy: default-src 'self'; script-src 'self' 'nonce-...' 'strict-dynamic'; ...
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-frame-options: DENY
x-content-type-options: nosniff
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
cross-origin-opener-policy: same-origin
```

---

### 8. Papéis só existiam no nome (grave)

Técnico e leitor conseguiam criar, editar e excluir ativos, apagar histórico,
mudar os dados da empresa e desconectar o WhatsApp — as policies de RLS só
checavam se a pessoa era membro. Corrigido em `supabase/migracao-v2.sql`:

| | Proprietário / Gestor | Técnico | Leitor |
|---|---|---|---|
| Ver tudo | ✓ | ✓ | ✓ |
| Registrar manutenção e anexos, movimentar pneus | ✓ | ✓ | — |
| Categorias, ativos, periódicas, cadastro de pneus | ✓ | — | — |
| Excluir manutenções / limpar histórico | ✓ | — | — |
| Dados da empresa, WhatsApp, equipe | ✓ | — | — |

A tela esconde os botões (`lib/permissoes.ts`), mas quem barra é o banco.

### 9. Convite de usuário não pode vir do formulário

Usuários criados pelo gestor entram direto na empresa pelo trigger
`handle_new_user`, que lê o convite de `raw_app_meta_data` — campo que só a
chave de serviço define. Ler de `raw_user_meta_data` (preenchido pelo
formulário público de cadastro) deixaria qualquer pessoa se colocar dentro de
outra empresa. A troca de senha pelo gestor só vale para quem participa
apenas daquela empresa, para um gestor não tomar a conta do dono de outra.

---

## Content Security Policy

Cada requisição gera um **nonce** novo. Só scripts com aquele nonce rodam, e
`'strict-dynamic'` faz o navegador confiar apenas no que eles carregarem. Na
prática: mesmo que um texto malicioso chegue ao HTML, ele não executa.

Verificado em produção: **10 de 10 scripts com nonce, zero violações no console.**

### ⚠️ Armadilha: página estática quebra com esta CSP

O nonce vem do cabeçalho da requisição, então **só existe em renderização
dinâmica**. Uma página pré-gerada no build sai com os scripts sem nonce e, como
`'strict-dynamic'` faz o navegador ignorar o `'self'`, **todo o JavaScript dela
é bloqueado** — a página aparece, mas nada funciona.

Isso aconteceu de verdade aqui: `/cadastro` e `/recuperar-senha` ficaram com os
10 scripts bloqueados e os formulários não enviavam. Corrigido com
`export const dynamic = "force-dynamic"` em todas as páginas fora do grupo
autenticado (que já é dinâmico por usar cookies).

**Ao criar uma página nova fora de `app/(app)/`, adicione essa linha.** Para
conferir:

```bash
curl -s https://sua-url.vercel.app/pagina-nova \
  | grep -c '<script'            # total
curl -s https://sua-url.vercel.app/pagina-nova \
  | grep -c '<script[^>]*nonce="'  # precisa dar o mesmo número
```

Verificação atual:

```
/login            scripts=10  sem nonce=0     violações no navegador: 0
/cadastro         scripts=10  sem nonce=0     violações no navegador: 0
/recuperar-senha  scripts=10  sem nonce=0
/offline          scripts=11  sem nonce=0     violações no navegador: 0
```

Duas escolhas conscientes:

- `style-src` usa `'unsafe-inline'`. Atributos `style` inline (as cores das
  categorias, as barras dos gráficos) não aceitam nonce. Em `style-src` isso não
  permite executar código — o risco é cosmético, não de execução.
- `connect-src` e `img-src` liberam `*.supabase.co`, necessário para os dados e
  as fotos das manutenções.

---

## Isolamento entre empresas

Todas as tabelas têm RLS. A regra é sempre a mesma: a linha só aparece se o
`org_id` dela estiver entre as empresas de que o usuário é membro.

Testado sem sessão, com a chave pública:

```
whatsapp_conexoes  0 linhas      organizacoes  0 linhas
whatsapp_envios    0 linhas      ativos        0 linhas
manutencoes        0 linhas
```

E com a chave de serviço aparece `[{"nome":"Tekvo"}]` — o dado existe; quem
barrou foi o RLS, não uma tabela vazia. Essa é a diferença entre estar protegido
e apenas parecer protegido.

Para evitar recursão infinita, as funções usadas dentro das policies
(`user_org_ids`, `user_admin_org_ids`) são `SECURITY DEFINER`.

---

## Segredos

Só o que tem prefixo `NEXT_PUBLIC_` vai ao navegador. Verificado nos arquivos
realmente entregues ao cliente:

```
.next/static + HTML:  sb_secret_...  ausente
                      EVOLUTION_API_KEY  ausente
                      CRON_SECRET  ausente
                      sb_publishable_...  presente  (público por design)
```

`lib/evolution.ts` e `lib/supabase/admin.ts` são marcados com `server-only`: se
alguém importar num componente de cliente, **o build falha** em vez de vazar.

---

## O que continua sendo responsabilidade sua

- **Rotacionar a `sb_secret_`** — ela foi compartilhada em conversa.
  Settings → API Keys → Rotate, atualizar na Vercel, Redeploy.
- **Senha mínima de 6 caracteres** é o padrão do Supabase. Para exigir mais,
  Authentication → Policies.
- **Ativar MFA** para as contas de proprietário, se o dado for sensível.
- **Backups**: o plano gratuito do Supabase não faz backup automático.

---

## Como reproduzir a auditoria

```bash
# Cabeçalhos
curl -sI https://sua-url.vercel.app/login | grep -iE "content-security|x-frame|strict-transport"

# Open redirect
curl -s "https://sua-url.vercel.app/login?redirect=//evil.com" | grep 'name="redirect"'
# esperado: value="/dashboard"

# Rotina protegida
curl -s -o /dev/null -w "%{http_code}\n" https://sua-url.vercel.app/api/notificacoes/disparar
# esperado: 401

# Segredos no bundle
grep -rl "sb_secret" .next/static | wc -l   # esperado: 0
```
