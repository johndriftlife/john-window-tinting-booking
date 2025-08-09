import { useEffect, useState } from 'react'
const API = process.env.NEXT_PUBLIC_API_BASE_URL || ''

function ymd(d){ return d.toISOString().slice(0,10); }
function MonthGrid({ view, date, setDate, onPick }) {
  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - ((first.getDay()+6)%7));
  const cells = [];
  for (let i=0;i<42;i++){
    const d = new Date(start); d.setDate(start.getDate()+i);
    const inMonth = d.getMonth() === month;
    const iso = ymd(d);
    const selected = iso === date;
    cells.push(
      <button key={iso} type="button" onClick={()=>{ setDate(iso); onPick && onPick(iso); }}
        style={{padding:'8px 0', borderRadius:10, border:'1px solid #2a2a2a',
                background:selected?'linear-gradient(180deg, var(--gold), var(--gold-600))':'#0e0e0e',
                color:selected?'#111':(inMonth?'#fff':'#aaa')}}>
        {d.getDate()}
      </button>
    );
  }
  return <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:6}}>{cells}</div>;
}

export default function Home(){
  const [services, setServices] = useState([])
  const [serviceId, setServiceId] = useState('')
  const [shadeOptions, setShadeOptions] = useState([]) // [{label, enabled}]

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [area, setArea] = useState('Front doors')

  const [date, setDate] = useState('')
  const [view, setView] = useState(new Date())
  const [time, setTime] = useState('')
  const [times, setTimes] = useState([])

  const [picked, setPicked] = useState([])
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)

  useEffect(()=>{ if(API) fetch(`${API}/api/services`).then(r=>r.json()).then(setServices) },[])
  useEffect(()=>{
    setShadeOptions([]); setPicked([])
    if(API && serviceId) fetch(`${API}/api/shades/list?serviceId=${serviceId}`).then(r=>r.json()).then(setShadeOptions)
  },[serviceId])

  async function loadTimes(forDate){
    const useDate = forDate || date
    setTimes([]); setTime(''); setMsg(''); setOk(false)
    if (!useDate) return
    try{
      const r = await fetch(`${API}/api/availability?date=${useDate}`)
      const data = await r.json()
      setTimes(data.slots || [])
      if(!(data.slots||[]).length) setMsg('No times available for that date.')
    }catch{ setMsg('Could not load availability.') }
  }

  function toggleShade(label, checked){
    setPicked(prev => checked ? [...new Set([...prev, label])] : prev.filter(x=>x!==label))
  }

  async function submit(e){
    e.preventDefault(); setMsg(''); setOk(false)
    if (!API) { setMsg('Set NEXT_PUBLIC_API_BASE_URL.'); return }
    if (!picked.length) { setMsg('Pick at least one tint shade.'); return }
    try{
      const res = await fetch(`${API}/api/book`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          name, phone, brand, model, windowArea: area,
          serviceId: Number(serviceId), shades: picked, date, time
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
          <fieldset>
            <legend>Tint Shades (pick one or more)</legend>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
              {shadeOptions.map(s => (
                <label key={s.label} className={s.enabled ? '' : 'oos'} style={{display:'flex',alignItems:'center',gap:8}}>
                  <input type="checkbox" disabled={!s.enabled}
                    checked={picked.includes(s.label)}
                    onChange={e=>toggleShade(s.label, e.target.checked)} />
                  {s.label}{!s.enabled ? ' (Out of stock)' : ''}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <label> Window to work on
          <select value={area} onChange={e=>setArea(e.target.value)} required>
            <option>Front doors</option>
            <option>Front windshield</option>
            <option>All</option>
          </select>
        </label>

        <label> Date availability
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} onBlur={()=>loadTimes()} required />
          <div className="helper">Use the picker or pick a date on the calendar below.</div>
        </label>

        <div className="calendar" style={{marginTop:10}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',margin:'8px 0'}}>
            <button type="button" onClick={()=>setView(new Date(view.getFullYear(), view.getMonth()-1, 1))}>‹</button>
            <div style={{color:'var(--gold)'}}>{view.toLocaleString('default',{month:'long', year:'numeric'})}</div>
            <button type="button" onClick={()=>setView(new Date(view.getFullYear(), view.getMonth()+1, 1))}>›</button>
          </div>
          <MonthGrid view={view} date={date} setDate={(iso)=>{ setDate(iso); loadTimes(iso); }} onPick={()=>{}} />
        </div>

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
