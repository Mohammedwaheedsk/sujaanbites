const BUSINESS = {
  name: "Sujaan Bites",
  upiId: "6301000409@kotakbank",
  upiPayeeName: "Sujaan Bites",
  whatsappNumber: "916301000409",
  deliveryFee: 30,
};

const MAX_ADDRESSES = 10;

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const STORAGE_KEYS = {
  profile: "spiceTableProfile",
  addresses: "spiceTableAddresses",
  selectedAddressId: "spiceTableSelectedAddressId",
};

const state = {
  menu: [],
  activeCategory: "all",
  cart: new Map(),
  profile: null,
  addresses: [],
  selectedAddressId: null,
  activeTab: "profile",
  drawerOpen: false,
  editingAddressId: null,
  addressMode: "profile",
  selectedLocation: null,
  previousOrders: [],
  map: null,
  marker: null,
  loadingMenu: false,
};

const MENU_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "classic", label: "Classic" },
  { id: "chocolate", label: "Chocolate" },
  { id: "stuffed", label: "Stuffed" },
  { id: "packs", label: "Packs" },
];

const DEFAULT_MENU = [
  {
    id: "butter",
    name: "Butter Cookies",
    description: "Crisp, golden butter cookies with a light vanilla finish.",
    price: 120,
    category: "classic",
    image: "assets/cookie-butter.png",
    available: true,
  },
  {
    id: "choco-chip",
    name: "Chocolate Chip Cookies",
    description: "Soft-centred cookies loaded with rich chocolate chips.",
    price: 150,
    category: "chocolate",
    image: "assets/cookie-chocolate.png",
    available: true,
  },
  {
    id: "oatmeal",
    name: "Oatmeal Raisin Cookies",
    description: "Chewy oats with raisins and a warm cinnamon note.",
    price: 130,
    category: "classic",
    image: "assets/cookie-butter.png",
    available: true,
  },
  {
    id: "filled-biscuit",
    name: "Stuffed Jam Cookies",
    description: "Tender cookies with a sweet strawberry jam centre.",
    price: 160,
    category: "stuffed",
    image: "assets/cookie-jam.png",
    available: true,
  },
  {
    id: "brownie-bite",
    name: "Chocolate Fudge Cookies",
    description: "Dense cocoa cookies with a fudgy brownie-like bite.",
    price: 170,
    category: "chocolate",
    image: "assets/cookie-chocolate.png",
    available: true,
  },
  {
    id: "gift-pack",
    name: "Assorted Cookie Box",
    description: "A mixed box of 12 cookies, perfect for gifting.",
    price: 420,
    category: "packs",
    image: "assets/hero-food.png",
    available: true,
  },
];

const menuGrid = document.querySelector("#menuGrid");
const orderShell = document.querySelector("#orderShell");
const accountButton = document.querySelector("#accountButton");
const accountOverlay = document.querySelector("#accountOverlay");
const accountShell = document.querySelector("#accountShell");
const accountLogoutButton = document.querySelector("#accountLogoutButton");
const closeSidebarBtn = document.querySelector("#closeSidebarBtn");
const accountShellTitle = document.querySelector("#accountShellTitle");
const accountContent = document.querySelector("#accountContent");
const accountTabs = document.querySelectorAll(".account-tab");
const cartItems = document.querySelector("#cartItems");
const itemCount = document.querySelector("#itemCount");
const subtotalEl = document.querySelector("#subtotal");
const deliveryFeeEl = document.querySelector("#deliveryFee");
const grandTotalEl = document.querySelector("#grandTotal");
const checkout = document.querySelector("#checkout");
const customerName = document.querySelector("#customerName");
const customerPhone = document.querySelector("#customerPhone");
const orderType = document.querySelector("#orderType");
const paymentMethod = document.querySelector("#paymentMethod");
const selectedAddressText = document.querySelector("#selectedAddressText");
const paymentDialog = document.querySelector("#paymentDialog");
const paymentSummary = document.querySelector("#paymentSummary");
const razorpayRetryButton = document.querySelector("#razorpayRetryButton");
const adminNotice = document.querySelector("#adminNotice");

