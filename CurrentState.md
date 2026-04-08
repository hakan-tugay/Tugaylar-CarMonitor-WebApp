# CarMonitor - Current State Specification

## Overview
A web application for tracking cars with photos, chassis numbers, and location data. Deployed on Vercel as a serverless app.

## Deployment
- **Live URL**: https://tugaylar-carmonitor.vercel.app
- **GitHub**: https://github.com/hakan-tugay/Tugaylar-CarMonitor-WebApp
- **Platform**: Vercel (serverless functions)
- **Database**: Neon Postgres (via `@neondatabase/serverless`)
- **File Storage**: Vercel Blob (via `@vercel/blob`)
- **Frontend**: Plain HTML/CSS/JS served as static files from `public/`
- **Stable branch**: `stable-v1` (snapshot before structural changes)

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
| chassis | TEXT | Chassis number |
| created_by | TEXT | Username who created the record |
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
| role | TEXT | DEFAULT 'editor'. Values: 'admin', 'editor', 'viewer' |
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
- Token expires in 30 days, includes id, username, and role
- All API routes (except login) require `Authorization: Bearer <token>` header
- Auto-logout on 401 responses
- View resets properly on logout/login without page refresh

### Roles
Three roles with different access levels:

| Feature | Admin | Editor | Viewer |
|---------|-------|--------|--------|
| Browse cars & photos | Yes | Yes | Yes |
| Photo lightbox & swipe | Yes | Yes | Yes |
| Create car records | Yes | Yes | No |
| Add/delete photos | Yes | Yes | No |
| Delete car records | Yes | Yes | No |
| Hamburger menu: Car View | Yes | No | No |
| Hamburger menu: Table View | Yes | No | No |
| Hamburger menu: Manage Locations | Yes | No | No |
| Hamburger menu: Manage Users | Yes | No | No |
| Hamburger menu: Logout | Yes | Yes | Yes |

- Admin check enforced both frontend (UI visibility) and backend (403 on API)
- Existing users with "tugay" in username were auto-set to admin on migration
- Non-admin users only see Logout in the hamburger menu

## API Routes

### Auth
| Method | Path | Auth | Admin | Description |
|--------|------|------|-------|-------------|
| POST | /api/auth/login | No | No | Login with username/password, returns JWT + role |
| POST | /api/auth/register | Yes | Yes | Create new user account with role |
| GET | /api/auth/users | Yes | Yes | List all users with roles |
| DELETE | /api/auth/users/[userId] | Yes | Yes | Delete a user (can't delete self) |

### Cars
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/cars | Yes | List all cars with images, ordered by created_at DESC |
| POST | /api/cars | Yes | Create car record `{ location, chassis }`, stores created_by |
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
| POST | /api/locations | Yes | Yes | Add location `{ name }`, case-insensitive duplicate check |
| DELETE | /api/locations/[locationId] | Yes | Yes | Delete a location |

## Frontend Features

### Login Page
- Username and password fields (same size)
- No self-registration link
- Error messages shown inline

### Car View (Main View)
- **Create Car Form** (hidden for viewers):
  - Location: text input with datalist dropdown populated from locations database, user can select or type freely
  - Chassis Number: required text input
  - Add Car button
- **Car Records**: Grouped by date (newest first), then by location within each date
  - Group headers show date on left, location on right, both bold above a blue line
  - Location grouping is case-insensitive and normalizes whitespace/dashes (e.g., "Pendik - sumela" and "Pendik-Sumela" merge)
  - Minimal whitespace between groups
  - Each card shows: chassis number (monospace), photo thumbnails
  - **Add Photos** button (hidden for viewers)
  - **Edit Photos** toggle button (hidden for viewers, only shown when car has photos): enters delete mode where photos show red overlay, tap to delete
  - **Delete** button (hidden for viewers)
  - All action buttons are equal width and height

### Photo Upload
- Photos are watermarked client-side before upload using Canvas API
- Watermark: current date/time in bottom-right corner
- Watermark style: phosphorescent green (#39ff14) text with glow effect on dark semi-transparent background
- Images converted to JPEG at 92% quality after watermarking

### Photo Lightbox
- Click a photo thumbnail to open full-size in a dark overlay
- Previous/Next arrow buttons to navigate through all photos of that car
- **Touch swipe** support: swipe left/right on mobile to navigate (50px minimum threshold, ignores vertical swipes)
- Photo counter shown at bottom (e.g., "2 / 5")
- Keyboard support: Arrow Left/Right to navigate, Escape to close
- Click overlay background to close

### Table View (Admin only)
- Accessed from hamburger menu > Table View
- Sortable table with columns: Date, Location, Chassis, Created By
- Default sort: date descending, then location ascending
- Click column headers to sort (ascending/descending with arrow indicators)
- Search box filters across all columns
- **Export to Excel** button: exports current filtered data as CSV with UTF-8 BOM
- Horizontal scrollbar on mobile with min-width 500px for readability

### Admin: Manage Users
- Replaces the cars view when active
- Table listing all users with username, role, created date, delete button
- Current user shown with "(you)" label, cannot delete self
- Create new user form with username, password, and role dropdown (Editor/Viewer/Admin)

### Admin: Manage Locations
- Replaces the cars view when active
- Table listing all locations with delete button
- Add new location form

### Header
- Oncoming car icon (&#128664;) + "CarMonitor" title with subtitle "Track and browse car records"
- Browser tab favicon: same car emoji
- When logged in: username display, hamburger menu (&#9776;)
- Hamburger menu contents:
  - **Admin users**: Car View, Table View, Manage Locations, Manage Users, divider, Logout
  - **Editor/Viewer users**: Logout only
- Admin dropdown closes when clicking outside

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
  upload.js               — POST file upload to Vercel Blob (bodyParser disabled)
  images/[imageId].js     — DELETE /api/images/:imageId
  auth/login.js           — POST /api/auth/login
  auth/register.js        — POST /api/auth/register (admin only)
  auth/users.js           — GET /api/auth/users (admin only)
  auth/users/[userId].js  — DELETE /api/auth/users/:userId (admin only)
  locations.js            — GET/POST /api/locations
  locations/[locationId].js — DELETE /api/locations/:locationId (admin only)
lib/
  db.js                   — Neon Postgres connection, ensureTables() with migrations
  auth.js                 — JWT helpers: createToken, authenticate, requireAuth, requireAdmin
```

## Style
- Original blue theme: blue header (#2563eb), light gray background (#f1f5f9), white cards
- Responsive design, works on mobile
- Border-radius: 8px throughout
- Box shadows on cards: `0 1px 3px rgba(0,0,0,0.08)`
- Hamburger menu with dropdown for navigation
- Form rows wrap on mobile (flex-wrap)

## Dependencies
```json
{
  "@vercel/blob": "^0.27.0",
  "@neondatabase/serverless": "^0.10.0",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.0"
}
```

## Dev Dependencies
```json
{
  "dotenv": "^17.4.1"
}
```
