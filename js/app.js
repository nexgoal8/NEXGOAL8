// =============================================
//   NexGoal Soccer Wear — Main JS
// =============================================

const WHATSAPP_NUMBERS = ["263788018611", "263779998833"];
const STORE_NAME = "NexGoal Soccer Wear";

// ── JSONBin.io config ──────────────────────────────────────────────────────
// 1. Create a free account at https://jsonbin.io
// 2. Create a bin with your products array (or an empty [])
// 3. Paste your Bin ID and API key below
const JSONBIN_BIN_ID  = "6a42cd7bf5f4af5e2943a739";   // e.g. "6659f3e1acd3cb34a8560e23"
const JSONBIN_API_KEY = "$2a$10$V/hPd2mOVYeSSCg3AkzxeueXRp8Dkomi8NKhQfWHVGZktj05qY66G";   // X-Master-Key from your account
const JSONBIN_BASE    = "https://api.jsonbin.io/v3/b";
const PRODUCTS_API    = `${JSONBIN_BASE}/${JSONBIN_BIN_ID}`;
// ──────────────────────────────────────────────────────────────────────────

let products = [];
let cart = JSON.parse(localStorage.getItem('nexgoal-cart') || '[]');
let currentFilter = 'All';

// ---------- Load Products ----------
async function loadProducts() {
  try {
    const res = await fetch(`${PRODUCTS_API}/latest`, {
      headers: { "X-Master-Key": JSONBIN_API_KEY }
    });
    if (!res.ok) throw new Error("JSONBin fetch failed: " + res.status);
    const json = await res.json();
    // JSONBin wraps the payload in { record: <your data> }
    const data = json.record;
    products = Array.isArray(data) ? data : Object.values(data || {});
    renderProducts(products);
  } catch (e) {
    console.warn('Could not load live products, using local data.', e);
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
      <p style="font-family:var(--font-head);font-weight:700;font-size:1.1rem;margin-bottom:8px;text-transform:uppercase">No products found</p>
      <p>Try a different search or filter</p>
    </div>`;
    return;
  }
  grid.innerHTML = list.map(p => `
    <div class="product-card" onclick="openProduct(${p.id})">
      <div class="product-img">
        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='https://placehold.co/400x300/1A1A1A/CC0000?text=${encodeURIComponent(p.name)}'">
        ${p.bestSeller ? '<span class="product-badge">🔥 Hot</span>' : ''}
        <button class="quick-add" onclick="event.stopPropagation();addToCart(${p.id})">
          🛒 Add to Cart
        </button>
      </div>
      <div class="product-info">
        <div class="product-category">${p.category}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-footer">
          <div class="product-price">$${p.price.toFixed(2)} <span>USD</span></div>
          <div class="stars">${'★'.repeat(Math.round(p.rating))}${'☆'.repeat(5 - Math.round(p.rating))}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function renderFeatured() {
  renderProducts(products.filter(p => p.featured), 'featured-grid');
}

function renderBestSellers() {
  renderProducts(products.filter(p => p.bestSeller), 'bestseller-grid');
}

// ---------- Filter ----------
function setFilter(cat) {
  currentFilter = cat;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  document.querySelectorAll('.cat-card').forEach(c => c.classList.toggle('active', c.dataset.cat === cat));
  renderProducts(cat === 'All' ? products : products.filter(p => p.category === cat), 'products-grid');
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
  document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---------- Product Modal with Gallery ----------
function openProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const modal = document.getElementById('product-modal');
  const imgs = Array.isArray(p.images) && p.images.length > 0
    ? p.images : [p.image].filter(Boolean);
  const mainImg = document.getElementById('gallery-main-img');
  mainImg.src = imgs[0] || '';
  mainImg.alt = p.name;
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
  modal.querySelector('.modal-category').textContent = p.category;
  modal.querySelector('.modal-name').textContent = p.name;
  modal.querySelector('.modal-price').textContent = `$${p.price.toFixed(2)}`;
  modal.querySelector('.modal-desc').textContent = p.description;
  modal.querySelector('.modal-stars').innerHTML = '★'.repeat(Math.round(p.rating)) + '☆'.repeat(5 - Math.round(p.rating)) + ` (${p.reviews} reviews)`;
  modal.querySelector('#modal-qty').textContent = '1';
  modal.dataset.productId = id;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
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
  document.body.style.overflow = 'hidden';
}

function changeModalQty(delta) {
  const el = document.getElementById('modal-qty');
  el.textContent = Math.max(1, parseInt(el.textContent) + delta);
}

function addToCartFromModal() {
  const modal = document.getElementById('product-modal');
  addToCart(parseInt(modal.dataset.productId), parseInt(document.getElementById('modal-qty').textContent));
  closeModal();
}

function whatsappFromModal() {
  const modal = document.getElementById('product-modal');
  const p = products.find(x => x.id === parseInt(modal.dataset.productId));
  const qty = parseInt(document.getElementById('modal-qty').textContent);
  if (!p) return;
  const msg = `Hello ${STORE_NAME}! ⚽\n\nI'd like to order:\n\n• ${p.name} x${qty} — $${(p.price * qty).toFixed(2)}\n\nPlease confirm availability and delivery. Thank you!`;
  const num = WHATSAPP_NUMBERS[0];
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ---------- Cart ----------
function addToCart(id, qty = 1) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const existing = cart.find(c => c.id === id);
  if (existing) { existing.qty += qty; } else { cart.push({ id: p.id, name: p.name, price: p.price, image: p.image, category: p.category, qty }); }
  saveCart(); updateCartBadge(); renderCartItems();
  showToast(`✅ ${p.name} added to cart!`);
}

function removeFromCart(id) { cart = cart.filter(c => c.id !== id); saveCart(); updateCartBadge(); renderCartItems(); }
function changeCartQty(id, delta) {
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart(); renderCartItems(); updateCartBadge();
}
function saveCart() { localStorage.setItem('nexgoal-cart', JSON.stringify(cart)); }
function updateCartBadge() {
  const total = cart.reduce((s, c) => s + c.qty, 0);
  document.querySelectorAll('.cart-badge').forEach(b => { b.textContent = total; b.style.display = total > 0 ? 'flex' : 'none'; });
}
function renderCartItems() {
  const el = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total');
  if (!el) return;
  if (cart.length === 0) {
    el.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🛒</div><p style="font-family:var(--font-head);font-weight:700;color:var(--white);text-transform:uppercase">Your cart is empty</p><p style="font-size:0.85rem">Add some items to get started</p></div>`;
    if (totalEl) totalEl.textContent = '$0.00';
    return;
  }
  el.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img class="cart-item-img" src="${item.image}" alt="${item.name}" onerror="this.src='https://placehold.co/64x64/1A1A1A/CC0000?text=NG'">
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

function openCart() { document.getElementById('cart-drawer').classList.add('open'); document.getElementById('cart-overlay').classList.add('open'); document.body.style.overflow = 'hidden'; renderCartItems(); history.pushState({ modal: 'cart' }, ''); }
function closeCart() { document.getElementById('cart-drawer').classList.remove('open'); document.getElementById('cart-overlay').classList.remove('open'); document.body.style.overflow = ''; }

function checkoutWhatsApp() {
  if (cart.length === 0) { showToast('❗ Your cart is empty!'); return; }
  const items = cart.map(c => `• ${c.name} x${c.qty} — $${(c.price * c.qty).toFixed(2)}`).join('\n');
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const msg = `Hello ${STORE_NAME}! ⚽\n\nI'd like to place an order:\n\n${items}\n\n💰 Total: $${total.toFixed(2)}\n\nPlease confirm availability and delivery. Thank you!`;
  const num = WHATSAPP_NUMBERS[0];
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
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
function toggleMobileNav() { document.getElementById('nav-links').classList.toggle('mobile-open'); }

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', async () => {
  await loadProducts();
  renderFeatured();
  renderBestSellers();
  updateCartBadge();
  document.querySelectorAll('.search-input').forEach(inp => inp.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(inp.value); }));
  document.querySelectorAll('.search-btn').forEach(btn => btn.addEventListener('click', () => { const inp = btn.closest('.nav-search, .hero-search')?.querySelector('input'); if (inp) doSearch(inp.value); }));
  document.getElementById('product-modal')?.addEventListener('click', function(e) { if (e.target === this) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeCart(); closeLightbox(); } });

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

window.addEventListener('scroll', () => { const btn = document.getElementById('scroll-top'); if (btn) btn.classList.toggle('visible', window.scrollY > 400); });

function getDemoProducts() {
  return [
    { id:1, name:"Arsenal Jersey", price:10, category:"T-Shirts", image:"https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&q=80", description:"Premium jersey.", featured:true, bestSeller:true, rating:4.9, reviews:64, stock:20 },
    { id:2, name:"Man United Jersey", price:10, category:"T-Shirts", image:"https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=600&q=80", description:"Classic jersey.", featured:true, bestSeller:true, rating:4.8, reviews:58, stock:18 },
    { id:9, name:"Arsenal Tracksuit", price:25, category:"Tracksuits", image:"https://images.unsplash.com/photo-1556906781-9a412961a28c?w=600&q=80", description:"Full tracksuit.", featured:true, bestSeller:true, rating:4.9, reviews:44, stock:8 },
  ];
}
