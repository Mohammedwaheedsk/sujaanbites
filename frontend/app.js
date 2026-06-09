/* ──────────────────────────────────────────────────────────────
   SUJAAN BITES — Mobile Webapp JS
   ────────────────────────────────────────────────────────────── */

const BUSINESS = {
  name: "Sujaan Bites",
  upiId: "6301000409@kotakbank",
  upiPayeeName: "Sujaan Bites",
  whatsappNumber: "916301000409",
  deliveryFee: 30,
};

const API_BASE = String(window.__API_BASE || window.__API_BASE__ || "").trim().replace(/\/+$/, "");
const MAX_ADDRESSES = 10;
const FREE_DELIVERY_THRESHOLD = 1599;

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

const STORAGE_KEYS = {
  profile: "spiceTableProfile",
  addresses: "spiceTableAddresses",
  selectedAddressId: "spiceTableSelectedAddressId",
  lastAcceptedOrderShown: "spiceTableLastAcceptedOrderShown",
  lastCustomerMessageShown: "spiceTableLastCustomerMessageShown",
  lastCancelledOrderShown: "spiceTableLastCancelledOrderShown",
  lastCompletedOrderShown: "spiceTableLastCompletedOrderShown",
  lastDeliveryRatingShown: "spiceTableLastDeliveryRatingShown",
  lastProductRatingShown: "spiceTableLastProductRatingShown",
  theme: "sujaanTheme",
};

const state = {
  menu: [],
  menuCategories: [],
  activeCategory: "all",
  cart: new Map(),
  profile: null,
  addresses: [],
  selectedAddressId: null,
  activeTab: "dashboard",
  currentPage: "home",
  editingAddressId: null,
  addressMode: null,
  selectedLocation: null,
  previousOrders: [],
  map: null,
  marker: null,
  loadingMenu: false,
  checkoutNeedsAccountConfirm: true,
};

const DEFAULT_MENU = [
  { id: "butter", name: "Butter Cookies", description: "Crisp, golden butter cookies with a light vanilla finish.", price: 120, category: "classic", image: "assets/cookie-butter.png", available: true, stockCount: 20 },
  { id: "choco-chip", name: "Chocolate Chip Cookies", description: "Soft-centred cookies loaded with rich chocolate chips.", price: 150, category: "chocolate", image: "assets/cookie-chocolate.png", available: true, stockCount: 20 },
  { id: "oatmeal", name: "Oatmeal Raisin Cookies", description: "Chewy oats with raisins and a warm cinnamon note.", price: 130, category: "classic", image: "assets/cookie-butter.png", available: true, stockCount: 20 },
  { id: "filled-biscuit", name: "Stuffed Jam Cookies", description: "Tender cookies with a sweet strawberry jam centre.", price: 160, category: "stuffed", image: "assets/cookie-jam.png", available: true, stockCount: 20 },
  { id: "brownie-bite", name: "Chocolate Fudge Cookies", description: "Dense cocoa cookies with a fudgy brownie-like bite.", price: 170, category: "chocolate", image: "assets/cookie-chocolate.png", available: true, stockCount: 20 },
  { id: "gift-pack", name: "Assorted Cookie Box", description: "A mixed box of 12 cookies, perfect for gifting.", price: 420, category: "packs", image: "assets/hero-food.png", available: true, stockCount: 20 },
];

/* ── DOM References ─────────────────────────────────────────── */
const menuGrid = document.querySelector("#menuGrid");
const menuFilters = document.querySelector("#menuFilters");
const accountShellTitle = document.querySelector("#accountShellTitle");
const accountContent = document.querySelector("#accountContent");
const cartItems = document.querySelector("#cartItems");
const itemCount = document.querySelector("#itemCount");
const subtotalEl = document.querySelector("#subtotal");
const deliveryFeeEl = document.querySelector("#deliveryFee");
const grandTotalEl = document.querySelector("#grandTotal");
const checkout = document.querySelector("#checkout");
const customerName = document.querySelector("#customerName");
const customerPhone = document.querySelector("#customerPhone");
const selectedAddressText = document.querySelector("#selectedAddressText");
const checkoutAddressSelect = document.querySelector("#checkoutAddressSelect");
const paymentDialog = document.querySelector("#paymentDialog");
const paymentSummary = document.querySelector("#paymentSummary");
const razorpayRetryButton = document.querySelector("#razorpayRetryButton");
const adminNotice = document.querySelector("#adminNotice");
const deliveryRatingDialog = document.querySelector("#deliveryRatingDialog");
const deliveryRatingForm = document.querySelector("#deliveryRatingForm");
const deliveryRatingInput = document.querySelector("#deliveryRatingInput");
const deliveryRatingStars = document.querySelector("#deliveryRatingStars");
const deliveryRatingComment = document.querySelector("#deliveryRatingComment");
const productRatingDialog = document.querySelector("#productRatingDialog");
const productRatingForm = document.querySelector("#productRatingForm");
const productRatingItems = document.querySelector("#productRatingItems");
const productRatingSummary = document.querySelector("#productRatingSummary");
const productRatingComment = document.querySelector("#productRatingComment");
const orderReceivedOverlay = document.querySelector("#orderReceivedOverlay");
const orderReceivedTitle = document.querySelector("#orderReceivedTitle");
const orderReceivedSymbol = document.querySelector("#orderReceivedSymbol");
const orderReceivedIcon = document.querySelector(".order-received-icon");
const orderReceivedAddress = document.querySelector("#orderReceivedAddress");
const orderReceivedEta = document.querySelector("#orderReceivedEta");
const closeOrderReceivedOverlay = document.querySelector("#closeOrderReceivedOverlay");
const trackingDock = document.querySelector("#trackingDock");
const trackingToggle = document.querySelector("#trackingToggle");
const trackingSheet = document.querySelector("#trackingSheet");
const trackingBarTitle = document.querySelector("#trackingBarTitle");
const trackingBarEta = document.querySelector("#trackingBarEta");
const trackingStatusPill = document.querySelector("#trackingStatusPill");
const trackingEta = document.querySelector("#trackingEta");
const trackingMapEl = document.querySelector("#trackingMap");
const trackingReceiptId = document.querySelector("#trackingReceiptId");
const trackingItemsList = document.querySelector("#trackingItems");
const trackingTotal = document.querySelector("#trackingTotal");
const trackingAddress = document.querySelector("#trackingAddress");
const customerMessageDialog = document.querySelector("#customerMessageDialog");
const customerMessageText = document.querySelector("#customerMessageText");
const closeCustomerMessageDialog = document.querySelector("#closeCustomerMessageDialog");
const cartPanel = document.querySelector("#cartPanel");
const cartPanelOverlay = document.querySelector("#cartPanelOverlay");
const cartPanelClose = document.querySelector("#cartPanelClose");
const cartBadge = document.querySelector("#cartBadge");
const bottomNavIndicator = document.querySelector("#bottomNavIndicator");
const bottomNavBtns = document.querySelectorAll(".bottom-app-nav button[data-bottom-tab]");
const themeToggleBtn = document.querySelector("#themeToggleBtn");
const featuredGrid = document.querySelector("#featuredGrid");
const searchInput = document.querySelector("#menuSearchInput");
const searchResults = document.querySelector("#searchResults");
const freeDeliveryProgressBar = document.querySelector("#freeDeliveryProgressBar");
const freeDeliveryProgressLabel = document.querySelector("#freeDeliveryProgressLabel");
const freeDeliveryProgressRemaining = document.querySelector("#freeDeliveryProgressRemaining");

let trackingMap = null;
let trackingLayerGroup = null;
let trackingOpen = false;
let trackingCurrentOrder = null;

/* ── Helpers ────────────────────────────────────────────────── */
function formatPrice(value) { return currency.format(value || 0); }
function normalizePhone(value) { return String(value || "").replace(/\D/g, "").slice(-10); }
function normalizeCategory(value) { return String(value || "").trim().toLowerCase(); }
function formatCategoryLabel(value) {
  return String(value || "").trim().split(/[\s_-]+/).filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "Other";
}
function getMenuStock(item) { const n = Number(item?.stockCount); return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 20; }
function readStoredJson(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function writeStoredJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function statusLabel(s) { return String(s || "").replaceAll("_", " "); }

/* ── Theme ──────────────────────────────────────────────────── */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEYS.theme, theme);
}

