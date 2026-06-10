/* ═══════════════════════════════════════════════════════
   SUJAAN BITES — app.js
   7-page SPA: Home | Menu | Reorder | Account | Login | Signup | sub-pages
═══════════════════════════════════════════════════════ */

/* ── Constants ─────────────────────────────────────── */
const BUSINESS = {
  name: "Sujaan Bites",
  upiId: "6301000409@kotakbank",
  upiPayeeName: "Sujaan Bites",
  whatsappNumber: "916301000409",
  deliveryFee: 30,
};

const API_BASE = String(window.__API_BASE || "").trim().replace(/\/+$/, "");
const MENU_FALLBACK_PATHS = ["./data/menu.json", "data/menu.json"];
const MAX_ADDRESSES = 10;

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
});

const STORAGE_KEYS = {
  profile: "spiceTableProfile",
  addresses: "spiceTableAddresses",
  selectedAddressId: "spiceTableSelectedAddressId",
  theme: "sbTheme",
  lastAcceptedOrderShown: "spiceTableLastAcceptedOrderShown",
  lastCustomerMessageShown: "spiceTableLastCustomerMessageShown",
  lastCancelledOrderShown: "spiceTableLastCancelledOrderShown",
  lastCompletedOrderShown: "spiceTableLastCompletedOrderShown",
  lastDeliveryRatingShown: "spiceTableLastDeliveryRatingShown",
  lastProductRatingShown: "spiceTableLastProductRatingShown",
};

const state = {
  menu: [],
  menuCategories: [],
  activeCategory: "all",
  cart: new Map(),
  profile: null,
  addresses: [],
  selectedAddressId: null,
  previousOrders: [],
  loadingMenu: false,
  currentPage: "home",
  pageHistory: [],
  signupMap: null,
  signupMarker: null,
  signupLocation: null,
  addrMap: null,
  addrMarker: null,
  addrLocation: null,
  editingAddressId: null,
};

/* ── Helpers ───────────────────────────────────────── */
const $ = (id) => document.getElementById(id);
const fmt = (v) => currency.format(v || 0);
const normalizePhone = (v) => String(v || "").replace(/\D/g, "").slice(-10);
const normCat = (v) => String(v || "").trim().toLowerCase();
const titleCat = (v) => String(v || "").trim().split(/[\s_-]+/).filter(Boolean)
  .map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
const getStock = (item) => { const n = Number(item?.stockCount); return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 20; };
const readJson = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const writeJson = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const dateStr = (d) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));

/* ── Theme ─────────────────────────────────────────── */
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  $("themeIcon").textContent = t === "dark" ? "🌙" : "☀️";
  const meta = document.getElementById("themeColorMeta");
  if (meta) meta.content = t === "dark" ? "#0c0806" : "#faf6f0";
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "dark";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(STORAGE_KEYS.theme, next);
  applyTheme(next);
}

/* ── Router ────────────────────────────────────────── */
const PAGES = ["home","menu","reorder","account","login","signup","edit-profile","addresses","orders","spends","help"];

function navigateTo(pageId, pushHistory = true) {
  if (!PAGES.includes(pageId)) return;
  const prev = state.currentPage;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById(`page-${pageId}`);
  if (target) target.classList.add("active");

  // Update bottom nav
  document.querySelectorAll(".nav-tab").forEach(btn => {
    const tab = btn.dataset.goto;
    btn.classList.toggle("active", tab === pageId || (tab === "account" && ["login","signup","edit-profile","addresses","orders","spends","help"].includes(pageId)));
  });

  if (pushHistory && prev !== pageId) state.pageHistory.push(prev);
  state.currentPage = pageId;

  // Page-specific init
  if (pageId === "menu") initMenuPage();
  if (pageId === "reorder") initReorderPage();
  if (pageId === "account") renderAccountPage();
  if (pageId === "orders") renderOrdersPage();
  if (pageId === "spends") renderSpendsPage();
  if (pageId === "addresses") renderAddressesPage();
  if (pageId === "signup") initSignupMap();
  if (pageId === "addresses") setTimeout(initAddrMap, 100);
}

function goBack() {
  const prev = state.pageHistory.pop();
  if (prev) navigateTo(prev, false);
  else navigateTo("account", false);
}

/* ── API ───────────────────────────────────────────── */
function apiRequest(path, options = {}) {
  const headers = { "content-type": "application/json", ...(options.headers || {}) };
  const activeAddr = getActiveAddress();
  if (activeAddr?.phone) headers["x-customer-phone"] = activeAddr.phone;
  else if (state.profile?.phone) headers["x-customer-phone"] = state.profile.phone;
  return fetch(`${API_BASE}${path}`, { ...options, headers }).then(async (res) => {
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || "Request failed");
    return payload;
  });
}

/* ── Local state ───────────────────────────────────── */
function loadLocalState() {
  state.profile = readJson(STORAGE_KEYS.profile) || null;
  state.addresses = readJson(STORAGE_KEYS.addresses) || [];
  state.selectedAddressId = localStorage.getItem(STORAGE_KEYS.selectedAddressId) || null;
  if (!state.selectedAddressId && state.addresses.length) state.selectedAddressId = state.addresses[0].id;
}

async function loadCustomerState() {
  const phone = state.profile?.phone;
  if (!phone) return;
  try {
    const result = await apiRequest(`/api/customer/state?phone=${encodeURIComponent(phone)}`);
    if (result.profile || Array.isArray(result.addresses)) {
      state.profile = result.profile || state.profile;
      state.addresses = Array.isArray(result.addresses) ? result.addresses.slice(0, MAX_ADDRESSES) : state.addresses;
      state.selectedAddressId = result.selectedAddressId || state.addresses[0]?.id || state.selectedAddressId;
      writeJson(STORAGE_KEYS.profile, state.profile);
      writeJson(STORAGE_KEYS.addresses, state.addresses);
      if (state.selectedAddressId) localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
    }
  } catch (e) { console.warn("State sync skipped:", e.message); }
}

async function syncCustomerState() {
  if (!state.profile?.phone) return;
  try {
    const result = await apiRequest("/api/customer/state", {
      method: "PUT",
      body: JSON.stringify({ phone: state.profile.phone, profile: state.profile, addresses: state.addresses, selectedAddressId: state.selectedAddressId }),
    });
    if (result.profile || Array.isArray(result.addresses)) {
      state.profile = result.profile || state.profile;
      state.addresses = Array.isArray(result.addresses) ? result.addresses.slice(0, MAX_ADDRESSES) : state.addresses;
      state.selectedAddressId = result.selectedAddressId || state.addresses[0]?.id || state.selectedAddressId;
      writeJson(STORAGE_KEYS.profile, state.profile);
      writeJson(STORAGE_KEYS.addresses, state.addresses);
      if (state.selectedAddressId) localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
    }
  } catch (e) { console.warn("Sync skipped:", e.message); }
}

function clearSession() {
  state.profile = null;
  state.addresses = [];
  state.selectedAddressId = null;
  state.previousOrders = [];
  state.cart.clear();
  [STORAGE_KEYS.profile, STORAGE_KEYS.addresses, STORAGE_KEYS.selectedAddressId,
   STORAGE_KEYS.lastAcceptedOrderShown, STORAGE_KEYS.lastCustomerMessageShown,
   STORAGE_KEYS.lastCancelledOrderShown, STORAGE_KEYS.lastCompletedOrderShown,
   STORAGE_KEYS.lastDeliveryRatingShown, STORAGE_KEYS.lastProductRatingShown
  ].forEach(k => localStorage.removeItem(k));
}

function getActiveAddress() {
  if (!state.addresses.length) return null;
  return state.addresses.find(a => a.id === state.selectedAddressId) || state.addresses[0];
}

