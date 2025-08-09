
import { useEffect, useState } from 'react'
const API = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export default function AdminSettings(){
  const [key, setKey] = useState('')
  const [cfg, setCfg] = useState(null)
  const [services, setServices] = useState([])
  const [serviceId, setServiceId] = useState('')
  const [shades, setShades] = useState([])
  const [msg, setMsg] = useState('')

  useEffect(()=>{ if(API) fetch(`${API}/api/services`).then(r=>r.json()).then(setServices) }, [])

  const loadCfg = async () => {
    setMsg('')
    try{
      const r = await fetch(`${API}/api/config`)
      const data = await r.json()
      setCfg(data)
    }catch{
      setMsg('Failed to load config')
    }
  }

  const saveCfg = async () => {
    setMsg('')
    try{
      const r = await fetch(`${API}/api/config`, {
        method:'PUT',
        headers: { 'Content-Type':'application/json', 'X-Admin-Key': key },
        body: JSON.stringify(cfg)
      })
      if(!r.ok) throw new Error('Save failed')
      setMsg('Saved ✔')
    }catch(e){ setMsg(e.message) }
  }

  const loadShades = async (sid) => {
    setServiceId(sid)
    if (!sid) { setShades([]); return }
    const r = await fetch(`${API}/api/shades?serviceId=${sid}`)
    const data = await r.json()
    const standard = sid && services.find(s=>String(s.id)===String(sid))?.name.includes('Ceramic')
      ? ['5%','20%']
      : ['1%','5%','20%','35%','50%']
    const merged = standard.map(label => ({ label, enabled: data.includes(label) }))
    setShades(merged)
  }

  const toggleShade = async (label, enabled) => {
    setMsg('')
    try{
      const r = await fetch(`${API}/api/shades/toggle`, {
        method:'POST',
        headers: { 'Content-Type':'application/json', 'X-Admin-Key': key },
        body: JSON.stringify({ serviceId: Number(serviceId), label, enabled })
      })
      if(!r.ok) throw new Error('Toggle failed')
      loadShades(serviceId)
    }catch(e){ setMsg(e.message) }
  }

  return (
    <div className="container">
      <div style={{textAlign:'center'}}>
        <a href="/" className="link">← Back to Booking</a>
      </div>
      <h1>Admin — Settings</h1>

      <label>Admin key
        <input value={key} onChange={e=>setKey(e.target.value)} placeholder="Enter admin key" />
      </label>

      <div className="card">
        <h3>Business hours</h3>
        <button onClick={loadCfg}>Load current</button>
        {cfg && (
          <div style={{ display:'grid', gap: 10, marginTop: 10 }}>
            <label>Closed days (0=Sun..6=Sat)
              <input value={(cfg.closedDays||[]).join(',')} onChange={e=>setCfg(v=>({ ...v, closedDays: e.target.value.split(',').map(x=>Number(x.trim())).filter(x=>!isNaN(x)) }))} />
            </label>
            <label>Weekday slots (Tue–Fri, HH:MM comma-separated)
              <input value={(cfg.weekdaySlots||[]).join(',')} onChange={e=>setCfg(v=>({ ...v, weekdaySlots: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) }))} />
            </label>
            <label>Saturday slots (HH:MM comma-separated)
              <input value={(cfg.saturdaySlots||[]).join(',')} onChange={e=>setCfg(v=>({ ...v, saturdaySlots: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) }))} />
            </label>
            <label>Sunday slots (HH:MM comma-separated)
              <input value={(cfg.sundaySlots||[]).join(',')} onChange={e=>setCfg(v=>({ ...v, sundaySlots: e.target.value.split(',').map(s=>s.trim()).filter(Boolean) }))} />
            </label>
            <label>
              <input type="checkbox" checked={!!cfg.saturdayTwoHourSpacing} onChange={e=>setCfg(v=>({ ...v, saturdayTwoHourSpacing: e.target.checked }))} />
              &nbsp; Saturday 2‑hour spacing
            </label>
            <button onClick={saveCfg}>Save settings</button>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Tint shades</h3>
        <label>Service
          <select value={serviceId} onChange={e=>loadShades(e.target.value)}>
            <option value="">Choose service</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        {serviceId && (
          <div style={{ marginTop:10 }}>
            {shades.map(s => (
              <div key={s.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span>{s.label}</span>
                <label style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <input type="checkbox" checked={s.enabled} onChange={e=>toggleShade(s.label, e.target.checked)} />
                  {s.enabled ? 'Enabled' : 'Disabled'}
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {msg && <div style={{ marginTop:10, color:'#ff6b6b' }}>{msg}</div>}
    </div>
  )
}
