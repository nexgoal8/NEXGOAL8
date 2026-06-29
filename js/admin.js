// =============================================
//   NexGoal Admin Dashboard — JavaScript
// =============================================

const ADMIN_CREDENTIALS = [
  { email: "admin@nexgoal.com",   password: "NexGoal@Admin2025",  name: "Admin",   role: "Administrator" },
  { email: "manager@nexgoal.com", password: "Manager@NexGoal25",  name: "Manager", role: "Store Manager"  }
];

const SESSION_KEY = "nexgoal_admin_session";

// ── JSONBin.io config ──────────────────────────────────────────────────────
// Must match the same values in app.js
const JSONBIN_BIN_ID  = "6a42d550da38895dfe123a39";   // e.g. "6659f3e1acd3cb34a8560e23"
const JSONBIN_API_KEY = "$2a$10$V/hPd2mOVYeSSCg3AkzxeueXRp8Dkomi8NKhQfWHVGZktj05qY66G";   // X-Master-Key from your account
const JSONBIN_BASE    = "https://api.jsonbin.io/v3/b";
const PRODUCTS_API    = `${JSONBIN_BASE}/${JSONBIN_BIN_ID}`;
// ──────────────────────────────────────────────────────────────────────────

let products = [];
let editingId = null;
let deleteTargetId = null;
let currentPhotoData = null;
let currentPanel = "dashboard";

// =============================================
//   AUTH
// =============================================
function getSession() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; } }
function setSession(user) { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...user, loginTime: Date.now() })); }
function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

function checkAuth() {
  const session = getSession();
  if (!session) { showLoginPage(); } else { showDashboard(session); }
}

function showLoginPage() {
  document.getElementById("login-page").style.display = "flex";
  document.getElementById("admin-app").style.display = "none";
}

function showDashboard(user) {
  document.getElementById("login-page").style.display = "none";
  document.getElementById("admin-app").style.display = "flex";
  document.getElementById("admin-name").textContent = user.name;
  document.getElementById("admin-role-label").textContent = user.role;
  document.getElementById("admin-avatar-initials").textContent = user.name.charAt(0).toUpperCase();
  loadProducts();
}

function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl  = document.getElementById("login-error");
  const btn      = document.getElementById("login-btn");
  errorEl.classList.remove("show");
  btn.disabled = true;
  btn.textContent = "Signing in…";
  setTimeout(() => {
    const match = ADMIN_CREDENTIALS.find(u => u.email === email && u.password === password);
    if (match) { setSession(match); showDashboard(match); }
    else {
      errorEl.textContent = "❌ Incorrect email or password. Please try again.";
      errorEl.classList.add("show");
      document.getElementById("login-password").value = "";
    }
    btn.disabled = false;
    btn.textContent = "Sign In →";
  }, 600);
}

function logout() {
  if (!confirm("Are you sure you want to sign out?")) return;
  clearSession(); showLoginPage();
  document.getElementById("login-email").value = "";
  document.getElementById("login-password").value = "";
}

function togglePassword() {
  const input = document.getElementById("login-password");
  const btn   = document.getElementById("toggle-pass-btn");
  if (input.type === "password") { input.type = "text"; btn.textContent = "🙈"; }
  else { input.type = "password"; btn.textContent = "👁"; }
}

// =============================================
//   PRODUCTS — JSONBin.io REST API
// =============================================
let productsLoaded = false; // safety flag — never save until products are confirmed loaded

async function loadProducts() {
  productsLoaded = false;
  try {
    const res = await fetch(`${PRODUCTS_API}/latest`, {
      headers: {
        "X-Master-Key": JSONBIN_API_KEY,
        "X-Bin-Meta": "false"
      }
    });
    if (!res.ok) throw new Error("JSONBin fetch failed: " + res.status);
    const json = await res.json();
    // JSONBin wraps the payload: { record: <your data>, metadata: {...} }
    const data = json.record;
    const loaded = Array.isArray(data) ? data : Object.values(data || {});
    products = loaded;
    productsLoaded = true;
    refreshAll();
  } catch (err) {
    showAdminToast("⚠️ Could not load products: " + err.message, "error");
    productsLoaded = false;
    products = [];
    refreshAll();
  }
}