/* ── Address formatting ────────────────────────────── */
function formatAddressLine(address) {
  if (!address) return "No address saved yet.";
  return [`${address.houseNumber || ""} ${address.streetName || ""}`.trim(), address.address || "", address.type ? `${address.type}` : ""].filter(Boolean).join(" · ");
}

function formatMultilineAddress(address) {
  if (!address) return "";
  return [
    address.type ? `${address.type} address` : "Delivery address",
    address.houseNumber ? `${address.houseNumber}` : "",
    address.streetName ? `${address.streetName}` : "",
    address.address || "",
    address.location ? `📍 ${address.location.lat.toFixed(5)}, ${address.location.lng.toFixed(5)}` : "",
  ].filter(Boolean).join("\n");
}

/* ── Menu loading ──────────────────────────────────── */
const DEFAULT_MENU = [
  { id: "butter", name: "Butter Cookies", description: "Crisp golden butter cookies.", price: 120, category: "classic", image: "assets/cookie-butter.png", available: true, stockCount: 20 },
  { id: "choco-chip", name: "Chocolate Chip Cookies", description: "Soft-centred with rich choco chips.", price: 150, category: "chocolate", image: "assets/cookie-chocolate.png", available: true, stockCount: 20 },
  { id: "oatmeal", name: "Oatmeal Raisin Cookies", description: "Chewy oats with cinnamon.", price: 130, category: "classic", image: "assets/cookie-butter.png", available: true, stockCount: 20 },
  { id: "filled-biscuit", name: "Stuffed Jam Cookies", description: "Strawberry jam centre.", price: 160, category: "stuffed", image: "assets/cookie-jam.png", available: true, stockCount: 20 },
  { id: "brownie-bite", name: "Chocolate Fudge Cookies", description: "Dense cocoa fudge cookies.", price: 170, category: "chocolate", image: "assets/cookie-chocolate.png", available: true, stockCount: 20 },
  { id: "gift-pack", name: "Assorted Cookie Box", description: "Mixed box of 12 cookies.", price: 420, category: "packs", image: "assets/hero-food.png", available: true, stockCount: 20 },
];

async function loadMenu() {
  if (state.loadingMenu) return;
  state.loadingMenu = true;
  try {
    const result = await apiRequest("/api/menu");
    state.menu = result.menu || [];
    state.menuCategories = Array.isArray(result.categories) ? result.categories : [];
  } catch {
    try {
      for (const path of MENU_FALLBACK_PATHS) {
        try {
          const r = await fetch(path, { cache: "no-store" });
          if (!r.ok) continue;
          const menu = await r.json();
          state.menu = Array.isArray(menu) ? menu : [];
          state.menuCategories = [...new Set(state.menu.map(i => i.category).filter(Boolean))];
          break;
        } catch {}
      }
    } catch {}
    if (!state.menu.length) { state.menu = DEFAULT_MENU; state.menuCategories = ["classic","chocolate","stuffed","packs"]; }
  } finally {
    state.loadingMenu = false;
  }
  syncCartToStock();
  renderMenuGrid($("menuGrid"), state.menu, state.activeCategory);
  renderCategoryTabs();
  renderReorderGrid();
  updateCartUI();
}

async function loadPreviousOrders() {
  if (!state.profile?.phone) { state.previousOrders = []; return; }
  try {
    const result = await apiRequest("/api/orders/my");
    state.previousOrders = result.orders || [];
  } catch { state.previousOrders = []; }
}

/* ── Cart ──────────────────────────────────────────── */
function getCartRows() {
  return [...state.cart.entries()].map(([id, qty]) => {
    const item = state.menu.find(d => d.id === id);
    if (!item) return null;
    return { ...item, quantity: qty, lineTotal: item.price * qty };
  }).filter(Boolean).filter(r => r.quantity > 0);
}

function getTotals() {
  const rows = getCartRows();
  const subtotal = rows.reduce((s, r) => s + r.lineTotal, 0);
  const delivery = subtotal > 0 ? BUSINESS.deliveryFee : 0;
  return { rows, subtotal, delivery, total: subtotal + delivery, quantity: rows.reduce((s, r) => s + r.quantity, 0) };
}

function syncCartToStock() {
  for (const [id, qty] of [...state.cart.entries()]) {
    const item = state.menu.find(d => d.id === id);
    const stock = getStock(item);
    if (!item || item.available === false || stock <= 0) { state.cart.delete(id); continue; }
    if (qty > stock) state.cart.set(id, stock);
  }
}

function updateQuantity(id, change) {
  const item = state.menu.find(d => d.id === id);
  if (!item) return;
  const stock = getStock(item);
  if ((item.available === false || stock <= 0) && change > 0) { alert(`${item.name} is sold out.`); return; }
  const current = state.cart.get(id) || 0;
  const next = Math.max(0, current + change);
  if (change > 0 && next > stock) { alert(`Max stock reached for ${item.name}.`); return; }
  if (next === 0) state.cart.delete(id); else state.cart.set(id, next);
  updateCartUI();
  // Re-render all visible menu grids
  if (state.currentPage === "menu") renderMenuGrid($("menuGrid"), getFilteredMenu(), state.activeCategory);
  if (state.currentPage === "reorder") renderReorderGrid();
}

function updateCartUI() {
  const totals = getTotals();
  const badge = $("cartBadge");
  const fab = $("cartFab");
  if (badge) { badge.textContent = totals.quantity; badge.classList.toggle("hidden", totals.quantity === 0); }
  if (fab) fab.classList.toggle("visible", totals.quantity > 0);

  // Cart panel
  const cartItems = $("cartItems");
  if (cartItems) {
    if (!totals.rows.length) {
      cartItems.innerHTML = '<p class="empty-state">Add cookies from the menu to begin.</p>';
    } else {
      cartItems.innerHTML = totals.rows.map(item => `
        <div class="cart-row">
          <div class="cart-row-info">
            <strong>${item.name}</strong>
            <small>${fmt(item.price)} each · ${fmt(item.lineTotal)}</small>
          </div>
          <div class="cart-qty">
            <button class="cart-qty-btn" data-decrease="${item.id}" aria-label="Remove one ${item.name}">−</button>
            <span class="cart-qty-num">${item.quantity}</span>
            <button class="cart-qty-btn" data-increase="${item.id}" aria-label="Add one ${item.name}" ${item.quantity >= getStock(item) ? "disabled" : ""}>+</button>
          </div>
        </div>
      `).join("");
    }
  }

  const el = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  el("subtotal", fmt(totals.subtotal));
  el("deliveryFee", fmt(totals.delivery));
  el("grandTotal", fmt(totals.total));

  const addrText = $("selectedAddressText");
  if (addrText) addrText.textContent = formatAddressLine(getActiveAddress());

  syncCheckoutFields();
}

function syncCheckoutFields() {
  const cn = $("customerName"); if (cn) cn.value = state.profile?.name || "";
  const cp = $("customerPhone"); if (cp) cp.value = state.profile?.phone || "";
}

/* ── Menu rendering ────────────────────────────────── */
function getFilteredMenu(search = "") {
  const cat = normCat(state.activeCategory) || "all";
  const q = search.trim().toLowerCase();
  return state.menu.filter(item => {
    const matchCat = cat === "all" || normCat(item.category) === cat;
    const matchQ = !q || item.name.toLowerCase().includes(q) || (item.description || "").toLowerCase().includes(q);
    return matchCat && matchQ;
  });
}

