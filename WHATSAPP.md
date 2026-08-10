# Notificações por WhatsApp (Evolution API)

Cada empresa conecta o próprio WhatsApp lendo um QR code dentro do sistema e
passa a receber, toda manhã, o resumo das manutenções atrasadas e a vencer.

---

## Como funciona para o usuário

1. **Configurações → Notificações por WhatsApp → Conectar WhatsApp**
2. O QR code aparece na tela (ele se renova sozinho a cada poucos segundos).
3. No celular: WhatsApp → **Configurações → Aparelhos conectados → Conectar um aparelho**.
4. Assim que a leitura acontece, a tela muda sozinha e mostra o número conectado.
5. Ali mesmo dá para ajustar:
   - receber ou não o resumo diário;
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

`GET /api/notificacoes/disparar`, protegida por `CRON_SECRET`.

Agendada no `vercel.json` para **11:00 UTC (8h de Brasília)**:

```json
{ "crons": [{ "path": "/api/notificacoes/disparar", "schedule": "0 11 * * *" }] }
```

> O plano Hobby da Vercel permite **um disparo por dia** por cron. Por isso o
> resumo é diário e sem horário configurável por empresa. Se quiser horários
> diferentes por cliente, é preciso o plano Pro (ou apontar um agendador externo
> para a mesma URL).

Para cada empresa conectada, a rotina:

1. confere se já enviou hoje (a tabela `whatsapp_envios` tem restrição única por
   empresa e dia, então nem uma repetição do cron duplica a mensagem);
2. confirma que o WhatsApp continua conectado — se caiu, marca como desconectado;
3. busca as pendências via `whatsapp_pendencias()`;
4. envia e registra.

### Testar sem esperar o dia seguinte

```bash
curl "https://sua-url.vercel.app/api/notificacoes/disparar?segredo=SEU_CRON_SECRET"
```

Resposta:

```json
{ "verificadas": 1, "enviadas": 1, "puladas": 0, "falhas": [] }
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

1. Rode [`supabase/migracao-whatsapp.sql`](supabase/migracao-whatsapp.sql) no SQL Editor
   (ou o `schema.sql` inteiro, que já inclui essa parte).
2. Cadastre na Vercel: `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `SUPABASE_SECRET_KEY`
   e `CRON_SECRET`.
3. Faça o Redeploy.

## Observações operacionais

- **Uma instância por empresa.** Ao desconectar pelo sistema, a instância é
  removida da Evolution — não fica lixo acumulado no servidor.
- **WhatsApp desconecta sozinho** se o celular ficar muito tempo offline ou se o
  aparelho for removido pelo app. Nesse caso a rotina marca como desconectado e o
  usuário só precisa ler o QR de novo.
- **Não use um número que já esteja em outra instância** da sua Evolution
  (`Tekvo_Achados`, `David_planejai`) — o WhatsApp permite vários aparelhos
  conectados, mas cada instância precisa do seu próprio pareamento.
