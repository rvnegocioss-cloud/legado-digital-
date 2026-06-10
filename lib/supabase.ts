import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yegvazxycfrbhblyzvhg.supabase.co'
const supabaseKey = 'sb_publishable_Ut5ioUdxA7wOuiiixbvvTQ_EotELE-B'

export const supabase = createClient(supabaseUrl, supabaseKey)