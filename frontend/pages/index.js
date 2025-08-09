
import { useEffect, useState } from 'react'
const API = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export default function Home(){
  const [services, setServices] = useState([])
  const [serviceId, setServiceId] = useState('')
  const [shades, setShades] = useState([])

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [times, setTimes] = useState([])

  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)

  useEffect(()=>{ if(API) fetch(`${API}/api/services`).then(r=>r.json()).then(setServices) },[])
  useEffect(()=>{ if(API && serviceId){ setShades([]); fetch(`${API}/api/shades?serviceId=${serviceId}`).then(r=>r.json()).then(setShades) } },[serviceId])

  async function loadTimes(){
    setTimes([]); setTime(''); setMsg(''); setOk(false)
    if (!date) return
    try{
      const r = await fetch(`${API}/api/availability?date=${date}`)
      const data = await r.json()
      setTimes(data.slots || [])
      if(!(data.slots||[]).length) setMsg('No times available for that date.')
    }catch{ setMsg('Could not load availability.') }
  }

  async function submit(e){
    e.preventDefault(); setMsg(''); setOk(false)
    if (!API) { setMsg('Set NEXT_PUBLIC_API_BASE_URL.'); return }
    try{
      const res = await fetch(`${API}/api/book`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          name, phone, brand, model,
          serviceId: Number(serviceId),
          shade: document.getElementById('shade')?.value || '',
          date, time
        })
      })
      const data = await res.json()
      if(!res.ok) throw new Error(data.error || 'Error')
      setOk(true); setMsg('Booked! We will text you to confirm.')
      setTime('')
    }catch(err){ setMsg(err.message) }
  }

  return (
    <div className="container">
      <div className="logo-wrap">
        <img className="logo" src="/logo.png" alt="John Window Tinting" />
      </div>
      <h1>Book an Appointment</h1>

      <form onSubmit={submit}>
        <div className="row">
          <label> Name
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" required />
          </label>
          <label> Phone Number
            <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(555) 555-5555" required />
          </label>
        </div>

        <div className="row">
          <label> Vehicle Brand
            <input value={brand} onChange={e=>setBrand(e.target.value)} placeholder="e.g., Toyota" />
          </label>
          <label> Vehicle Model
            <input value={model} onChange={e=>setModel(e.target.value)} placeholder="e.g., Camry" />
          </label>
        </div>

        <label> Select service
          <select value={serviceId} onChange={e=>setServiceId(e.target.value)} required>
            <option value="" disabled>Choose service</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>

        {serviceId && (
          <label> Tint Shade
            <select id="shade" defaultValue="" required>
              <option value="" disabled>Select shade</option>
              {shades.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="helper">Enable/disable shades in Admin Settings (no redeploy).</div>
          </label>
        )}

        <label> Date availability
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} onBlur={loadTimes} required />
          <div className="helper">Closed Mondays; Sunday afternoon not offered.</div>
        </label>

        <label> Time
          <select value={time} onChange={e=>setTime(e.target.value)} required>
            <option value="" disabled>{times.length ? 'Select a time' : 'Choose a date first'}</option>
            {times.map(t => <option key={t.time} value={t.time}>{t.label}</option>)}
          </select>
        </label>

        {msg && <div className={ok ? 'success' : 'error'}>{msg}</div>}

        <button type="submit">Book Appointment</button>
      </form>

      <div style={{ textAlign:'center', marginTop: 12 }}>
        <a className="link" href="/admin-settings">Admin Settings</a>
      </div>
    </div>
  )
}