async function saveProducts() {
  // Safety check — never save if products haven't been confirmed loaded
  if (!productsLoaded) {
    showAdminToast("⚠️ Cannot save — products not fully loaded yet.", "error");
    return;
  }

  // Safety check — never overwrite database with empty array unless user explicitly deleted all
  if (products.length === 0) {
    const confirmed = confirm("⚠️ You are about to clear ALL products from the database. Are you sure?");
    if (!confirmed) return;
  }

  try {
    const res = await fetch(PRODUCTS_API, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": JSONBIN_API_KEY,
        "X-Bin-Versioning": "false"
      },
      body: JSON.stringify(products)
    });
    if (!res.ok) throw new Error("Save failed: " + res.status);
  } catch (err) {
    showAdminToast("⚠️ Could not save changes: " + err.message, "error");
  }
}

function refreshAll() {
  renderDashboard();
  renderProductsTable();
  renderInventoryTable();
  updateStats();
}

// =============================================
//   NAVIGATION
// =============================================
function switchPanel(panel) {
  currentPanel = panel;
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  document.getElementById("panel-" + panel).classList.add("active");
  document.getElementById("nav-" + panel).classList.add("active");
  const titles = {
    dashboard: { title: "Dashboard", sub: "Overview of your store" },
    products:  { title: "Products",  sub: "Manage your product catalogue" },
    inventory: { title: "Inventory", sub: "Track and update stock levels" },
    settings:  { title: "Settings",  sub: "Store configuration" }
  };
  const t = titles[panel] || titles.dashboard;
  document.getElementById("topbar-title").textContent = t.title;
  document.getElementById("topbar-sub").textContent = t.sub;
  document.getElementById("sidebar").classList.remove("open");
}

// =============================================
//   DASHBOARD
// =============================================
function updateStats() {
  const total    = products.length;
  const lowStock = products.filter(p => (p.stock ?? 0) < 5).length;
  const featured = products.filter(p => p.featured).length;
  const cats     = [...new Set(products.map(p => p.category))].length;
  document.getElementById("stat-products").textContent  = total;
  document.getElementById("stat-lowstock").textContent  = lowStock;
  document.getElementById("stat-featured").textContent  = featured;
  document.getElementById("stat-categories").textContent = cats;
  const badge = document.getElementById("low-stock-badge");
  badge.textContent = lowStock;
  badge.style.display = lowStock > 0 ? "inline-flex" : "none";
}

function renderDashboard() {
  const recent = [...products].slice(-5).reverse();
  const tbody = document.getElementById("recent-products-body");
  if (!tbody) return;
  tbody.innerHTML = recent.map(p => `
    <tr>
      <td><div style="display:flex;align-items:center;gap:10px">
        <img class="product-thumb" src="${p.image}" alt="" onerror="this.style.display='none'">
        <span style="font-weight:600;font-size:0.875rem">${p.name}</span>
      </div></td>
      <td><span class="badge badge-blue">${p.category}</span></td>
      <td style="font-family:var(--font-head);font-weight:700">$${p.price.toFixed(2)}</td>
      <td><span class="${(p.stock ?? 0) < 5 ? 'stock-low' : 'stock-ok'}">${p.stock ?? '—'}</span></td>
    </tr>
  `).join("");
}

