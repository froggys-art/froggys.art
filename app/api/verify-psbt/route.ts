import { NextResponse } from 'next/server'
import { VerifyPsbtInput } from '@/lib/validation'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = VerifyPsbtInput.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
    }

    // TODO: Implement PSBT verification (build OP_RETURN PSBT server-side; verify signatures and owner address)
    return NextResponse.json({ error: 'PSBT verification not implemented yet' }, { status: 501 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Server error' }, { status: 500 })
  }
}