function productCardHTML(item) {
  const stock = getStock(item);
  const soldOut = item.available === false || stock <= 0;
  const qty = state.cart.get(item.id) || 0;
  const canAdd = !soldOut && qty < stock;
  return `
    <article class="product-card ${soldOut ? "unavailable" : ""}">
      <img class="product-img" src="${item.image || "assets/hero-food.png"}" alt="${item.name}" loading="lazy" />
      <div class="product-body">
        <p class="product-name">${item.name}</p>
        <p class="product-desc">${item.description || ""}</p>
        <div class="product-footer">
          <span class="product-price">${fmt(item.price)}</span>
          ${soldOut
            ? `<span class="sold-badge">Sold out</span>`
            : qty > 0
              ? `<div class="qty-ctrl">
                   <button class="qty-btn" data-menu-decrease="${item.id}" aria-label="Remove">−</button>
                   <span class="qty-num">${qty}</span>
                   <button class="qty-btn" data-menu-increase="${item.id}" aria-label="Add" ${!canAdd ? "disabled" : ""}>+</button>
                 </div>`
              : `<button class="add-btn" data-add="${item.id}">Add</button>`
          }
        </div>
      </div>
    </article>
  `;
}

function renderMenuGrid(container, items, cat) {
  if (!container) return;
  const filtered = items.filter(item => {
    return cat === "all" || normCat(item.category) === normCat(cat);
  });
  if (!filtered.length) {
    container.innerHTML = '<p class="menu-loading">No items found.</p>';
    return;
  }
  container.innerHTML = filtered.map(productCardHTML).join("");
}

function renderCategoryTabs() {
  const container = $("menuFilters");
  if (!container) return;
  const cats = new Map();
  for (const item of state.menu) {
    const n = normCat(item.category);
    if (n && !cats.has(n)) cats.set(n, titleCat(item.category));
  }
  const tabs = [{ id: "all", label: "All" }, ...[...cats.entries()].map(([id, label]) => ({ id, label }))];
  container.innerHTML = tabs.map(t =>
    `<button class="cat-tab ${state.activeCategory === t.id ? "active" : ""}" type="button" data-category="${t.id}">${t.label}</button>`
  ).join("");
}

function initMenuPage() {
  renderCategoryTabs();
  const search = $("menuSearch");
  const grid = $("menuGrid");
  if (!state.menu.length) { if (grid) grid.innerHTML = '<p class="menu-loading">Loading cookies…</p>'; }
  else renderMenuGrid(grid, getFilteredMenu(search?.value || ""), state.activeCategory);
}

/* ── Reorder page ──────────────────────────────────── */
function renderReorderGrid() {
  const grid = $("reorderGrid");
  if (!grid || !state.menu.length) return;
  const search = $("reorderSearch");
  const q = search?.value || "";
  renderMenuGrid(grid, getFilteredMenu(q), "all");
}

async function initReorderPage() {
  // Previous orders section
  const prevList = $("prevOrdersList");
  const reorderBlock = $("reorderItemsBlock");
  const reorderItems = $("reorderItems");

  if (!state.profile?.phone) {
    if (prevList) prevList.innerHTML = `
      <div class="empty-state">
        <p>Sign in to see your previous orders.</p>
        <button class="btn-primary" type="button" data-goto="login" style="margin-top:12px">Sign In</button>
      </div>
    `;
  } else {
    if (prevList) prevList.innerHTML = '<p class="menu-loading" style="border:none;padding:12px 0">Loading orders…</p>';
    await loadPreviousOrders();
    if (!state.previousOrders.length) {
      if (prevList) prevList.innerHTML = `
        <div class="empty-state">
          <p>No previous orders yet.</p>
          <button class="btn-primary" type="button" data-goto="menu" style="margin-top:12px">Order Now</button>
        </div>
      `;
    } else {
      if (prevList) prevList.innerHTML = state.previousOrders.map(o => `
        <div class="prev-order-card">
          <strong>${o.id} · ${fmt(o.totals?.total || 0)}</strong>
          <span>${dateStr(o.createdAt)}</span>
          <span>${(o.items || []).map(i => `${i.name} ×${i.quantity}`).join(", ")}</span>
          <span class="status-tag ${o.status}">${String(o.status || "").replace(/_/g, " ")}</span>
        </div>
      `).join("");

      // Quick reorder items from last order
      const last = state.previousOrders[0];
      if (last?.items?.length && reorderBlock && reorderItems) {
        reorderBlock.classList.remove("hidden");
        reorderItems.innerHTML = (last.items || []).map(oi => {
          const menuItem = state.menu.find(m => m.id === oi.id);
          if (!menuItem) return "";
          return productCardHTML(menuItem);
        }).filter(Boolean).join("");
        if (!reorderItems.innerHTML.trim()) reorderBlock.classList.add("hidden");
      }
    }
  }

  renderReorderGrid();
}

/* ── Account page ──────────────────────────────────── */
function renderAccountPage() {
  const content = $("accountContent");
  if (!content) return;

  if (!state.profile) {
    // Logged out
    content.innerHTML = `
      <div class="acct-guest">
        <div class="acct-guest-brand">
          <img src="assets/sujaan-logo.png" alt="Sujaan Bites" class="acct-guest-logo" />
          <p class="acct-guest-name">SUJAAN BITES</p>
          <p class="acct-guest-sub">Fresh baked cookies delivered to you</p>
        </div>
        <p class="acct-guest-text">Sign in to track your orders, save addresses, and checkout faster. Don't have an account? Join us in minutes!</p>
        <div class="acct-guest-btns">
          <button class="btn-primary" type="button" data-goto="login">Sign In</button>
          <button class="btn-outline" type="button" data-goto="signup">Sign Up</button>
        </div>
      </div>
    `;
  } else {
    // Logged in
    const initials = String(state.profile.name || "S").trim().charAt(0).toUpperCase();
    content.innerHTML = `
      <div class="acct-profile-card">
        <div class="acct-avatar">${initials}</div>
        <div class="acct-profile-info">
          <strong>${state.profile.name || "Customer"}</strong>
          <span>${state.profile.phone || ""}</span>
        </div>
      </div>

      <div class="acct-quick-row">
        <button class="acct-quick-btn" type="button" data-acct="orders">
          <span class="acct-quick-icon">📦</span>
          <span class="acct-quick-label">Your Orders</span>
        </button>
        <button class="acct-quick-btn" type="button" data-acct="help">
          <span class="acct-quick-icon">💬</span>
          <span class="acct-quick-label">Help & Support</span>
        </button>
        <button class="acct-quick-btn" type="button" data-acct="info">
          <span class="acct-quick-icon">ℹ️</span>
          <span class="acct-quick-label">General Info</span>
        </button>
      </div>

      <p class="acct-section-label">My Account</p>
      <div class="acct-list">
        <button class="acct-list-row" type="button" data-acct="orders">
          <span>Previous Orders</span><span class="chevron">›</span>
        </button>
        <button class="acct-list-row" type="button" data-acct="addresses">
          <span>Saved Addresses</span><span class="chevron">›</span>
        </button>
        <button class="acct-list-row" type="button" data-acct="spends">
          <span>Past Spends</span><span class="chevron">›</span>
        </button>
        <button class="acct-list-row" type="button" data-acct="profile-edit">
          <span>Edit Profile</span><span class="chevron">›</span>
        </button>
      </div>

      <p class="acct-section-label" style="margin-top:16px">Support</p>
      <div class="acct-list">
        <button class="acct-list-row" type="button" data-acct="help">
          <span>Help & Support</span><span class="chevron">›</span>
        </button>
        <button class="acct-list-row danger" type="button" data-acct="logout">
          <span>Logout</span><span class="chevron">›</span>
        </button>
      </div>
    `;
  }
}

