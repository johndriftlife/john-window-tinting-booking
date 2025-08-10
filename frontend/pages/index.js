import { useEffect, useMemo, useState } from 'react'
const API = process.env.NEXT_PUBLIC_API_BASE_URL || ''

const WINDOW_OPTIONS = ['Front doors','Rear doors','Front windshield','Rear windshield']

export default function Home(){
  const [services, setServices] = useState([])
  const [serviceId, setServiceId] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [shadeOptions, setShadeOptions] = useState([])

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [times, setTimes] = useState([])

  const [pricing, setPricing] = useState({ pricing:{}, percent:50, currency:'eur' })

  const [pickedShades, setPickedShades] = useState([])
  const [pickedWindows, setPickedWindows] = useState([])

  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)

  useEffect(()=>{ if(API) fetch(`${API}/api/services`).then(r=>r.json()).then(d=>{setServices(d)}) },[])
  useEffect(()=>{
    setShadeOptions([]); setPickedShades([]); setPickedWindows([])
    const s = services.find(x=>String(x.id)===String(serviceId))
    setServiceName(s?.name || '')
    if(API && serviceId) fetch(`${API}/api/shades/list?serviceId=${serviceId}`).then(r=>r.json()).then(setShadeOptions)
  },[serviceId, services])
  useEffect(()=>{ if(API) fetch(`${API}/api/windows/pricing`).then(r=>r.json()).then(setPricing).catch(()=>{}) },[])

  async function loadTimes(useDate){
    const d = useDate || date
    setTimes([]); setTime(''); setMsg(''); setOk(false)
    if (!d) return
    try{
      const r = await fetch(`${API}/api/availability?date=${d}`)
      const data = await r.json()
      setTimes(data.slots || [])
      if(!(data.slots||[]).length) setMsg('No times available for that date.')
    }catch{ setMsg('Could not load availability.') }
  }

  function toggleShade(label, checked){
    setPickedShades(prev => checked ? [...new Set([...prev, label])] : prev.filter(x=>x!==label))
  }
  function toggleWindow(label, checked){
    setPickedWindows(prev => checked ? [...new Set([...prev, label])] : prev.filter(x=>x!==label))
  }

  const liveTotals = useMemo(()=>{
    const tier = (serviceName||'').toLowerCase().includes('ceramic') ? 'ceramic' : 'carbon'
    const table = (pricing.pricing||{})[tier] || {}
    let total = 0
    for (const w of pickedWindows) if (table[w]) total += table[w]
    const deposit = Math.round(total * (Number(pricing.percent||50)/100))
    return { total, deposit, currency: pricing.currency || 'eur' }
  }, [serviceName, pickedWindows, pricing])

  function fmt(cents, cur){
    const amt = (cents/100).toFixed(2)
    const sym = (cur||'').toLowerCase()==='eur' ? '€' : ''
    return `${sym}${amt}`
  }

  async function submit(e){
    e.preventDefault(); setMsg(''); setOk(false)
    if (!API) { setMsg('Set NEXT_PUBLIC_API_BASE_URL.'); return }
    if (!pickedShades.length) { setMsg('Pick at least one tint shade.'); return }
    if (!pickedWindows.length) { setMsg('Pick at least one window area.'); return }
    try{
      const res = await fetch(`${API}/api/deposit/session`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          name, email, phone, brand, model,
          serviceId: Number(serviceId),
          shades: pickedShades,
          windowAreas: pickedWindows,
          date, time
        })
      })
      const data = await res.json()
      if(!res.ok) throw new Error(data.error || 'Error')
      window.location = data.url
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
          <label> Email
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required />
          </label>
        </div>

        <div className="row">
          <label> Phone Number
            <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" required />
          </label>
          <label> Vehicle Brand
            <input value={brand} onChange={e=>setBrand(e.target.value)} placeholder="e.g., BMW" />
          </label>
        </div>

        <label> Vehicle Model
          <input value={model} onChange={e=>setModel(e.target.value)} placeholder="e.g., 3 Series" />
        </label>

        <label> Select service
          <select value={serviceId} onChange={e=>setServiceId(e.target.value)} required>
            <option value="" disabled>Choose service</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>

        {serviceId && (
          <fieldset>
            <legend>Tint Shades (pick one or more)</legend>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
              {shadeOptions.map(s => (
                <label key={s.label} className={s.enabled ? '' : 'oos'} style={{display:'flex',alignItems:'center',gap:8}}>
                  <input type="checkbox" disabled={!s.enabled}
                    checked={pickedShades.includes(s.label)}
                    onChange={e=>toggleShade(s.label, e.target.checked)} />
                  {s.label}{!s.enabled ? ' (Out of stock)' : ''}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {serviceId && (
          <fieldset>
            <legend>Window to work on (multi-select)</legend>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
              {WINDOW_OPTIONS.map(w => (
                <label key={w} style={{display:'flex',alignItems:'center',gap:8}}>
                  <input type="checkbox"
                    checked={pickedWindows.includes(w)}
                    onChange={e=>toggleWindow(w, e.target.checked)} />
                  {w}
                </label>
              ))}
            </div>
            <div className="priceRow">
              <span className="badge">Total: {fmt(liveTotals.total, liveTotals.currency)}</span>
              <span className="badge">Deposit (50%): {fmt(liveTotals.deposit, liveTotals.currency)}</span>
            </div>
            <small className="muted">Final 50% will be requested later.</small>
          </fieldset>
        )}

        <label> Date availability
          <input type="date" value={date} onChange={e=>{setDate(e.target.value); loadTimes(e.target.value)}} required />
        </label>

        <label> Time
          <select value={time} onChange={e=>setTime(e.target.value)} required>
            <option value="" disabled>{times.length ? 'Select a time' : 'Choose a date first'}</option>
            {times.map(t => <option key={t.time} value={t.time}>{t.label}</option>)}
          </select>
        </label>

        {msg && <div className={ok ? 'success' : 'error'}>{msg}</div>}

        <button type="submit">Pay deposit & Book</button>
      </form>

      <div style={{ textAlign:'center', marginTop: 12 }}>
        <a className="link" href="/admin-settings">Admin Settings</a> &nbsp;|&nbsp;
        <a className="link" href="/admin-bookings">Admin Bookings</a>
      </div>
    </div>
  )
}