// =============================================
//   PRODUCTS TABLE
// =============================================
function renderProductsTable(filter = "") {
  const tbody = document.getElementById("products-tbody");
  if (!tbody) return;
  const list = filter ? products.filter(p => p.name.toLowerCase().includes(filter) || p.category.toLowerCase().includes(filter)) : products;
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--grey-400)">No products found</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(p => `
    <tr>
      <td><div style="display:flex;align-items:center;gap:10px">
        <img class="product-thumb" src="${p.image}" alt="${p.name}" onerror="this.style.display='none'">
        <div>
          <div style="font-weight:600;font-size:0.875rem">${p.name}</div>
          <div style="font-size:0.72rem;color:var(--grey-400)">#${p.id}</div>
        </div>
      </div></td>
      <td><span class="badge badge-blue">${p.category}</span></td>
      <td style="font-family:var(--font-head);font-weight:700">$${p.price.toFixed(2)}</td>
      <td><span class="${(p.stock ?? 0) < 5 ? 'stock-low' : 'stock-ok'}">${p.stock ?? '—'} units</span></td>
      <td>
        ${p.featured ? '<span class="badge badge-gold" style="margin-right:4px">Featured</span>' : ''}
        ${p.bestSeller ? '<span class="badge badge-green">Hot 🔥</span>' : ''}
        ${!p.featured && !p.bestSeller ? '<span class="badge badge-grey">Standard</span>' : ''}
      </td>
      <td><div style="display:flex;align-items:center;gap:4px;font-size:0.8rem;color:#FFB300">${'★'.repeat(Math.round(p.rating))}<span style="color:var(--grey-400);margin-left:2px">${p.rating}</span></div></td>
      <td><div class="action-btns">
        <button class="action-btn action-btn-edit" onclick="openEditProduct(${p.id})" title="Edit">✏️</button>
        <button class="action-btn action-btn-delete" onclick="confirmDelete(${p.id})" title="Delete">🗑</button>
      </div></td>
    </tr>
  `).join("");
}

// =============================================
//   ADD / EDIT PRODUCT
// =============================================
function openAddProduct() {
  editingId = null;
  document.getElementById("product-modal-title").textContent = "Add New Product";
  document.getElementById("product-form").reset();
  resetPhotoPreview();
  document.getElementById("product-modal").classList.add("open");
}

function openEditProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById("product-modal-title").textContent = "Edit Product";
  document.getElementById("f-name").value        = p.name;
  document.getElementById("f-price").value       = p.price;
  document.getElementById("f-category").value    = p.category;
  document.getElementById("f-stock").value       = p.stock ?? 10;
  document.getElementById("f-description").value = p.description;
  document.getElementById("f-featured").checked  = p.featured;
  document.getElementById("f-bestseller").checked = p.bestSeller;

  const imgs = Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.image || ""];

  // Reset extra photo previews and reload from saved images
  extraPhotoData = { 2: null, 3: null, 4: null };
  [2, 3, 4].forEach(slot => {
    const img = document.getElementById("prev" + slot + "-img");
    const ph  = document.getElementById("prev" + slot + "-ph");
    const inp = document.getElementById("f-photo" + slot);
    if (img) { img.src = ""; img.style.display = "none"; }
    if (ph)  { ph.style.display = "block"; }
    if (inp) { inp.value = ""; }
    if (imgs[slot - 1]) {
      extraPhotoData[slot] = imgs[slot - 1];
      if (img) { img.src = imgs[slot - 1]; img.style.display = "block"; }
      if (ph)  { ph.style.display = "none"; }
    }
  });

  resetPhotoPreview();
  if (imgs[0]) showPhotoPreview(imgs[0]);
  const fImage = document.getElementById("f-image");
  if (fImage) fImage.value = imgs[0] && !imgs[0].startsWith("data:") ? imgs[0] : "";

  document.getElementById("product-modal").classList.add("open");
}

function closeProductModal() {
  document.getElementById("product-modal").classList.remove("open");
  editingId = null;
  resetPhotoPreview();
}

function saveProduct() {
  const name       = document.getElementById("f-name").value.trim();
  const price      = parseFloat(document.getElementById("f-price").value);
  const category   = document.getElementById("f-category").value;
  const stock      = parseInt(document.getElementById("f-stock").value) || 0;
  const desc       = document.getElementById("f-description").value.trim();
  const featured   = document.getElementById("f-featured").checked;
  const bestSeller = document.getElementById("f-bestseller").checked;

  if (!name || !price || !category) { showAdminToast("⚠️ Please fill in name, price and category.", "error"); return; }

  const urlField = document.getElementById("f-image") ? document.getElementById("f-image").value.trim() : "";
  let mainImage = currentPhotoData || urlField;
  if (!mainImage && editingId) {
    const ex = products.find(p => p.id === editingId);
    const exImgs = Array.isArray(ex?.images) ? ex.images : [ex?.image || ""];
    mainImage = exImgs[0] || "";
  }
  if (!mainImage) mainImage = `https://placehold.co/600x600/1A1A1A/CC0000?text=${encodeURIComponent(name)}`;

  const extra = [2, 3, 4]
    .map(slot => extraPhotoData[slot] || "")
    .filter(Boolean);

  const images = [mainImage, ...extra];
  const image = mainImage;

  if (editingId) {
    const idx = products.findIndex(p => p.id === editingId);
    products[idx] = { ...products[idx], name, price, category, stock, image, images, description: desc, featured, bestSeller };
    showAdminToast("✅ Product updated!", "success");
  } else {
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    products.push({ id: newId, name, price, category, stock, image, images, description: desc, featured, bestSeller, rating: 4.5, reviews: 0 });
    showAdminToast("✅ Product added!", "success");
  }
  saveProducts(); refreshAll(); closeProductModal();
}

