# CarMonitor - Current State Specification (stable-v1)

## Overview
A web application for tracking new cars with photos and location data. Deployed on Vercel as a serverless app.

## Deployment
- **Live URL**: https://tugaylar-carmonitor.vercel.app
- **GitHub**: https://github.com/hakan-tugay/Tugaylar-CarMonitor-WebApp
- **Platform**: Vercel (serverless functions)
- **Database**: Neon Postgres (via `@neondatabase/serverless`)
- **File Storage**: Vercel Blob (via `@vercel/blob`)
- **Frontend**: Plain HTML/CSS/JS served as static files from `public/`
- **Stable branch**: `stable-v1`

## Environment Variables (set in Vercel dashboard)
- `POSTGRES_URL` — Neon Postgres connection string (from Vercel Storage)
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob access token (from Vercel Storage)
- `AUTH_SECRET` — Secret key for signing JWT tokens

## Database Schema

### `cars`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | Primary key |
| location | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### `car_images`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | Primary key |
| car_id | INTEGER | FK → cars(id) ON DELETE CASCADE |
| url | TEXT | NOT NULL, Vercel Blob URL |
| filename | TEXT | NOT NULL |

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | Primary key |
| username | TEXT | UNIQUE, NOT NULL, stored lowercase |
| password_hash | TEXT | NOT NULL, bcrypt hashed |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

### `locations`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL | Primary key |
| name | TEXT | UNIQUE, NOT NULL |

## Authentication
- JWT-based authentication with tokens stored in localStorage
- Passwords hashed with bcryptjs
- Usernames are case-insensitive (stored lowercase)
- Login-only form (no self-registration)
- Token expires in 30 days
- All API routes (except login) require `Authorization: Bearer <token>` header
- Auto-logout on 401 responses

### Admin Role
- Users with "tugay" in their username (case-insensitive) are admins
- Admins see an "Admin" dropdown in the header with:
  - Manage Users
  - Manage Locations
- Admin check enforced both frontend (button visibility) and backend (403 on API)

## API Routes

### Auth
| Method | Path | Auth | Admin | Description |
|--------|------|------|-------|-------------|
| POST | /api/auth/login | No | No | Login with username/password, returns JWT |
| POST | /api/auth/register | Yes | Yes | Create new user account |
| GET | /api/auth/users | Yes | Yes | List all users |
| DELETE | /api/auth/users/[userId] | Yes | Yes | Delete a user (can't delete self) |

### Cars
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/cars | Yes | List all cars with their images, ordered by created_at DESC |
| POST | /api/cars | Yes | Create car record `{ location }` |
| GET | /api/cars/[id] | Yes | Get single car with images |
| DELETE | /api/cars/[id] | Yes | Delete car, its images from DB, and blobs from storage |

### Images
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/cars/[id]/images | Yes | Save image reference `{ url, filename }` |
| POST | /api/upload | Yes | Upload raw file body to Vercel Blob, returns `{ url, filename }` |
| DELETE | /api/images/[imageId] | Yes | Delete single image from DB and blob storage |

### Locations
| Method | Path | Auth | Admin | Description |
|--------|------|------|-------|-------------|
| GET | /api/locations | Yes | No | List all locations |
| POST | /api/locations | Yes | Yes | Add location `{ name }` |
| DELETE | /api/locations/[locationId] | Yes | Yes | Delete a location |

## Frontend Features

### Login Page
- Username and password fields
- No self-registration link
- Error messages shown inline

### Main View (Cars)
- **Create Car Form**: Text input with datalist dropdown populated from locations database. User can select a suggestion or type freely.
- **Car Records Grid**: Responsive card grid (`auto-fill, minmax(280px, 1fr)`)
  - Each card shows: creation date, location, photo thumbnails
  - **Add Photos** button (label wrapping hidden file input)
  - **Edit Photos** toggle button (only shown when car has photos): enters delete mode where photos show red overlay, tap to delete
  - **Delete** button for the whole car record
  - All three action buttons are equal width and height

### Photo Upload
- Photos are watermarked client-side before upload using Canvas API
- Watermark: current date/time in bottom-right corner
- Watermark style: phosphorescent green (#39ff14) text with glow effect on dark semi-transparent background
- Images converted to JPEG at 92% quality after watermarking

### Photo Lightbox
- Click a photo thumbnail to open full-size in a dark overlay
- Previous/Next arrow buttons to navigate through all photos of that car
- Photo counter shown at bottom (e.g., "2 / 5")
- Keyboard support: Arrow Left/Right to navigate, Escape to close
- Click overlay background to close

### Admin: Manage Users
- Replaces the cars view when active
- Table listing all users with username, created date, delete button
- Current user shown with "(you)" label, cannot delete self
- Create new user form with username and password fields

### Admin: Manage Locations
- Replaces the cars view when active
- Table listing all locations with delete button
- Add new location form

### Header
- App title "CarMonitor" with subtitle
- When logged in: username display, Admin dropdown (for admin users), Logout button
- Admin dropdown contains "Manage Locations" and "Manage Users"

## File Structure
```
package.json
public/
  index.html              — Single page HTML
  style.css               — All styling (original blue theme)
  app.js                  — All frontend logic
api/
  cars.js                 — GET/POST /api/cars
  cars/[id].js            — GET/DELETE /api/cars/:id
  cars/[id]/images.js     — POST /api/cars/:id/images
  upload.js               — POST file upload to Vercel Blob
  images/[imageId].js     — DELETE /api/images/:imageId
  auth/login.js           — POST /api/auth/login
  auth/register.js        — POST /api/auth/register (admin only)
  auth/users.js           — GET /api/auth/users (admin only)
  auth/users/[userId].js  — DELETE /api/auth/users/:userId (admin only)
  locations.js            — GET/POST /api/locations
  locations/[locationId].js — DELETE /api/locations/:locationId (admin only)
lib/
  db.js                   — Neon Postgres connection, ensureTables()
  auth.js                 — JWT helpers: createToken, authenticate, requireAuth, requireAdmin
```

## Style
- Original blue theme: blue header (#2563eb), light gray background (#f1f5f9), white cards
- Responsive design, works on mobile
- Border-radius: 8px throughout
- Box shadows on cards: `0 1px 3px rgba(0,0,0,0.08)`

## Dependencies
```json
{
  "@vercel/blob": "^0.27.0",
  "@neondatabase/serverless": "^0.10.0",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.0"
}
```
