import SiteNav from "@/components/public/SiteNav";
import SiteFooter from "@/components/public/SiteFooter";

// ============================================================================
// CASCA DO SITE PÚBLICO
// ============================================================================
//
// `(site)` é um route group do Next.js: agrupa rotas sem entrar na URL.
// `/busca` continua sendo `/busca` -- o nome do grupo some do endereço.
//
// Esta casca monta o menu e o rodapé UMA VEZ, para todas as páginas públicas.
// Antes, cada uma das 8 páginas importava e montava `SiteNav`/`SiteFooter` por
// conta própria: mudar um item de menu obrigava a lembrar de 8 arquivos, e foi
// exatamente assim que as páginas foram divergindo entre si.
//
// A regra que fecha o barramento, tirada do wireframe do Pedro (tela
// "Navegação e casca"): NENHUMA PÁGINA PÚBLICA MONTA O PRÓPRIO CABEÇALHO.
// A página entrega conteúdo; topo, migalhas e rodapé são da casca.
//
// As migalhas NÃO ficam aqui: elas dependem do dado que cada página carregou
// (o memorial sabe seu cemitério e seu jazigo), então cada página renderiza o
// próprio `<Migalhas trilha={...} />` logo no começo do conteúdo. A casca
// garante topo e rodapé; a trilha é derivada do dado, como o wireframe exige.
//
// Fora deste grupo, de propósito:
//   - app/homenagem/[slug]  -> página do memorial, protegida pela regra 21
//   - app/fio-da-vida       -> landing antiga preservada, tem casca própria
//   - app/admin | parceiro | familia -> casca de aplicação (menu lateral)
//
// Referência: docs oficiais de Route Groups do Next.js, e a convenção usada em
// github.com/georgwittberger/next-app-router-template e
// github.com/rashedxali/next-js-frontend-best-practices.

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      {children}
      <SiteFooter />
    </>
  );
}
