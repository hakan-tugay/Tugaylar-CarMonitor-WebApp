const carsGrid = document.getElementById('cars-grid');
const emptyMessage = document.getElementById('empty-message');
const carForm = document.getElementById('car-form');
let carsData = [];

async function loadCars() {
  const res = await fetch('/api/cars');
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
      // Step 1: Add watermark
      const watermarked = await addWatermark(file);

      // Step 2: Upload to Vercel Blob
      const uploadRes = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method: 'POST',
        body: watermarked,
      });
      if (!uploadRes.ok) throw new Error('Failed to upload photo');
      const blob = await uploadRes.json();

      // Step 3: Save blob URL reference to the car record
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

carForm.addEventListener('submit', createCar);
document.addEventListener('DOMContentLoaded', loadCars);
