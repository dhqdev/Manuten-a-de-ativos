# Notificações por WhatsApp (Evolution API)

Cada empresa conecta o próprio WhatsApp lendo um QR code dentro do sistema e
passa a receber, todo dia no horário que escolher, o resumo das manutenções
atrasadas e a vencer.

---

## Como funciona para o usuário

1. **Configurações → Notificações por WhatsApp → Conectar WhatsApp**
2. O QR code aparece na tela (ele se renova sozinho a cada poucos segundos).
3. No celular: WhatsApp → **Configurações → Aparelhos conectados → Conectar um aparelho**.
4. Assim que a leitura acontece, a tela muda sozinha e mostra o número conectado.
5. Ali mesmo dá para ajustar:
   - receber ou não o resumo diário;
   - **horário do envio** (hora cheia, horário de Brasília);
   - incluir ou não as atrasadas;
   - com quantos dias de antecedência avisar;
   - **Enviar teste**, que dispara na hora o mesmo texto da rotina diária.

Se não houver nada pendente, **nada é enviado** — o objetivo é não virar ruído.

---

## Como funciona por dentro

Cada empresa vira uma instância na Evolution, nomeada `manut_<id-da-empresa>`.
A tabela `whatsapp_conexoes` guarda o vínculo, o número e as preferências.

```
Navegador                Servidor (Next)              Evolution API
    │                          │                            │
    │  "Conectar WhatsApp"     │                            │
    ├─────────────────────────►│  POST /instance/create     │
    │                          ├───────────────────────────►│
    │  ◄── QR (imagem) ────────┤                            │
    │                          │                            │
    │  a cada 5s: "já leu?"    │  GET /connectionState      │
    ├─────────────────────────►├───────────────────────────►│
    │  ◄── conectado + número ─┤                            │
```

A chave da Evolution **nunca vai para o navegador**: todas as chamadas saem do
servidor. O arquivo `lib/evolution.ts` é marcado como `server-only`, o que faz o
build falhar se alguém tentar importá-lo em um componente de cliente.

### A rotina diária

`GET /api/notificacoes/disparar`, protegida por `CRON_SECRET` (só no cabeçalho
`Authorization: Bearer ...`).

Ela é chamada **de hora em hora** por um agendador gratuito do próprio Supabase
(pg_cron), e cada empresa recebe a partir do horário que escolheu. O plano Hobby
da Vercel só permite um cron por dia, por isso o agendamento de hora em hora
fica no Supabase.

Para ligar: abra [`supabase/agendamento-whatsapp.sql`](supabase/agendamento-whatsapp.sql),
troque `SUA_URL` e `SEU_CRON_SECRET` e rode no SQL Editor.

O cron da Vercel (`vercel.json`, 11:00 UTC = 8h de Brasília) continua como
reserva: se o agendador do Supabase não estiver configurado, só quem escolheu
até 8h recebe.

Para cada empresa conectada, a rotina:

1. confere se já chegou o horário da empresa e se ela já recebeu hoje (data de
   Brasília; `whatsapp_envios` tem restrição única por empresa e dia, então nem
   uma repetição do cron duplica a mensagem — uma falha é tentada de novo na
   hora seguinte);
2. confirma que o WhatsApp continua conectado — se caiu, marca como desconectado;
3. busca as pendências via `whatsapp_pendencias()`;
4. envia e registra.

### Testar sem esperar o dia seguinte

```bash
curl -H "Authorization: Bearer SEU_CRON_SECRET" https://sua-url.vercel.app/api/notificacoes/disparar
```

Ou use **Enviar teste** em Configurações → WhatsApp.

Resposta:

```json
{ "hora": 8, "verificadas": 1, "enviadas": 1, "puladas": 0, "falhas": [] }
```

Para reenviar no mesmo dia, apague a linha do dia em `whatsapp_envios`.

---

## Exemplo da mensagem

```
*Manutenções — Tekvo*
_10/08/2026_

🔴 *ATRASADAS (1)*
• *Caminhão Volvo FH 540* (ABC-1D23)
  Revisão dos freios — 10 dia(s) em atraso

🟡 *PRÓXIMAS (2)*
• *Caminhão Volvo FH 540* (ABC-1D23)
  Troca de óleo e filtros — em 2 dia(s) — 12/08/2026
• *Empilhadeira Hyster*
  Lubrificação geral — faltam 20 h

Abrir calendário: https://sua-url.vercel.app/calendario
```

---

## Instalação

1. Rode [`supabase/migracao-whatsapp.sql`](supabase/migracao-whatsapp.sql) e
   [`supabase/migracao-v2.sql`](supabase/migracao-v2.sql) no SQL Editor
   (ou o `schema.sql` inteiro, que já inclui as duas).
2. Configure o agendador: [`supabase/agendamento-whatsapp.sql`](supabase/agendamento-whatsapp.sql).
3. Cadastre na Vercel: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `SUPABASE_SECRET_KEY`
   e `CRON_SECRET`.
4. Faça o Redeploy.

## Observações operacionais

- **Uma instância por empresa.** Ao desconectar pelo sistema, a instância é
  removida da Evolution — não fica lixo acumulado no servidor.
- **WhatsApp desconecta sozinho** se o celular ficar muito tempo offline ou se o
  aparelho for removido pelo app. Nesse caso a rotina marca como desconectado e o
  usuário só precisa ler o QR de novo.
- **Não use um número que já esteja em outra instância** da sua Evolution
  (`Tekvo_Achados`, `David_planejai`) — o WhatsApp permite vários aparelhos
  conectados, mas cada instância precisa do seu próprio pareamento.
