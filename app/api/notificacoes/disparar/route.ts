import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarTexto, estadoConexao } from "@/lib/evolution";
import { montarResumo, type Pendencia } from "@/lib/whatsapp-mensagem";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Comparação de tempo constante: não vaza o segredo por diferença de latência. */
function comparacaoSegura(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    // Ainda assim compara, para o tempo não denunciar o tamanho.
    timingSafeEqual(bb, bb);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

const HORARIO_PADRAO = 8;

function agoraEmBrasilia() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const v = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "00";
  return { hoje: `${v("year")}-${v("month")}-${v("day")}`, hora: Number(v("hour")) };
}

/**
 * Rotina diária: varre as empresas com WhatsApp conectado e manda o resumo
 * das manutenções atrasadas e a vencer.
 *
 * Chamada de hora em hora pelo pg_cron do Supabase (supabase/agendamento-whatsapp.sql)
 * e uma vez por dia pelo Vercel Cron (vercel.json), como reserva. Os dois mandam
 * `Authorization: Bearer ${CRON_SECRET}`. Cada empresa recebe uma vez por dia,
 * a partir do horário que escolheu.
 */
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET?.trim();

  if (!segredo) {
    return NextResponse.json(
      { erro: "CRON_SECRET não configurada. A rotina fica desligada até você definir a variável." },
      { status: 503 },
    );
  }

  // Só cabeçalho: segredo em query string vaza em log de acesso e no Referer.
  const enviado = request.headers.get("authorization") ?? "";

  if (!comparacaoSegura(enviado, `Bearer ${segredo}`)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  // Data e hora de Brasília: o servidor da Vercel roda em UTC, e às 21h daqui
  // já seria "amanhã" para ele.
  const { hoje, hora } = agoraEmBrasilia();
  const supabase = createAdminClient();

  // "*" em vez de listar colunas: se a migração v2 (horario_envio) ainda não
  // rodou, a rotina continua funcionando com o horário padrão.
  const { data: todas, error } = await supabase
    .from("whatsapp_conexoes")
    .select("*, organizacoes(nome)")
    .eq("notificar", true)
    .eq("status", "conectado");

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  // Chegou a hora (ou já passou: se uma rodada falhar, a próxima cobre). Quem
  // já recebeu hoje é pulado logo abaixo.
  const conexoes = (todas ?? []).filter(
    (c) => Number(c.horario_envio ?? HORARIO_PADRAO) <= hora,
  );

  const resultado = {
    hora,
    verificadas: conexoes.length,
    enviadas: 0,
    puladas: 0,
    falhas: [] as { org: string; motivo: string }[],
  };

  for (const conexao of conexoes) {
    const empresa =
      (conexao.organizacoes as unknown as { nome?: string } | null)?.nome ?? "Sua empresa";

    try {
      // Já mandou hoje? A restrição única impede duplicidade se o cron repetir.
      const { data: jaEnviado } = await supabase
        .from("whatsapp_envios")
        .select("id")
        .eq("org_id", conexao.org_id)
        .eq("data_referencia", hoje)
        .eq("sucesso", true)
        .maybeSingle();

      if (jaEnviado) {
        resultado.puladas++;
        continue;
      }

      if (!conexao.numero) {
        resultado.falhas.push({ org: empresa, motivo: "sem número conectado" });
        continue;
      }

      const estado = await estadoConexao(conexao.instancia);
      if (estado !== "open") {
        await supabase
          .from("whatsapp_conexoes")
          .update({ status: "desconectado" })
          .eq("org_id", conexao.org_id);
        resultado.falhas.push({ org: empresa, motivo: `WhatsApp ${estado}` });
        continue;
      }

      const { data: pendencias } = await supabase.rpc("whatsapp_pendencias", {
        p_org: conexao.org_id,
      });

      const lista = (pendencias ?? []) as Pendencia[];

      // Nada pendente: não incomoda o usuário.
      if (lista.length === 0) {
        resultado.puladas++;
        continue;
      }

      await enviarTexto(conexao.instancia, conexao.numero, montarResumo(empresa, lista));

      // upsert: uma falha anterior no mesmo dia já ocupa a linha (e a rodada
      // seguinte tenta de novo — só envio com sucesso encerra o dia).
      await supabase.from("whatsapp_envios").upsert(
        {
          org_id: conexao.org_id,
          data_referencia: hoje,
          quantidade: lista.length,
          sucesso: true,
          detalhe: null,
        },
        { onConflict: "org_id,data_referencia" },
      );

      await supabase
        .from("whatsapp_conexoes")
        .update({ ultimo_envio: new Date().toISOString() })
        .eq("org_id", conexao.org_id);

      resultado.enviadas++;
    } catch (e) {
      const motivo = e instanceof Error ? e.message : "erro desconhecido";
      resultado.falhas.push({ org: empresa, motivo });

      await supabase
        .from("whatsapp_envios")
        .upsert(
          { org_id: conexao.org_id, data_referencia: hoje, sucesso: false, detalhe: motivo },
          { onConflict: "org_id,data_referencia" },
        );
    }
  }

  return NextResponse.json(resultado);
}
