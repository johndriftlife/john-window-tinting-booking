
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
        <img src="/logo.jpg" alt="John Window Tinting" className="logo" />

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