// =============================================
//   PHOTO UPLOAD
// =============================================
let extraPhotoData = { 2: null, 3: null, 4: null };

function handlePhotoSelect(event) {
  const file = event.target.files[0];
  if (!file || !file.type.startsWith("image/")) { showAdminToast("⚠️ Please select an image file.", "error"); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    compressImage(e.target.result, file.size, (compressed) => {
      currentPhotoData = compressed;
      document.getElementById("f-image").value = "";
      showPhotoPreview(compressed);
    });
  };
  reader.readAsDataURL(file);
}

function handleExtraPhoto(event, slot) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) { showAdminToast("⚠️ Please select an image file.", "error"); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    compressImage(e.target.result, file.size, (compressed) => {
      extraPhotoData[slot] = compressed;
      const img = document.getElementById("prev" + slot + "-img");
      const ph  = document.getElementById("prev" + slot + "-ph");
      if (img) { img.src = compressed; img.style.display = "block"; }
      if (ph)  { ph.style.display = "none"; }
    });
  };
  reader.readAsDataURL(file);
}

function removeExtraPhoto(slot) {
  extraPhotoData[slot] = null;
  const img = document.getElementById("prev" + slot + "-img");
  const ph  = document.getElementById("prev" + slot + "-ph");
  const inp = document.getElementById("f-photo" + slot);
  if (img) { img.src = ""; img.style.display = "none"; }
  if (ph)  { ph.style.display = "block"; }
  if (inp) { inp.value = ""; }
}

function compressImage(dataUrl, originalSize, callback) {
  const img = new Image();
  img.onload = function() {
    const MAX = 700;
    let { width, height } = img;
    if (width > height && width > MAX) { height = Math.round(height * (MAX / width)); width = MAX; }
    else if (height > MAX) { width = Math.round(width * (MAX / height)); height = MAX; }
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);
    callback(canvas.toDataURL("image/jpeg", originalSize > 1500000 ? 0.6 : 0.75));
  };
  img.src = dataUrl;
}

function showPhotoPreview(src) {
  document.getElementById("photo-preview-img").src = src;
  document.getElementById("photo-preview-img").style.display = "block";
  document.getElementById("photo-preview-placeholder").style.display = "none";
  document.getElementById("photo-remove-btn").style.display = "block";
}

function resetPhotoPreview() {
  currentPhotoData = null;
  document.getElementById("photo-preview-img").style.display = "none";
  document.getElementById("photo-preview-img").src = "";
  document.getElementById("photo-preview-placeholder").style.display = "block";
  document.getElementById("photo-remove-btn").style.display = "none";
  document.getElementById("f-photo-file").value = "";
}

function removePhoto() { resetPhotoPreview(); document.getElementById("f-image").value = ""; }
function handleUrlInput(value) {
  if (value.trim()) { currentPhotoData = null; document.getElementById("f-photo-file").value = ""; showPhotoPreview(value.trim()); }
  else if (!currentPhotoData) resetPhotoPreview();
}

// =============================================
//   DELETE
// =============================================
function confirmDelete(id) {
  deleteTargetId = id;
  const p = products.find(x => x.id === id);
  document.getElementById("delete-product-name").textContent = p ? p.name : "this product";
  document.getElementById("delete-confirm").classList.add("open");
}
function cancelDelete() { deleteTargetId = null; document.getElementById("delete-confirm").classList.remove("open"); }
function executeDelete() {
  if (!deleteTargetId) return;
  products = products.filter(p => p.id !== deleteTargetId);
  saveProducts(); refreshAll(); cancelDelete();
  showAdminToast("🗑 Product deleted.", "success");
}

