import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface PerfilLink {
  perfis: { nome: string } | null;
}

export async function GET(req: NextRequest) {
  // Bug real corrigido aqui (auditoria 2026-07-24): `(req as any).headers.authorization`
  // nunca existe num objeto Headers de verdade (só tem .get()) - a rota estava
  // sempre bloqueando por acidente, nunca por autenticação de propósito. Corrigido
  // com o mesmo padrao staff-only usado em consultar-cpf/consultar-cnpj, não só
  // com a leitura certa do header (isso sozinho abriria a rota pra qualquer token).
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAuth = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !userData.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('usuarios_perfis(perfis(nome))')
      .eq('email', userData.user.email)
      .single()

    const papeis = ((usuario?.usuarios_perfis || []) as unknown as PerfilLink[]).map((up) => up.perfis?.nome)
    const ehStaff = papeis.includes('Admin Legado Digital') || papeis.includes('Operador Legado Digital')
    if (!ehStaff) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const data = new Date().toISOString().split("T")[0];

    // Lista de tabelas conhecidas
    const tables = [
      "usuarios",
      "perfis",
      "permissoes",
      "usuarios_perfis",
      "parceiros_b2b",
      "cemiterios",
      "homenagens",
      "homenagens_seguranca",
      "emails_enviados",
      "configuracoes_sistema",
      "mapa_sugestoes",
      "lapides",
      "gavetas",
      "parceiros_contatos",
    ];

    const backup: Record<
      string,
      { count: number | null; status: string; error?: string }
    > = {};

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true });

        if (error) {
          backup[table] = { count: null, status: "ERRO", error: error.message };
        } else {
          backup[table] = { count: count || 0, status: "OK" };
        }
      } catch (e) {
        backup[table] = {
          count: null,
          status: "ERRO",
          error: (e as Error).message,
        };
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      data_backup: data,
      projeto: "Legado Digital",
      tabelas: backup,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