function formatPrice(value) {
  return currency.format(value || 0);
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function withinServiceArea(location) {
  return Boolean(location && Number.isFinite(location.lat) && Number.isFinite(location.lng));
}

function readStoredJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeStoredJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

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

function loadLocalState() {
  state.profile = readStoredJson(STORAGE_KEYS.profile) || null;
  state.addresses = readStoredJson(STORAGE_KEYS.addresses) || [];
  state.selectedAddressId = localStorage.getItem(STORAGE_KEYS.selectedAddressId) || null;

  if (!state.selectedAddressId && state.addresses.length > 0) {
    state.selectedAddressId = state.addresses[0].id;
  }

  if (state.addresses.length > 0) {
    localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
  }
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
      if (state.selectedAddressId) {
        localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
      }
    }
  } catch (error) {
    console.warn("Customer state sync skipped:", error.message);
  }
}

async function syncCustomerState() {
  if (!state.profile?.phone) return;

  try {
    const result = await apiRequest("/api/customer/state", {
      method: "PUT",
      body: JSON.stringify({
        phone: state.profile.phone,
        profile: state.profile,
        addresses: state.addresses,
        selectedAddressId: state.selectedAddressId,
      }),
    });

    if (result.profile || Array.isArray(result.addresses)) {
      state.profile = result.profile || state.profile;
      state.addresses = Array.isArray(result.addresses) ? result.addresses.slice(0, MAX_ADDRESSES) : state.addresses;
      state.selectedAddressId = result.selectedAddressId || state.addresses[0]?.id || state.selectedAddressId;
      writeStoredJson(STORAGE_KEYS.profile, state.profile);
      writeStoredJson(STORAGE_KEYS.addresses, state.addresses);
      if (state.selectedAddressId) {
        localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
      }
    }
  } catch (error) {
    console.warn("Customer state save skipped:", error.message);
  }
}

function getActiveAddress() {
  if (!state.addresses.length) return null;
  return state.addresses.find((entry) => entry.id === state.selectedAddressId) || state.addresses[0];
}

