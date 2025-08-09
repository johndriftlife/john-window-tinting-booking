export default function Home() {
  return (
    <div className="container">
      <img src="/logo.jpg" alt="John Window Tinting" width="300" height="150" />
      <h1>Book an Appointment</h1>
      <form>
        <label>
          Name
          <input type="text" placeholder="Full name" />
        </label>
        <label>
          Select service
          <select>
            <option>Carbon Tint</option>
            <option>Ceramic Tint</option>
          </select>
        </label>
        <label>
          Date
          <input type="date" />
        </label>
        <label>
          Time
          <input type="time" />
        </label>
        <button type="submit">Book Now</button>
      </form>
    </div>
  )
}
