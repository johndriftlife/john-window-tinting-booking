# Admin Settings — Full Pack

Use this to access Admin Settings from the frontend, and manage shades in/out of stock.

## Backend (API service)
1. Replace your API repo's `src/` with `backend/src/` from this pack.
2. Push to GitHub. Render redeploys.
3. Open: https://john-window-tinting-booking.onrender.com/admin-settings?key=YOUR_ADMIN_KEY

## Frontend
Copy `frontend/public/admin-settings.html` into your frontend's `public/` folder and deploy.
Then the frontend URL works too:
https://johnwindowtinting-booking.onrender.com/admin-settings?key=YOUR_ADMIN_KEY

## Notes
- Protected with the same admin key (`ADMIN_KEY` env var or DB hash via your existing code).
- The page loads services and shades from your existing endpoints and toggles availability.
