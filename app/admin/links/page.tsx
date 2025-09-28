import { db } from '@/db/client'
import { frogLinks } from '@/db/schema'

export const dynamic = 'force-dynamic'

export default async function AdminLinksPage() {
  const rows = db.select().from(frogLinks).all()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin · Links</h1>
        <a className="btn" href="/admin/links/export">Export CSV</a>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-slate-800">
          <thead className="bg-slate-900/60">
            <tr className="text-left">
              <th className="p-2 border-b border-slate-800">Frog ID</th>
              <th className="p-2 border-b border-slate-800">Froggy ID</th>
              <th className="p-2 border-b border-slate-800">Inscription ID</th>
              <th className="p-2 border-b border-slate-800">Owner Address</th>
              <th className="p-2 border-b border-slate-800">Method</th>
              <th className="p-2 border-b border-slate-800">Created At</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.frogId} className="odd:bg-slate-900/30">
                <td className="p-2">{r.frogId}</td>
                <td className="p-2">{r.froggyId}</td>
                <td className="p-2 break-all">{r.inscriptionId}</td>
                <td className="p-2 break-all">{r.ownerAddress}</td>
                <td className="p-2">{r.method}</td>
                <td className="p-2">{r.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
