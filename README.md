# 🕯️ Legado Digital

Plataforma de homenagens póstumas digitais — elegante, respeitosa e pronta para escalar.

---

## 📌 Sobre o Projeto

O **Legado Digital** é uma aplicação web que permite criar páginas de homenagem personalizadas para entes queridos, com foto, biografia, galeria de fotos, vídeo e um livro de condolências online.

Desenvolvido com foco em design **minimalista e de alta classe**, utilizando uma paleta sóbria em tons de *stone/slate* com detalhes em dourado metálico.

---

## 🚀 Tecnologias

- [Next.js 16](https://nextjs.org/) — App Router
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) — integração ativa (homenagens + livro de condolências)

---

## 📁 Estrutura de Pastas

```
legado-digital/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── homenagem/
│       └── [id]/
│           └── page.tsx        ← página dinâmica por homenagem
├── components/
│   └── HomenagemTemplate.tsx   ← componente principal
├── public/
├── README.md
├── package.json
└── tailwind.config.ts
```

---

## ⚙️ Como Rodar Localmente

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/legado-digital.git
cd legado-digital

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Preencha com suas credenciais do Supabase

# 4. Rode o servidor de desenvolvimento
npm run dev
```

Acesse em: `http://localhost:3000`

---

## 🔌 Integração com Supabase

O componente já está preparado para conexão com banco de dados. Procure pelos comentários `// TODO: Integrar com Supabase` no arquivo `HomenagemTemplate.tsx`.

As credenciais ficam em `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`) e são lidas em `lib/supabase.ts`.

As mensagens do livro de condolências são gravadas na tabela `homenagens`, vinculadas pela coluna `memorial_slug`.

---

## 🎨 Design

| Elemento | Escolha |
|---|---|
| Tipografia display | Cormorant Garamond |
| Tipografia corpo | Lato |
| Paleta base | Stone / Slate escuro `#1a1917` |
| Acento | Dourado metálico `#b8973a` |
| Estilo | Minimalista, High-End, Mobile-First |

---

## 📄 Licença

MIT © Legado Digital
