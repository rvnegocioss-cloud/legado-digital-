import Link from 'next/link'

interface Secao {
  id: string
  titulo: string
  path?: string
  texto: string[]
}

const SECOES: Secao[] = [
  {
    id: 'website',
    titulo: 'Website Institucional',
    path: '/',
    texto: [
      'Landing page pública — capta parceiros B2B (funerárias, cemitérios, prefeituras) e visitantes que querem buscar um memorial.',
      'Integração: linka pra "Acesso Parceiros" (/parceiro/login), "Acesso Familiar" (/familia/login), "Acesso Legado Central" (/admin/login) e o botão de busca (/busca).',
    ],
  },
  {
    id: 'central',
    titulo: 'Central Legado Digital',
    path: '/admin',
    texto: [
      'Equipe interna (Admin/Operador Legado Digital) opera tudo: parceiros, cemitérios, memoriais, usuários, e-mails disparados.',
      'Integração: enxerga TODOS os memoriais (diretos e de todo parceiro) via RLS `is_legado_staff()`. Consegue "entrar" no Portal de qualquer Parceiro sem logar de novo (botão na ficha do parceiro).',
    ],
  },
  {
    id: 'parceiro',
    titulo: 'Portal do Parceiro B2B',
    path: '/parceiro',
    texto: [
      'Funerária/prefeitura cadastra e edita só os próprios memoriais, edita a própria página pública (logo/descrição), e acompanha e-mails (senha da família, confirmação de placa) dos memoriais dela.',
      'Integração: mesma tabela `homenagens` da Central, restrita por `parceiro_id` via RLS `is_own_parceiro()`. O que o parceiro cadastra aparece automaticamente na Central.',
    ],
  },
  {
    id: 'familia',
    titulo: 'Portal da Família',
    path: '/familia/login + /familia/[slug]',
    texto: [
      'Família busca o memorial pelo nome do homenageado (nunca por slug/endereço técnico) e entra com a senha simples gerada automaticamente quando a Central/Parceiro cadastra o e-mail dela. Um e-mail só por memorial — sem conta, sem convite múltiplo.',
      'Integração: edita os mesmos campos (foto, vídeo, galeria, timeline, bio, frase) que a Central/Parceiro — tudo cai na mesma tabela `homenagens`, ninguém trabalha "por fora".',
    ],
  },
  {
    id: 'memorial',
    titulo: 'Página do Memorial',
    path: '/homenagem/[slug]',
    texto: [
      'Página pública, 100% servidor (sem JS client desnecessário). Acesso por QR Code, URL direta ou busca.',
      'Integração: se o memorial tem senha de acesso cadastrada, essa mesma senha bloqueia TANTO a busca quanto a entrada direta pelo link/QR (cookie assinado de 30 dias depois de verificar uma vez).',
    ],
  },
  {
    id: 'busca',
    titulo: 'Busca Pública',
    path: '/busca',
    texto: [
      'Busca por nome do homenageado, sem grade aberta com todos os memoriais (isso vazava privacidade — corrigido). Busca é sem sensibilidade a acento (função `buscar_homenagens_publicas`, extensão `unaccent`) — "jose" acha "José".',
      'Integração: mesmo componente (`BuscaMemorial.tsx`) usado em `/busca` e na sub-landing do parceiro (`/parceiros/[slug]`), só muda se filtra por `parceiro_id`.',
    ],
  },
  {
    id: 'sublanding',
    titulo: 'Sub-landing do Parceiro',
    path: '/parceiros/[slug]',
    texto: [
      'Página pública de cada parceiro — logo, descrição institucional, busca interna escopada só aos memoriais daquele parceiro.',
      'Integração: campos editáveis no dashboard do Portal do Parceiro E na ficha do parceiro na Central — os dois lados sempre em sincronia (mesma tabela `parceiros_b2b`).',
    ],
  },
  {
    id: 'mod-parceiros',
    titulo: 'Módulo Parceiros (Central)',
    path: '/admin/parceiros',
    texto: ['CRUD completo + ficha por parceiro (dados, plano/pagamento, memoriais dele, botão "Convidar contato" que cria o acesso ao Portal do Parceiro).'],
  },
  {
    id: 'mod-cemiterios',
    titulo: 'Módulo Cemitérios (Central)',
    path: '/admin/cemiterios',
    texto: ['Cadastro com mapa Leaflet/OpenStreetMap pra marcar localização (clique no mapa, sem chave de API). Base pra Fase 5 (mapeamento cemiterial avançado).'],
  },
  {
    id: 'mod-memoriais',
    titulo: 'Módulo Memoriais (Central)',
    path: '/admin/memoriais',
    texto: [
      'CRUD completo + ficha por memorial: dados, mídia, timeline, privacidade, QR Code, mensagem da placa, e-mail da família.',
      'Integração: QR Code gerado automaticamente ao criar/salvar, e-mail pro fornecedor de placas só sai depois que a família confirma a mensagem (ver Central de E-mails).',
    ],
  },
  {
    id: 'mod-emails',
    titulo: 'Central de E-mails',
    path: '/admin/emails + /parceiro/emails',
    texto: [
      'Log de todo e-mail disparado pelo sistema (senha da família, confirmação de placa, envio ao fornecedor) — status enviado/confirmado/erro, sem precisar abrir caixa de e-mail nenhuma.',
      'Integração: Central vê tudo, Parceiro vê só os e-mails dos próprios memoriais (RLS via `is_own_parceiro`).',
    ],
  },
  {
    id: 'mod-usuarios',
    titulo: 'Módulo Usuários (Central)',
    path: '/admin/usuarios',
    texto: ['Tela existe, ainda sem gestão real — planejado.'],
  },
  {
    id: 'mod-financeiro',
    titulo: 'Módulo Financeiro (Central)',
    texto: ['Contratos, planos, aquisições, fechamento mensal — Fase 4, ainda não construído.'],
  },
]

export default function ManualPage() {
  return (
    <div>
      <Link href="/admin/mapa" className="text-sm text-zinc-400 hover:text-white">
        ← Voltar pro Mapa
      </Link>

      <h1 className="text-2xl font-bold text-white mt-4 mb-2">Manual do Sistema</h1>
      <p className="text-zinc-400 text-sm mb-8 max-w-2xl">
        O que tem em cada página e como ela se integra com o resto — atualizado junto com o mapa,
        toda vez que algo muda de verdade.
      </p>

      <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 mb-8">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Neste manual</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
          {SECOES.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="text-sm text-blue-400 hover:underline">
              {s.titulo}
            </a>
          ))}
        </div>
      </div>

      <div className="space-y-8 max-w-2xl">
        {SECOES.map((s) => (
          <section key={s.id} id={s.id} className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 scroll-mt-6">
            <h2 className="text-lg font-medium text-white mb-1">{s.titulo}</h2>
            {s.path && <p className="text-xs text-zinc-500 font-mono mb-3">{s.path}</p>}
            {s.texto.map((p, i) => (
              <p key={i} className="text-sm text-zinc-400 mt-2 first:mt-0">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