// =============================================
//   INVENTORY
// =============================================
function renderInventoryTable(filter = "") {
  const tbody = document.getElementById("inventory-tbody");
  if (!tbody) return;
  const list = filter ? products.filter(p => p.name.toLowerCase().includes(filter) || p.category.toLowerCase().includes(filter)) : products;
  tbody.innerHTML = list.map(p => `
    <tr>
      <td><div style="display:flex;align-items:center;gap:10px">
        <img class="product-thumb" src="${p.image}" alt="" onerror="this.style.display='none'">
        <span style="font-weight:600;font-size:0.875rem">${p.name}</span>
      </div></td>
      <td><span class="badge badge-blue">${p.category}</span></td>
      <td><input class="stock-input" type="number" min="0" value="${p.stock ?? 0}" onchange="updateStock(${p.id}, this.value)"></td>
      <td><span class="badge ${getStockBadge(p.stock)}">${getStockLabel(p.stock)}</span></td>
      <td style="font-family:var(--font-head);font-weight:700">$${p.price.toFixed(2)}</td>
      <td><button class="action-btn action-btn-edit" onclick="quickRestock(${p.id})" style="width:auto;padding:0 10px;font-size:0.75rem;font-family:var(--font-head);font-weight:700">+10</button></td>
    </tr>
  `).join("");
}

function getStockBadge(stock) { const s = stock ?? 0; if (s === 0) return "badge-red"; if (s < 5) return "badge-gold"; return "badge-green"; }
function getStockLabel(stock) { const s = stock ?? 0; if (s === 0) return "Out of Stock"; if (s < 5) return "Low Stock"; return "In Stock"; }
function updateStock(id, val) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  p.stock = Math.max(0, parseInt(val) || 0);
  saveProducts(); updateStats();
  showAdminToast(`📦 Stock updated for ${p.name}`, "success");
}
function quickRestock(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  p.stock = (p.stock ?? 0) + 10;
  saveProducts(); renderInventoryTable(); updateStats();
  showAdminToast(`📦 +10 units added to ${p.name}`, "success");
}

// =============================================
//   SETTINGS
// =============================================
function saveSettings() {
  const settings = {
    storeName: document.getElementById("s-storename").value.trim(),
    whatsapp:  document.getElementById("s-whatsapp").value.trim(),
    whatsapp2: document.getElementById("s-whatsapp2").value.trim(),
    email:     document.getElementById("s-email").value.trim(),
    phone:     document.getElementById("s-phone").value.trim(),
    location:  document.getElementById("s-location").value.trim(),
  };
  localStorage.setItem("nexgoal-settings", JSON.stringify(settings));
  showAdminToast("✅ Settings saved!", "success");
}

function loadSettings() {
  const s = JSON.parse(localStorage.getItem("nexgoal-settings") || "{}");
  if (s.storeName) document.getElementById("s-storename").value = s.storeName;
  if (s.whatsapp)  document.getElementById("s-whatsapp").value  = s.whatsapp;
  if (s.whatsapp2) document.getElementById("s-whatsapp2").value = s.whatsapp2;
  if (s.email)     document.getElementById("s-email").value     = s.email;
  if (s.phone)     document.getElementById("s-phone").value     = s.phone;
  if (s.location)  document.getElementById("s-location").value  = s.location;
}

// =============================================
//   EXPORT / IMPORT
// =============================================
function exportProducts() {
  const blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "nexgoal-products.json";
  a.click();
  URL.revokeObjectURL(a.href);
  showAdminToast("📥 Products exported!", "success");
}

function importProducts(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const imported = JSON.parse(ev.target.result);
      if (!Array.isArray(imported)) throw new Error("Invalid format");
      products = imported.map(p => ({ ...p, stock: p.stock ?? 10 }));
      saveProducts(); refreshAll();
      showAdminToast(`✅ Imported ${products.length} products!`, "success");
    } catch { showAdminToast("❌ Invalid JSON file.", "error"); }
  };
  reader.readAsText(file);
  e.target.value = "";
}

// =============================================
//   TOAST
// =============================================
function showAdminToast(msg, type = "success") {
  const t = document.getElementById("admin-toast");
  t.querySelector(".toast-text").textContent = msg;
  t.className = `admin-toast ${type} show`;
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove("show"), 3500);
}

function toggleSidebar() { document.getElementById("sidebar").classList.toggle("open"); }

document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  loadSettings();
  document.getElementById("products-search")?.addEventListener("input", e => renderProductsTable(e.target.value.toLowerCase()));
  document.getElementById("inventory-search")?.addEventListener("input", e => renderInventoryTable(e.target.value.toLowerCase()));
});
