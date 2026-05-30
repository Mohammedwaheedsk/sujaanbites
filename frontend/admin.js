const ADMIN_STORAGE_KEY = "spiceTableAdminPin";
const API_BASE = String(window.__API_BASE || window.__API_BASE__ || "").trim().replace(/\/+$/, "");

const loginPanel = document.querySelector("#loginPanel");
const dashboardPanel = document.querySelector("#dashboardPanel");
const adminLoginForm = document.querySelector("#adminLoginForm");
const adminPin = document.querySelector("#adminPin");
const adminLoginMessage = document.querySelector("#adminLoginMessage");
const refreshOrders = document.querySelector("#refreshOrders");
const adminLogout = document.querySelector("#adminLogout");
const adminStats = document.querySelector("#adminStats");
const incomingOrdersList = document.querySelector("#incomingOrdersList");
const liveOrdersList = document.querySelector("#liveOrdersList");
const reviewsList = document.querySelector("#reviewsList");
const menuManager = document.querySelector("#menuManager");
const menuAddForm = document.querySelector("#menuAddForm");
const categoryManager = document.querySelector("#categoryManager");
const newCategoryName = document.querySelector("#newCategoryName");
const addCategoryButton = document.querySelector("#addCategoryButton");
const menuStockCount = document.querySelector("#menuStockCount");
const historyFilters = document.querySelector("#historyFilters");
const historyFrom = document.querySelector("#historyFrom");
const historyTo = document.querySelector("#historyTo");
const historyStats = document.querySelector("#historyStats");
const historyList = document.querySelector("#historyList");
const adminLocationMap = document.querySelector("#adminLocationMap");
const adminUseCurrentLocation = document.querySelector("#adminUseCurrentLocation");
const adminSaveLocation = document.querySelector("#adminSaveLocation");
const adminLocationStatus = document.querySelector("#adminLocationStatus");

let locationMap = null;
let locationMarker = null;
let selectedAdminLocation = null;
let refreshTimer = null;
let alertTimer = null;
let lastOrderSnapshot = "";
let lastDashboardFocusedAt = 0;
let alertAudio = null;
let configuredCategories = [];
let ordersCache = [];
let lastHapticAt = 0;

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatPrice(value) {
  return currency.format(value || 0);
}

