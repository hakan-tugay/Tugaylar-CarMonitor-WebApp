const carsGrid = document.getElementById('cars-grid');
const emptyMessage = document.getElementById('empty-message');
const carForm = document.getElementById('car-form');
let carsData = [];

// --- Auth ---

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders(extra = {}) {
  const token = getToken();
  const headers = { ...extra };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return headers;
}

function showAuth() {
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('app-section').classList.add('hidden');
  document.getElementById('user-info').classList.add('hidden');
}

function showApp(username) {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('app-section').classList.remove('hidden');
  document.getElementById('user-info').classList.remove('hidden');
  document.getElementById('username-display').textContent = username;
  const isAdmin = username.toLowerCase().includes('tugay');
  document.getElementById('admin-menu').style.display = isAdmin ? '' : 'none';
  if (!isAdmin) {
    document.getElementById('users-section').classList.add('hidden');
    document.getElementById('locations-section').classList.add('hidden');
  }
  loadLocationsDatalist();
  loadCars();
}

let isLoginMode = true;

function toggleAuthMode(e) {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  document.getElementById('auth-title').textContent = isLoginMode ? 'Login' : 'Register';
  document.getElementById('auth-submit').textContent = isLoginMode ? 'Login' : 'Register';
  document.getElementById('auth-toggle-text').textContent = isLoginMode ? "Don't have an account?" : 'Already have an account?';
  document.getElementById('auth-toggle-link').textContent = isLoginMode ? 'Register' : 'Login';
  document.getElementById('auth-error').classList.add('hidden');
}

document.getElementById('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('auth-username').value.trim();
  const password = document.getElementById('auth-password').value;
  const errorEl = document.getElementById('auth-error');
  errorEl.classList.add('hidden');

  const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Authentication failed';
      errorEl.classList.remove('hidden');
      return;
    }
    localStorage.setItem('token', data.token);
    localStorage.setItem('username', data.username);
    showApp(data.username);
  } catch (err) {
    errorEl.textContent = 'Connection error';
    errorEl.classList.remove('hidden');
  }
});

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  showAuth();
}

// --- Dropdown ---

function toggleDropdown() {
  document.getElementById('dropdown-menu').classList.toggle('hidden');
}

function closeDropdown() {
  document.getElementById('dropdown-menu').classList.add('hidden');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown')) closeDropdown();
});

// --- Locations ---

async function loadLocationsDatalist() {
  const res = await fetch('/api/locations', { headers: authHeaders() });
  if (res.status === 401) { logout(); return; }
  const locations = await res.json();
  const datalist = document.getElementById('locations');
  datalist.innerHTML = locations.map(l => `<option value="${escapeHtml(l.name)}">`).join('');
}

// --- Location Management ---

function toggleLocationsPanel() {
  const locationsSection = document.getElementById('locations-section');
  const usersSection = document.getElementById('users-section');
  const createSection = document.getElementById('create-section');
  const carsSection = document.getElementById('cars-section');
  const isVisible = !locationsSection.classList.contains('hidden');

  if (isVisible) {
    locationsSection.classList.add('hidden');
    createSection.classList.remove('hidden');
    carsSection.classList.remove('hidden');
    document.getElementById('manage-locations-btn').textContent = 'Manage Locations';
  } else {
    locationsSection.classList.remove('hidden');
    usersSection.classList.add('hidden');
    createSection.classList.add('hidden');
    carsSection.classList.add('hidden');
    document.getElementById('manage-locations-btn').textContent = 'Back to Cars';
    document.getElementById('manage-users-btn').textContent = 'Manage Users';
    loadLocations();
  }
}

async function loadLocations() {
  const res = await fetch('/api/locations', { headers: authHeaders() });
  if (res.status === 401) { logout(); return; }
  const locations = await res.json();

  const list = document.getElementById('locations-list');
  if (locations.length === 0) {
    list.innerHTML = '<p class="no-users">No locations yet.</p>';
    return;
  }

  list.innerHTML = '<table class="users-table"><thead><tr><th>Location</th><th></th></tr></thead><tbody>' +
    locations.map(l =>
      `<tr>
        <td>${escapeHtml(l.name)}</td>
        <td><button class="btn-delete-user" onclick="deleteLocation(${l.id})">Delete</button></td>
      </tr>`
    ).join('') +
    '</tbody></table>';
}

document.getElementById('create-location-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('create-location-error');
  const successEl = document.getElementById('create-location-success');
  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');

  const name = document.getElementById('new-location-name').value.trim();

  try {
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error;
      errorEl.classList.remove('hidden');
      return;
    }
    successEl.textContent = `Location "${data.name}" added`;
    successEl.classList.remove('hidden');
    document.getElementById('new-location-name').value = '';
    loadLocations();
    loadLocationsDatalist();
  } catch (err) {
    errorEl.textContent = 'Connection error';
    errorEl.classList.remove('hidden');
  }
});

