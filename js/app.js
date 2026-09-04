// =============================================
//   CTC Fashion & Luggage Wear — Main JS
// =============================================

const WHATSAPP_NUMBER = "263771621449"; // international format, no +
const STORE_NAME = "CTC Fashion & Luggage Wear";
const PRODUCTS_API = "https://nexgoal8-cd425-default-rtdb.firebaseio.com/products.json";

let products = [];
let cart = JSON.parse(localStorage.getItem('ctc-cart') || '[]');
let currentFilter = 'All';

// ---------- Load Products ----------
async function loadProducts() {
  try {
    const res = await fetch(PRODUCTS_API);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    // Firebase can return array with null slots or an object — handle both
    if (Array.isArray(data)) {
      products = data.filter(Boolean);
    } else if (data && typeof data === "object") {
      products = Object.values(data).filter(Boolean);
    } else {
      products = [];
    }
    renderProducts(products);
  } catch (e) {
    console.warn('Could not load live products, using local data.');
    try {
      const res2 = await fetch('data/products.json');
      products = await res2.json();
    } catch {
      products = getDemoProducts();
    }
    renderProducts(products);
  }
}

// ---------- Render Products ----------
function renderProducts(list, containerId = 'products-grid') {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  if (list.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--grey-500)">
      <div style="font-size:3rem;margin-bottom:12px">🔍</div>
      <p style="font-family:var(--font-head);font-weight:700;font-size:1.1rem;margin-bottom:8px">No products found</p>
      <p>Try a different search or filter</p>
    </div>`;
    return;
  }

  grid.innerHTML = list.map(p => `
    <div class="product-card" onclick="openProduct(${p.id})">
      <div class="product-img">
        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x300/1565C0/ffffff?text=${encodeURIComponent(p.name)}'">
        ${p.bestSeller ? '<span class="product-badge">Best Seller</span>' : ''}
        <button class="quick-add" onclick="event.stopPropagation();addToCart(${p.id})">
          🛒 Add to Cart
        </button>
      </div>
      <div class="product-info">
        <div class="product-category">${p.category}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-footer">
          <div class="product-price">$${p.price.toFixed(2)} <span>USD</span></div>
          <div class="stars">${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))} (${p.reviews})</div>
        </div>
      </div>
    </div>
  `).join('');
}

// ---------- Render Featured ----------
function renderFeatured() {
  const featured = products.filter(p => p.featured);
  renderProducts(featured, 'featured-grid');
}

// ---------- Render Best Sellers ----------
function renderBestSellers() {
  const best = products.filter(p => p.bestSeller);
  renderProducts(best, 'bestseller-grid');
}

// ---------- Filter ----------
function setFilter(cat) {
  currentFilter = cat;
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  document.querySelectorAll('.cat-card').forEach(c => {
    c.classList.toggle('active', c.dataset.cat === cat);
  });
  const filtered = cat === 'All' ? products : products.filter(p => p.category === cat);
  renderProducts(filtered, 'products-grid');
}

// ---------- Search ----------
function doSearch(query) {
  const q = query.toLowerCase().trim();
  if (!q) { setFilter(currentFilter); return; }
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q)
  );
  renderProducts(filtered, 'products-grid');
  // scroll to products
  document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- Product Modal with Gallery ----------
function openProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const modal = document.getElementById('product-modal');

  // Build image list — support images array or single image
  const imgs = Array.isArray(p.images) && p.images.length > 0
    ? p.images
    : [p.image].filter(Boolean);

  // Set main image
  const mainImg = document.getElementById('gallery-main-img');
  mainImg.src = imgs[0] || '';
  mainImg.alt = p.name;

  // Build thumbnails
  const thumbsEl = document.getElementById('gallery-thumbs');
  if (imgs.length > 1) {
    thumbsEl.innerHTML = imgs.map((src, i) => `
      <img class="gallery-thumb ${i === 0 ? 'active' : ''}" src="${src}" alt="${p.name} view ${i+1}"
        onclick="switchGalleryImage(this, '${src}')">
    `).join('');
    thumbsEl.style.display = 'flex';
  } else {
    thumbsEl.innerHTML = '';
    thumbsEl.style.display = 'none';
  }

  // Set product info
  modal.querySelector('.modal-category').textContent = p.category;
  modal.querySelector('.modal-name').textContent = p.name;
  modal.querySelector('.modal-price').textContent = `$${p.price.toFixed(2)}`;
  modal.querySelector('.modal-desc').textContent = p.description;
  modal.querySelector('.modal-stars').innerHTML = '★'.repeat(Math.round(p.rating)) + '☆'.repeat(5 - Math.round(p.rating)) + ` (${p.reviews} reviews)`;
  modal.querySelector('#modal-qty').textContent = '1';
  modal.dataset.productId = id;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  // Push history state so phone back button closes modal instead of leaving page
  history.pushState({ modal: 'product' }, '');
}

function switchGalleryImage(thumb, src) {
  document.getElementById('gallery-main-img').src = src;
  document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
}

function closeModal() {
  document.getElementById('product-modal').classList.remove('open');
  document.body.style.overflow = '';
}

// ---------- Lightbox ----------
function openLightbox(src) {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  img.src = src;
  img.classList.remove('zoomed');
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
  history.pushState({ modal: 'lightbox' }, '');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.body.style.overflow = 'hidden'; // keep modal scroll locked
}

// Double-tap / click to zoom in lightbox
document.addEventListener('DOMContentLoaded', () => {
  let lastTap = 0;
  const lbImg = document.getElementById('lightbox-img');
  if (lbImg) {
    lbImg.addEventListener('click', function(e) {
      e.stopPropagation();
      const now = Date.now();
      if (now - lastTap < 300) {
        this.classList.toggle('zoomed');
      }
      lastTap = now;
    });
  }
});

function changeModalQty(delta) {
  const el = document.getElementById('modal-qty');
  const cur = parseInt(el.textContent);
  el.textContent = Math.max(1, cur + delta);
}

function addToCartFromModal() {
  const modal = document.getElementById('product-modal');
  const id = parseInt(modal.dataset.productId);
  const qty = parseInt(document.getElementById('modal-qty').textContent);
  addToCart(id, qty);
  closeModal();
}

function whatsappFromModal() {
  const modal = document.getElementById('product-modal');
  const id = parseInt(modal.dataset.productId);
  const p = products.find(x => x.id === id);
  const qty = parseInt(document.getElementById('modal-qty').textContent);
  if (!p) return;
  const msg = `Hello ${STORE_NAME}! 👋\n\nI'd like to order:\n\n• ${p.name} x${qty} — $${(p.price * qty).toFixed(2)}\n\nPlease confirm availability and delivery details. Thank you!`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ---------- Cart ----------
