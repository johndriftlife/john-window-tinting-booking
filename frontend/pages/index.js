import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'

export default function Home() {
  const [services, setServices] = useState([])
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [form, setForm] = useState({
    serviceId: '',
    name: '',
    phone: '',
    email: '',
    vehicle: '',
    windows: '',
    notes: '',
    timeIso: ''
  })
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch(`${API}/api/services`).then(r=>r.json()).then(setServices).catch(()=>{})
  }, [])

  const fetchSlots = async () => {
    if (!date) return
    setLoadingSlots(true)
    setSlots([])
    try {
      const res = await fetch(`${API}/api/availability?date=${date}`)
      const data = await res.json()
      setSlots(data.slots || [])
    } finally {
      setLoadingSlots(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setMessage('')
    if (!form.timeIso) { setMessage('Please choose a time slot.'); return }
    const payload = {
      ...form,
      serviceId: Number(form.serviceId),
      date
    }
    const res = await fetch(`${API}/api/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (res.ok) {
      window.location.href = '/success'
    } else {
      setMessage(data.error ? JSON.stringify(data.error) : 'Error')
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 32, marginBottom: 4 }}>John Window Tinting — Book Now</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>Tue–Fri: 2–5pm · Sat: 9–5 · Sun: 10–12 · Mon: Closed</p>

      <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
        <label>
          Service
          <select value={form.serviceId} onChange={e=>setForm(f=>({...f, serviceId:e.target.value}))} required style={{ width: '100%', padding: 8 }}>
            <option value="">Select service</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name} — ${(s.basePrice/100).toFixed(2)}</option>)}
          </select>
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
          <label>
            Date
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} required style={{ width: '100%', padding: 8 }} />
          </label>
          <button type="button" onClick={fetchSlots} disabled={!date} style={{ padding: '8px 12px' }}>
            {loadingSlots ? 'Loading...' : 'Check availability'}
          </button>
        </div>

        {slots.length > 0 && (
          <div>
            <div style={{ marginBottom: 8 }}>Available times</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {slots.map(s => (
                <button type="button" key={s.iso}
                  onClick={()=>setForm(f=>({...f, timeIso: s.iso}))}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    background: form.timeIso === s.iso ? '#111' : '#fff',
                    color: form.timeIso === s.iso ? '#fff' : '#111',
                    borderRadius: 8,
                    cursor: 'pointer'
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <label>
          Full name
          <input value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} required style={{ width: '100%', padding: 8 }} />
        </label>

        <label>
          Phone
          <input value={form.phone} onChange={e=>setForm(f=>({...f, phone:e.target.value}))} required style={{ width: '100%', padding: 8 }} />
        </label>

        <label>
          Email (optional)
          <input type="email" value={form.email} onChange={e=>setForm(f=>({...f, email:e.target.value}))} style={{ width: '100%', padding: 8 }} />
        </label>

        <label>
          Vehicle (make/model)
          <input value={form.vehicle} onChange={e=>setForm(f=>({...f, vehicle:e.target.value}))} required style={{ width: '100%', padding: 8 }} />
        </label>

        <label>
          Windows to tint
          <input placeholder="e.g., Front doors + back window" value={form.windows} onChange={e=>setForm(f=>({...f, windows:e.target.value}))} required style={{ width: '100%', padding: 8 }} />
        </label>

        <label>
          Notes (optional)
          <textarea value={form.notes} onChange={e=>setForm(f=>({...f, notes:e.target.value}))} rows={4} style={{ width: '100%', padding: 8 }} />
        </label>

        {message && <div style={{ color: 'crimson' }}>{message}</div>}

        <button type="submit" style={{ padding: '10px 14px', background: '#111', color: '#fff', borderRadius: 8, cursor: 'pointer' }}>
          Confirm Booking
        </button>
      </form>

      <hr style={{ margin: '32px 0' }} />

      <a href="/admin" style={{ color: '#555' }}>Admin</a>
    </main>
  )
}
