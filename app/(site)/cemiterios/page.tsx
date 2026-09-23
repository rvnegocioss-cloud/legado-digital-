import Link from "next/link";
import { MapPin } from "lucide-react";
import { supabaseServidor as supabase } from "@/lib/supabaseServidor";
import "./cemiterios.css";

// Padronizada em 2026-09-23: saiu do lib/publicTheme (Georgia, 960px, fundo
// em gradiente) e passou a usar os tokens de app/tokens.css, alinhando na
// mesma largura do menu e do rodapé. Backup do arquivo original em
// `Desktop\Paginas Originais - Cemiterios\`.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cemitérios — Legado Digital",
  description: "Encontre memoriais digitais por cidade e cemitério.",
};

interface CidadePublica {
  cidade: string;
  estado: string;
  cidade_slug: string;
  total_cemiterios: number;
}

export default async function CemiteriosPage() {
  const { data } = await supabase.rpc("listar_cidades_publicas");
  const cidades = (data || []) as CidadePublica[];

  return (
    <div className="cem">


      <main>
        <p className="eyebrow">Em memória</p>
        <h1>Cemitérios mapeados</h1>
        <p className="subtitulo">
          Escolha uma cidade para ver os cemitérios mapeados e os memoriais publicados neles.
        </p>

        {cidades.length === 0 ? (
          <p className="vazio">Nenhum cemitério público cadastrado ainda.</p>
        ) : (
          <div className="grade">
            {cidades.map((c) => (
              <Link key={c.cidade_slug} href={`/cemiterios/${c.cidade_slug}`} className="card">
                <div className="anel">
                  <MapPin size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="nome">
                    {c.cidade} — {c.estado}
                  </p>
                  <p className="meta">
                    {c.total_cemiterios} {c.total_cemiterios === 1 ? "cemitério" : "cemitérios"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>


    </div>
  );
}
