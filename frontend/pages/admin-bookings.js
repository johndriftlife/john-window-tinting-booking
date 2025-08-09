import { useEffect, useState } from 'react'
const API = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export default function AdminBookings(){
  const [key, setKey] = useState('')
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [items, setItems] = useState([])
  const [msg, setMsg] = useState('')

  async function load(){
    setMsg('')
    try{
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (status) params.set('status', status)
      const r = await fetch(`${API}/api/bookings?${params.toString()}`, { headers: { 'X-Admin-Key': key } })
      const data = await r.json()
      if(!r.ok) throw new Error(data.error || 'Failed')
      setItems(data.items || [])
    }catch(e){ setMsg(e.message) }
  }

  async function exportCsv(){
    const url = `${API}/api/bookings.csv`
    const r = await fetch(url, { headers: { 'X-Admin-Key': key } })
    if (!r.ok) { setMsg('Export failed'); return }
    const blob = await r.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'bookings.csv'
    a.click()
  }

  async function sendFinal(id){
    setMsg('')
    try{
      const r = await fetch(`${API}/api/bookings/${id}/final-session`, { method:'POST', headers: { 'Content-Type':'application/json', 'X-Admin-Key': key } })
      const data = await r.json()
      if(!r.ok) throw new Error(data.error || 'Failed')
      setMsg('Final payment link sent.')
    }catch(e){ setMsg(e.message) }
  }

  async function refundDeposit(id){
    setMsg('')
    try{
      const r = await fetch(`${API}/api/bookings/${id}/refund-deposit`, { method:'POST', headers: { 'Content-Type':'application/json', 'X-Admin-Key': key } })
      const data = await r.json()
      if(!r.ok) throw new Error(data.error || 'Failed')
      setMsg('Deposit refunded & booking cancelled.')
      load()
    }catch(e){ setMsg(e.message) }
  }

  function fmt(c){ return (c? (c/100).toFixed(2):'0.00') + ' €' }

  return (
    <div className="container">
      <div style={{textAlign:'center'}}>
        <a href="/" className="link">← Back to Booking</a>
      </div>
      <h1>Admin — Bookings</h1>

      <div className="row">
        <label> Admin key
          <input value={key} onChange={e=>setKey(e.target.value)} placeholder="Enter admin key" />
        </label>
        <label> Search
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="name / email / phone / date" />
        </label>
      </div>

      <div className="row">
        <label> Status
          <select value={status} onChange={e=>setStatus(e.target.value)}>
            <option value="">All</option>
            <option>PENDING</option>
            <option>AWAITING_DEPOSIT</option>
            <option>DEPOSIT_PAID</option>
            <option>FINAL_PAID</option>
            <option>CANCELLED_REFUNDED</option>
          </select>
        </label>
      </div>

      <div className="btnRow">
        <button onClick={load}>Load</button>
        <button onClick={exportCsv}>Export CSV</button>
      </div>

      {msg && <div className={msg.includes('sent')||msg.includes('cancelled') ? 'success':'error'} style={{marginTop:8}}>{msg}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Service</th><th>Shades</th><th>Windows</th><th>Date</th><th>Time</th><th>Status</th><th>Total</th><th>Deposit</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(b => (
            <tr key={b.id}>
              <td>{b.id}</td>
              <td>{b.name}</td>
              <td>{b.email}</td>
              <td>{b.phone}</td>
              <td>{b.serviceId}</td>
              <td>{b.shades}</td>
              <td>{b.windowArea}</td>
              <td>{b.date}</td>
              <td>{b.time}</td>
              <td className="status">{b.status}</td>
              <td>{fmt(b.totalCents)}</td>
              <td>{fmt(b.depositCents)}</td>
              <td className="btnRow">
                <button onClick={()=>sendFinal(b.id)}>Send final link</button>
                <button onClick={()=>refundDeposit(b.id)}>Refund deposit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
