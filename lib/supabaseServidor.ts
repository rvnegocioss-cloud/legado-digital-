import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Client com service role — só pra Server Components/rotas server-side que
// leem dado que não pode passar pela chave anon (ex: página pública do
// memorial, que precisa aplicar o gate de privacidade ANTES de expor o
// dado, e a policy de leitura pública de `homenagens` foi revogada de
// `anon` justamente por causa disso — ver migration
// 20260731_fecha_leitura_anon_memorial.sql).
if (typeof window !== 'undefined') {
  throw new Error('lib/supabaseServidor.ts nunca pode ser importado em código client — usa a service role key.')
}

let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return client
}

export const supabaseServidor = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver)
  },
})