function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme);
  const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  applyTheme(saved || preferred);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  applyTheme(current === "dark" ? "light" : "dark");
}

/* ── Session ────────────────────────────────────────────────── */
function clearSession() {
  state.profile = null;
  state.addresses = [];
  state.selectedAddressId = null;
  state.editingAddressId = null;
  state.selectedLocation = null;
  state.previousOrders = [];
  localStorage.removeItem(STORAGE_KEYS.profile);
  localStorage.removeItem(STORAGE_KEYS.addresses);
  localStorage.removeItem(STORAGE_KEYS.selectedAddressId);
  state.cart.clear();
}

function getActiveAddress() {
  if (!state.addresses.length) return null;
  return state.addresses.find((e) => e.id === state.selectedAddressId) || state.addresses[0];
}

function getResolvedCustomerProfile() {
  const activeAddress = getActiveAddress();
  const name = String(state.profile?.name || activeAddress?.name || "").trim();
  const phone = normalizePhone(state.profile?.phone || activeAddress?.phone || "");
  if (!name && phone.length !== 10) return null;
  return { name, phone };
}

function formatAddressLine(address) {
  if (!address) return "No address saved yet.";
  return [`${address.houseNumber || ""} ${address.streetName || ""}`.trim(), address.address || "", address.landmark ? `Landmark: ${address.landmark}` : "", address.type ? `${address.type} address` : "Delivery address"]
    .filter(Boolean).join(" • ");
}

function formatMultilineAddress(address) {
  if (!address) return "";
  return [`${address.type || "Delivery"} address`, `House number: ${address.houseNumber || "-"}`, `Street name: ${address.streetName || "-"}`, `Phone: ${address.phone || state.profile?.phone || "-"}`, `Map address: ${address.address || "-"}`, address.landmark ? `Landmark: ${address.landmark}` : ""]
    .filter(Boolean).join("\n");
}

/* ── API ────────────────────────────────────────────────────── */
function apiRequest(path, options = {}) {
  const headers = { "content-type": "application/json", ...(options.headers || {}) };
  const activeAddress = getActiveAddress();
  if (activeAddress?.phone) headers["x-customer-phone"] = activeAddress.phone;
  else if (state.profile?.phone) headers["x-customer-phone"] = state.profile.phone;
  return fetch(`${API_BASE}${path}`, { ...options, headers }).then(async (res) => {
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || "Request failed");
    return payload;
  });
}

/* ── Page Navigation ────────────────────────────────────────── */
function navigateTo(pageId) {
  document.querySelectorAll(".app-page").forEach((p) => p.classList.remove("active"));
  const page = document.querySelector(`#page-${pageId}`);
  if (page) page.classList.add("active");
  state.currentPage = pageId;

  // Update bottom nav highlight
  bottomNavBtns.forEach((btn) => {
    const tab = btn.dataset.bottomTab;
    btn.classList.toggle("active", tab === pageId);
  });
  positionBottomNavIndicator(pageId);

  // Scroll to top
  if (page) page.scrollTop = 0;
}

function positionBottomNavIndicator(tabName, animate = true) {
  const activeBtn = [...bottomNavBtns].find((b) => b.dataset.bottomTab === tabName);
  const nav = document.querySelector(".bottom-app-nav");
  if (!activeBtn || !bottomNavIndicator || !nav) return;
  const navRect = nav.getBoundingClientRect();
  const btnRect = activeBtn.getBoundingClientRect();
  const paddingLeft = parseFloat(getComputedStyle(nav).paddingLeft) || 0;
  const left = Math.max(0, Math.min(navRect.width - btnRect.width, btnRect.left - navRect.left - paddingLeft));
  if (!animate) bottomNavIndicator.style.transition = "none";
  bottomNavIndicator.style.width = `${btnRect.width}px`;
  bottomNavIndicator.style.transform = `translateX(${Math.round(left)}px)`;
  if (!animate) requestAnimationFrame(() => { bottomNavIndicator.style.transition = ""; });
}

/* ── Cart Panel ─────────────────────────────────────────────── */
function openCart() {
  cartPanel?.classList.remove("hidden");
  cartPanelOverlay?.classList.remove("hidden");
  requestAnimationFrame(() => {
    cartPanel?.classList.add("show");
    cartPanelOverlay?.classList.add("show");
  });
}

function closeCart() {
  cartPanel?.classList.remove("show");
  cartPanelOverlay?.classList.remove("show");
  setTimeout(() => {
    cartPanel?.classList.add("hidden");
    cartPanelOverlay?.classList.add("hidden");
  }, 380);
}

/* ── Menu ───────────────────────────────────────────────────── */
function getMenuCategories() {
  if (Array.isArray(state.menuCategories) && state.menuCategories.length) {
    return [{ id: "all", label: "All" }, ...state.menuCategories.map((c) => ({ id: normalizeCategory(c), label: formatCategoryLabel(c) }))];
  }
  const cats = new Map();
  for (const item of state.menu) {
    const n = normalizeCategory(item.category);
    if (!n || cats.has(n)) continue;
    cats.set(n, formatCategoryLabel(item.category));
  }
  return [{ id: "all", label: "All" }, ...[...cats.entries()].map(([id, label]) => ({ id, label }))];
}

function renderFilters() {
  if (!menuFilters) return;
  const cats = getMenuCategories();
  menuFilters.innerHTML = cats.map((c) => `<button class="filter ${state.activeCategory === c.id ? "active" : ""}" type="button" data-category="${c.id}">${c.label}</button>`).join("");
}

function syncCartToStock() {
  let changed = false;
  for (const [id, qty] of [...state.cart.entries()]) {
    const item = state.menu.find((d) => d.id === id);
    const stock = getMenuStock(item);
    if (!item || item.available === false || stock <= 0) { state.cart.delete(id); changed = true; continue; }
    if (qty > stock) { state.cart.set(id, stock); changed = true; }
  }
  if (changed) renderCart();
}

function renderMenu() {
  if (!menuGrid) return;
  const activeCategory = normalizeCategory(state.activeCategory) || "all";
  const dishes = state.menu.filter((item) => {
    const cat = normalizeCategory(item.category);
    return activeCategory === "all" || cat === activeCategory;
  });
  menuGrid.innerHTML = dishes.map((item) => {
    const stock = getMenuStock(item);
    const soldOut = item.available === false || stock <= 0;
    const qty = state.cart.get(item.id) || 0;
    const canAdd = !soldOut && qty < stock;
    return `
      <article class="dish-card ${soldOut ? "unavailable" : ""}">
        <img class="dish-image" src="${item.image || "assets/hero-food.png"}" alt="${item.name}" loading="lazy" />
        <div class="dish-top">
          <div>
            <h3>${item.name}</h3>
            <p>${item.description}</p>
          </div>
          <span class="price">${formatPrice(item.price)}</span>
        </div>
        <div class="dish-actions">
          <span class="availability ${soldOut ? "off" : "on"}">${soldOut ? "Sold out" : "In stock"}</span>
          ${soldOut
            ? `<button class="add-button" type="button" disabled>Unavailable</button>`
            : qty > 0
              ? `<div class="menu-quantity" aria-label="Quantity for ${item.name}">
                  <button type="button" data-menu-decrease="${item.id}" aria-label="Remove one ${item.name}">−</button>
                  <span>${qty}</span>
                  <button type="button" data-menu-increase="${item.id}" aria-label="Add one ${item.name}" ${canAdd ? "" : "disabled"}>+</button>
                </div>`
              : `<button class="add-button" type="button" data-add="${item.id}">Add</button>`
          }
        </div>
        ${!soldOut && qty >= stock ? `<p class="form-note">You have reached the available stock for this item.</p>` : ""}
      </article>
    `;
  }).join("");
}

