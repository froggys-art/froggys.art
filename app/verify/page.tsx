"use client"

import { useMemo, useState } from 'react'
import { bech32Address } from '@/lib/validation'

function isTaproot(addr?: string) {
  return !!addr && (addr.startsWith('bc1p') || addr.startsWith('tb1p'))
}

export default function VerifyPage() {
  const [frogId, setFrogId] = useState<number | ''>('')
  const [inscriptionId, setInscriptionId] = useState('')
  const [address, setAddress] = useState<string>('')
  const [pubkey, setPubkey] = useState<string>('')
  const [challenge, setChallenge] = useState('')
  const [nonce, setNonce] = useState('')
  const [status, setStatus] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState<boolean | null>(null)
  const taproot = useMemo(() => isTaproot(address), [address])

  async function connectUniSat() {
    // Prefer UniSat if available
    const anyWindow = window as any
    if (!anyWindow.unisat) {
      setStatus('UniSat not detected. Please install UniSat or use a supported wallet.')
      return
    }
    try {
      setStatus('Connecting UniSat...')
      const accs: string[] = await anyWindow.unisat.getAccounts?.() || await anyWindow.unisat.requestAccounts?.()
      const addr = accs?.[0]
      if (!addr) throw new Error('No address')
      const pk = await anyWindow.unisat.getPublicKey?.()
      setAddress(addr)
      if (pk) setPubkey(pk)
      setStatus(`Connected: ${addr.slice(0, 8)}...${addr.slice(-6)}`)
    } catch (e: any) {
      setStatus(e?.message || 'Connect failed')
    }
  }

  async function getChallenge() {
    if (!frogId || !inscriptionId) {
      setStatus('Enter Frog ID and Inscription ID')
      return
    }
    try {
      setLoading(true)
      setStatus('Requesting challenge...')
      const r = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ frogId: Number(frogId), inscriptionId }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'Failed to get challenge')
      setChallenge(j.challenge)
      setNonce(j.nonce)
      setStatus('Challenge ready. Please review and sign.')
    } catch (e: any) {
      setStatus(e?.message || 'Challenge failed')
    } finally {
      setLoading(false)
    }
  }

  async function signAndVerify() {
    try {
      if (!address) throw new Error('Connect a wallet first')
      if (!challenge || !nonce) throw new Error('Request a challenge first')
      const anyWindow = window as any

      let signature = ''
      if (anyWindow.unisat?.signMessage) {
        setStatus('Signing message with UniSat...')
        signature = await anyWindow.unisat.signMessage(challenge)
      } else {
        throw new Error('No supported wallet signer detected')
      }

      // If not taproot, prefer PSBT (not yet implemented) for broader compatibility
      if (!taproot) {
        setStatus('Non-taproot address detected; message verification may fail. PSBT flow coming soon.')
      }

      setStatus('Verifying on server...')
      const r = await fetch('/api/verify-message', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          frogId: Number(frogId),
          inscriptionId,
          address,
          signature,
          pubkey: taproot ? pubkey : undefined,
          nonce,
        }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || 'Verification failed')
      setOk(true)
      setStatus(`✅ Verified! Froggy ID: ${j.froggyId}`)
    } catch (e: any) {
      setOk(false)
      setStatus(e?.message || 'Verification failed')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Verify Holder</h1>

      <div className="card space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Frog ID</label>
            <input className="input" type="number" value={frogId}
              onChange={(e) => setFrogId(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="123" />
          </div>
          <div>
            <label className="block text-sm mb-1">Inscription ID</label>
            <input className="input" value={inscriptionId} onChange={(e) => setInscriptionId(e.target.value)} placeholder="inscription id" />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button className="btn" onClick={connectUniSat}>Connect UniSat</button>
          {address && <span className="text-sm text-slate-300">{address}</span>}
        </div>

        <div className="flex items-center gap-3">
          <button className="btn" disabled={loading || !frogId || !inscriptionId} onClick={getChallenge}>Get Challenge</button>
          <button className="btn" disabled={!challenge || !address} onClick={signAndVerify}>Sign & Verify</button>
        </div>

        {challenge && (
          <pre className="whitespace-pre-wrap text-sm bg-slate-900/60 p-3 rounded border border-slate-800 mt-2 max-h-60 overflow-auto">{challenge}</pre>
        )}

        {status && (
          <div className={`text-sm ${ok === true ? 'text-emerald-400' : ok === false ? 'text-red-400' : 'text-slate-300'}`}>{status}</div>
        )}

        {!taproot && address && (
          <div className="text-xs text-amber-300">
            Tip: Non-taproot address detected (bc1q...). If message signing fails, use PSBT flow (coming soon).
          </div>
        )}
      </div>
    </div>
  )
}
