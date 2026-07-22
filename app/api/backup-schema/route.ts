import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { authorization } = (req as any).headers || {}
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
          .select("*", { count: "exact" });

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
      ref: "yegvazxycfrbhblyzvhg",
      tabelas: backup,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
