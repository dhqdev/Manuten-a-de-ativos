export type PapelMembro = "proprietario" | "gestor" | "tecnico" | "leitor";
export type UnidadePeriodicidade = "dias" | "meses" | "horas";
export type StatusAtivo = "ativo" | "manutencao" | "inativo" | "baixado";
export type TipoManutencao = "preventiva" | "corretiva" | "preditiva" | "inspecao" | "melhoria";
export type SituacaoPlano = "em_dia" | "proxima" | "atrasada" | "inativo";

export type Organizacao = {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  endereco: string | null;
  logo_url: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  cargo: string | null;
  avatar_url: string | null;
  org_atual: string | null;
};

export type Categoria = {
  id: string;
  org_id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  icone: string;
  ordem: number;
  created_at: string;
};

export type Ativo = {
  id: string;
  org_id: string;
  categoria_id: string;
  nome: string;
  modelo: string | null;
  marca: string | null;
  identificacao: string | null;
  ano: number | null;
  data_cadastro: string;
  horimetro_atual: number;
  status: StatusAtivo;
  foto_url: string | null;
  observacoes: string | null;
  created_at: string;
};

export type Manutencao = {
  id: string;
  org_id: string;
  ativo_id: string;
  plano_id: string | null;
  tipo: TipoManutencao;
  data_manutencao: string;
  descricao: string;
  pecas: string | null;
  valor: number;
  responsavel: string | null;
  empresa: string | null;
  nota_fiscal: string | null;
  garantia_dias: number;
  garantia_ate: string | null;
  horimetro: number | null;
  observacoes: string | null;
  created_at: string;
};

export type ManutencaoCompleta = Manutencao & {
  ativo_nome: string;
  ativo_identificacao: string | null;
  ativo_marca: string | null;
  ativo_modelo: string | null;
  categoria_id: string;
  categoria_nome: string;
  categoria_cor: string;
  total_anexos: number;
};

export type Anexo = {
  id: string;
  org_id: string;
  manutencao_id: string;
  nome: string;
  path: string;
  tipo_mime: string | null;
  tamanho: number | null;
  created_at: string;
};

export type PlanoManutencao = {
  id: string;
  org_id: string;
  ativo_id: string;
  tipo: string;
  descricao: string | null;
  periodicidade_valor: number;
  periodicidade_unidade: UnidadePeriodicidade;
  proxima_data: string | null;
  proximo_horimetro: number | null;
  alerta_antecedencia_dias: number;
  alerta_antecedencia_horas: number;
  ultima_data: string | null;
  ultimo_horimetro: number | null;
  responsavel: string | null;
  custo_estimado: number | null;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
};

export type PlanoStatus = PlanoManutencao & {
  ativo_nome: string;
  ativo_identificacao: string | null;
  horimetro_atual: number;
  categoria_id: string;
  categoria_nome: string;
  categoria_cor: string;
  dias_restantes: number | null;
  horas_restantes: number | null;
  situacao: SituacaoPlano;
};

export type DashboardResumo = {
  total_ativos: number;
  total_categorias: number;
  gasto_mes: number;
  gasto_ano: number;
  manutencoes_mes: number;
  alertas_proximas: number;
  alertas_atrasadas: number;
};

/** Filtros escolhidos na tela de relatórios. */
export type FiltrosRelatorio = {
  de: string;
  ate: string;
  categoria: string;
  ativo: string;
  tipo: "todos" | TipoManutencao;
};

export type DadosDoRelatorio =
  | { ok: true; manutencoes: ManutencaoCompleta[]; proximas: PlanoStatus[] }
  | { ok: false; erro: string };
