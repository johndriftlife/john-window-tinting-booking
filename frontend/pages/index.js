
export default function Home() {
  return (
    <div className="container">
      <div className="logo-wrap">
        <img src="/logo.png" alt="John Window Tinting" className="logo" />
      </div>
      <h1>Book an Appointment</h1>
      <form onSubmit={(e)=>{ e.preventDefault(); alert('Submitted!'); }}>
        <label>
          Name
          <input type="text" placeholder="Full name" required />
        </label>
        <label>
          Select service
          <select required defaultValue="">
            <option value="" disabled>Choose service</option>
            <option>Carbon Tint</option>
            <option>Ceramic Tint</option>
          </select>
        </label>
        <label>
          Date
          <input type="date" required />
        </label>
        <label>
          Time
          <input type="time" required />
        </label>
        <label>
          Deposit
          <input type="text" value="$0.00" readOnly />
        </label>
        <button type="submit">Book Appointment</button>
      </form>
    </div>
  )
}