async function deleteLocation(locationId) {
  if (!confirm('Delete this location?')) return;
  try {
    const res = await fetch(`/api/locations/${locationId}`, { method: 'DELETE', headers: authHeaders() });
    if (res.status === 401) { logout(); return; }
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to delete location');
      return;
    }
    loadLocations();
    loadLocationsDatalist();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// --- User Management ---

function toggleUsersPanel() {
  const usersSection = document.getElementById('users-section');
  const locationsSection = document.getElementById('locations-section');
  const createSection = document.getElementById('create-section');
  const carsSection = document.getElementById('cars-section');
  const isVisible = !usersSection.classList.contains('hidden');

  if (isVisible) {
    usersSection.classList.add('hidden');
    createSection.classList.remove('hidden');
    carsSection.classList.remove('hidden');
    document.getElementById('manage-users-btn').textContent = 'Manage Users';
  } else {
    usersSection.classList.remove('hidden');
    locationsSection.classList.add('hidden');
    createSection.classList.add('hidden');
    carsSection.classList.add('hidden');
    document.getElementById('manage-users-btn').textContent = 'Back to Cars';
    document.getElementById('manage-locations-btn').textContent = 'Manage Locations';
    loadUsers();
  }
}

async function loadUsers() {
  const res = await fetch('/api/auth/users', { headers: authHeaders() });
  if (res.status === 401) { logout(); return; }
  const users = await res.json();

  const list = document.getElementById('users-list');
  if (users.length === 0) {
    list.innerHTML = '<p class="no-users">No users found.</p>';
    return;
  }

  const currentUsername = localStorage.getItem('username');
  list.innerHTML = '<table class="users-table"><thead><tr><th>Username</th><th>Created</th><th></th></tr></thead><tbody>' +
    users.map(u => {
      const date = new Date(u.created_at).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric'
      });
      const isSelf = u.username === currentUsername;
      return `<tr>
        <td>${escapeHtml(u.username)}${isSelf ? ' (you)' : ''}</td>
        <td>${date}</td>
        <td>${isSelf ? '' : `<button class="btn-delete-user" onclick="deleteUser(${u.id})">Delete</button>`}</td>
      </tr>`;
    }).join('') +
    '</tbody></table>';
}

document.getElementById('create-user-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById('create-user-error');
  const successEl = document.getElementById('create-user-success');
  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');

  const username = document.getElementById('new-username').value.trim();
  const password = document.getElementById('new-password').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error;
      errorEl.classList.remove('hidden');
      return;
    }
    successEl.textContent = `User "${data.username}" created`;
    successEl.classList.remove('hidden');
    document.getElementById('new-username').value = '';
    document.getElementById('new-password').value = '';
    loadUsers();
  } catch (err) {
    errorEl.textContent = 'Connection error';
    errorEl.classList.remove('hidden');
  }
});

async function deleteUser(userId) {
  if (!confirm('Delete this user?')) return;
  try {
    const res = await fetch(`/api/auth/users/${userId}`, { method: 'DELETE', headers: authHeaders() });
    if (res.status === 401) { logout(); return; }
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to delete user');
      return;
    }
    loadUsers();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

// --- App ---

async function loadCars() {
  const res = await fetch('/api/cars', { headers: authHeaders() });
  if (res.status === 401) { logout(); return; }
  const cars = await res.json();

  carsGrid.innerHTML = '';

  if (cars.length === 0) {
    emptyMessage.classList.remove('hidden');
    return;
  }

  emptyMessage.classList.add('hidden');
  carsData = cars;

  for (const car of cars) {
    const card = document.createElement('div');
    card.className = 'car-card';

    const date = new Date(car.created_at);
    const dateStr = date.toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    let imagesHtml = '';
    if (car.images.length > 0) {
      imagesHtml = '<div class="card-images">' +
        car.images.map(img =>
          `<div class="image-wrapper" onclick="onImageClick(this, ${car.id}, ${car.images.indexOf(img)}, ${img.id})">
            <img src="${escapeHtml(img.url)}" alt="Car photo">
            <span class="delete-overlay">&times;</span>
          </div>`
        ).join('') +
        '</div>';
    }

    card.innerHTML = `
      <div class="card-body">
        <div class="card-meta">
          <span>${dateStr}</span>
        </div>
        <div class="card-location">${escapeHtml(car.location)}</div>
        ${imagesHtml}
        <div class="card-actions">
          <label class="btn-add-photos">
            Add Photos
            <input type="file" multiple accept="image/*" onchange="uploadPhotos(${car.id}, this.files)" hidden>
          </label>
          ${car.images.length > 0 ? `<button class="btn-edit-photos" onclick="toggleDeleteMode(this)">Edit Photos</button>` : ''}
          <button class="btn-delete" onclick="deleteCar(${car.id})">Delete</button>
        </div>
      </div>
    `;

    carsGrid.appendChild(card);
  }
}

async function createCar(e) {
  e.preventDefault();

  const locationInput = document.getElementById('location');
  const submitBtn = carForm.querySelector('button[type="submit"]');

  const location = locationInput.value.trim();
  if (!location) return;

  submitBtn.disabled = true;

  try {
    const carRes = await fetch('/api/cars', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ location })
    });

    if (carRes.status === 401) { logout(); return; }
    if (!carRes.ok) throw new Error('Failed to create car');

    carForm.reset();
    await loadCars();
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    submitBtn.disabled = false;
  }
}