/* ── Orders page ───────────────────────────────────── */
async function renderOrdersPage() {
  const content = $("ordersContent");
  if (!content) return;

  if (!state.profile?.phone) {
    content.innerHTML = '<div class="empty-state"><p>Sign in to view your orders.</p></div>';
    return;
  }
  content.innerHTML = '<div class="empty-state">Loading orders…</div>';
  await loadPreviousOrders();
  await loadOrdersForTracking();

  if (!state.previousOrders.length) {
    content.innerHTML = `<div class="empty-state"><p>No orders yet.</p><button class="btn-primary" style="margin-top:12px" type="button" data-goto="menu">Order Now</button></div>`;
    return;
  }

  content.innerHTML = state.previousOrders.map(o => {
    const isLive = !["completed","cancelled"].includes(o.status);
    return `
      <div class="order-card">
        <strong>${o.id}</strong>
        <span>${dateStr(o.createdAt)}</span>
        <span>${(o.items || []).map(i => `${i.name} ×${i.quantity}`).join(", ")}</span>
        <span>${fmt(o.totals?.total || 0)} · ${String(o.paymentMethod || "").replace(/_/g," ")}</span>
        <span class="order-tag ${o.status} ${isLive ? "live" : ""}">${String(o.status || "").replace(/_/g," ")}${isLive ? " 🔴" : ""}</span>
      </div>
    `;
  }).join("");
}

/* ── Spends page ───────────────────────────────────── */
function renderSpendsPage() {
  const content = $("spendsContent");
  if (!content) return;
  if (!state.profile) { content.innerHTML = '<div class="empty-state">Sign in to view spends.</div>'; return; }
  const completed = state.previousOrders.filter(o => o.status !== "cancelled");
  const total = completed.reduce((s, o) => s + Number(o.totals?.total || 0), 0);
  content.innerHTML = `
    <div class="spend-card"><strong>${fmt(total)}</strong><small>Total spend (all orders)</small></div>
    <div class="spend-card" style="margin-top:10px"><strong>${completed.length}</strong><small>Completed orders</small></div>
    <div class="spend-card" style="margin-top:10px"><strong>${fmt(completed.length ? total / completed.length : 0)}</strong><small>Average order value</small></div>
  `;
}

/* ── Addresses page ────────────────────────────────── */
function renderAddressesPage() {
  const list = $("addressList");
  if (!list) return;

  if (!state.addresses.length) {
    list.innerHTML = '<p class="empty-state">No saved addresses yet.</p>';
  } else {
    list.innerHTML = state.addresses.map(addr => `
      <div class="addr-card ${addr.id === state.selectedAddressId ? "selected-addr" : ""}">
        <strong>${addr.type || "Address"} ${addr.id === state.selectedAddressId ? "✓" : ""}</strong>
        <p>${formatMultilineAddress(addr).replace(/\n/g, " · ")}</p>
        <div class="addr-card-actions">
          <button class="btn-sm-outline" type="button" data-select-addr="${addr.id}">Use</button>
          <button class="btn-sm-outline" type="button" data-edit-addr="${addr.id}">Edit</button>
          <button class="btn-sm-outline" style="border-color:var(--danger);color:var(--danger)" type="button" data-del-addr="${addr.id}">Delete</button>
        </div>
      </div>
    `).join("");
  }
}

/* ── Edit profile page ─────────────────────────────── */
function initEditProfilePage() {
  const name = $("editName");
  const phone = $("editPhone");
  if (name) name.value = state.profile?.name || "";
  if (phone) phone.value = state.profile?.phone || "";
}

/* ── Login flow ────────────────────────────────────── */
async function handleLogin(event) {
  event.preventDefault();
  const phoneInput = $("loginPhone");
  const nameInput  = $("loginName");
  const btn = $("loginSubmitBtn");
  const phone = normalizePhone(phoneInput?.value || "");
  const enteredName = (nameInput?.value || "").trim();

  if (!enteredName) { alert("Please enter your name."); return; }
  if (phone.length !== 10) { alert("Please enter a valid 10-digit phone number."); return; }

  if (btn) { btn.disabled = true; btn.textContent = "Signing in…"; }

  try {
    // Try to load existing customer state by phone
    const result = await apiRequest(`/api/customer/state?phone=${encodeURIComponent(phone)}`);
    if (result.profile) {
      // Use server profile but update name if the server has the default placeholder
      const serverName = result.profile.name || "";
      const useName = (serverName && serverName !== "Customer") ? serverName : enteredName;
      state.profile = { ...result.profile, name: useName };
      state.addresses = Array.isArray(result.addresses) ? result.addresses.slice(0, MAX_ADDRESSES) : [];
      state.selectedAddressId = result.selectedAddressId || state.addresses[0]?.id || null;
    } else {
      // New user — use the name they typed
      state.profile = { name: enteredName, phone };
      state.addresses = [];
    }
    writeJson(STORAGE_KEYS.profile, state.profile);
    writeJson(STORAGE_KEYS.addresses, state.addresses);
    if (state.selectedAddressId) localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);

    // Persist the updated name back to server
    try { await syncCustomerState(); } catch {}

    await loadOrdersForTracking();
    navigateTo("account");
  } catch (e) {
    // If API fails, create local profile with the entered name
    state.profile = { name: enteredName, phone };
    state.addresses = [];
    writeJson(STORAGE_KEYS.profile, state.profile);
    navigateTo("account");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Sign In"; }
  }
}


/* ── Signup flow ───────────────────────────────────── */
let signupMapInstance = null;
let signupMarkerInstance = null;
let signupLocationData = null;

function initSignupMap() {
  setTimeout(() => {
    const mapEl = $("signupMap");
    if (!mapEl || !window.L) return;

    if (signupMapInstance) {
      signupMapInstance.invalidateSize();
      return;
    }

    const center = [20.5937, 78.9629];
    signupMapInstance = L.map(mapEl).setView(center, 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors", maxZoom: 19,
    }).addTo(signupMapInstance);

    signupMapInstance.on("click", (e) => setSignupPin(e.latlng.lat, e.latlng.lng));
  }, 200);
}

function setSignupPin(lat, lng) {
  if (!signupMapInstance) return;
  signupLocationData = { lat, lng };
  if (!signupMarkerInstance) {
    signupMarkerInstance = L.marker([lat, lng], { draggable: true }).addTo(signupMapInstance);
    signupMarkerInstance.on("dragend", () => {
      const pos = signupMarkerInstance.getLatLng();
      setSignupPin(pos.lat, pos.lng);
    });
  } else {
    signupMarkerInstance.setLatLng([lat, lng]);
  }
  signupMapInstance.setView([lat, lng], Math.max(signupMapInstance.getZoom(), 15));
  const status = $("mapStatus");
  if (status) status.textContent = `Pin set at ${lat.toFixed(5)}, ${lng.toFixed(5)}. Fetching address…`;

  // Reverse geocode
  fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
    .then(r => r.json())
    .then(data => {
      const addr = $("signupAddress");
      if (addr && data.display_name) addr.value = data.display_name;
      const status = $("mapStatus");
      if (status) status.textContent = "Address found from pin.";
    }).catch(() => {
      const status = $("mapStatus");
      if (status) status.textContent = "Pin set. Enter address manually if needed.";
    });
}

