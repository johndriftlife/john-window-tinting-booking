import { useState } from 'react'
const API = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export default function Admin() {
  const [key, setKey] = useState('')
  const [bookings, setBookings] = useState([])
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const res = await fetch(`${API}/api/bookings`, { headers: { 'X-Admin-Key': key } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setBookings(data)
    } catch (e) { setError(e.message) }
  }

  return (
    <main className="container">
      <h1>Admin</h1>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" placeholder="Admin key" value={key} onChange={e=>setKey(e.target.value)} />
          <button className="btn" onClick={load}>Load</button>
        </div>
        {error && <div style={{ color: 'var(--red)', marginTop: 12 }}>{error}</div>}
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {bookings.map(b => (
          <div key={b.id} className="card">
            <div style={{ display:'flex', justifyContent:'space-between', gap: 12 }}>
              <strong style={{ color:'var(--gold)' }}>#{b.id} — {new Date(b.date).toLocaleString()}</strong>
              <span>{b.status}</span>
            </div>
            <div style={{ fontSize: 14, color:'var(--muted)' }}>{b.name} · {b.phone} · {b.email || '—'}</div>
            <div style={{ fontSize: 14, color:'var(--muted)' }}>{b.vehicle} · {b.windows}</div>
          </div>
        ))}
        {bookings.length === 0 && <div className="card">No bookings yet.</div>}
      </div>
    </main>
  )
}
