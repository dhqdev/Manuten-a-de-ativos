-- ============================================================================
--  AGENDADOR DE HORA EM HORA DO RESUMO DO WHATSAPP (pg_cron + pg_net)
--
--  Por quê: o plano gratuito da Vercel só permite um cron por dia, então todo
--  mundo receberia às 8h. Com este agendador (gratuito, roda dentro do próprio
--  Supabase) a rotina é chamada a cada hora e cada empresa recebe no horário
--  escolhido em Configurações → WhatsApp.
--
--  Antes de rodar:
--    1. Troque SUA_URL pela URL do app na Vercel (sem barra no final).
--    2. Troque SEU_CRON_SECRET pelo mesmo valor da variável CRON_SECRET da Vercel.
--  Pode rodar de novo para atualizar URL ou segredo.
--
--  O cron da Vercel (vercel.json) continua como reserva: se este agendador
--  falhar, quem escolheu até 8h ainda recebe. Ninguém recebe duas vezes no
--  mesmo dia (whatsapp_envios tem restrição única por empresa e dia).
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove o agendamento anterior, se existir.
select cron.unschedule(jobid) from cron.job where jobname = 'resumo-whatsapp';

select cron.schedule(
  'resumo-whatsapp',
  '1 * * * *',   -- minuto 1 de toda hora
  $$
    select net.http_get(
      url     := 'SUA_URL/api/notificacoes/disparar',
      headers := jsonb_build_object('Authorization', 'Bearer SEU_CRON_SECRET'),
      timeout_milliseconds := 60000
    );
  $$
);

-- Conferir:   select * from cron.job;
-- Execuções:  select * from cron.job_run_details order by start_time desc limit 10;
-- Respostas:  select status_code, content from net._http_response order by created desc limit 10;
