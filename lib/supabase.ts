import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Client criado sob demanda (nao na importacao do modulo) - evitar corrida
// com a injecao de env var durante "Collecting page data" da Vercel, que
// roda em fase separada e as vezes ainda nao tem process.env populado
// quando o modulo e avaliado (causava "supabaseUrl is required" em builds
// intermitentes, sempre em rotas dinamicas [slug] diferentes).
let client: SupabaseClient | null = null

function getClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver)
  },
})