import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Senha temporária única para os 3 (mínimo de 6 caracteres exigido pelo Supabase) — trocar depois do primeiro login
const TEMP_PASSWORD = '123456'

// Edite esta lista com os sócios antes de rodar
const socios = [
  { email: 'rvnegocioss@gmail.com', nome: 'Rafael Oliveira Abrão', papel: 'Admin Legado Digital' },
  { email: 'ricrodalves@gmail.com', nome: 'Ricardo Alves', papel: 'Admin Legado Digital' },
  { email: 'pedro.saraiva@estouonline.com.br', nome: 'Pedro Paulo Saraiva', papel: 'Admin Legado Digital' },
]

async function main() {
  const { data: perfis, error: perfisError } = await supabase.from('perfis').select('id, nome')
  if (perfisError) throw perfisError

  const {
    data: { users: existingUsers },
    error: listError,
  } = await supabase.auth.admin.listUsers({ perPage: 200 })
  if (listError) throw listError

  for (const socio of socios) {
    const perfil = perfis.find((p) => p.nome === socio.papel)
    if (!perfil) {
      console.error(`Papel "${socio.papel}" não encontrado para ${socio.email}`)
      continue
    }

    const existing = existingUsers.find((u) => u.email === socio.email)
    let userId

    if (existing) {
      const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
        password: TEMP_PASSWORD,
        email_confirm: true,
      })
      if (error) {
        console.error(`Erro ao definir senha de ${socio.email}:`, error.message)
        continue
      }
      userId = data.user.id
      console.log(`✓ Senha temporária definida para ${socio.email} (conta já existia)`)
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: socio.email,
        password: TEMP_PASSWORD,
        email_confirm: true,
        user_metadata: { nome: socio.nome },
      })
      if (error) {
        console.error(`Erro ao criar ${socio.email}:`, error.message)
        continue
      }
      userId = data.user.id
      console.log(`✓ ${socio.email} criado com senha temporária`)
    }

    const { data: vinculoExistente } = await supabase
      .from('usuarios_perfis')
      .select('usuario_id')
      .eq('usuario_id', userId)
      .eq('perfil_id', perfil.id)
      .maybeSingle()

    if (!vinculoExistente) {
      const { error: vinculoError } = await supabase
        .from('usuarios_perfis')
        .insert({ usuario_id: userId, perfil_id: perfil.id })
      if (vinculoError) {
        console.error(`Erro ao vincular papel de ${socio.email}:`, vinculoError.message)
      } else {
        console.log(`  → papel "${socio.papel}" vinculado`)
      }
    }
  }
}

main()