function renderFeatured() {
  if (!featuredGrid) return;
  const top = state.menu.slice(0, 4);
  featuredGrid.innerHTML = top.map((item) => `
    <div class="featured-card" data-add-feat="${item.id}">
      <img src="${item.image || "assets/hero-food.png"}" alt="${item.name}" loading="lazy" />
      <div class="featured-card-body">
        <h3>${item.name}</h3>
        <div class="price">${formatPrice(item.price)}</div>
      </div>
    </div>
  `).join("");
}

/* ── Cart ───────────────────────────────────────────────────── */
function getCartRows() {
  return [...state.cart.entries()].map(([id, qty]) => {
    const item = state.menu.find((d) => d.id === id);
    if (!item) return null;
    return { ...item, quantity: qty, lineTotal: item.price * qty };
  }).filter(Boolean).filter((i) => i.quantity > 0);
}

function getTotals() {
  const rows = getCartRows();
  const subtotal = rows.reduce((s, i) => s + i.lineTotal, 0);
  const delivery = subtotal > 0 ? (subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : BUSINESS.deliveryFee) : 0;
  return { rows, subtotal, delivery, total: subtotal + delivery, quantity: rows.reduce((s, i) => s + i.quantity, 0) };
}

function renderCart() {
  const totals = getTotals();
  if (itemCount) itemCount.textContent = `${totals.quantity} ${totals.quantity === 1 ? "item" : "items"}`;
  if (subtotalEl) subtotalEl.textContent = formatPrice(totals.subtotal);
  if (deliveryFeeEl) deliveryFeeEl.textContent = formatPrice(totals.delivery);
  if (grandTotalEl) grandTotalEl.textContent = formatPrice(totals.total);

  // Cart badge
  if (cartBadge) {
    cartBadge.textContent = totals.quantity;
    cartBadge.classList.toggle("hidden", totals.quantity === 0);
  }

  // Cart items
  if (cartItems) {
    if (!totals.rows.length) {
      cartItems.innerHTML = '<p class="empty">Add cookies from the menu to begin.</p>';
    } else {
      cartItems.innerHTML = totals.rows.map((item) => `
        <div class="cart-row">
          <div>
            <strong>${item.name}</strong>
            <small>${formatPrice(item.price)} each</small>
          </div>
          <div class="quantity" aria-label="Quantity for ${item.name}">
            <button type="button" data-decrease="${item.id}" aria-label="Remove one ${item.name}">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-increase="${item.id}" aria-label="Add one ${item.name}" ${item.quantity >= getMenuStock(item) ? "disabled" : ""}>+</button>
          </div>
        </div>
      `).join("");
    }
  }

  // Free delivery progress
  if (freeDeliveryProgressBar && totals.subtotal >= 0) {
    const pct = Math.min(100, (totals.subtotal / FREE_DELIVERY_THRESHOLD) * 100);
    freeDeliveryProgressBar.style.width = `${pct}%`;
    if (freeDeliveryProgressLabel) freeDeliveryProgressLabel.textContent = `${formatPrice(totals.subtotal)} / ${formatPrice(FREE_DELIVERY_THRESHOLD)}`;
    if (freeDeliveryProgressRemaining) {
      freeDeliveryProgressRemaining.textContent = totals.subtotal >= FREE_DELIVERY_THRESHOLD
        ? "🎉 You got free delivery!"
        : `${formatPrice(FREE_DELIVERY_THRESHOLD - totals.subtotal)} away from free delivery`;
    }
  }

  // Checkout address
  if (selectedAddressText) selectedAddressText.textContent = formatAddressLine(getActiveAddress());
  syncCheckoutAddressSelect();
  syncCheckoutFields();
}

function syncCheckoutAddressSelect() {
  if (!checkoutAddressSelect) return;
  const selected = getActiveAddress();
  checkoutAddressSelect.innerHTML = state.addresses.map((addr) => `
    <option value="${addr.id}" ${addr.id === selected?.id ? "selected" : ""}>${addr.type || "Address"} — ${addr.streetName || addr.address || addr.houseNumber || ""}</option>
  `).join("");
  if (!state.addresses.length) checkoutAddressSelect.innerHTML = '<option>No addresses saved</option>';
}

function syncCheckoutFields() {
  if (customerName) customerName.value = state.profile?.name || "";
  if (customerPhone) customerPhone.value = state.profile?.phone || "";
}

function updateQuantity(id, change) {
  const item = state.menu.find((d) => d.id === id);
  if (!item) return;
  const stock = getMenuStock(item);
  if ((item.available === false || stock <= 0) && change > 0) { alert(`${item.name} is sold out right now.`); return; }
  const current = state.cart.get(id) || 0;
  const next = Math.max(0, current + change);
  if (change > 0 && next > stock) { alert(`You have reached the available stock for ${item.name}.`); return; }
  if (next === 0) state.cart.delete(id); else state.cart.set(id, next);
  state.checkoutNeedsAccountConfirm = true;
  renderCart();
  renderMenu();
  if (change > 0 && current === 0) showCartToast(item.name);
}

function showCartToast(name) {
  const toast = document.querySelector("#cartToast");
  const text = document.querySelector("#cartToastText");
  if (!toast) return;
  if (text) text.textContent = `${name} added!`;
  toast.classList.remove("hidden");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add("hidden"), 2800);
}

/* ── Account Page ───────────────────────────────────────────── */
function renderAccount() {
  if (!accountContent) return;
  const hasProfile = Boolean(state.profile?.name && state.profile?.phone);
  const isNew = !hasProfile;

  if (accountShellTitle) {
    accountShellTitle.textContent = isNew ? "Welcome" : state.profile.name;
  }

  if (state.activeTab === "dashboard") renderAccountDashboard(isNew);
  else if (state.activeTab === "profile") renderProfileSetup();
  else if (state.activeTab === "addresses") renderAddresses();
  else if (state.activeTab === "orders") renderOrdersTab();
  else if (state.activeTab === "spends") renderSpendsTab();
  else if (state.activeTab === "care") renderCareTab();
}

function renderAccountDashboard(isNew) {
  if (!accountContent) return;
  const profile = getResolvedCustomerProfile() || {};

  const profileCardHTML = isNew
    ? `<div class="login-card">
        <div class="login-card-icon">🍪</div>
        <h3>Welcome to Sujaan Bites</h3>
        <p>Sign in to track your orders, save addresses, and enjoy a faster checkout experience.</p>
        <button class="primary-button" type="button" data-nav-subpage="profile" style="width:100%">Login / Sign Up</button>
      </div>`
    : `<div class="wf-profile-card">
        <div class="wf-profile-info">
          <h3>${profile.name || "Valued Customer"}</h3>
          <p>${profile.phone || ""}</p>
        </div>
        <div class="wf-avatar-circle">${(profile.name || "S")[0].toUpperCase()}</div>
      </div>`;

  accountContent.innerHTML = `
    <div class="account-dashboard">
      ${profileCardHTML}

      ${isNew ? "" : `
      <div class="wf-quick-actions">
        <button class="wf-action-btn" type="button" data-nav-subpage="orders">
          <span class="wf-action-icon">📦</span><span>Your<br>Orders</span>
        </button>
        <button class="wf-action-btn" type="button" data-nav-subpage="care">
          <span class="wf-action-icon">💬</span><span>Help &<br>Support</span>
        </button>
        <button class="wf-action-btn" type="button" data-nav-subpage="profile">
          <span class="wf-action-icon">👤</span><span>Your<br>Profile</span>
        </button>
      </div>

      <div class="wf-section">
        <h4 class="wf-section-title">Your Information</h4>
        <div class="wf-list-group">
          <button class="wf-list-row" type="button" data-nav-subpage="orders">
            <span class="wf-row-label">📦 Previous Orders</span>
            <span class="wf-row-chevron">›</span>
          </button>
          <button class="wf-list-row" type="button" data-nav-subpage="addresses">
            <span class="wf-row-label">📍 Saved Addresses</span>
            <span class="wf-row-chevron">›</span>
          </button>
          <button class="wf-list-row" type="button" data-nav-subpage="spends">
            <span class="wf-row-label">📊 Past Spends</span>
            <span class="wf-row-chevron">›</span>
          </button>
          <button class="wf-list-row" type="button" data-nav-subpage="care">
            <span class="wf-row-label">💬 Help & Support</span>
            <span class="wf-row-chevron">›</span>
          </button>
        </div>
      </div>

      <div class="wf-section">
        <h4 class="wf-section-title">Other</h4>
        <div class="wf-list-group">
          <button class="wf-list-row" type="button" data-account-action="logout">
            <span class="wf-row-label" style="color:var(--danger)">🚪 Log out</span>
          </button>
        </div>
      </div>
      `}
    </div>
  `;
}