function formatAddressLine(address) {
  if (!address) return "No address saved yet.";
  return [
    `${address.houseNumber || ""} ${address.streetName || ""}`.trim(),
    address.address || "",
    address.landmark ? `Landmark: ${address.landmark}` : "",
    address.type ? `${address.type} address` : "Delivery address",
    address.location ? `Pin: ${address.location.lat.toFixed(5)}, ${address.location.lng.toFixed(5)}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
}

function formatMultilineAddress(address) {
  if (!address) return "";
  return [
    `${address.type || "Delivery"} address`,
    `House number: ${address.houseNumber || "-"}`,
    `Street name: ${address.streetName || "-"}`,
    `Phone: ${address.phone || state.profile?.phone || "-"}`,
    `Map address: ${address.address || "-"}`,
    address.landmark ? `Landmark: ${address.landmark}` : "",
    address.location ? `Pin: ${address.location.lat.toFixed(6)}, ${address.location.lng.toFixed(6)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function apiRequest(path, options = {}) {
  const headers = {
    "content-type": "application/json",
    ...(options.headers || {}),
  };

  const activeAddress = getActiveAddress();
  if (activeAddress?.phone) {
    headers["x-customer-phone"] = activeAddress.phone;
  } else if (state.profile?.phone) {
    headers["x-customer-phone"] = state.profile.phone;
  }

  return fetch(path, { ...options, headers }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Request failed");
    }
    return payload;
  });
}

function openDrawer() {
  state.drawerOpen = true;
  renderAccount();
}

function closeDrawer() {
  state.drawerOpen = false;
  renderAccount();
}

function setActiveTab(tab) {
  state.activeTab = tab;
  renderAccount();
}

function startProfileSetup() {
  state.addressMode = "profile";
  state.editingAddressId = null;
  state.activeTab = "profile";
  openDrawer();
}

function startAddressCreate() {
  if (state.addresses.length >= MAX_ADDRESSES) {
    alert("You can save up to 10 addresses only.");
    return;
  }
  state.addressMode = "new";
  state.editingAddressId = null;
  state.activeTab = "addresses";
  openDrawer();
}

function startAddressEdit(id) {
  state.addressMode = "edit";
  state.editingAddressId = id;
  state.activeTab = "addresses";
  openDrawer();
}

function renderMenu() {
  const dishes = state.menu.filter(
    (item) => state.activeCategory === "all" || item.category === state.activeCategory,
  );

  menuGrid.innerHTML = dishes
    .map(
      (item) => `
        <article class="dish-card ${item.available === false ? "unavailable" : ""}">
          <img class="dish-image" src="${item.image || "assets/hero-food.png"}" alt="${item.name}" />
          <div class="dish-top">
            <div>
              <h3>${item.name}</h3>
              <p>${item.description}</p>
            </div>
            <span class="price">${formatPrice(item.price)}</span>
          </div>
          <div class="dish-actions">
            <span class="availability ${item.available === false ? "off" : "on"}">
              ${item.available === false ? "Sold out" : "Available"}
            </span>
            <button class="add-button" type="button" data-add="${item.id}" ${item.available === false ? "disabled" : ""}>
              ${item.available === false ? "Unavailable" : "Add to cart"}
            </button>
          </div>
        </article>
      `,
    )
    .join("");
}

function getCartRows() {
  return [...state.cart.entries()]
    .map(([id, quantity]) => {
      const item = state.menu.find((dish) => dish.id === id);
      if (!item) return null;
      return { ...item, quantity, lineTotal: item.price * quantity };
    })
    .filter(Boolean)
    .filter((item) => item.quantity > 0);
}

function getTotals() {
  const rows = getCartRows();
  const subtotal = rows.reduce((sum, item) => sum + item.lineTotal, 0);
  const delivery = subtotal > 0 ? BUSINESS.deliveryFee : 0;
  return {
    rows,
    subtotal,
    delivery,
    total: subtotal + delivery,
    quantity: rows.reduce((sum, item) => sum + item.quantity, 0),
  };
}

function renderCart() {
  const totals = getTotals();
  itemCount.textContent = `${totals.quantity} ${totals.quantity === 1 ? "item" : "items"}`;
  subtotalEl.textContent = formatPrice(totals.subtotal);
  deliveryFeeEl.textContent = formatPrice(totals.delivery);
  grandTotalEl.textContent = formatPrice(totals.total);

  if (!totals.rows.length) {
    cartItems.innerHTML = '<p class="empty">Add cookies from the menu to begin.</p>';
  } else {
    cartItems.innerHTML = totals.rows
      .map(
        (item) => `
          <div class="cart-row">
            <div>
              <strong>${item.name}</strong>
              <small>${formatPrice(item.price)} each</small>
            </div>
            <div class="quantity" aria-label="Quantity for ${item.name}">
              <button type="button" data-decrease="${item.id}" aria-label="Remove one ${item.name}">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-increase="${item.id}" aria-label="Add one ${item.name}">+</button>
            </div>
          </div>
        `,
      )
      .join("");
  }

  if (selectedAddressText) {
    selectedAddressText.textContent = formatAddressLine(getActiveAddress());
  }
}

function updateQuantity(id, change) {
  const current = state.cart.get(id) || 0;
  const next = Math.max(0, current + change);
  if (next === 0) {
    state.cart.delete(id);
  } else {
    state.cart.set(id, next);
  }
  renderCart();
}

function renderProfileSetup() {
  const existing = state.profile || {};
  const savedAddress = state.addresses[0] || null;
  const selectedAddress = getActiveAddress();

  accountShellTitle.textContent = state.profile ? "Your details" : "Complete your details";

  if (!state.profile || state.addressMode === "profile") {
    accountContent.innerHTML = `
    <form class="auth-form" id="profileSetupForm">
      <label>
        Name
        <input id="profileName" type="text" placeholder="Your name" value="${existing.name || ""}" required />
      </label>
      <label>
        Phone number
        <input id="profilePhone" type="tel" inputmode="numeric" placeholder="10-digit mobile" value="${existing.phone || ""}" required />
      </label>
      <div class="map-picker">
        <div class="map-actions">
          <div>
            <strong>Pin your delivery location</strong>
              <small>Choose the exact pin point anywhere in India.</small>
          </div>
          <button class="secondary-button" id="useLocationButton" type="button">Use current location</button>
        </div>
        <div class="map-canvas" id="locationMap" aria-label="Map for choosing delivery location"></div>
        <p class="form-note" id="locationStatus">Choose your location on the map before saving.</p>
      </div>
      <label>
        House number
        <input id="houseNumber" type="text" placeholder="Flat / house / shop number" value="${savedAddress?.houseNumber || ""}" required />
      </label>
      <label>
        Street name
        <input id="streetName" type="text" placeholder="Street / building / area" value="${savedAddress?.streetName || ""}" required />
      </label>
      <label>
        Address type
        <select id="addressType" required>
          <option value="Home" ${savedAddress?.type === "Home" ? "selected" : ""}>Home</option>
          <option value="Work" ${savedAddress?.type === "Work" ? "selected" : ""}>Work</option>
          <option value="Other" ${savedAddress?.type === "Other" ? "selected" : ""}>Other</option>
        </select>
      </label>
      <label>
        Map address
        <textarea id="savedAddress" rows="3" placeholder="Area from selected pin" required>${savedAddress?.address || ""}</textarea>
      </label>
      <label>
        Nearby landmark
        <input id="savedLandmark" type="text" placeholder="Optional landmark" value="${savedAddress?.landmark || ""}" />
      </label>
      <button class="pay-button" type="submit">${state.profile ? "Save details" : "Save details"}</button>
      <p class="form-note">Up to 10 addresses can be saved. All-India delivery is supported.</p>
    </form>
    `;
  } else {
    accountContent.innerHTML = `
      <div class="saved-user">
        <strong>${state.profile.name}</strong>
        <p>${state.profile.phone}</p>
        <div class="account-actions">
          <button class="secondary-button" type="button" data-account-action="logout">Logout</button>
        </div>
      </div>
    `;
  }

  if (selectedAddress && state.selectedLocation == null) {
    state.selectedLocation = selectedAddress.location || null;
  }

  if (state.map) {
    state.map.remove();
    state.map = null;
    state.marker = null;
  }

  setTimeout(() => initLocationMap(), 0);
}

function renderAddresses() {
  accountShellTitle.textContent = "Saved addresses";

  const addressFormOpen = state.addressMode === "new" || state.addressMode === "edit";
  const addressToEdit = addressFormOpen && state.editingAddressId
    ? state.addresses.find((entry) => entry.id === state.editingAddressId)
    : null;

  accountContent.innerHTML = `
    <div class="saved-address">
      ${state.addresses.length ? state.addresses.map((address) => `
        <div class="address-item ${address.id === state.selectedAddressId ? "selected" : ""}">
          <div>
            <strong>${address.type || "Delivery"} address${address.id === state.selectedAddressId ? " (Selected)" : ""}</strong>
            <p>${formatMultilineAddress(address).replaceAll("\n", "<br>")}</p>
          </div>
          <div class="account-actions">
            <button class="secondary-button" type="button" data-select-address="${address.id}">Use</button>
            <button class="secondary-button" type="button" data-edit-address="${address.id}">Edit</button>
            <button class="secondary-button danger" type="button" data-delete-address="${address.id}">Delete</button>
          </div>
        </div>
      `).join("") : '<p class="empty">No saved addresses yet.</p>'}
      <button class="secondary-button" type="button" data-account-action="add-address" ${state.addresses.length >= MAX_ADDRESSES ? "disabled" : ""}>
        Add new address
      </button>
      <p class="form-note">Saved addresses stay here until you log out.</p>
    </div>

    ${addressFormOpen ? `
      <form class="auth-form" id="addressForm">
        <h3>${addressToEdit ? "Edit address" : "Add address"}</h3>
        <label>
          House number
          <input id="houseNumber" type="text" placeholder="Flat / house / shop number" value="${addressToEdit?.houseNumber || ""}" required />
        </label>
        <label>
          Street name
          <input id="streetName" type="text" placeholder="Street / building / area" value="${addressToEdit?.streetName || ""}" required />
        </label>
        <label>
          Address type
          <select id="addressType" required>
            <option value="Home" ${addressToEdit?.type === "Home" ? "selected" : ""}>Home</option>
            <option value="Work" ${addressToEdit?.type === "Work" ? "selected" : ""}>Work</option>
            <option value="Other" ${addressToEdit?.type === "Other" ? "selected" : ""}>Other</option>
          </select>
        </label>
        <div class="map-picker">
          <div class="map-actions">
            <div>
              <strong>Pin your delivery location</strong>
              <small>Pick the exact delivery point on the map.</small>
            </div>
            <button class="secondary-button" id="useLocationButton" type="button">Use current location</button>
          </div>
          <div class="map-canvas" id="locationMap" aria-label="Map for choosing delivery location"></div>
          <p class="form-note" id="locationStatus">Choose your location on the map before saving.</p>
        </div>
        <label>
          Map address
          <textarea id="savedAddress" rows="3" placeholder="Area from selected pin" required>${addressToEdit?.address || ""}</textarea>
        </label>
        <label>
          Nearby landmark
          <input id="savedLandmark" type="text" placeholder="Optional landmark" value="${addressToEdit?.landmark || ""}" />
        </label>
        <button class="pay-button" type="submit">${addressToEdit ? "Save address" : "Save address"}</button>
        <p class="form-note">All-India delivery is supported.</p>
      </form>
    ` : ""}
  `;

  if (addressToEdit?.location) {
    state.selectedLocation = addressToEdit.location;
  }

  if (state.map) {
    state.map.remove();
    state.map = null;
    state.marker = null;
  }

  setTimeout(() => initLocationMap(), 0);
}

function renderOrdersTab() {
  accountShellTitle.textContent = "Previous orders";
  if (!state.previousOrders.length) {
    accountContent.innerHTML = '<p class="empty">No previous orders yet.</p>';
    return;
  }

  accountContent.innerHTML = `
    <div class="order-history">
      ${state.previousOrders
        .map(
          (order) => `
            <article class="history-card">
              <strong>${order.id} - ${formatPrice(order.totals.total)}</strong>
              <span>${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))}</span>
              <span>Status: ${String(order.status || "").replaceAll("_", " ")}</span>
              <span>Payment: ${String(order.paymentStatus || "").replaceAll("_", " ")}</span>
              <span>${order.items.map((item) => `${item.name} x ${item.quantity}`).join(", ")}</span>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderCareTab() {
  accountShellTitle.textContent = "Customer care";
  accountContent.innerHTML = `
    <div class="saved-user">
      <strong>Need help?</strong>
      <p>Call or WhatsApp us at ${BUSINESS.whatsappNumber}. Share your order ID for faster help.</p>
      <a class="secondary-link" href="https://wa.me/${BUSINESS.whatsappNumber}" target="_blank" rel="noreferrer">Contact customer care</a>
    </div>
  `;
}

