import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return user
}

export async function getAdminUser() {
  const user = await getCurrentUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('usuarios')
    .select(`
      *,
      usuarios_perfis (
        perfis (
          id,
          nome
        )
      )
    `)
    .eq('email', user.email)
    .single()

  if (error || !data || !data.ativo) return null
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}