import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Satellite } from "lucide-react";
import { supabaseServidor as supabase } from "@/lib/supabaseServidor";
import SiteNav from "@/components/public/SiteNav";
import SiteFooter from "@/components/public/SiteFooter";
import "../cemiterios.css";

// Padronizada em 2026-09-23 junto com as outras páginas de cemitério.
// Backup do arquivo original em `Desktop\Paginas Originais - Cemiterios\`.

export const dynamic = "force-dynamic";

interface CemiterioPublico {
  slug: string;
  nome: string;
  endereco: string | null;
  cidade: string;
  estado: string;
  latitude: number | null;
  longitude: number | null;
  tem_ortomosaico: boolean;
}

export default async function CidadeCemiteriosPage({
  params,
}: {
  params: Promise<{ cidade: string }>;
}) {
  const { cidade } = await params;
  const { data } = await supabase.rpc("listar_cemiterios_publicos", { p_cidade_slug: cidade });
  const cemiterios = (data || []) as CemiterioPublico[];

  if (cemiterios.length === 0) {
    notFound();
  }

  const { cidade: nomeCidade, estado } = cemiterios[0];

  return (
    <div className="cem">
      <SiteNav />

      <main>
        <Link href="/cemiterios" className="voltar">
          ← Voltar pros cemitérios
        </Link>

        <p className="eyebrow">Em memória</p>
        <h1>
          {nomeCidade} — {estado}
        </h1>
        <p className="subtitulo">Cemitérios mapeados nesta cidade.</p>

        <div className="grade">
          {cemiterios.map((c) => (
            <Link key={c.slug} href={`/cemiterios/${cidade}/${c.slug}`} className="card">
              <div className="anel">
                <MapPin size={20} strokeWidth={1.5} />
              </div>
              <div>
                <p className="nome">{c.nome.trim()}</p>
                {c.endereco && <p className="meta">{c.endereco.trim()}</p>}
                {c.tem_ortomosaico && (
                  <span className="selo">
                    <Satellite size={11} strokeWidth={1.5} style={{ verticalAlign: -1 }} /> Mapa aéreo
                    de drone
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
