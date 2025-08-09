
export default function Home() {
  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <img src="/logo.jpg" alt="Logo" className="logo" />
      <h1>Book Your Window Tinting Appointment</h1>
      <form style={{ maxWidth: '400px', margin: '0 auto' }}>
        <input type="text" placeholder="Name" /><br/><br/>
        <input type="text" placeholder="Phone" /><br/><br/>
        <select>
          <option>Select Service</option>
        </select><br/><br/>
        <button type="submit">Book Now</button>
      </form>
    </div>
  );
}