function addToCart(id, qty = 1) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const existing = cart.find(c => c.id === id);
  if (existing) { existing.qty += qty; }
  else { cart.push({ id: p.id, name: p.name, price: p.price, image: p.image, category: p.category, qty }); }
  saveCart();
  updateCartBadge();
  renderCartItems();
  showToast(`✅ ${p.name} added to cart!`);
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  saveCart(); updateCartBadge(); renderCartItems();
}

function changeCartQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart(); renderCartItems(); updateCartBadge();
}

function saveCart() { localStorage.setItem('ctc-cart', JSON.stringify(cart)); }

function updateCartBadge() {
  const total = cart.reduce((s, c) => s + c.qty, 0);
  document.querySelectorAll('.cart-badge').forEach(b => {
    b.textContent = total;
    b.style.display = total > 0 ? 'flex' : 'none';
  });
}

function renderCartItems() {
  const el = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!el) return;

  if (cart.length === 0) {
    el.innerHTML = `<div class="cart-empty">
      <div class="cart-empty-icon">🛒</div>
      <p style="font-family:var(--font-head);font-weight:700;color:var(--navy)">Your cart is empty</p>
      <p style="font-size:0.85rem">Add some items to get started</p>
    </div>`;
    if (totalEl) totalEl.textContent = '$0.00';
    return;
  }

  el.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img class="cart-item-img" src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/64x64/1565C0/fff?text=CTC'">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
        <div class="cart-item-controls">
          <button class="cart-qty-btn" onclick="changeCartQty(${item.id}, -1)">−</button>
          <span class="cart-qty-num">${item.qty}</span>
          <button class="cart-qty-btn" onclick="changeCartQty(${item.id}, 1)">+</button>
          <button class="cart-remove-btn" onclick="removeFromCart(${item.id})" title="Remove">🗑</button>
        </div>
      </div>
    </div>
  `).join('');

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;
}

function openCart() {
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('cart-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCartItems();
  history.pushState({ modal: 'cart' }, '');
}

function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function checkoutWhatsApp() {
  if (cart.length === 0) { showToast('❗ Your cart is empty!'); return; }
  const items = cart.map(c => `• ${c.name} x${c.qty} — $${(c.price * c.qty).toFixed(2)}`).join('\n');
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const msg = `Hello ${STORE_NAME}! 👋\n\nI'd like to place an order:\n\n${items}\n\n💰 Total: $${total.toFixed(2)}\n\nPlease confirm availability and delivery. Thank you!`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ---------- Toast ----------
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.querySelector('.toast-msg').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ---------- Mobile Nav ----------
function toggleMobileNav() {
  document.getElementById('nav-links').classList.toggle('mobile-open');
}

