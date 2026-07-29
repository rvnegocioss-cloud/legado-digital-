import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMemorialStorageUsage } from '@/lib/storageUsage'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(req: NextRequest) {
  const memorialId = req.nextUrl.searchParams.get('memorialId')
  if (!memorialId) {
    return NextResponse.json({ error: 'memorialId obrigatório' }, { status: 400 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
  const usageBytes = await getMemorialStorageUsage(supabaseAdmin, memorialId)

  return NextResponse.json({ usageBytes })
}
