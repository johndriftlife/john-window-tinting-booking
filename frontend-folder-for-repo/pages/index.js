
import { useEffect, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_BASE_URL || ''

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
  const [deposit, setDeposit] = useState('$50.00')

  useEffect(() => {
    if (!API) return
    fetch(`${API}/api/services`).then(r=>r.json()).then(setServices).catch(()=>{})
  }, [])

  const fetchSlots = async () => {
    if (!date || !API) return
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
    const payload = { ...form, serviceId: Number(form.serviceId), date }
    const res = await fetch(`${API}/api/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (res.ok) window.location.href = '/success'
    else setMessage(data.error ? JSON.stringify(data.error) : 'Error')
  }

  return (
    <main className="container">
      <div className="header">
        <img className="logo" src="data:image/png;base64,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" alt="John Window Tinting" />
      </div>

      <h1>Book an Appointment</h1>
      <p className="muted">Premium look, premium protection. Deposit shown below.</p>

      <div className="card" style={{marginBottom:16}}>
        <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
          <label className="label">Name
            <input className="input" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} required placeholder="Full name" />
          </label>
          <label className="label">Phone
            <input className="input" value={form.phone} onChange={e=>setForm(f=>({...f, phone:e.target.value}))} required placeholder="(555) 555-5555" />
          </label>
          <label className="label">Email (optional)
            <input className="input" type="email" value={form.email} onChange={e=>setForm(f=>({...f, email:e.target.value}))} placeholder="you@example.com" />
          </label>

          <label className="label">Select service
            <select className="input" value={form.serviceId} onChange={e=>setForm(f=>({...f, serviceId:e.target.value}))} required>
              <option value="">Choose service</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} — ${(s.basePrice/100).toFixed(2)}</option>)}
            </select>
          </label>

          <div className="row">
            <label className="label">Date
              <input className="input" type="date" value={date} onChange={e=>setDate(e.target.value)} required />
            </label>
            <div style={{display:'grid', alignItems:'end'}}>
              <button type="button" onClick={fetchSlots} disabled={!date} className="btn">
                {loadingSlots ? 'Loading…' : 'Check availability'}
              </button>
            </div>
          </div>

          {slots.length > 0 && (
            <div>
              <div className="muted" style={{ marginBottom: 8, textAlign:'left' }}>Available times</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {slots.map(s => (
                  <button type="button" key={s.iso}
                    onClick={()=>setForm(f=>({...f, timeIso: s.iso}))}
                    className={`slot ${form.timeIso === s.iso ? 'active' : ''}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="label">Vehicle (make/model)
            <input className="input" value={form.vehicle} onChange={e=>setForm(f=>({...f, vehicle:e.target.value}))} required placeholder="e.g., Toyota Corolla" />
          </label>
          <label className="label">Windows to tint
            <input className="input" value={form.windows} onChange={e=>setForm(f=>({...f, windows:e.target.value}))} required placeholder="Front doors + back window" />
          </label>
          <label className="label">Notes (optional)
            <textarea className="input" rows={4} value={form.notes} onChange={e=>setForm(f=>({...f, notes:e.target.value}))} placeholder="Anything we should know?" />
          </label>

          <div className="row">
            <label className="label">Deposit
              <input className="input" value={deposit} readOnly />
            </label>
            <div style={{display:'grid', alignItems:'end'}}>
              <button type="submit" className="btn">Book Now</button>
            </div>
          </div>

          {message && <div style={{ color: 'var(--red)' }}>{message}</div>}
        </form>
      </div>

      <hr className="hr" />
      <a href="/admin" className="link">Admin</a>
    </main>
  )
}
