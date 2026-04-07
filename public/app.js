const carsGrid = document.getElementById('cars-grid');
const emptyMessage = document.getElementById('empty-message');
const carForm = document.getElementById('car-form');

async function loadCars() {
  const res = await fetch('/api/cars');
  const cars = await res.json();

  carsGrid.innerHTML = '';

  if (cars.length === 0) {
    emptyMessage.classList.remove('hidden');
    return;
  }

  emptyMessage.classList.add('hidden');

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
          `<div class="image-wrapper" onclick="onImageClick(this, '${escapeHtml(img.url)}', ${img.id})">
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location })
    });

    if (!carRes.ok) throw new Error('Failed to create car');

    carForm.reset();
    await loadCars();
  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    submitBtn.disabled = false;
  }
}

async function uploadPhotos(carId, files) {
  if (!files || files.length === 0) return;

  try {
    for (const file of files) {
      // Step 1: Upload file to Vercel Blob
      const uploadRes = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Failed to upload photo');
      const blob = await uploadRes.json();

      // Step 2: Save blob URL reference to the car record
      const saveRes = await fetch(`/api/cars/${carId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: blob.url, filename: file.name }),
      });
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

function onImageClick(wrapper, url, imageId) {
  const card = wrapper.closest('.car-card');
  if (card.classList.contains('delete-mode')) {
    deleteImage(imageId);
  } else {
    openLightbox(url);
  }
}

async function deleteImage(imageId) {
  if (!confirm('Delete this photo?')) return;

  try {
    const res = await fetch(`/api/images/${imageId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete photo');
    await loadCars();
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function deleteCar(id) {
  if (!confirm('Are you sure you want to delete this car record?')) return;

  try {
    const res = await fetch(`/api/cars/${id}`, { method: 'DELETE' });
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

function openLightbox(url) {
  const overlay = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  img.src = url;
  overlay.classList.remove('hidden');
}

function closeLightbox() {
  const overlay = document.getElementById('lightbox');
  overlay.classList.add('hidden');
  document.getElementById('lightbox-img').src = '';
}

carForm.addEventListener('submit', createCar);
document.addEventListener('DOMContentLoaded', loadCars);