function renderAccount() {
  accountShell.classList.toggle("open", state.drawerOpen);
  accountOverlay.classList.toggle("open", state.drawerOpen);
  accountLogoutButton.classList.toggle("hidden", !state.profile);

  accountTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.accountTab === state.activeTab);
  });

  if (state.activeTab === "profile") {
    renderProfileSetup();
  } else if (state.activeTab === "addresses") {
    renderAddresses();
  } else if (state.activeTab === "orders") {
    renderOrdersTab();
  } else {
    renderCareTab();
  }

  renderCart();
  syncCheckoutFields();
}

async function logoutCustomer() {
  clearSession();
  state.drawerOpen = true;
  state.activeTab = "profile";
  state.addressMode = "profile";
  state.selectedLocation = null;
  state.previousOrders = [];
  renderAccount();
}

function syncCheckoutFields() {
  customerName.value = state.profile?.name || "";
  customerPhone.value = state.profile?.phone || "";
  if (selectedAddressText) {
    selectedAddressText.textContent = formatAddressLine(getActiveAddress());
  }
}

async function loadMenu() {
  if (state.loadingMenu) return;
  state.loadingMenu = true;
  try {
    const result = await apiRequest("/api/menu");
    state.menu = result.menu || [];
    renderMenu();
    renderCart();
  } catch (error) {
    console.error(error);
  } finally {
    state.loadingMenu = false;
  }
}