// ---------- Scroll to Top ----------
window.addEventListener('scroll', () => {
  const btn = document.getElementById('scroll-top');
  if (btn) btn.classList.toggle('visible', window.scrollY > 400);
});

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  renderFeatured();
  renderBestSellers();
  updateCartBadge();

  // Search handlers
  const searchInputs = document.querySelectorAll('.search-input');
  searchInputs.forEach(inp => {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') doSearch(inp.value);
    });
  });
  document.querySelectorAll('.search-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = btn.closest('.nav-search, .hero-search')?.querySelector('input');
      if (inp) doSearch(inp.value);
    });
  });

  // Close modal on backdrop
  document.getElementById('product-modal')?.addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  // ESC key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeCart(); closeLightbox(); }
  });

  // Phone back button — close modals instead of leaving page
  window.addEventListener('popstate', function(e) {
    if (document.getElementById('lightbox').classList.contains('open')) {
      closeLightbox();
    } else if (document.getElementById('product-modal').classList.contains('open')) {
      closeModal();
    } else if (document.getElementById('cart-drawer').classList.contains('open')) {
      closeCart();
    }
  });
});

// ---------- Demo fallback ----------
function getDemoProducts() {
  return [
    { id:1, name:"School Blazer", price:35.00, category:"School Uniforms", image:"https://images.unsplash.com/photo-1592878904946-b3cd8ae243d0?w=600&q=80", description:"Smart school blazer for all ages.", featured:true, bestSeller:true, rating:4.8, reviews:42 },
    { id:2, name:"Track Suit", price:28.00, category:"School Uniforms", image:"https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=600&q=80", description:"Comfortable track suit for school sports.", featured:true, bestSeller:true, rating:4.7, reviews:38 },
    { id:3, name:"Ladies Fashion Dress", price:22.00, category:"Fashion Wear", image:"https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&q=80", description:"Elegant dresses for all occasions.", featured:true, bestSeller:true, rating:4.9, reviews:54 },
    { id:4, name:"Laptop Bag", price:19.00, category:"Bags", image:"https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80", description:"Sleek protective laptop bags.", featured:true, bestSeller:true, rating:4.7, reviews:48 },
  ];
}