function fireTelegramHaptic(kind = "light") {
  const feedback = window?.Telegram?.WebApp?.HapticFeedback;
  if (!feedback) return false;
  try {
    if (kind === "selection" && typeof feedback.selectionChanged === "function") {
      feedback.selectionChanged();
      return true;
    }
    if (typeof feedback.impactOccurred === "function") {
      const impactStyle = kind === "heavy" ? "heavy" : kind === "medium" ? "medium" : "light";
      feedback.impactOccurred(impactStyle);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function vibrateTap(pattern = 8, kind = "light") {
  const now = Date.now();
  if (now - lastHapticAt < 35) return;
  lastHapticAt = now;
  if (fireTelegramHaptic(kind)) return;
  if (typeof navigator?.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // no-op
  }
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isSameLocalDay(value, now = new Date()) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  return (
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
  );
}

function formatCategoryLabel(value) {
  const cleaned = String(value || "").trim();
  if (!cleaned) return "Other";
  return cleaned
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeCategoryName(value) {
  return String(value || "").trim();
}

function normalizeCategoryList(values) {
  if (!Array.isArray(values)) return [];
  const unique = new Map();
  for (const value of values) {
    const label = normalizeCategoryName(value);
    if (!label) continue;
    const key = label.toLowerCase();
    if (!unique.has(key)) unique.set(key, label);
  }
  return [...unique.values()];
}

function getSnapshot(orders) {
  return JSON.stringify(
    (orders || [])
      .map((order) => ({
        id: order.id,
        status: order.status,
        updatedAt: order.updatedAt || order.createdAt || "",
      }))
      .sort((a, b) => (a.id < b.id ? -1 : 1)),
  );
}

function ensureAlertAudio() {
  if (alertAudio) return alertAudio;
  alertAudio = new Audio(
    "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAABCxAgAEABAAZGF0YQAAAAA=",
  );
  alertAudio.loop = true;
  alertAudio.volume = 0.25;
  return alertAudio;
}

function startAlerting() {
  const audio = ensureAlertAudio();
  audio.play().catch(() => {});
  if (alertTimer) return;
  alertTimer = setInterval(() => {
    if (document.hidden) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, 5000);
}

function stopAlerting() {
  if (alertTimer) {
    clearInterval(alertTimer);
    alertTimer = null;
  }
  if (alertAudio) {
    alertAudio.pause();
    alertAudio.currentTime = 0;
  }
}

function markAdminSeen() {
  lastDashboardFocusedAt = Date.now();
  stopAlerting();
}

async function pollDashboard() {
  if (document.hidden || !getAdminPin()) return;
  try {
    const payload = await adminRequest("/api/admin/orders");
    const nextSnapshot = getSnapshot(payload.orders || []);
    if (lastOrderSnapshot && nextSnapshot !== lastOrderSnapshot && Date.now() - lastDashboardFocusedAt > 3000) {
      startAlerting();
    }
    lastOrderSnapshot = nextSnapshot;
    ordersCache = payload.orders || [];
    renderStats(payload.orders || []);
    renderOrders(payload.orders || []);
  } catch {
    // keep silent; next refresh will try again
  }
}

function getAdminPin() {
  return localStorage.getItem(ADMIN_STORAGE_KEY) || "";
}

async function adminRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-admin-pin": getAdminPin(),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Admin request failed");
  }
  return payload;
}

function showDashboard(show) {
  loginPanel.classList.toggle("hidden", show);
  dashboardPanel.classList.toggle("hidden", !show);
}

function renderStats(orders) {
  const now = new Date();
  const todayOrders = orders.filter((order) => isSameLocalDay(order.createdAt, now));
  const actionable = orders.filter((order) => ["pending_admin_acceptance", "received"].includes(order.status));
  const todayActionable = todayOrders.filter((order) => ["pending_admin_acceptance", "received"].includes(order.status));

  const overallRevenue = orders
    .filter((order) => order.paymentStatus === "captured" || order.paymentMethod === "cod")
    .reduce((sum, order) => sum + order.totals.total, 0);
  const todayRevenue = todayOrders
    .filter((order) => order.paymentStatus === "captured" || order.paymentMethod === "cod")
    .reduce((sum, order) => sum + order.totals.total, 0);

  adminStats.innerHTML = `
    <article class="stats-group">
      <p class="stats-group-title">Today</p>
      <div class="stats-grid">
        <div class="stat-card"><strong>${todayOrders.length}</strong><span>Total orders</span></div>
        <div class="stat-card"><strong>${todayActionable.length}</strong><span>Need acceptance</span></div>
        <div class="stat-card"><strong>${formatPrice(todayRevenue)}</strong><span>Paid or COD value</span></div>
      </div>
    </article>
    <article class="stats-group">
      <p class="stats-group-title">Overall</p>
      <div class="stats-grid">
        <div class="stat-card"><strong>${orders.length}</strong><span>Total orders</span></div>
        <div class="stat-card"><strong>${actionable.length}</strong><span>Need acceptance</span></div>
        <div class="stat-card"><strong>${formatPrice(overallRevenue)}</strong><span>Paid or COD value</span></div>
      </div>
    </article>
  `;
}

function renderOrders(orders) {
  const incoming = (orders || []).filter((order) => ["pending_admin_acceptance", "received"].includes(order.status));
  const live = (orders || []).filter((order) => ["accepted", "preparing", "out_for_delivery"].includes(order.status));
  const reviewed = (orders || []).filter(
    (order) => Number(order.review?.deliveryRating) > 0
      || (Array.isArray(order.review?.productRatings) && order.review.productRatings.length > 0),
  );

  incomingOrdersList.innerHTML = incoming.length ? incoming.map(renderOrder).join("") : '<p class="empty">No incoming orders.</p>';
  liveOrdersList.innerHTML = live.length ? live.map(renderOrder).join("") : '<p class="empty">No live orders.</p>';
  reviewsList.innerHTML = reviewed.length ? reviewed.map(renderReviewCard).join("") : '<p class="empty">No customer reviews yet.</p>';
}

function renderStars(rating) {
  const safe = Math.max(0, Math.min(5, Number(rating) || 0));
  return `
    <span class="review-stars" aria-label="${safe} out of 5 stars">
      ${[1, 2, 3, 4, 5]
        .map((value) => `<span class="review-star ${value <= safe ? "filled" : ""}">★</span>`)
        .join("")}
    </span>
  `;
}

function renderReviewCard(order) {
  const deliveryRating = Number(order.review?.deliveryRating) || 0;
  const productRatings = Array.isArray(order.review?.productRatings) ? order.review.productRatings : [];
  const itemNames = new Map((order.items || []).map((item) => [item.id, item.name]));
  return `
    <article class="review-card">
      <div class="review-head">
        <strong>${order.id} - ${order.customerName || "Customer"}</strong>
        <small>${formatDate(order.updatedAt || order.createdAt)}</small>
      </div>
      <div class="review-row">
        <span>Delivery</span>
        ${deliveryRating ? renderStars(deliveryRating) : '<span class="form-note">No delivery rating</span>'}
      </div>
      ${order.review?.deliveryComment ? `<p class="form-note">${order.review.deliveryComment}</p>` : ""}
      <div class="review-products">
        ${productRatings.length
          ? productRatings
            .map((entry) => `
              <div class="review-row">
                <span>${itemNames.get(entry.id) || entry.id}</span>
                ${renderStars(entry.rating)}
              </div>
            `)
            .join("")
          : '<p class="form-note">No product ratings</p>'}
      </div>
      ${order.review?.productComment ? `<p class="form-note">${order.review.productComment}</p>` : ""}
    </article>
  `;
}

function renderOrder(order) {
  const address = order.address || {};
  const mapsUrl = address.location
    ? `https://www.google.com/maps/search/?api=1&query=${address.location.lat},${address.location.lng}`
    : "";
  const itemNames = new Map((order.items || []).map((item) => [item.id, item.name]));
  const reviewSummary =
    Array.isArray(order.review?.productRatings) && order.review.productRatings.length
      ? order.review.productRatings.map((rating) => `${itemNames.get(rating.id) || rating.id}:${rating.rating}`).join(", ")
      : "-";

  const dueReminder = isDeliveryCheckDue(order)
    ? '<p class="form-note" style="color:#8d1f1f;font-weight:800;">ETA + 2 min passed. Please check with delivery agent and update status.</p>'
    : "";

  return `
    <article class="order-card" data-order-id="${order.id}">
      <div class="order-card-top">
        <div>
          <p class="eyebrow">${formatDate(order.createdAt)}</p>
          <h2>${order.id} - ${order.customerName || "Customer"}</h2>
        </div>
        <span class="status-pill ${order.status}">${String(order.status).replaceAll("_", " ")}</span>
      </div>

      <div class="order-meta">
        <strong>${formatPrice(order.totals.total)}</strong>
        <span>${order.orderType}</span>
        <span>Payment: ${String(order.paymentStatus || "").replaceAll("_", " ")}</span>
        <span>Method: ${order.paymentMethod || "prepaid"}</span>
        <span>${order.customerPhone || "-"}</span>
        ${order.etaMinutes ? `<span>ETA: ${order.etaMinutes} min</span>` : ""}
      </div>

      <div class="order-grid">
        <div class="order-section">
          <h3>Items</h3>
          <ul>
            ${order.items.map((item) => `<li>${item.name} x ${item.quantity} - ${formatPrice(item.lineTotal)}</li>`).join("")}
          </ul>
        </div>
        <div class="order-section">
          <h3>Address</h3>
          <p>
            ${address.type || "Delivery"}<br>
            House: ${address.houseNumber || "-"}<br>
            Street: ${address.streetName || "-"}<br>
            Phone: ${address.phone || order.customerPhone || "-"}<br>
            ${address.address || ""}<br>
            ${address.landmark ? `Landmark: ${address.landmark}<br>` : ""}
            ${mapsUrl ? `<a href="${mapsUrl}" target="_blank" rel="noreferrer">Open location pin</a>` : ""}
          </p>
        </div>
        <div class="order-section">
          <h3>Payment</h3>
          <p>
            Razorpay order: ${order.razorpayOrderId || "-"}<br>
            Razorpay payment: ${order.razorpayPaymentId || "-"}<br>
            Verified at: ${order.paymentVerifiedAt ? formatDate(order.paymentVerifiedAt) : "-"}<br>
            Delivery rating: ${order.review?.deliveryRating || "-"}<br>
            Product ratings: ${reviewSummary}
          </p>
        </div>
      </div>

      ${dueReminder}

      <div class="order-controls">
        <button class="secondary-button" type="button" data-order-action="accept" data-order-id="${order.id}">Accept</button>
        <button class="secondary-button danger" type="button" data-order-action="reject" data-order-id="${order.id}">Reject</button>
        <input type="number" min="1" placeholder="ETA (min)" data-eta-for="${order.id}" />
        <input type="text" placeholder="Message for customer (optional)" data-message-for="${order.id}" />
        <select data-status-for="${order.id}">
          ${["pending_admin_acceptance", "received", "accepted", "preparing", "out_for_delivery", "completed", "cancelled"]
            .map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status.replaceAll("_", " ")}</option>`)
            .join("")}
        </select>
        <button class="secondary-button" type="button" data-save-status="${order.id}">Save status</button>
      </div>
    </article>
  `;
}

function isDeliveryCheckDue(order) {
  if (!["accepted", "preparing", "out_for_delivery"].includes(order.status)) return false;
  const eta = Number(order.etaMinutes);
  if (!Number.isFinite(eta) || eta <= 0) return false;
  const start = new Date(order.etaUpdatedAt || order.acceptedAt || order.updatedAt || order.createdAt).getTime();
  if (!Number.isFinite(start)) return false;
  const dueAt = start + (eta + 2) * 60 * 1000;
  return Date.now() >= dueAt;
}

function renderMenuManager(menu) {
  if (!menu.length) {
    menuManager.innerHTML = '<p class="empty">No menu items found.</p>';
    return;
  }

  menuManager.innerHTML = menu
    .map(
      (item) => {
        const stockCount = Number.isFinite(Number(item.stockCount)) ? Math.max(0, Math.floor(Number(item.stockCount))) : 0;
        return `
        <article class="menu-item-card" data-menu-item-id="${item.id}">
          <div class="menu-item-preview">
            <img src="${item.image || "assets/hero-food.png"}" alt="${item.name}" />
            <div>
              <strong>${item.name}</strong>
              <p>${item.description}</p>
            </div>
          </div>
          <div class="menu-item-fields">
            <label>
              Item name
              <input type="text" data-menu-name="${item.id}" value="${item.name || ""}" />
            </label>
            <label>
              Description
              <textarea rows="2" data-menu-description="${item.id}">${item.description || ""}</textarea>
            </label>
            <label>
              Category
              <input type="text" data-menu-category="${item.id}" value="${item.category || ""}" />
            </label>
            <label>
              Stock count
              <input type="number" min="0" step="1" data-menu-stock="${item.id}" value="${stockCount}" />
            </label>
          </div>
          <div class="menu-item-actions">
            <span class="availability ${item.available === false ? "off" : "on"}">
              ${item.available === false ? "Unavailable" : `${stockCount} in stock`}
            </span>
            <label class="toggle">
              <input type="checkbox" data-toggle-availability="${item.id}" ${item.available === false ? "" : "checked"} />
              <span>Visible to customers</span>
            </label>
            <button class="secondary-button" type="button" data-save-menu="${item.id}">Save item</button>
            <button class="secondary-button danger" type="button" data-delete-menu="${item.id}">Remove item</button>
          </div>
        </article>
      `;
      },
    )
    .join("");
}

function renderCategoryManager() {
  if (!categoryManager) return;
  if (!configuredCategories.length) {
    categoryManager.innerHTML = '<p class="empty">No categories configured yet.</p>';
    return;
  }

  categoryManager.innerHTML = `
    <div class="filters">
      ${configuredCategories
        .map(
          (category) => `
            <button class="filter" type="button" data-remove-category="${category}" title="Remove ${category}">
              ${formatCategoryLabel(category)} ×
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

async function saveCategories(nextCategories) {
  const categories = normalizeCategoryList(nextCategories);
  const payload = await adminRequest("/api/admin/categories", {
    method: "PUT",
    body: JSON.stringify({ categories }),
  });
  configuredCategories = normalizeCategoryList(payload.categories || []);
  renderCategoryManager();
}

function renderHistory(payload) {
  const summary = payload?.summary || {};
  const days = payload?.days || [];

  historyStats.innerHTML = `
    <div class="stat-card"><strong>${summary.totalOrders || 0}</strong><span>Total orders</span></div>
    <div class="stat-card"><strong>${formatPrice(summary.totalIncome || 0)}</strong><span>Total income</span></div>
    <div class="stat-card"><strong>${summary.cancelledOrders || 0}</strong><span>Cancelled orders</span></div>
    <div class="stat-card"><strong>${summary.dayCount || 0}</strong><span>Days in range</span></div>
  `;

  if (!days.length) {
    historyList.innerHTML = '<p class="empty">No history found for selected dates.</p>';
    return;
  }

  historyList.innerHTML = days
    .map(
      (day) => `
        <article class="history-day">
          <div class="history-day-head">
            <strong>${day.date}</strong>
            <span>${day.orders} orders • ${formatPrice(day.income)} income</span>
          </div>
          <small>COD: ${day.cod} • Prepaid: ${day.prepaid} • Cancelled: ${day.cancelled}</small>
          <ul>
            ${day.details
              .map(
                (entry) =>
                  `<li>${entry.id} • ${entry.customerName || "Customer"} • ${formatPrice(entry.amount)} • ${entry.paymentMethod} • ${String(entry.status || "").replaceAll("_", " ")}</li>`,
              )
              .join("")}
          </ul>
        </article>
      `,
    )
    .join("");
}

async function loadHistory() {
  const params = new URLSearchParams();
  if (historyFrom?.value) params.set("from", historyFrom.value);
  if (historyTo?.value) params.set("to", historyTo.value);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const payload = await adminRequest(`/api/admin/history${suffix}`);
  renderHistory(payload);
}

function setAdminLocationStatus(text) {
  if (adminLocationStatus) adminLocationStatus.textContent = text;
}

function setAdminLocation(lat, lng, address = "") {
  selectedAdminLocation = { lat: Number(lat), lng: Number(lng), address };
  if (!locationMap || !window.L) return;
  if (!locationMarker) {
    locationMarker = L.marker([lat, lng], { draggable: true }).addTo(locationMap);
    locationMarker.on("dragend", () => {
      const point = locationMarker.getLatLng();
      setAdminLocation(point.lat, point.lng, selectedAdminLocation?.address || "");
    });
  } else {
    locationMarker.setLatLng([lat, lng]);
  }
  locationMap.setView([lat, lng], Math.max(locationMap.getZoom(), 15));
  setAdminLocationStatus(`Selected location: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
}

function initAdminLocationMap(savedLocation) {
  if (!adminLocationMap || !window.L) return;
  const start = savedLocation || { lat: 16.3067, lng: 80.4365 };
  if (!locationMap) {
    locationMap = L.map(adminLocationMap).setView([start.lat, start.lng], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(locationMap);
    locationMap.on("click", (event) => setAdminLocation(event.latlng.lat, event.latlng.lng, ""));
  } else {
    locationMap.invalidateSize();
    locationMap.setView([start.lat, start.lng], 12);
  }
  if (savedLocation) {
    setAdminLocation(savedLocation.lat, savedLocation.lng, savedLocation.address || "");
  } else {
    setAdminLocationStatus("Tap on the map to set store location.");
  }
}

async function loadDashboard() {
  try {
    const [ordersPayload, menuPayload, locationPayload, categoriesPayload] = await Promise.all([
      adminRequest("/api/admin/orders"),
      adminRequest("/api/admin/menu"),
      adminRequest("/api/admin/location"),
      adminRequest("/api/admin/categories"),
    ]);
    showDashboard(true);
    ordersCache = ordersPayload.orders || [];
    renderStats(ordersPayload.orders || []);
    renderOrders(ordersPayload.orders || []);
    renderMenuManager(menuPayload.menu || []);
    configuredCategories = normalizeCategoryList(categoriesPayload.categories || []);
    renderCategoryManager();
    initAdminLocationMap(locationPayload.adminLocation || null);
    await loadHistory();
    const nextSnapshot = getSnapshot(ordersPayload.orders || []);
    if (lastOrderSnapshot && nextSnapshot !== lastOrderSnapshot) {
      startAlerting();
    }
    lastOrderSnapshot = nextSnapshot;
    markAdminSeen();
  } catch (error) {
    showDashboard(false);
    adminLoginMessage.textContent = error.message;
  }
}

adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  localStorage.setItem(ADMIN_STORAGE_KEY, adminPin.value.trim());
  await loadDashboard();
  if (!refreshTimer) {
    refreshTimer = setInterval(pollDashboard, 60_000);
  }
});

refreshOrders.addEventListener("click", loadDashboard);

adminLogout.addEventListener("click", () => {
  localStorage.removeItem(ADMIN_STORAGE_KEY);
  showDashboard(false);
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  stopAlerting();
});

dashboardPanel.addEventListener("click", async (event) => {
  const acceptButton = event.target.closest("[data-order-action='accept']");
  const rejectButton = event.target.closest("[data-order-action='reject']");
  const saveButton = event.target.closest("[data-save-status]");
  const target = acceptButton || rejectButton || saveButton;
  if (!target) return;

  const orderId = target.dataset.orderId || target.dataset.saveStatus;
  const order = (ordersCache || []).find((entry) => entry.id === orderId) || null;
  const isLongDistance = order?.deliveryMeta?.isLongDistance === true || order?.deliveryWindow === "3-7 days";
  const status =
    acceptButton ? "accepted" : rejectButton ? "cancelled" : document.querySelector(`[data-status-for="${orderId}"]`).value;
  const etaInput = document.querySelector(`[data-eta-for="${orderId}"]`);
  const messageInput = document.querySelector(`[data-message-for="${orderId}"]`);
  let etaMinutes = Number(etaInput?.value);
  if (status === "accepted" && !isLongDistance && (!Number.isFinite(etaMinutes) || etaMinutes <= 0)) {
    const etaPrompt = prompt("Enter delivery time in minutes for customer:");
    etaMinutes = Number(etaPrompt);
  }
  const payload = { status };
  if (messageInput?.value?.trim()) {
    payload.customerMessage = messageInput.value.trim();
  }
  if (status === "accepted" && !isLongDistance && Number.isFinite(etaMinutes) && etaMinutes > 0) {
    payload.etaMinutes = etaMinutes;
  } else if (status === "accepted" && !isLongDistance) {
    alert("Please enter a valid ETA in minutes.");
    return;
  }

  target.disabled = true;
  try {
    await adminRequest(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    markAdminSeen();
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  } finally {
    target.disabled = false;
  }
});

menuManager.addEventListener("change", async (event) => {
  const checkbox = event.target.closest("[data-toggle-availability]");
  if (!checkbox) return;

  try {
    await adminRequest(`/api/admin/menu/${checkbox.dataset.toggleAvailability}`, {
      method: "PATCH",
      body: JSON.stringify({ available: checkbox.checked }),
    });
    markAdminSeen();
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
});

menuManager.addEventListener("click", async (event) => {
  const saveButton = event.target.closest("[data-save-menu]");
  const deleteButton = event.target.closest("[data-delete-menu]");
  if (saveButton) {
    const itemId = saveButton.dataset.saveMenu;
    const payload = {
      name: String(document.querySelector(`[data-menu-name="${itemId}"]`)?.value || "").trim(),
      description: String(document.querySelector(`[data-menu-description="${itemId}"]`)?.value || "").trim(),
      category: String(document.querySelector(`[data-menu-category="${itemId}"]`)?.value || "").trim(),
      stockCount: Number(document.querySelector(`[data-menu-stock="${itemId}"]`)?.value),
    };

    try {
      saveButton.disabled = true;
      await adminRequest(`/api/admin/menu/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      markAdminSeen();
      await loadDashboard();
    } catch (error) {
      alert(error.message);
    } finally {
      saveButton.disabled = false;
    }
    return;
  }
  if (!deleteButton) return;
  if (!confirm("Remove this menu item from the site?")) return;

  try {
    await adminRequest(`/api/admin/menu/${deleteButton.dataset.deleteMenu}`, {
      method: "DELETE",
    });
    markAdminSeen();
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
});

menuAddForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    name: document.querySelector("#menuName").value.trim(),
    price: Number(document.querySelector("#menuPrice").value),
    category: document.querySelector("#menuCategory").value.trim(),
    stockCount: Number(menuStockCount?.value),
    description: document.querySelector("#menuDescription").value.trim(),
  };

  try {
    await adminRequest("/api/admin/menu", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    menuAddForm.reset();
    if (menuStockCount) menuStockCount.value = "20";
    markAdminSeen();
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
});

addCategoryButton?.addEventListener("click", async () => {
  const value = normalizeCategoryName(newCategoryName?.value);
  if (!value) return;
  try {
    await saveCategories([...configuredCategories, value]);
    if (newCategoryName) newCategoryName.value = "";
    markAdminSeen();
  } catch (error) {
    alert(error.message);
  }
});

categoryManager?.addEventListener("click", async (event) => {
  const remove = event.target.closest("[data-remove-category]");
  if (!remove) return;
  const category = remove.dataset.removeCategory;
  try {
    await saveCategories(configuredCategories.filter((entry) => entry.toLowerCase() !== String(category || "").toLowerCase()));
    markAdminSeen();
  } catch (error) {
    alert(error.message);
  }
});

historyFilters?.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await loadHistory();
  } catch (error) {
    alert(error.message);
  }
});

adminUseCurrentLocation?.addEventListener("click", () => {
  if (!navigator.geolocation) {
    setAdminLocationStatus("Browser does not support location access.");
    return;
  }
  setAdminLocationStatus("Requesting location...");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      setAdminLocation(position.coords.latitude, position.coords.longitude, "");
    },
    () => {
      setAdminLocationStatus("Could not get current location. Tap map to set manually.");
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
  );
});

adminSaveLocation?.addEventListener("click", async () => {
  if (!selectedAdminLocation) {
    setAdminLocationStatus("Please pick a location first.");
    return;
  }
  try {
    await adminRequest("/api/admin/location", {
      method: "PUT",
      body: JSON.stringify({ location: selectedAdminLocation }),
    });
    setAdminLocationStatus("Store location saved.");
  } catch (error) {
    setAdminLocationStatus(error.message);
  }
});

if (getAdminPin()) {
  loadDashboard();
  refreshTimer = setInterval(pollDashboard, 60_000);
}

document.addEventListener("pointerdown", (event) => {
  const trigger = event.target.closest(
    "button, a, input[type='button'], input[type='submit'], [role='button']",
  );
  if (!trigger) return;
  vibrateTap(8, "selection");
});

document.addEventListener("click", (event) => {
  const trigger = event.target.closest(
    "button, a, input[type='button'], input[type='submit'], [role='button']",
  );
  if (!trigger) return;
  vibrateTap(10, "light");
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    markAdminSeen();
    if (getAdminPin()) pollDashboard();
  }
});