async function handleSignup(event) {
  event.preventDefault();
  const btn = $("signupSubmitBtn");
  const name = $("signupName")?.value.trim();
  const phone = normalizePhone($("signupPhone")?.value || "");
  const house = $("signupHouse")?.value.trim();
  const street = $("signupStreet")?.value.trim();
  const address = $("signupAddress")?.value.trim();
  const addrType = $("signupAddressType")?.value || "Home";

  if (!name) { alert("Please enter your name."); return; }
  if (phone.length !== 10) { alert("Please enter a valid 10-digit phone number."); return; }
  if (!signupLocationData) { alert("Please pin your delivery location on the map."); return; }
  if (!house) { alert("Please enter your house/flat number."); return; }

  if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }

  const profile = { name, phone };
  const addressRecord = {
    id: Date.now().toString(),
    name, phone,
    houseNumber: house,
    streetName: street,
    type: addrType,
    address: address || "",
    location: signupLocationData,
  };

  state.profile = profile;
  state.addresses = [addressRecord];
  state.selectedAddressId = addressRecord.id;

  writeJson(STORAGE_KEYS.profile, profile);
  writeJson(STORAGE_KEYS.addresses, state.addresses);
  localStorage.setItem(STORAGE_KEYS.selectedAddressId, addressRecord.id);

  try { await syncCustomerState(); } catch {}

  if (btn) { btn.disabled = false; btn.textContent = "Save & Continue"; }
  navigateTo("account");
}

/* ── Address map (addresses page) ──────────────────── */
let addrMapInstance = null;
let addrMarkerInstance = null;
let addrLocationData = null;

function initAddrMap() {
  const mapEl = $("addrMap");
  if (!mapEl || !window.L) return;
  if (addrMapInstance) { addrMapInstance.invalidateSize(); return; }

  const editingAddr = state.editingAddressId ? state.addresses.find(a => a.id === state.editingAddressId) : null;
  const center = editingAddr?.location ? [editingAddr.location.lat, editingAddr.location.lng] : [20.5937, 78.9629];

  addrMapInstance = L.map(mapEl).setView(center, editingAddr?.location ? 15 : 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors", maxZoom: 19,
  }).addTo(addrMapInstance);

  if (editingAddr?.location) {
    addrLocationData = editingAddr.location;
    addrMarkerInstance = L.marker(center, { draggable: true }).addTo(addrMapInstance);
    addrMarkerInstance.on("dragend", () => {
      const p = addrMarkerInstance.getLatLng();
      setAddrPin(p.lat, p.lng);
    });
  }

  addrMapInstance.on("click", (e) => setAddrPin(e.latlng.lat, e.latlng.lng));
}

