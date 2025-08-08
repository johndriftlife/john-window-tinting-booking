import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'

export default function Admin() {
  const [key, setKey] = useState('')
  const [bookings, setBookings] = useState([])
  const [error, setError] = useState('')

  const load = async () => {
    setError('')
    try {
      const res = await fetch(`${API}/api/bookings`, {
        headers: { 'X-Admin-Key': key }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setBookings(data)
    } catch (e) {
      setError(e.message)
    }
  }

  const cancel = async (id) => {
    if (!confirm('Cancel booking?')) return
    const res = await fetch(`${API}/api/bookings/${id}/cancel`, {
      method: 'POST',
      headers: { 'X-Admin-Key': key }
    })
    if (res.ok) load()
  }

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Admin</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input placeholder="Admin key" value={key} onChange={e=>setKey(e.target.value)} style={{ padding: 8, flex: 1 }} />
        <button onClick={load} style={{ padding: '8px 12px' }}>Load</button>
      </div>
      {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'grid', gap: 12 }}>
        {bookings.map(b => (
          <div key={b.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap: 12 }}>
              <strong>#{b.id} — {new Date(b.date).toLocaleString()}</strong>
              <span>{b.status}</span>
            </div>
            <div style={{ fontSize: 14, color:'#444' }}>{b.name} · {b.phone} · {b.email || '—'}</div>
            <div style={{ fontSize: 14, color:'#444' }}>{b.vehicle} · {b.windows}</div>
            <div style={{ fontSize: 14, color:'#444' }}>Service: {b.service?.name}</div>
            {b.notes && <div style={{ fontSize: 14, color:'#444' }}>Notes: {b.notes}</div>}
            {b.status !== 'CANCELLED' && <button onClick={()=>cancel(b.id)} style={{ marginTop:8, padding:'6px 10px' }}>Cancel</button>}
          </div>
        ))}
        {bookings.length === 0 && <div>No bookings yet.</div>}
      </div>
    </main>
  )
}