async function loadPreviousOrders() {
  const phone = state.profile?.phone || getActiveAddress()?.phone;
  if (!phone) {
    state.previousOrders = [];
    return;
  }

  try {
    const result = await apiRequest("/api/orders/my");
    state.previousOrders = result.orders || [];
  } catch {
    state.previousOrders = [];
  }
}

function initLocationMap() {
  const locationMap = document.querySelector("#locationMap");
  const locationStatus = document.querySelector("#locationStatus");
  const useLocationButton = document.querySelector("#useLocationButton");
  const savedAddress = document.querySelector("#savedAddress");

  if (!locationMap || !window.L) return;

  const existing = state.selectedLocation || getActiveAddress()?.location || { lat: 20.5937, lng: 78.9629 };
  if (!state.map) {
    state.map = L.map(locationMap).setView([existing.lat, existing.lng], state.selectedLocation ? 16 : 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(state.map);
    state.map.on("click", (event) => setMapPin(event.latlng.lat, event.latlng.lng, true));
  } else {
    state.map.invalidateSize();
    state.map.setView([existing.lat, existing.lng], state.selectedLocation ? 16 : 12);
  }

  if (state.marker) {
    state.marker.remove();
    state.marker = null;
  }

  if (state.selectedLocation) {
    state.marker = L.marker([state.selectedLocation.lat, state.selectedLocation.lng], { draggable: true }).addTo(state.map);
    state.marker.on("dragend", () => {
      const position = state.marker.getLatLng();
      setMapPin(position.lat, position.lng, true);
    });
  }

  function setLocationMessage(message) {
    if (locationStatus) locationStatus.textContent = message;
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("Your browser does not support location access. Tap the map to place the pin.");
      return;
    }

    useLocationButton.disabled = true;
    setLocationMessage("Requesting location permission...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        useLocationButton.disabled = false;
        useLocationButton.textContent = "Use current location";
        setMapPin(position.coords.latitude, position.coords.longitude, true);
      },
      () => {
        useLocationButton.disabled = false;
        useLocationButton.textContent = "Ask location permission again";
        setLocationMessage("Location permission was not allowed. Please allow location access, then press Ask location permission again, or tap the map to place the pin.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  useLocationButton?.removeEventListener("click", requestLocation);
  useLocationButton?.addEventListener("click", requestLocation);

  if (state.selectedLocation && savedAddress) {
    setLocationMessage(`Pin saved at ${state.selectedLocation.lat.toFixed(5)}, ${state.selectedLocation.lng.toFixed(5)}.`);
  }

  function setMapPin(lat, lng, shouldReverseGeocode) {
    state.selectedLocation = { lat, lng };

    if (!state.marker) {
      state.marker = L.marker([lat, lng], { draggable: true }).addTo(state.map);
      state.marker.on("dragend", () => {
        const position = state.marker.getLatLng();
        setMapPin(position.lat, position.lng, true);
      });
    } else {
      state.marker.setLatLng([lat, lng]);
    }

    state.map.setView([lat, lng], Math.max(state.map.getZoom(), 16));

    setLocationMessage(`Pin saved at ${lat.toFixed(5)}, ${lng.toFixed(5)}. Fetching address...`);

    if (shouldReverseGeocode) {
      reverseGeocode(lat, lng, setLocationMessage, savedAddress);
    } else {
      setLocationMessage(`Pin saved at ${lat.toFixed(5)}, ${lng.toFixed(5)}.`);
    }
  }

  window.__setMapPin = setMapPin;
}

async function reverseGeocode(lat, lng, setLocationMessage, savedAddress) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Address lookup failed");
    const result = await response.json();
    if (result.display_name && savedAddress) {
      savedAddress.value = result.display_name;
      setLocationMessage("Address found from the selected map pin.");
      return;
    }
    setLocationMessage("Pin saved. Please type any missing address details.");
  } catch {
    setLocationMessage("Pin saved, but address lookup failed. Please type the address manually.");
  }
}

function setMapPin(lat, lng, shouldReverseGeocode) {
  if (typeof window.__setMapPin === "function") {
    window.__setMapPin(lat, lng, shouldReverseGeocode);
  }
}

async function saveProfileAndFirstAddress(form) {
  const name = form.querySelector("#profileName").value.trim();
  const phone = normalizePhone(form.querySelector("#profilePhone").value);
  const houseNumber = form.querySelector("#houseNumber").value.trim();
  const streetName = form.querySelector("#streetName").value.trim();
  const addressType = form.querySelector("#addressType").value;
  const address = form.querySelector("#savedAddress").value.trim();
  const landmark = form.querySelector("#savedLandmark").value.trim();

  if (!state.selectedLocation) {
    alert("Please choose your exact location on the map before saving.");
    return;
  }

  if (phone.length !== 10) {
    alert("Please enter a valid 10-digit phone number.");
    return;
  }

  const profile = { name, phone };
  const addressRecord = {
    id: Date.now().toString(),
    name,
    phone,
    houseNumber,
    streetName,
    type: addressType,
    address,
    landmark,
    location: state.selectedLocation,
  };

  state.profile = profile;
  state.addresses = [addressRecord];
  state.selectedAddressId = addressRecord.id;
  state.activeTab = "profile";
  state.addressMode = null;
  state.drawerOpen = false;

  writeStoredJson(STORAGE_KEYS.profile, profile);
  writeStoredJson(STORAGE_KEYS.addresses, state.addresses);
  localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
  await syncCustomerState();
  renderAccount();
}

async function saveAddress(form) {
  const houseNumber = form.querySelector("#houseNumber").value.trim();
  const streetName = form.querySelector("#streetName").value.trim();
  const addressType = form.querySelector("#addressType").value;
  const address = form.querySelector("#savedAddress").value.trim();
  const landmark = form.querySelector("#savedLandmark").value.trim();

  if (!state.selectedLocation) {
    alert("Please choose your exact location on the map before saving.");
    return;
  }

  if (state.addresses.length >= MAX_ADDRESSES && !state.editingAddressId) {
    alert("You can save up to 10 addresses only.");
    return;
  }

  const profile = state.profile || {};
  const record = {
    id: state.editingAddressId || Date.now().toString(),
    name: profile.name || "",
    phone: profile.phone || "",
    houseNumber,
    streetName,
    type: addressType,
    address,
    landmark,
    location: state.selectedLocation,
  };

  const nextAddresses = [...state.addresses];
  const index = nextAddresses.findIndex((entry) => entry.id === record.id);
  if (index >= 0) {
    nextAddresses[index] = record;
  } else {
    nextAddresses.push(record);
  }

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
  state.addresses = state.addresses.filter((entry) => entry.id !== id);
  if (state.selectedAddressId === id) {
    state.selectedAddressId = state.addresses[0]?.id || null;
  }

  writeStoredJson(STORAGE_KEYS.addresses, state.addresses);
  if (state.selectedAddressId) {
    localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
  } else {
    localStorage.removeItem(STORAGE_KEYS.selectedAddressId);
  }

  await syncCustomerState();
  renderAccount();
}

function renderAccountContent() {
  if (state.activeTab === "profile") {
    renderProfileSetup();
  } else if (state.activeTab === "addresses") {
    renderAddresses();
  } else if (state.activeTab === "orders") {
    renderOrdersTab();
  } else {
    renderCareTab();
  }
}

async function createCodOrder() {
  const totals = getTotals();
  const activeAddress = getActiveAddress();
  if (!state.profile || !activeAddress) {
    openDrawer();
    state.activeTab = "profile";
    renderAccount();
    throw new Error("Please save your details before ordering.");
  }

  const payload = {
    customerName: state.profile.name,
    customerPhone: state.profile.phone,
    orderType: "delivery",
    paymentMethod: "cod",
    address: activeAddress,
    items: getCartRows().map((item) => ({ id: item.id, quantity: item.quantity })),
  };

  const result = await apiRequest("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  state.cart.clear();
  await loadPreviousOrders();
  renderCart();
  return result.order;
}

async function createPrepaidIntent() {
  const activeAddress = getActiveAddress();
  if (!state.profile || !activeAddress) {
    openDrawer();
    state.activeTab = "profile";
    renderAccount();
    throw new Error("Please save your details before ordering.");
  }

  const payload = {
    customerName: state.profile.name,
    customerPhone: state.profile.phone,
    orderType: "delivery",
    address: activeAddress,
    items: getCartRows().map((item) => ({ id: item.id, quantity: item.quantity })),
  };

  return apiRequest("/api/payments/razorpay/create-intent", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function openRazorpayCheckout(intent, paymentSessionId) {
  if (!window.Razorpay) {
    throw new Error("Razorpay Checkout could not load. Please check your connection.");
  }

  const checkoutInstance = new Razorpay({
    key: intent.razorpay.keyId,
    amount: intent.razorpay.amount,
    currency: intent.razorpay.currency,
    name: intent.razorpay.name,
    description: `Order payment`,
    order_id: intent.razorpay.orderId,
    prefill: {
      name: state.profile?.name || "",
      contact: state.profile?.phone || "",
    },
    method: { upi: true },
    handler: async (response) => {
      try {
        const result = await apiRequest("/api/payments/razorpay/verify", {
          method: "POST",
          body: JSON.stringify({
            paymentSessionId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });

        paymentSummary.textContent = `${result.order.id} has been received and sent to admin.`;
        adminNotice.textContent = "Payment verified by the server.";
        razorpayRetryButton.classList.add("hidden");
        state.cart.clear();
        await loadPreviousOrders();
        renderCart();
      } catch (error) {
        paymentSummary.textContent = `Payment response received, but verification failed. ${error.message}`;
        razorpayRetryButton.classList.remove("hidden");
      }
    },
    modal: {
      ondismiss: () => {
        paymentSummary.textContent = "Payment failed or was closed. Please try again.";
        adminNotice.textContent = "No order was created because the payment was not completed.";
        razorpayRetryButton.classList.remove("hidden");
      },
    },
  });

  razorpayRetryButton.onclick = () => checkoutInstance.open();
  checkoutInstance.open();
}

async function handleCheckout(event) {
  event.preventDefault();

  if (!state.profile || !getActiveAddress()) {
    openDrawer();
    state.activeTab = "profile";
    renderAccount();
    alert("Please save your details before ordering.");
    return;
  }

  const totals = getTotals();
  if (!totals.rows.length) {
    alert("Please add at least one item to your cart.");
    return;
  }

  try {
    const method = paymentMethod.value;
    if (method === "cod") {
      const order = await createCodOrder();
      alert(`${order.id} placed and sent to admin for acceptance.`);
      return;
    }

    const intent = await createPrepaidIntent();
    paymentSummary.textContent = `Pay ${formatPrice(totals.total)} using Razorpay UPI.`;
    adminNotice.textContent = "Complete the payment. If the payment is not completed, no order will be saved.";
    paymentDialog.showModal();
    openRazorpayCheckout(intent, intent.paymentSessionId);
  } catch (error) {
    alert(error.message);
  }
}

async function loadOrdersForAccount() {
  if (!state.profile?.phone) {
    state.previousOrders = [];
    return;
  }

  try {
    const result = await apiRequest("/api/orders/my");
    state.previousOrders = result.orders || [];
  } catch {
    state.previousOrders = [];
  }
}

accountButton.addEventListener("click", () => {
  state.drawerOpen = true;
  renderAccount();
});

closeSidebarBtn.addEventListener("click", closeDrawer);
accountOverlay.addEventListener("click", closeDrawer);

accountTabs.forEach((tab) => {
  tab.addEventListener("click", async () => {
    state.activeTab = tab.dataset.accountTab;
    state.drawerOpen = true;
    if (state.activeTab === "orders") {
      await loadOrdersForAccount();
    }
    renderAccount();
  });
});

accountContent.addEventListener("submit", async (event) => {
  const form = event.target.closest("form");
  if (!form) return;
  if (form.id === "profileSetupForm") {
    event.preventDefault();
    await saveProfileAndFirstAddress(form);
  }
  if (form.id === "addressForm") {
    event.preventDefault();
    await saveAddress(form);
  }
});

accountContent.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-account-action]")?.dataset.accountAction;
  if (action === "logout") {
    await logoutCustomer();
    return;
  }

  if (action === "add-address") {
    startAddressCreate();
    renderAccount();
    return;
  }

  const selectAddress = event.target.closest("[data-select-address]");
  if (selectAddress) {
    state.selectedAddressId = selectAddress.dataset.selectAddress;
    localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
    await syncCustomerState();
    renderAccount();
    return;
  }

  const editAddress = event.target.closest("[data-edit-address]");
  if (editAddress) {
    startAddressEdit(editAddress.dataset.editAddress);
    renderAccount();
    return;
  }

  const deleteAddressBtn = event.target.closest("[data-delete-address]");
  if (deleteAddressBtn) {
    if (confirm("Delete this address?")) {
      await deleteAddress(deleteAddressBtn.dataset.deleteAddress);
    }
  }
});

accountShell.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-account-action]")?.dataset.accountAction;
  if (action === "logout") {
    await logoutCustomer();
  }
});

document.querySelectorAll(".filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach((filter) => filter.classList.remove("active"));
    button.classList.add("active");
    state.activeCategory = button.dataset.category;
    renderMenu();
  });
});

menuGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (!button) return;
  updateQuantity(button.dataset.add, 1);
});

cartItems.addEventListener("click", (event) => {
  const increase = event.target.closest("[data-increase]");
  const decrease = event.target.closest("[data-decrease]");
  if (increase) updateQuantity(increase.dataset.increase, 1);
  if (decrease) updateQuantity(decrease.dataset.decrease, -1);
});

checkout.addEventListener("submit", handleCheckout);

async function boot() {
  loadLocalState();
  await loadCustomerState();
  state.drawerOpen = !state.profile || !state.addresses.length;
  state.activeTab = state.drawerOpen ? "profile" : "profile";
  renderAccount();
  renderCart();
  await loadMenu();
  if (state.profile?.phone) {
    await loadOrdersForAccount();
  }
  renderAccount();
  setInterval(loadMenu, 15000);
}

boot();
