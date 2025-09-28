import { NextResponse } from 'next/server'
import { db } from '@/db/client'
import { frogLinks } from '@/db/schema'

export const runtime = 'nodejs'

export async function GET() {
  const rows = db.select().from(frogLinks).all()
  const header = ['frog_id', 'froggy_id', 'inscription_id', 'owner_address', 'method', 'created_at']
  const body = rows.map((r) => [r.frogId, r.froggyId, r.inscriptionId, r.ownerAddress, r.method, r.createdAt])
  const csv = [header, ...body]
    .map((line) => line.map((v) => String(v).replaceAll('"', '""')).map((v) => `"${v}`.concat('"')).join(','))
    .join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="frog_links.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