function setAddrPin(lat, lng) {
  if (!addrMapInstance) return;
  addrLocationData = { lat, lng };
  if (!addrMarkerInstance) {
    addrMarkerInstance = L.marker([lat, lng], { draggable: true }).addTo(addrMapInstance);
    addrMarkerInstance.on("dragend", () => {
      const p = addrMarkerInstance.getLatLng();
      setAddrPin(p.lat, p.lng);
    });
  } else addrMarkerInstance.setLatLng([lat, lng]);
  addrMapInstance.setView([lat, lng], Math.max(addrMapInstance.getZoom(), 15));
  const s = $("addrMapStatus");
  if (s) s.textContent = `Pin at ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
    .then(r => r.json()).then(d => {
      const f = $("addrFull"); if (f && d.display_name) f.value = d.display_name;
      const s = $("addrMapStatus"); if (s) s.textContent = "Address found from pin.";
    }).catch(() => {});
}

async function saveAddressForm() {
  const house = $("addrHouse")?.value.trim();
  const street = $("addrStreet")?.value.trim();
  const full = $("addrFull")?.value.trim();
  const type = $("addrType")?.value || "Home";

  if (!addrLocationData) { alert("Please pin your location on the map."); return; }
  if (!house) { alert("Please enter house/flat number."); return; }

  if (state.addresses.length >= MAX_ADDRESSES && !state.editingAddressId) {
    alert("Maximum 10 addresses allowed."); return;
  }

  const record = {
    id: state.editingAddressId || Date.now().toString(),
    name: state.profile?.name || "",
    phone: state.profile?.phone || "",
    houseNumber: house,
    streetName: street || "",
    type,
    address: full || "",
    location: addrLocationData,
  };

  const idx = state.addresses.findIndex(a => a.id === record.id);
  if (idx >= 0) state.addresses[idx] = record;
  else state.addresses.push(record);

  state.addresses = state.addresses.slice(0, MAX_ADDRESSES);
  state.selectedAddressId = record.id;
  state.editingAddressId = null;

  writeJson(STORAGE_KEYS.addresses, state.addresses);
  localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);

  try { await syncCustomerState(); } catch {}

  // Reset map
  if (addrMapInstance) { addrMapInstance.remove(); addrMapInstance = null; addrMarkerInstance = null; addrLocationData = null; }

  // Hide form
  const form = $("addressForm"); if (form) form.classList.add("hidden");
  const btn = $("addAddressBtn"); if (btn) btn.classList.remove("hidden");

  renderAddressesPage();
  updateCartUI();
}

/* ── Checkout ──────────────────────────────────────── */
function syncCheckoutUI() {
  syncCheckoutFields();
}

async function handleCheckout(event) {
  event.preventDefault();

  if (!state.profile || !getActiveAddress()) {
    alert("Please sign in and save a delivery address before ordering.");
    navigateTo("account");
    return;
  }

  const totals = getTotals();
  if (!totals.rows.length) { alert("Please add at least one item to your cart."); return; }

  try {
    const intent = await apiRequest("/api/payments/razorpay/create-intent", {
      method: "POST",
      body: JSON.stringify({
        customerName: state.profile.name,
        customerPhone: state.profile.phone,
        orderType: "delivery",
        address: getActiveAddress(),
        items: getCartRows().map(r => ({ id: r.id, quantity: r.quantity })),
      }),
    });

    const ps = $("paymentSummary");
    const an = $("adminNotice");
    const rrb = $("razorpayRetryButton");
    if (ps) ps.textContent = `Pay ${fmt(totals.total)} using Razorpay UPI.`;
    if (an) an.textContent = "Complete the payment. No order saved until payment is done.";
    if (rrb) rrb.classList.add("hidden");
    $("paymentDialog")?.showModal();
    openRazorpayCheckout(intent, intent.paymentSessionId);
  } catch (e) { alert(e.message); }
}

function openRazorpayCheckout(intent, paymentSessionId) {
  if (!window.Razorpay) { alert("Razorpay could not load. Check your connection."); return; }
  const ps = $("paymentSummary");
  const an = $("adminNotice");
  const rrb = $("razorpayRetryButton");

  const instance = new Razorpay({
    key: intent.razorpay.keyId,
    amount: intent.razorpay.amount,
    currency: intent.razorpay.currency,
    name: intent.razorpay.name,
    description: "Order payment",
    order_id: intent.razorpay.orderId,
    prefill: { name: state.profile?.name || "", contact: state.profile?.phone || "" },
    method: { upi: true },
    handler: async (response) => {
      try {
        const result = await apiRequest("/api/payments/razorpay/verify", {
          method: "POST",
          body: JSON.stringify({ paymentSessionId, ...response }),
        });
        if (ps) ps.textContent = `${result.order.id} payment verified. Waiting for restaurant confirmation.`;
        if (an) an.textContent = "Payment verified.";
        if (rrb) rrb.classList.add("hidden");
        state.cart.clear();
        updateCartUI();
        closeCart();
        await loadOrdersForTracking();
      } catch (e) {
        if (ps) ps.textContent = `Payment received but verification failed: ${e.message}`;
        if (rrb) rrb.classList.remove("hidden");
      }
    },
    modal: {
      ondismiss: () => {
        if (ps) ps.textContent = "Payment was closed. Please try again.";
        if (an) an.textContent = "No order was created.";
        if (rrb) rrb.classList.remove("hidden");
      },
    },
  });
  if (rrb) rrb.onclick = () => instance.open();
  instance.open();
}

/* ── Tracking ──────────────────────────────────────── */
let trackingMap = null;
let trackingLayerGroup = null;
let trackingOpen = false;
let trackingCurrentOrder = null;

function statusLabel(s) { return String(s || "").replace(/_/g, " "); }

function renderTrackingPanel(order) {
  const dock = $("trackingDock");
  const sheet = $("trackingSheet");
  const toggle = $("trackingToggle");
  if (!dock) return;

  const isTerminal = order?.status === "completed" || order?.status === "cancelled";
  if (!order || isTerminal) {
    dock.classList.add("hidden");
    trackingOpen = false;
    if (sheet) sheet.classList.add("hidden");
    if (isTerminal) trackingCurrentOrder = null;
    return;
  }

  dock.classList.remove("hidden");
  const title = ["pending_admin_acceptance","received"].includes(order.status) ? "Order placed" : "Order confirmed";
  const tb = $("trackingBarTitle"); if (tb) tb.textContent = title;
  const be = $("trackingBarEta");
  if (be) be.textContent = order.etaMinutes ? `${order.etaMinutes} min to your location` : "Waiting for restaurant";
  const pill = $("trackingStatusPill");
  if (pill) { pill.textContent = statusLabel(order.status); pill.className = `tracking-pill ${order.status === "cancelled" ? "cancelled" : ""}`; }

  const rid = $("trackingReceiptId"); if (rid) rid.textContent = `Order ID: ${order.id}`;
  const items = $("trackingItems");
  if (items) items.innerHTML = (order.items || []).map(i => `<li>${i.name} ×${i.quantity} — ${fmt(i.lineTotal || i.price * i.quantity)}</li>`).join("");
  const tot = $("trackingTotal"); if (tot) tot.textContent = `Total: ${fmt(order.totals?.total || 0)}`;
  const addr = $("trackingAddress"); if (addr) addr.textContent = formatAddressLine(order.address);

  trackingCurrentOrder = order;
  if (sheet) sheet.classList.toggle("hidden", !trackingOpen);
  if (toggle) toggle.setAttribute("aria-expanded", trackingOpen ? "true" : "false");
  if (trackingOpen) renderTrackingMap(order);
}

function renderTrackingMap(order) {
  const mapEl = $("trackingMap");
  if (!mapEl || !window.L) return;
  const pin = order?.address?.location;
  if (!pin || !Number.isFinite(pin.lat)) { mapEl.innerHTML = "<p class='empty-state'>Map unavailable.</p>"; return; }
  if (!trackingMap) {
    trackingMap = L.map(mapEl).setView([pin.lat, pin.lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(trackingMap);
    trackingLayerGroup = L.layerGroup().addTo(trackingMap);
  } else { trackingMap.invalidateSize(); trackingLayerGroup.clearLayers(); }
  L.marker([pin.lat, pin.lng]).bindPopup("Delivery address").addTo(trackingLayerGroup);
}

async function loadOrdersForTracking() {
  if (!state.profile?.phone) { renderTrackingPanel(null); return; }
  try {
    const result = await apiRequest("/api/orders/my");
    state.previousOrders = result.orders || [];
    maybeShowCustomerMessage(state.previousOrders);
    const latest = getLatestOrder(state.previousOrders);
    maybeShowCancelledOrder(latest);
    maybeShowAcceptedOrder(latest);
    maybeShowCompletedOrder(latest);
    if (latest?.status === "completed") {
      promptDeliveryRating(latest);
      promptProductRating(latest);
    }
    renderTrackingPanel(latest);
  } catch { renderTrackingPanel(null); }
}

function getLatestOrder(orders) {
  return [...(orders || [])].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))[0] || null;
}

/* ── Order notifications ───────────────────────────── */
function openOrderReceivedCard(order) {
  const overlay = $("orderReceivedOverlay"); if (!overlay) return;
  const cancelled = order?.status === "cancelled";
  const completed = order?.status === "completed";
  const title = $("orderReceivedTitle");
  if (title) title.textContent = cancelled ? "Order Update" : completed ? "Delivery Completed" : "Order Accepted!";
  const sym = $("orderReceivedSymbol"); if (sym) sym.textContent = cancelled ? "✕" : "✓";
  const icon = document.querySelector(".order-received-icon");
  if (icon) icon.classList.toggle("failed", cancelled);
  const addrEl = $("orderReceivedAddress"); if (addrEl) addrEl.textContent = formatAddressLine(order.address);
  const eta = $("orderReceivedEta");
  if (eta) eta.textContent = cancelled ? "The order could not be delivered." : completed ? "Delivered! Please rate your order." : order.etaMinutes ? `${order.etaMinutes} min to your location` : "Order confirmed by restaurant.";
  overlay.classList.remove("hidden");
}

function maybeShowAcceptedOrder(order) {
  if (!order || order.status !== "accepted") return;
  const shown = localStorage.getItem(STORAGE_KEYS.lastAcceptedOrderShown);
  if (shown === order.id) return;
  localStorage.setItem(STORAGE_KEYS.lastAcceptedOrderShown, order.id);
  openOrderReceivedCard(order);
}

function maybeShowCancelledOrder(order) {
  if (!order || order.status !== "cancelled") return;
  const marker = `${order.id}:${order.updatedAt || order.createdAt}`;
  if (localStorage.getItem(STORAGE_KEYS.lastCancelledOrderShown) === marker) return;
  localStorage.setItem(STORAGE_KEYS.lastCancelledOrderShown, marker);
  openOrderReceivedCard(order);
}

function maybeShowCompletedOrder(order) {
  if (!order || order.status !== "completed") return;
  const marker = `${order.id}:${order.completedAt || order.updatedAt || order.createdAt}`;
  if (localStorage.getItem(STORAGE_KEYS.lastCompletedOrderShown) === marker) return;
  localStorage.setItem(STORAGE_KEYS.lastCompletedOrderShown, marker);
  openOrderReceivedCard(order);
}

function maybeShowCustomerMessage(orders) {
  const msg = [...(orders || [])].sort((a, b) => new Date(b.customerMessageAt || b.updatedAt || b.createdAt) - new Date(a.customerMessageAt || a.updatedAt || a.createdAt))
    .find(o => typeof o.customerMessage === "string" && o.customerMessage.trim());
  if (!msg) return;
  const marker = `${msg.id}:${msg.customerMessageAt || msg.customerMessage}`;
  if (localStorage.getItem(STORAGE_KEYS.lastCustomerMessageShown) === marker) return;
  localStorage.setItem(STORAGE_KEYS.lastCustomerMessageShown, marker);
  const el = $("customerMessageText"); if (el) el.textContent = msg.customerMessage;
  $("customerMessageDialog")?.showModal();
}

/* ── Ratings ───────────────────────────────────────── */
function promptDeliveryRating(order) {
  if (!order || order.status !== "completed") return;
  if (order.review?.deliveryRating) return;
  const marker = `${order.id}:${order.completedAt || order.updatedAt}`;
  if (localStorage.getItem(STORAGE_KEYS.lastDeliveryRatingShown) === marker) return;
  localStorage.setItem(STORAGE_KEYS.lastDeliveryRatingShown, marker);
  $("deliveryRatingDialog")?.showModal();
  const input = $("deliveryRatingInput"); if (input) input.value = "0";
  const stars = $("deliveryRatingStars"); if (stars) paintStars(stars, 0);
  const comment = $("deliveryRatingComment"); if (comment) comment.value = "";
}

function promptProductRating(order) {
  if (!order || order.status !== "completed") return;
  if (Array.isArray(order.review?.productRatings) && order.review.productRatings.length) return;
  const completedAt = new Date(order.completedAt || order.updatedAt || order.createdAt).getTime();
  if (!Number.isFinite(completedAt)) return;
  if (Date.now() < completedAt + 5 * 60 * 1000) return;
  const marker = `${order.id}:${order.completedAt || order.updatedAt}`;
  if (localStorage.getItem(STORAGE_KEYS.lastProductRatingShown) === marker) return;
  localStorage.setItem(STORAGE_KEYS.lastProductRatingShown, marker);
  renderProductRatingItems(order);
  $("productRatingDialog")?.showModal();
  const comment = $("productRatingComment"); if (comment) comment.value = "";
}

function renderProductRatingItems(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const summary = $("productRatingSummary");
  if (summary) summary.textContent = items.length ? `Items: ${items.map(i => `${i.name} ×${i.quantity}`).join(", ")}` : "";
  const container = $("productRatingItems");
  if (!container) return;
  container.innerHTML = items.map(item => `
    <div class="rating-item">
      <label>${item.name} ×${item.quantity}</label>
      <input type="hidden" data-product-rating-input="${item.id}" value="0" />
      <div class="star-rating" data-rating-target="product-${item.id}" role="radiogroup" aria-label="Rating for ${item.name}">
        ${[1,2,3,4,5].map(v => `<button type="button" class="star-btn" data-star-value="${v}" aria-label="${v} star">★</button>`).join("")}
      </div>
    </div>
  `).join("");
}

function paintStars(container, rating) {
  container.querySelectorAll(".star-btn").forEach(btn => {
    const active = Number(btn.dataset.starValue) <= Number(rating);
    btn.classList.toggle("active", active);
  });
}

function setRatingFromStar(btn) {
  const container = btn.closest(".star-rating"); if (!container) return;
  const value = Number(btn.dataset.starValue || 0);
  const target = container.dataset.ratingTarget || "";
  if (target === "deliveryRatingInput") {
    const input = $("deliveryRatingInput"); if (input) input.value = String(value);
  } else if (target.startsWith("product-")) {
    const id = target.replace("product-", "");
    const input = $("productRatingItems")?.querySelector(`[data-product-rating-input="${id}"]`);
    if (input) input.value = String(value);
  }
  paintStars(container, value);
}

/* ── Cart panel open/close ─────────────────────────── */
function openCart() {
  const panel = $("cartPanel");
  const backdrop = $("cartBackdrop");
  if (panel) { panel.classList.remove("hidden"); setTimeout(() => panel.classList.add("open"), 10); }
  if (backdrop) { backdrop.classList.remove("hidden"); setTimeout(() => backdrop.classList.add("open"), 10); }
  updateCartUI();
}

function closeCart() {
  const panel = $("cartPanel");
  const backdrop = $("cartBackdrop");
  if (panel) { panel.classList.remove("open"); setTimeout(() => panel.classList.add("hidden"), 320); }
  if (backdrop) { backdrop.classList.remove("open"); setTimeout(() => backdrop.classList.add("hidden"), 320); }
}

/* ── GPS location ──────────────────────────────────── */
function requestGPS(onSuccess, onError) {
  if (!navigator.geolocation) { onError("Location not supported in this browser."); return; }
  navigator.geolocation.getCurrentPosition(
    pos => onSuccess(pos.coords.latitude, pos.coords.longitude),
    err => onError(err.code === 1 ? "Location blocked. Tap the map to pin manually." : "Could not get location. Tap the map to pin manually."),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}

/* ── Logout ────────────────────────────────────────── */
async function logout() {
  if (!confirm("Are you sure you want to log out?")) return;
  clearSession();
  // Reset maps
  if (signupMapInstance) { signupMapInstance.remove(); signupMapInstance = null; signupMarkerInstance = null; signupLocationData = null; }
  if (addrMapInstance) { addrMapInstance.remove(); addrMapInstance = null; addrMarkerInstance = null; addrLocationData = null; }
  renderTrackingPanel(null);
  updateCartUI();
  navigateTo("account");
}

/* ══════════════════════════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {

  // Global navigation — data-goto
  document.addEventListener("click", (e) => {
    const goto = e.target.closest("[data-goto]")?.dataset.goto;
    if (goto) { navigateTo(goto); return; }

    const back = e.target.closest("[data-goto-back]");
    if (back) { goBack(); return; }
  });

  // Theme toggle
  $("themeToggle")?.addEventListener("click", toggleTheme);

  // Cart FAB
  $("cartFab")?.addEventListener("click", openCart);
  $("closeCartBtn")?.addEventListener("click", closeCart);
  $("cartBackdrop")?.addEventListener("click", closeCart);

  // Bottom nav
  document.querySelectorAll(".nav-tab").forEach(btn => {
    btn.addEventListener("click", () => navigateTo(btn.dataset.goto));
  });

  // Cart quantity in cart panel
  $("cartItems")?.addEventListener("click", (e) => {
    const inc = e.target.closest("[data-increase]");
    const dec = e.target.closest("[data-decrease]");
    if (inc) updateQuantity(inc.dataset.increase, 1);
    if (dec) updateQuantity(dec.dataset.decrease, -1);
  });

  // Menu filters
  $("menuFilters")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-category]");
    if (!btn) return;
    state.activeCategory = normCat(btn.dataset.category) || "all";
    renderCategoryTabs();
    const search = $("menuSearch");
    renderMenuGrid($("menuGrid"), getFilteredMenu(search?.value || ""), state.activeCategory);
  });

  // Menu grid click
  $("menuGrid")?.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    const inc = e.target.closest("[data-menu-increase]");
    const dec = e.target.closest("[data-menu-decrease]");
    if (add) updateQuantity(add.dataset.add, 1);
    if (inc) updateQuantity(inc.dataset.menuIncrease, 1);
    if (dec) updateQuantity(dec.dataset.menuDecrease, -1);
  });

  // Menu search
  $("menuSearch")?.addEventListener("input", (e) => {
    renderMenuGrid($("menuGrid"), getFilteredMenu(e.target.value), state.activeCategory);
  });

  // Reorder grid click (delegate to same handler)
  document.getElementById("reorderGrid")?.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    const inc = e.target.closest("[data-menu-increase]");
    const dec = e.target.closest("[data-menu-decrease]");
    if (add) updateQuantity(add.dataset.add, 1);
    if (inc) updateQuantity(inc.dataset.menuIncrease, 1);
    if (dec) updateQuantity(dec.dataset.menuDecrease, -1);
  });

  document.getElementById("reorderItems")?.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    const inc = e.target.closest("[data-menu-increase]");
    const dec = e.target.closest("[data-menu-decrease]");
    if (add) updateQuantity(add.dataset.add, 1);
    if (inc) updateQuantity(inc.dataset.menuIncrease, 1);
    if (dec) updateQuantity(dec.dataset.menuDecrease, -1);
  });

  // Reorder search
  $("reorderSearch")?.addEventListener("input", (e) => renderReorderGrid());

  // Account page buttons (delegated)
  $("accountContent")?.addEventListener("click", async (e) => {
    const acct = e.target.closest("[data-acct]")?.dataset.acct;
    if (!acct) return;
    if (acct === "logout") { await logout(); return; }
    if (acct === "orders") { navigateTo("orders"); return; }
    if (acct === "addresses") { navigateTo("addresses"); return; }
    if (acct === "spends") { await loadPreviousOrders(); navigateTo("spends"); return; }
    if (acct === "help") { navigateTo("help"); return; }
    if (acct === "profile-edit") { initEditProfilePage(); navigateTo("edit-profile"); return; }
    if (acct === "info") { navigateTo("help"); return; }
  });

  // Login form
  $("loginForm")?.addEventListener("submit", handleLogin);

  // Signup form
  $("signupForm")?.addEventListener("submit", handleSignup);

  // Signup GPS button
  $("useLocationBtn")?.addEventListener("click", () => {
    const btn = $("useLocationBtn");
    if (btn) btn.textContent = "Getting GPS…";
    requestGPS(
      (lat, lng) => { setSignupPin(lat, lng); if (btn) btn.textContent = "📍 Use GPS"; },
      (err) => { alert(err); if (btn) btn.textContent = "📍 Use GPS"; }
    );
  });

  // Address GPS button
  $("addrUseLocationBtn")?.addEventListener("click", () => {
    requestGPS((lat, lng) => setAddrPin(lat, lng), (err) => alert(err));
  });

  // Add address button
  $("addAddressBtn")?.addEventListener("click", () => {
    state.editingAddressId = null;
    addrLocationData = null;
    if (addrMapInstance) { addrMapInstance.remove(); addrMapInstance = null; addrMarkerInstance = null; }
    const form = $("addressForm"); if (form) form.classList.remove("hidden");
    const btn = $("addAddressBtn"); if (btn) btn.classList.add("hidden");
    const title = $("addressFormTitle"); if (title) title.textContent = "New Address";
    // Clear form
    ["addrHouse","addrStreet","addrFull"].forEach(id => { const el = $(id); if (el) el.value = ""; });
    setTimeout(() => initAddrMap(), 100);
  });

  $("cancelAddressBtn")?.addEventListener("click", () => {
    const form = $("addressForm"); if (form) form.classList.add("hidden");
    const btn = $("addAddressBtn"); if (btn) btn.classList.remove("hidden");
    state.editingAddressId = null;
    if (addrMapInstance) { addrMapInstance.remove(); addrMapInstance = null; addrMarkerInstance = null; addrLocationData = null; }
  });

  $("addressForm")?.addEventListener("submit", async (e) => { e.preventDefault(); await saveAddressForm(); });

  // Address list actions (edit/delete/select)
  $("addressList")?.addEventListener("click", async (e) => {
    const sel = e.target.closest("[data-select-addr]");
    const edit = e.target.closest("[data-edit-addr]");
    const del = e.target.closest("[data-del-addr]");
    if (sel) {
      state.selectedAddressId = sel.dataset.selectAddr;
      localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
      try { await syncCustomerState(); } catch {}
      renderAddressesPage(); updateCartUI(); return;
    }
    if (edit) {
      state.editingAddressId = edit.dataset.editAddr;
      const addr = state.addresses.find(a => a.id === state.editingAddressId);
      if (addr) {
        addrLocationData = addr.location || null;
        if (addrMapInstance) { addrMapInstance.remove(); addrMapInstance = null; addrMarkerInstance = null; }
        const form = $("addressForm"); if (form) form.classList.remove("hidden");
        const btn = $("addAddressBtn"); if (btn) btn.classList.add("hidden");
        const title = $("addressFormTitle"); if (title) title.textContent = "Edit Address";
        const h = $("addrHouse"); if (h) h.value = addr.houseNumber || "";
        const s = $("addrStreet"); if (s) s.value = addr.streetName || "";
        const f = $("addrFull"); if (f) f.value = addr.address || "";
        const t = $("addrType"); if (t) t.value = addr.type || "Home";
        setTimeout(() => initAddrMap(), 100);
      }
      return;
    }
    if (del) {
      if (!confirm("Delete this address?")) return;
      state.addresses = state.addresses.filter(a => a.id !== del.dataset.delAddr);
      if (state.selectedAddressId === del.dataset.delAddr) state.selectedAddressId = state.addresses[0]?.id || null;
      writeJson(STORAGE_KEYS.addresses, state.addresses);
      if (state.selectedAddressId) localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
      try { await syncCustomerState(); } catch {}
      renderAddressesPage(); updateCartUI(); return;
    }
  });

  // Edit profile form
  $("editProfileForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("editName")?.value.trim();
    const phone = normalizePhone($("editPhone")?.value || "");
    if (!name) { alert("Please enter your name."); return; }
    if (phone.length !== 10) { alert("Please enter a valid 10-digit phone number."); return; }
    state.profile = { ...state.profile, name, phone };
    writeJson(STORAGE_KEYS.profile, state.profile);
    try { await syncCustomerState(); } catch {}
    goBack();
  });

  // Checkout form
  $("checkout")?.addEventListener("submit", handleCheckout);

  // Order received overlay close
  $("closeOrderReceivedOverlay")?.addEventListener("click", () => $("orderReceivedOverlay")?.classList.add("hidden"));
  $("orderReceivedOverlay")?.addEventListener("click", (e) => { if (e.target === $("orderReceivedOverlay")) $("orderReceivedOverlay")?.classList.add("hidden"); });

  // Tracking toggle
  $("trackingToggle")?.addEventListener("click", () => {
    trackingOpen = !trackingOpen;
    const sheet = $("trackingSheet");
    if (sheet) sheet.classList.toggle("hidden", !trackingOpen);
    $("trackingToggle")?.setAttribute("aria-expanded", trackingOpen ? "true" : "false");
    if (trackingOpen && trackingCurrentOrder) {
      setTimeout(() => { trackingMap?.invalidateSize(); renderTrackingMap(trackingCurrentOrder); }, 160);
    }
  });

  // Delivery rating
  $("deliveryRatingDialog")?.addEventListener("click", (e) => {
    const star = e.target.closest(".star-btn"); if (star) setRatingFromStar(star);
  });
  $("productRatingDialog")?.addEventListener("click", (e) => {
    const star = e.target.closest(".star-btn"); if (star) setRatingFromStar(star);
  });

  $("deliveryRatingForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const order = getLatestOrder(state.previousOrders);
    if (!order) return;
    const rating = Number($("deliveryRatingInput")?.value || 0);
    if (rating < 1 || rating > 5) { alert("Please choose a star rating."); return; }
    try {
      await apiRequest(`/api/orders/${order.id}/reviews`, {
        method: "POST",
        body: JSON.stringify({ type: "delivery", deliveryRating: rating, deliveryComment: $("deliveryRatingComment")?.value || "" }),
      });
      localStorage.removeItem(STORAGE_KEYS.lastDeliveryRatingShown);
      $("deliveryRatingDialog")?.close();
      await loadOrdersForTracking();
    } catch (e) { alert(e.message); }
  });

  $("productRatingForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const order = getLatestOrder(state.previousOrders);
    if (!order) return;
    const ratings = Array.from($("productRatingItems")?.querySelectorAll("[data-product-rating-input]") || []).map(input => ({
      id: input.dataset.productRatingInput, rating: Number(input.value || 0),
    }));
    if (ratings.some(r => r.rating < 1)) { alert("Please rate every item."); return; }
    try {
      await apiRequest(`/api/orders/${order.id}/reviews`, {
        method: "POST",
        body: JSON.stringify({ type: "products", productRatings: ratings, productComment: $("productRatingComment")?.value || "" }),
      });
      localStorage.removeItem(STORAGE_KEYS.lastProductRatingShown);
      $("productRatingDialog")?.close();
      await loadOrdersForTracking();
    } catch (e) { alert(e.message); }
  });

  $("closeCustomerMessageDialog")?.addEventListener("click", () => $("customerMessageDialog")?.close());

  // Cart panel address change link
  $("cartPanel")?.addEventListener("click", (e) => {
    if (e.target.closest("[data-goto='addresses']")) { closeCart(); navigateTo("addresses"); }
  });

  // Update cart address text when user changes address
  $("addressList")?.addEventListener("click", () => setTimeout(updateCartUI, 200));
});

/* ══════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════ */
async function boot() {
  // Apply saved theme
  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(savedTheme);

  loadLocalState();
  await loadCustomerState();
  updateCartUI();
  await loadMenu();
  if (state.profile?.phone) await loadOrdersForTracking();
  renderAccountPage();

  // Periodic refresh
  setInterval(loadMenu, 300000);
  setInterval(async () => {
    if (!state.profile?.phone) return;
    await loadOrdersForTracking();
  }, 45000);
}

boot();