function renderProfileSetup() {
  const existing = state.profile || {};
  const savedAddress = state.addresses[0] || null;
  const selectedAddress = getActiveAddress();
  if (accountShellTitle) accountShellTitle.textContent = state.profile ? "Edit Profile" : "Complete your details";

  if (!state.profile || state.addressMode === "profile") {
    accountContent.innerHTML = `
      <form class="auth-form" id="profileSetupForm">
        <label>Name<input id="profileName" type="text" placeholder="Your name" value="${existing.name || ""}" required /></label>
        <label>Phone number<input id="profilePhone" type="tel" inputmode="numeric" placeholder="10-digit mobile" value="${existing.phone || ""}" required /></label>
        <div class="map-picker">
          <div class="map-actions">
            <div><strong>Pin your delivery location</strong><small>Choose the exact pin point on the map.</small></div>
            <button class="secondary-button" id="useLocationButton" type="button">Use current location</button>
          </div>
          <div class="map-canvas" id="locationMap" aria-label="Map for choosing delivery location"></div>
          <p class="form-note" id="locationStatus">Choose your location on the map before saving.</p>
        </div>
        <label>House number<input id="houseNumber" type="text" placeholder="Flat / house / shop number" value="${savedAddress?.houseNumber || ""}" required /></label>
        <label>Street name<input id="streetName" type="text" placeholder="Street / building / area" value="${savedAddress?.streetName || ""}" required /></label>
        <label>Address type
          <select id="addressType" required>
            <option value="Home" ${savedAddress?.type === "Home" ? "selected" : ""}>Home</option>
            <option value="Work" ${savedAddress?.type === "Work" ? "selected" : ""}>Work</option>
            <option value="Other" ${savedAddress?.type === "Other" ? "selected" : ""}>Other</option>
          </select>
        </label>
        <label>Map address<textarea id="savedAddress" rows="2" placeholder="Area from selected pin" required>${savedAddress?.address || ""}</textarea></label>
        <label>Nearby landmark<input id="savedLandmark" type="text" placeholder="Optional landmark" value="${savedAddress?.landmark || ""}" /></label>
        <button class="pay-button" type="submit">Save details</button>
        <p class="form-note">Up to 10 addresses can be saved. All-India delivery is supported.</p>
      </form>
    `;
  } else {
    accountContent.innerHTML = `
      <div class="saved-user">
        <strong>${state.profile.name}</strong>
        <p>${state.profile.phone}</p>
        <div class="account-actions">
          <button class="secondary-button" type="button" data-account-action="edit-profile">Edit profile</button>
          <button class="secondary-button danger" type="button" data-account-action="logout">Logout</button>
        </div>
      </div>
    `;
  }

  if (selectedAddress && state.selectedLocation == null) state.selectedLocation = selectedAddress.location || null;
  if (state.map) { state.map.remove(); state.map = null; state.marker = null; }
  setTimeout(() => initLocationMap(), 0);
}

function renderAddresses() {
  if (accountShellTitle) accountShellTitle.textContent = "Saved Addresses";
  const addressFormOpen = state.addressMode === "new" || state.addressMode === "edit";
  const addressToEdit = addressFormOpen && state.editingAddressId
    ? state.addresses.find((e) => e.id === state.editingAddressId)
    : null;

  accountContent.innerHTML = `
    <div class="saved-address">
      ${state.addresses.length ? state.addresses.map((addr) => `
        <div class="address-item ${addr.id === state.selectedAddressId ? "selected" : ""}">
          <div>
            <strong>${addr.type || "Delivery"} Address${addr.id === state.selectedAddressId ? " ✓" : ""}</strong>
            <p>${formatMultilineAddress(addr).replaceAll("\n", "<br>")}</p>
          </div>
          <div class="account-actions">
            <button class="secondary-button" type="button" data-select-address="${addr.id}">Use</button>
            <button class="secondary-button" type="button" data-edit-address="${addr.id}">Edit</button>
            <button class="secondary-button danger" type="button" data-delete-address="${addr.id}">Delete</button>
          </div>
        </div>
      `).join("") : '<p class="empty">No saved addresses yet.</p>'}
      <button class="secondary-button" type="button" data-account-action="add-address" ${state.addresses.length >= MAX_ADDRESSES ? "disabled" : ""}>Add new address</button>
    </div>
    ${addressFormOpen ? `
      <form class="auth-form" id="addressForm">
        <h3>${addressToEdit ? "Edit address" : "Add address"}</h3>
        <label>House number<input id="houseNumber" type="text" placeholder="Flat / house / shop number" value="${addressToEdit?.houseNumber || ""}" required /></label>
        <label>Street name<input id="streetName" type="text" placeholder="Street / building / area" value="${addressToEdit?.streetName || ""}" required /></label>
        <label>Address type
          <select id="addressType" required>
            <option value="Home" ${addressToEdit?.type === "Home" ? "selected" : ""}>Home</option>
            <option value="Work" ${addressToEdit?.type === "Work" ? "selected" : ""}>Work</option>
            <option value="Other" ${addressToEdit?.type === "Other" ? "selected" : ""}>Other</option>
          </select>
        </label>
        <div class="map-picker">
          <div class="map-actions">
            <div><strong>Pin your delivery location</strong><small>Pick the exact delivery point on the map.</small></div>
            <button class="secondary-button" id="useLocationButton" type="button">Use current location</button>
          </div>
          <div class="map-canvas" id="locationMap" aria-label="Map for choosing delivery location"></div>
          <p class="form-note" id="locationStatus">Choose your location on the map before saving.</p>
        </div>
        <label>Map address<textarea id="savedAddress" rows="2" placeholder="Area from selected pin" required>${addressToEdit?.address || ""}</textarea></label>
        <label>Nearby landmark<input id="savedLandmark" type="text" placeholder="Optional landmark" value="${addressToEdit?.landmark || ""}" /></label>
        <button class="pay-button" type="submit">Save address</button>
      </form>
    ` : ""}
  `;

  if (addressToEdit?.location) state.selectedLocation = addressToEdit.location;
  if (state.map) { state.map.remove(); state.map = null; state.marker = null; }
  setTimeout(() => initLocationMap(), 0);
}

function renderOrdersTab() {
  if (accountShellTitle) accountShellTitle.textContent = "Previous Orders";
  if (!state.previousOrders.length) {
    accountContent.innerHTML = '<p class="empty">No previous orders yet. Place your first order!</p>';
    return;
  }
  accountContent.innerHTML = `<div class="order-history">${state.previousOrders.map((order) => `
    <article class="history-card">
      <strong>${order.id} — ${formatPrice(order.totals?.total || 0)}</strong>
      <span>${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))}</span>
      <span>Status: ${statusLabel(order.status)}</span>
      <span>${(order.items || []).map((i) => `${i.name} × ${i.quantity}`).join(", ")}</span>
    </article>
  `).join("")}</div>`;
}

function renderSpendsTab() {
  if (accountShellTitle) accountShellTitle.textContent = "Past Spends";
  const spends = (state.previousOrders || []).reduce((acc, o) => {
    if (o?.status === "cancelled") return acc;
    acc.total += Number(o?.totals?.total || 0);
    return acc;
  }, { total: 0 });
  const totalOrders = (state.previousOrders || []).filter((o) => o?.status !== "cancelled").length;
  accountContent.innerHTML = `
    <div class="spend-summary">
      <article class="spend-card total"><strong>${formatPrice(spends.total)}</strong><small>Total spend</small></article>
      <article class="spend-card"><strong>${totalOrders}</strong><small>Orders placed</small></article>
    </div>
  `;
}

