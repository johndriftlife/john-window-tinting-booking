
import { useState, useMemo } from 'react'

export default function Home() {
  const [service, setService] = useState('')
  const [shade, setShade] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  const shadeOptions = useMemo(() => {
    if (service === 'Carbon Tint') return ['1%', '5%', '20%', '35%', '50%']
    if (service === 'Ceramic Tint') return ['5%', '20%']
    return []
  }, [service])

  const onChangeService = (e) => {
    setService(e.target.value)
    setShade('')
  }

  const submit = (e) => {
    e.preventDefault()
    alert(`Submitted:\nName: ${name}\nPhone: ${phone}\nService: ${service}\nShade: ${shade || '(none)'}\nVehicle: ${brand} ${model}\nDate: ${date}\nTime: ${time}`)
  }

  return (
    <div className="container">
      <div className="logo-wrap">
        <img src="/logo.png" alt="John Window Tinting" className="logo" />
      </div>

      <h1>Book an Appointment</h1>

      <form onSubmit={submit}>
        <label>
          Name
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e)=>setName(e.target.value)}
            required
          />
        </label>

        <label>
          Phone Number
          <input
            type="tel"
            placeholder="(555) 555-5555"
            value={phone}
            onChange={(e)=>setPhone(e.target.value)}
            required
          />
        </label>

        <label>
          Vehicle Brand
          <input
            type="text"
            placeholder="e.g., Toyota"
            value={brand}
            onChange={(e)=>setBrand(e.target.value)}
          />
        </label>

        <label>
          Vehicle Model
          <input
            type="text"
            placeholder="e.g., Camry"
            value={model}
            onChange={(e)=>setModel(e.target.value)}
          />
        </label>

        <label>
          Select service
          <select value={service} onChange={onChangeService} required>
            <option value="" disabled>Choose service</option>
            <option value="Carbon Tint">Carbon Tint</option>
            <option value="Ceramic Tint">Ceramic Tint</option>
          </select>
        </label>

        {service && (
          <label>
            Tint Shade
            <select
              value={shade}
              onChange={(e)=>setShade(e.target.value)}
              required
            >
              <option value="" disabled>Select shade</option>
              {shadeOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </label>
        )}

        <label>
          Date
          <input
            type="date"
            value={date}
            onChange={(e)=>setDate(e.target.value)}
            required
          />
        </label>

        <label>
          Time
          <input
            type="time"
            value={time}
            onChange={(e)=>setTime(e.target.value)}
            required
          />
        </label>

        <button type="submit">Book Appointment</button>
      </form>
    </div>
  )
}