function addWatermark(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const dateStr = new Date().toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      const fontSize = Math.max(16, Math.floor(img.width / 30));
      ctx.font = `bold ${fontSize}px sans-serif`;
      const padding = fontSize * 0.5;
      const textMetrics = ctx.measureText(dateStr);
      const x = img.width - textMetrics.width - padding;
      const y = img.height - padding;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(x - padding * 0.5, y - fontSize, textMetrics.width + padding, fontSize + padding * 0.5);

      ctx.shadowColor = 'rgba(0, 255, 0, 0.8)';
      ctx.shadowBlur = fontSize * 0.6;
      ctx.fillStyle = '#39ff14';
      ctx.fillText(dateStr, x, y);
      ctx.shadowBlur = 0;

      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    };
    img.src = URL.createObjectURL(file);
  });
}

async function uploadPhotos(carId, files) {
  if (!files || files.length === 0) return;

  try {
    for (const file of files) {
      const watermarked = await addWatermark(file);

      const uploadRes = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        headers: authHeaders(),
        body: watermarked,
      });
      if (uploadRes.status === 401) { logout(); return; }
      if (!uploadRes.ok) throw new Error('Failed to upload photo');
      const blob = await uploadRes.json();

      const saveRes = await fetch(`/api/cars/${carId}/images`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ url: blob.url, filename: file.name }),
      });
      if (saveRes.status === 401) { logout(); return; }
      if (!saveRes.ok) throw new Error('Failed to save photo');
    }
    await loadCars();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function toggleDeleteMode(btn) {
  const card = btn.closest('.car-card');
  const isActive = card.classList.toggle('delete-mode');
  btn.textContent = isActive ? 'Done' : 'Edit Photos';
}

function onImageClick(wrapper, carId, imageIndex, imageId) {
  const card = wrapper.closest('.car-card');
  if (card.classList.contains('delete-mode')) {
    deleteImage(imageId);
  } else {
    openLightbox(carId, imageIndex);
  }
}

async function deleteImage(imageId) {
  if (!confirm('Delete this photo?')) return;

  try {
    const res = await fetch(`/api/images/${imageId}`, { method: 'DELETE', headers: authHeaders() });
    if (res.status === 401) { logout(); return; }
    if (!res.ok) throw new Error('Failed to delete photo');
    await loadCars();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteCar(id) {
  if (!confirm('Are you sure you want to delete this car record?')) return;

  try {
    const res = await fetch(`/api/cars/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (res.status === 401) { logout(); return; }
    if (!res.ok) throw new Error('Failed to delete car');
    await loadCars();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let lightboxCarId = null;
let lightboxIndex = 0;

function openLightbox(carId, index) {
  lightboxCarId = carId;
  lightboxIndex = index;
  updateLightboxImage();
  document.getElementById('lightbox').classList.remove('hidden');
}

function updateLightboxImage() {
  const car = carsData.find(c => c.id === lightboxCarId);
  if (!car) return;
  const img = document.getElementById('lightbox-img');
  img.src = car.images[lightboxIndex].url;
  const counter = document.getElementById('lightbox-counter');
  counter.textContent = car.images.length > 1 ? `${lightboxIndex + 1} / ${car.images.length}` : '';
  document.getElementById('lightbox-prev').style.display = car.images.length > 1 ? '' : 'none';
  document.getElementById('lightbox-next').style.display = car.images.length > 1 ? '' : 'none';
}

function lightboxPrev(e) {
  e.stopPropagation();
  const car = carsData.find(c => c.id === lightboxCarId);
  if (!car) return;
  lightboxIndex = (lightboxIndex - 1 + car.images.length) % car.images.length;
  updateLightboxImage();
}

function lightboxNext(e) {
  e.stopPropagation();
  const car = carsData.find(c => c.id === lightboxCarId);
  if (!car) return;
  lightboxIndex = (lightboxIndex + 1) % car.images.length;
  updateLightboxImage();
}

function closeLightbox() {
  document.getElementById('lightbox').classList.add('hidden');
  document.getElementById('lightbox-img').src = '';
  lightboxCarId = null;
}

document.addEventListener('keydown', (e) => {
  if (document.getElementById('lightbox').classList.contains('hidden')) return;
  if (e.key === 'ArrowLeft') lightboxPrev(e);
  else if (e.key === 'ArrowRight') lightboxNext(e);
  else if (e.key === 'Escape') closeLightbox();
});

// --- Init ---
carForm.addEventListener('submit', createCar);

document.addEventListener('DOMContentLoaded', () => {
  const token = getToken();
  const username = localStorage.getItem('username');
  if (token && username) {
    showApp(username);
  } else {
    showAuth();
  }
});