function renderCareTab() {
  if (accountShellTitle) accountShellTitle.textContent = "Customer Care";
  accountContent.innerHTML = `
    <div class="saved-user">
      <strong>Need help?</strong>
      <p>Call or WhatsApp us at ${BUSINESS.whatsappNumber}. Share your order ID for faster help.</p>
      <a class="secondary-button" href="https://wa.me/${BUSINESS.whatsappNumber}" target="_blank" rel="noreferrer" style="display:inline-flex;align-items:center;justify-content:center;text-decoration:none;margin-top:4px">Contact Customer Care</a>
    </div>
  `;
}

/* ── Map ────────────────────────────────────────────────────── */
function initLocationMap() {
  const locationMap = document.querySelector("#locationMap");
  const locationStatus = document.querySelector("#locationStatus");
  const useLocationButton = document.querySelector("#useLocationButton");
  const savedAddress = document.querySelector("#savedAddress");
  if (!locationMap || !window.L) return;

  const existing = state.selectedLocation || getActiveAddress()?.location || { lat: 20.5937, lng: 78.9629 };
  if (!state.map) {
    state.map = L.map(locationMap).setView([existing.lat, existing.lng], state.selectedLocation ? 16 : 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(state.map);
    state.map.on("click", (e) => setMapPinLocal(e.latlng.lat, e.latlng.lng, true));
  } else { state.map.invalidateSize(); state.map.setView([existing.lat, existing.lng], state.selectedLocation ? 16 : 12); }

  if (state.marker) { state.marker.remove(); state.marker = null; }
  if (state.selectedLocation) {
    state.marker = L.marker([state.selectedLocation.lat, state.selectedLocation.lng], { draggable: true }).addTo(state.map);
    state.marker.on("dragend", () => { const pos = state.marker.getLatLng(); setMapPinLocal(pos.lat, pos.lng, true); });
  }

  function setLocationMessage(msg) { if (locationStatus) locationStatus.textContent = msg; }

  function requestLocation() {
    if (!navigator.geolocation) { setLocationMessage("Location not supported. Tap the map to place the pin."); return; }
    useLocationButton.disabled = true;
    setLocationMessage("Requesting location permission...");
    navigator.geolocation.getCurrentPosition(
      (pos) => { useLocationButton.disabled = false; setMapPinLocal(pos.coords.latitude, pos.coords.longitude, true); },
      (err) => {
        useLocationButton.disabled = false;
        if (state.selectedLocation) { setLocationMessage(`Pin already saved at ${state.selectedLocation.lat.toFixed(5)}, ${state.selectedLocation.lng.toFixed(5)}.`); return; }
        setLocationMessage(err?.code === 1 ? "Location blocked. Tap the map to place your delivery pin." : "Could not fetch location. Please tap the map.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  useLocationButton?.removeEventListener("click", requestLocation);
  useLocationButton?.addEventListener("click", requestLocation);
  if (state.selectedLocation && savedAddress) setLocationMessage(`Pin saved at ${state.selectedLocation.lat.toFixed(5)}, ${state.selectedLocation.lng.toFixed(5)}.`);

  function setMapPinLocal(lat, lng, geocode) {
    state.selectedLocation = { lat, lng };
    if (!state.marker) {
      state.marker = L.marker([lat, lng], { draggable: true }).addTo(state.map);
      state.marker.on("dragend", () => { const pos = state.marker.getLatLng(); setMapPinLocal(pos.lat, pos.lng, true); });
    } else { state.marker.setLatLng([lat, lng]); }
    state.map.setView([lat, lng], Math.max(state.map.getZoom(), 16));
    setLocationMessage(`Pin saved at ${lat.toFixed(5)}, ${lng.toFixed(5)}. Fetching address...`);
    if (geocode) reverseGeocode(lat, lng, setLocationMessage, savedAddress);
    else setLocationMessage(`Pin saved at ${lat.toFixed(5)}, ${lng.toFixed(5)}.`);
  }

  window.__setMapPin = setMapPinLocal;
}

async function reverseGeocode(lat, lng, setMsg, savedAddress) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`);
    if (!res.ok) throw new Error("lookup failed");
    const result = await res.json();
    if (result.display_name && savedAddress) { savedAddress.value = result.display_name; setMsg("Address found from map pin."); return; }
    setMsg("Pin saved. Please type any missing address details.");
  } catch { setMsg("Pin saved, but address lookup failed. Please type the address manually."); }
}

/* ── Profile save ───────────────────────────────────────────── */
async function saveProfileAndFirstAddress(form) {
  const name = form.querySelector("#profileName").value.trim();
  const phone = normalizePhone(form.querySelector("#profilePhone").value);
  const houseNumber = form.querySelector("#houseNumber").value.trim();
  const streetName = form.querySelector("#streetName").value.trim();
  const addressType = form.querySelector("#addressType").value;
  const address = form.querySelector("#savedAddress").value.trim();
  const landmark = form.querySelector("#savedLandmark").value.trim();

  if (!state.selectedLocation) { alert("Please choose your exact location on the map before saving."); return; }
  if (phone.length !== 10) { alert("Please enter a valid 10-digit phone number."); return; }

  const profile = { name, phone };
  const addressRecord = { id: Date.now().toString(), name, phone, houseNumber, streetName, type: addressType, address, landmark, location: state.selectedLocation };
  state.profile = profile;
  state.addresses = [addressRecord];
  state.selectedAddressId = addressRecord.id;
  state.activeTab = "dashboard";
  state.addressMode = null;

  writeStoredJson(STORAGE_KEYS.profile, profile);
  writeStoredJson(STORAGE_KEYS.addresses, state.addresses);
  localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
  await syncCustomerState();
  renderAccount();
  renderCart();
}

async function saveAddress(form) {
  const houseNumber = form.querySelector("#houseNumber").value.trim();
  const streetName = form.querySelector("#streetName").value.trim();
  const addressType = form.querySelector("#addressType").value;
  const address = form.querySelector("#savedAddress").value.trim();
  const landmark = form.querySelector("#savedLandmark").value.trim();
  if (!state.selectedLocation) { alert("Please choose your exact location on the map before saving."); return; }
  if (state.addresses.length >= MAX_ADDRESSES && !state.editingAddressId) { alert("You can save up to 10 addresses only."); return; }

  const profile = state.profile || {};
  const record = { id: state.editingAddressId || Date.now().toString(), name: profile.name || "", phone: profile.phone || "", houseNumber, streetName, type: addressType, address, landmark, location: state.selectedLocation };
  const nextAddresses = [...state.addresses];
  const idx = nextAddresses.findIndex((e) => e.id === record.id);
  if (idx >= 0) nextAddresses[idx] = record; else nextAddresses.push(record);
  state.addresses = nextAddresses.slice(0, MAX_ADDRESSES);
  state.selectedAddressId = record.id;
  state.addressMode = null;
  state.editingAddressId = null;

  writeStoredJson(STORAGE_KEYS.addresses, state.addresses);
  localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
  await syncCustomerState();
  renderAccount();
}

async function deleteAddress(id) {
  state.addresses = state.addresses.filter((e) => e.id !== id);
  if (state.selectedAddressId === id) state.selectedAddressId = state.addresses[0]?.id || null;
  writeStoredJson(STORAGE_KEYS.addresses, state.addresses);
  if (state.selectedAddressId) localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
  else localStorage.removeItem(STORAGE_KEYS.selectedAddressId);
  await syncCustomerState();
  renderAccount();
}

async function logoutCustomer() {
  clearSession();
  state.activeTab = "dashboard";
  state.addressMode = null;
  state.previousOrders = [];
  renderAccount();
  renderCart();
}

/* ── State sync ─────────────────────────────────────────────── */
function loadLocalState() {
  state.profile = readStoredJson(STORAGE_KEYS.profile) || null;
  state.addresses = readStoredJson(STORAGE_KEYS.addresses) || [];
  state.selectedAddressId = localStorage.getItem(STORAGE_KEYS.selectedAddressId) || null;
  if (!state.selectedAddressId && state.addresses.length > 0) state.selectedAddressId = state.addresses[0].id;
  if (state.addresses.length > 0) localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
}

async function loadCustomerState() {
  const phone = state.profile?.phone || getActiveAddress()?.phone;
  if (!phone) return;
  try {
    const result = await apiRequest(`/api/customer/state?phone=${encodeURIComponent(phone)}`);
    if (result.profile || Array.isArray(result.addresses)) {
      state.profile = result.profile || state.profile;
      state.addresses = Array.isArray(result.addresses) ? result.addresses.slice(0, MAX_ADDRESSES) : state.addresses;
      state.selectedAddressId = result.selectedAddressId || state.addresses[0]?.id || state.selectedAddressId;
      writeStoredJson(STORAGE_KEYS.profile, state.profile);
      writeStoredJson(STORAGE_KEYS.addresses, state.addresses);
      if (state.selectedAddressId) localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
    }
  } catch (err) { console.warn("Customer state sync skipped:", err.message); }
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
      writeStoredJson(STORAGE_KEYS.profile, state.profile);
      writeStoredJson(STORAGE_KEYS.addresses, state.addresses);
    }
  } catch (err) { console.warn("Customer state save skipped:", err.message); }
}

/* ── Menu loading ───────────────────────────────────────────── */
async function loadMenu() {
  if (state.loadingMenu) return;
  state.loadingMenu = true;
  if (menuGrid) menuGrid.innerHTML = '<div class="menu-loading">Loading fresh bakes...</div>';
  try {
    const result = await apiRequest("/api/menu");
    state.menu = (result.menu && result.menu.length > 0) ? result.menu : DEFAULT_MENU;
    state.menuCategories = Array.isArray(result.categories) ? result.categories : [];
    const available = new Set(state.menu.map((i) => normalizeCategory(i.category)).filter(Boolean));
    if (state.activeCategory !== "all" && !available.has(normalizeCategory(state.activeCategory))) state.activeCategory = "all";
  } catch {
    console.info("API menu unavailable, using default menu.");
    state.menu = [...DEFAULT_MENU];
    state.menuCategories = [];
  } finally {
    state.loadingMenu = false;
  }
  renderFilters();
  syncCartToStock();
  renderMenu();
  renderFeatured();
  renderCart();
}

/* ── Orders & Tracking ──────────────────────────────────────── */
function getLatestOrder(orders) { return [...(orders || [])].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).find(Boolean); }

async function loadOrdersForAccount() {
  if (!state.profile?.phone) { state.previousOrders = []; renderTrackingPanel(null); return; }
  try {
    const result = await apiRequest("/api/orders/my");
    state.previousOrders = result.orders || [];
    maybeShowCustomerMessage(state.previousOrders);
    const latest = getLatestOrder(state.previousOrders);
    maybeShowCancelledOrder(latest);
    maybeShowAcceptedOrder(latest);
    maybeShowCompletedOrder(latest);
    renderTrackingPanel(latest);
  } catch { state.previousOrders = []; renderTrackingPanel(null); }
}

function maybeShowAcceptedOrder(order) {
  if (!order || order.status !== "accepted") return;
  const shownId = localStorage.getItem(STORAGE_KEYS.lastAcceptedOrderShown) || "";
  if (shownId === order.id) return;
  localStorage.setItem(STORAGE_KEYS.lastAcceptedOrderShown, order.id);
  openOrderReceivedCard(order);
}

function maybeShowCancelledOrder(order) {
  if (!order || order.status !== "cancelled") return;
  const marker = `${order.id}:${order.updatedAt || order.createdAt}`;
  const shown = localStorage.getItem(STORAGE_KEYS.lastCancelledOrderShown) || "";
  if (shown === marker) return;
  localStorage.setItem(STORAGE_KEYS.lastCancelledOrderShown, marker);
  openOrderReceivedCard(order);
}

function maybeShowCompletedOrder(order) {
  if (!order || order.status !== "completed") return;
  const marker = `${order.id}:${order.completedAt || order.updatedAt || order.createdAt}`;
  const shown = localStorage.getItem(STORAGE_KEYS.lastCompletedOrderShown) || "";
  if (shown === marker) return;
  localStorage.setItem(STORAGE_KEYS.lastCompletedOrderShown, marker);
  openOrderReceivedCard(order);
}

function maybeShowCustomerMessage(orders) {
  const latest = [...(orders || [])].sort((a, b) => new Date(b.customerMessageAt || b.updatedAt || b.createdAt) - new Date(a.customerMessageAt || a.updatedAt || a.createdAt))
    .find((o) => typeof o.customerMessage === "string" && o.customerMessage.trim());
  if (!latest) return;
  const marker = `${latest.id}:${latest.customerMessageAt || latest.customerMessage}`;
  if (localStorage.getItem(STORAGE_KEYS.lastCustomerMessageShown) === marker) return;
  localStorage.setItem(STORAGE_KEYS.lastCustomerMessageShown, marker);
  if (customerMessageText) customerMessageText.textContent = latest.customerMessage;
  customerMessageDialog?.showModal();
}

function openOrderReceivedCard(order) {
  if (!orderReceivedOverlay || !orderReceivedAddress) return;
  const cancelled = order?.status === "cancelled";
  const completed = order?.status === "completed";
  if (orderReceivedTitle) orderReceivedTitle.textContent = cancelled ? "Order Update" : completed ? "Delivery Completed" : "Yay! Restaurant Accepted";
  if (orderReceivedSymbol) orderReceivedSymbol.textContent = cancelled ? "✕" : "✓";
  orderReceivedIcon?.classList.toggle("cancelled", cancelled);
  orderReceivedAddress.textContent = formatAddressLine(order.address);
  if (orderReceivedEta) orderReceivedEta.textContent = cancelled ? "The order cannot be delivered." : completed ? "Delivery completed. Please rate." : `${order.etaMinutes || "?"} minutes estimated.`;
  orderReceivedOverlay.classList.remove("hidden");
}

function renderTrackingPanel(order) {
  if (!trackingDock) return;
  const isTerminal = order?.status === "completed" || order?.status === "cancelled";
  if (!order || isTerminal) { trackingDock.classList.add("hidden"); trackingOpen = false; trackingSheet?.classList.add("hidden"); trackingToggle?.setAttribute("aria-expanded", "false"); if (isTerminal) trackingCurrentOrder = null; return; }
  trackingDock.classList.remove("hidden");
  const title = [" pending_admin_acceptance", "received"].includes(order.status) ? "Order placed" : "Order confirmed";
  if (trackingBarTitle) trackingBarTitle.textContent = title;
  if (trackingStatusPill) { trackingStatusPill.textContent = statusLabel(order.status); trackingStatusPill.className = `tracking-toggle-right ${order.status || ""}`; }
  if (trackingBarEta) trackingBarEta.textContent = order.etaMinutes ? `${order.etaMinutes} min to your location` : "Waiting for update...";
  if (trackingReceiptId) trackingReceiptId.textContent = `Order ID: ${order.id}`;
  if (trackingItemsList) trackingItemsList.innerHTML = (order.items || []).map((i) => `<li>${i.name} × ${i.quantity}</li>`).join("");
  if (trackingTotal) trackingTotal.textContent = `Total: ${formatPrice(order?.totals?.total || 0)}`;
  if (trackingAddress) trackingAddress.textContent = formatAddressLine(order.address);
  trackingSheet?.classList.toggle("hidden", !trackingOpen);
  trackingToggle?.setAttribute("aria-expanded", trackingOpen ? "true" : "false");
  if (trackingOpen) renderTrackingMap(order);
}

function renderTrackingMap(order) {
  if (!trackingMapEl || !window.L) return;
  trackingCurrentOrder = order || null;
  const pin = order?.address?.location;
  if (!pin || !Number.isFinite(pin.lat)) { trackingMapEl.innerHTML = "<p class='empty'>Map unavailable.</p>"; return; }
  if (!trackingMap) {
    trackingMap = L.map(trackingMapEl).setView([pin.lat, pin.lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 19 }).addTo(trackingMap);
    trackingLayerGroup = L.layerGroup().addTo(trackingMap);
  } else { trackingMap.invalidateSize(); trackingLayerGroup.clearLayers(); }
  trackingLayerGroup.addLayer(L.marker([pin.lat, pin.lng]).bindPopup("Customer address"));
  const rPin = order?.restaurantLocation;
  if (rPin && Number.isFinite(rPin.lat)) {
    trackingLayerGroup.addLayer(L.marker([rPin.lat, rPin.lng]).bindPopup("Restaurant"));
    const line = L.polyline([[rPin.lat, rPin.lng], [pin.lat, pin.lng]], { color: "#C87E34", weight: 4, opacity: 0.9 });
    trackingLayerGroup.addLayer(line);
    trackingMap.fitBounds(line.getBounds(), { padding: [28, 28], maxZoom: 15 });
  } else trackingMap.setView([pin.lat, pin.lng], 14);
}

/* ── Checkout ───────────────────────────────────────────────── */
async function createPrepaidIntent() {
  const activeAddress = getActiveAddress();
  if (!state.profile || !activeAddress) { navigateTo("account"); state.activeTab = "profile"; renderAccount(); throw new Error("Please save your details before ordering."); }
  return apiRequest("/api/payments/razorpay/create-intent", {
    method: "POST",
    body: JSON.stringify({ customerName: state.profile.name, customerPhone: state.profile.phone, orderType: "delivery", address: activeAddress, items: getCartRows().map((i) => ({ id: i.id, quantity: i.quantity })) }),
  });
}

function openRazorpayCheckout(intent, paymentSessionId) {
  if (!window.Razorpay) throw new Error("Razorpay Checkout could not load. Please check your connection.");
  const totals = getTotals();
  const instance = new Razorpay({
    key: intent.razorpay.keyId, amount: intent.razorpay.amount, currency: intent.razorpay.currency,
    name: intent.razorpay.name, description: "Order payment", order_id: intent.razorpay.orderId,
    prefill: { name: state.profile?.name || "", contact: state.profile?.phone || "" },
    method: { upi: true },
    handler: async (response) => {
      try {
        const result = await apiRequest("/api/payments/razorpay/verify", { method: "POST", body: JSON.stringify({ paymentSessionId, razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature }) });
        if (paymentSummary) paymentSummary.textContent = `${result.order.id} payment verified. Waiting for restaurant confirmation.`;
        if (adminNotice) adminNotice.textContent = "Payment verified by the server.";
        razorpayRetryButton?.classList.add("hidden");
        state.cart.clear();
        await loadOrdersForAccount();
        renderCart();
        closeCart();
      } catch (err) { if (paymentSummary) paymentSummary.textContent = `Payment received, but verification failed. ${err.message}`; razorpayRetryButton?.classList.remove("hidden"); }
    },
    modal: { ondismiss: () => { if (paymentSummary) paymentSummary.textContent = "Payment failed or was closed. Please try again."; if (adminNotice) adminNotice.textContent = "No order was created."; razorpayRetryButton?.classList.remove("hidden"); } },
  });
  if (razorpayRetryButton) razorpayRetryButton.onclick = () => instance.open();
  instance.open();
}

async function handleCheckout(event) {
  event.preventDefault();
  if (!state.profile || !getActiveAddress()) { navigateTo("account"); state.activeTab = "profile"; renderAccount(); alert("Please save your details before ordering."); return; }
  const totals = getTotals();
  if (!totals.rows.length) { alert("Please add at least one item to your cart."); return; }
  if (state.checkoutNeedsAccountConfirm) { navigateTo("account"); state.activeTab = "dashboard"; renderAccount(); state.checkoutNeedsAccountConfirm = false; alert("Please confirm your account details, then click Place order again."); return; }
  try {
    const intent = await createPrepaidIntent();
    if (paymentSummary) paymentSummary.textContent = `Pay ${formatPrice(totals.total)} using Razorpay UPI.`;
    if (adminNotice) adminNotice.textContent = "Complete the payment. If not completed, no order will be saved.";
    paymentDialog?.showModal();
    openRazorpayCheckout(intent, intent.paymentSessionId);
  } catch (err) { alert(err.message); }
}

/* ── Rating ─────────────────────────────────────────────────── */
function paintStarRating(container, rating) {
  const safe = Math.max(0, Math.min(5, Number(rating) || 0));
  container.querySelectorAll(".star-button").forEach((btn) => {
    const v = Number(btn.dataset.starValue || 0);
    btn.classList.toggle("active", v <= safe);
    btn.setAttribute("aria-checked", v <= safe ? "true" : "false");
  });
}

function setRatingFromStarButton(btn) {
  const container = btn.closest(".star-rating");
  if (!container) return;
  const value = Math.max(1, Math.min(5, Number(btn.dataset.starValue || 0)));
  const target = container.dataset.ratingTarget || "";
  if (target === "deliveryRatingInput" && deliveryRatingInput) deliveryRatingInput.value = String(value);
  else if (target.startsWith("product-")) { const id = target.replace("product-", ""); const inp = productRatingItems?.querySelector(`[data-product-rating-input="${id}"]`); if (inp) inp.value = String(value); }
  paintStarRating(container, value);
}

function renderDeliveryRatingItems(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (productRatingSummary) productRatingSummary.textContent = items.length ? `Ordered: ${items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}` : "Ordered items will appear here.";
  if (!productRatingItems) return;
  productRatingItems.innerHTML = items.map((item) => `
    <label class="rating-item">
      <span>How was ${item.name} × ${item.quantity}?</span>
      <input type="hidden" data-product-rating-input="${item.id}" value="0" />
      <div class="star-rating" data-product-rating="${item.id}" data-rating-target="product-${item.id}" role="radiogroup" aria-label="Rating for ${item.name}">
        <button type="button" class="star-button" data-star-value="1">★</button>
        <button type="button" class="star-button" data-star-value="2">★</button>
        <button type="button" class="star-button" data-star-value="3">★</button>
        <button type="button" class="star-button" data-star-value="4">★</button>
        <button type="button" class="star-button" data-star-value="5">★</button>
      </div>
    </label>
  `).join("");
}

function promptDeliveryRating(order) {
  if (!order || order.status !== "completed" || order.review?.deliveryRating) return;
  const marker = `${order.id}:${order.completedAt || order.updatedAt || order.createdAt}`;
  if (localStorage.getItem(STORAGE_KEYS.lastDeliveryRatingShown) === marker) return;
  localStorage.setItem(STORAGE_KEYS.lastDeliveryRatingShown, marker);
  deliveryRatingDialog?.showModal();
  if (deliveryRatingInput) deliveryRatingInput.value = "0";
  if (deliveryRatingStars) paintStarRating(deliveryRatingStars, 0);
  if (deliveryRatingComment) deliveryRatingComment.value = "";
}

function promptProductRating(order) {
  if (!order || order.status !== "completed") return;
  if (Array.isArray(order.review?.productRatings) && order.review.productRatings.length) return;
  const completedAt = new Date(order.completedAt || order.updatedAt || order.createdAt).getTime();
  if (!Number.isFinite(completedAt) || Date.now() < completedAt + 5 * 60 * 1000) return;
  const marker = `${order.id}:${order.completedAt || order.updatedAt || order.createdAt}`;
  if (localStorage.getItem(STORAGE_KEYS.lastProductRatingShown) === marker) return;
  localStorage.setItem(STORAGE_KEYS.lastProductRatingShown, marker);
  renderDeliveryRatingItems(order);
  productRatingItems?.querySelectorAll(".star-rating").forEach((n) => paintStarRating(n, 0));
  productRatingDialog?.showModal();
  if (productRatingComment) productRatingComment.value = "";
}

/* ── Search ─────────────────────────────────────────────────── */
function renderSearch(query) {
  if (!searchResults) return;
  const q = (query || "").toLowerCase().trim();
  if (!q) { searchResults.innerHTML = '<p class="empty">Start typing to search…</p>'; return; }
  const results = state.menu.filter((item) => item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q) || item.category.toLowerCase().includes(q));
  if (!results.length) { searchResults.innerHTML = '<p class="empty">No cookies found. Try a different search.</p>'; return; }
  searchResults.innerHTML = results.map((item) => `
    <div class="search-card" data-add="${item.id}">
      <h3>${item.name}</h3>
      <p>${item.description} — <strong style="color:var(--accent)">${formatPrice(item.price)}</strong></p>
    </div>
  `).join("");
}

/* ── Event Listeners ────────────────────────────────────────── */
// Bottom nav
bottomNavBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.bottomTab;
    if (tab === "cart") { openCart(); return; }
    navigateTo(tab);
    if (tab === "account") { state.activeTab = "dashboard"; renderAccount(); }
  });
});

// Global [data-nav-*] buttons
document.body.addEventListener("click", async (e) => {
  if (e.target.closest("[data-nav-home]")) { navigateTo("home"); return; }
  if (e.target.closest("[data-nav-menu]")) { navigateTo("menu"); return; }
  if (e.target.closest("[data-nav-account]")) { navigateTo("account"); state.activeTab = "dashboard"; renderAccount(); return; }
  if (e.target.closest("[data-nav-search]")) { navigateTo("search"); setTimeout(() => searchInput?.focus(), 100); return; }
  if (e.target.closest("[data-open-cart]")) { openCart(); return; }

  // Account sub-page nav
  const subpage = e.target.closest("[data-nav-subpage]")?.dataset.navSubpage;
  if (subpage) {
    state.activeTab = subpage;
    if (subpage === "orders" || subpage === "spends") await loadOrdersForAccount();
    renderAccount();
    return;
  }

  // Account actions
  const action = e.target.closest("[data-account-action]")?.dataset.accountAction;
  if (action === "logout") { await logoutCustomer(); return; }
  if (action === "add-address") { state.addressMode = "new"; state.editingAddressId = null; state.activeTab = "addresses"; renderAccount(); return; }
  if (action === "edit-profile") { state.addressMode = "profile"; state.activeTab = "profile"; renderAccount(); return; }

  const selectAddr = e.target.closest("[data-select-address]");
  if (selectAddr) { state.selectedAddressId = selectAddr.dataset.selectAddress; localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId); await syncCustomerState(); renderAccount(); renderCart(); return; }

  const editAddr = e.target.closest("[data-edit-address]");
  if (editAddr) { state.addressMode = "edit"; state.editingAddressId = editAddr.dataset.editAddress; state.activeTab = "addresses"; renderAccount(); return; }

  const delAddr = e.target.closest("[data-delete-address]");
  if (delAddr) { if (confirm("Delete this address?")) await deleteAddress(delAddr.dataset.deleteAddress); return; }

  // Featured card
  const featCard = e.target.closest("[data-add-feat]");
  if (featCard) { updateQuantity(featCard.dataset.addFeat, 1); navigateTo("menu"); return; }

  // Search result card
  const searchCard = e.target.closest(".search-card[data-add]");
  if (searchCard) { updateQuantity(searchCard.dataset.add, 1); return; }

  // Manage addresses from cart
  if (e.target.closest("#manageAddressesButton")) { closeCart(); navigateTo("account"); state.activeTab = "addresses"; renderAccount(); return; }

  // Star ratings
  const starBtn = e.target.closest(".star-button");
  if (starBtn) { setRatingFromStarButton(starBtn); return; }
});

// Menu grid click
menuGrid?.addEventListener("click", (e) => {
  const add = e.target.closest("[data-add]");
  const inc = e.target.closest("[data-menu-increase]");
  const dec = e.target.closest("[data-menu-decrease]");
  if (add) updateQuantity(add.dataset.add, 1);
  if (inc) updateQuantity(inc.dataset.menuIncrease, 1);
  if (dec) updateQuantity(dec.dataset.menuDecrease, -1);
  state.checkoutNeedsAccountConfirm = true;
});

// Cart items click
cartItems?.addEventListener("click", (e) => {
  const inc = e.target.closest("[data-increase]");
  const dec = e.target.closest("[data-decrease]");
  if (inc) updateQuantity(inc.dataset.increase, 1);
  if (dec) updateQuantity(dec.dataset.decrease, -1);
  state.checkoutNeedsAccountConfirm = true;
});

// Menu filters
menuFilters?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-category]");
  if (!btn) return;
  state.activeCategory = normalizeCategory(btn.dataset.category) || "all";
  renderFilters();
  renderMenu();
});

// Forms
document.body.addEventListener("submit", async (e) => {
  const form = e.target.closest("form");
  if (!form) return;
  if (form.id === "profileSetupForm") { e.preventDefault(); await saveProfileAndFirstAddress(form); }
  if (form.id === "addressForm") { e.preventDefault(); await saveAddress(form); }
  if (form.id === "checkout") { await handleCheckout(e); }
  if (form.id === "deliveryRatingForm") {
    e.preventDefault();
    const order = getLatestOrder(state.previousOrders);
    if (!order) return;
    const selected = Number(deliveryRatingInput?.value || 0);
    if (!Number.isFinite(selected) || selected < 1 || selected > 5) { alert("Please choose a star rating."); return; }
    try {
      await apiRequest(`/api/orders/${order.id}/reviews`, { method: "POST", body: JSON.stringify({ type: "delivery", deliveryRating: selected, deliveryComment: deliveryRatingComment?.value || "" }) });
      localStorage.removeItem(STORAGE_KEYS.lastDeliveryRatingShown);
      deliveryRatingDialog?.close();
      await loadOrdersForAccount();
    } catch (err) { alert(err.message); }
  }
  if (form.id === "productRatingForm") {
    e.preventDefault();
    const order = getLatestOrder(state.previousOrders);
    if (!order) return;
    const productRatings = Array.from(productRatingItems?.querySelectorAll("[data-product-rating-input]") || []).map((inp) => ({ id: inp.dataset.productRatingInput, rating: Number(inp.value || 0) }));
    const invalid = productRatings.find((r) => !Number.isFinite(r.rating) || r.rating < 1 || r.rating > 5);
    if (invalid) { alert("Please rate every item."); return; }
    try {
      await apiRequest(`/api/orders/${order.id}/reviews`, { method: "POST", body: JSON.stringify({ type: "products", productRatings, productComment: productRatingComment?.value || "" }) });
      localStorage.removeItem(STORAGE_KEYS.lastProductRatingShown);
      productRatingDialog?.close();
      await loadOrdersForAccount();
    } catch (err) { alert(err.message); }
  }
});

// Cart panel close
cartPanelClose?.addEventListener("click", closeCart);
cartPanelOverlay?.addEventListener("click", closeCart);

// Checkout address select
checkoutAddressSelect?.addEventListener("change", (e) => {
  state.selectedAddressId = e.target.value;
  localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
  renderCart();
});

// Theme toggle
themeToggleBtn?.addEventListener("click", toggleTheme);

// Search
searchInput?.addEventListener("input", (e) => renderSearch(e.target.value));

// Tracking
trackingToggle?.addEventListener("click", () => {
  trackingOpen = !trackingOpen;
  trackingSheet?.classList.toggle("hidden", !trackingOpen);
  trackingToggle.setAttribute("aria-expanded", trackingOpen ? "true" : "false");
  if (trackingOpen) setTimeout(() => { trackingMap?.invalidateSize(); if (trackingCurrentOrder) renderTrackingMap(trackingCurrentOrder); }, 160);
});

// Close order received
closeOrderReceivedOverlay?.addEventListener("click", () => orderReceivedOverlay?.classList.add("hidden"));
orderReceivedOverlay?.addEventListener("click", (e) => { if (e.target === orderReceivedOverlay) orderReceivedOverlay?.classList.add("hidden"); });

// Close customer message
closeCustomerMessageDialog?.addEventListener("click", () => customerMessageDialog?.close());

/* ── Boot ───────────────────────────────────────────────────── */
async function boot() {
  initTheme();
  loadLocalState();
  await loadCustomerState();
  state.activeTab = "dashboard";
  renderAccount();
  renderCart();
  await loadMenu();
  if (state.profile?.phone) await loadOrdersForAccount();
  navigateTo("home");
  requestAnimationFrame(() => positionBottomNavIndicator("home", false));
  setInterval(loadMenu, 300000);
  setInterval(async () => {
    if (!state.profile?.phone) return;
    await loadOrdersForAccount();
    if (state.currentPage === "account") renderAccount();
  }, 45000);
}

boot();
