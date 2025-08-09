
import Image from 'next/image'

export default function Home() {
  return (
    <div className="container">
      <Image src="/logo.jpg" alt="John Window Tinting" width={300} height={150} />
      <h1>Book an Appointment</h1>
      <form>
        <div>
          <label>Name</label>
          <input type="text" placeholder="Name" />
        </div>
        <div>
          <label>Select service</label>
          <select>
            <option>Carbon Tint</option>
            <option>Ceramic Tint</option>
          </select>
        </div>
        <div>
          <label>Date</label>
          <input type="date" />
        </div>
        <div>
          <label>Time</label>
          <input type="time" />
        </div>
        <div>
          <label>Deposit</label>
          <input type="text" value="$0.00" readOnly />
        </div>
        <button type="submit">Book Now</button>
      </form>
    </div>
  )
}
