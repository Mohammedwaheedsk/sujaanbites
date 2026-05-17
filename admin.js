const ADMIN_STORAGE_KEY = "spiceTableAdminPin";

const loginPanel = document.querySelector("#loginPanel");
const dashboardPanel = document.querySelector("#dashboardPanel");
const adminLoginForm = document.querySelector("#adminLoginForm");
const adminPin = document.querySelector("#adminPin");
const adminLoginMessage = document.querySelector("#adminLoginMessage");
const refreshOrders = document.querySelector("#refreshOrders");
const adminLogout = document.querySelector("#adminLogout");
const adminStats = document.querySelector("#adminStats");
const ordersList = document.querySelector("#ordersList");
const menuManager = document.querySelector("#menuManager");
const menuAddForm = document.querySelector("#menuAddForm");
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

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatPrice(value) {
  return currency.format(value || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getAdminPin() {
  return localStorage.getItem(ADMIN_STORAGE_KEY) || "";
}

async function adminRequest(path, options = {}) {
  const response = await fetch(path, {
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
  const actionable = orders.filter((order) => ["pending_admin_acceptance", "received"].includes(order.status));
  const revenue = orders
    .filter((order) => order.paymentStatus === "captured" || order.paymentMethod === "cod")
    .reduce((sum, order) => sum + order.totals.total, 0);

  adminStats.innerHTML = `
    <div class="stat-card"><strong>${orders.length}</strong><span>Total orders</span></div>
    <div class="stat-card"><strong>${actionable.length}</strong><span>Need acceptance</span></div>
    <div class="stat-card"><strong>${formatPrice(revenue)}</strong><span>Paid or COD value</span></div>
  `;
}

function renderOrders(orders) {
  if (!orders.length) {
    ordersList.innerHTML = '<p class="empty">No orders yet.</p>';
    return;
  }

  ordersList.innerHTML = orders.map(renderOrder).join("");
}

function renderOrder(order) {
  const address = order.address || {};
  const mapsUrl = address.location
    ? `https://www.google.com/maps/search/?api=1&query=${address.location.lat},${address.location.lng}`
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
            Verified at: ${order.paymentVerifiedAt ? formatDate(order.paymentVerifiedAt) : "-"}
          </p>
        </div>
      </div>

      <div class="order-controls">
        <button class="secondary-button" type="button" data-order-action="accept" data-order-id="${order.id}">Accept</button>
        <button class="secondary-button danger" type="button" data-order-action="reject" data-order-id="${order.id}">Reject</button>
        <input type="number" min="1" placeholder="ETA (min)" data-eta-for="${order.id}" />
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

function renderMenuManager(menu) {
  if (!menu.length) {
    menuManager.innerHTML = '<p class="empty">No menu items found.</p>';
    return;
  }

  menuManager.innerHTML = menu
    .map(
      (item) => `
        <article class="menu-item-card">
          <div>
            <strong>${item.name}</strong>
            <p>${item.description}</p>
          </div>
          <div class="menu-item-actions">
            <span class="availability ${item.available === false ? "off" : "on"}">
              ${item.available === false ? "Unavailable" : "Available"}
            </span>
            <label class="toggle">
              <input type="checkbox" data-toggle-availability="${item.id}" ${item.available === false ? "" : "checked"} />
              <span>Visible to customers</span>
            </label>
            <button class="secondary-button danger" type="button" data-delete-menu="${item.id}">Remove item</button>
          </div>
        </article>
      `,
    )
    .join("");
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
    const [ordersPayload, menuPayload, locationPayload] = await Promise.all([
      adminRequest("/api/admin/orders"),
      adminRequest("/api/admin/menu"),
      adminRequest("/api/admin/location"),
    ]);
    showDashboard(true);
    renderStats(ordersPayload.orders || []);
    renderOrders(ordersPayload.orders || []);
    renderMenuManager(menuPayload.menu || []);
    initAdminLocationMap(locationPayload.adminLocation || null);
    await loadHistory();
  } catch (error) {
    showDashboard(false);
    adminLoginMessage.textContent = error.message;
  }
}

adminLoginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  localStorage.setItem(ADMIN_STORAGE_KEY, adminPin.value.trim());
  await loadDashboard();
});

refreshOrders.addEventListener("click", loadDashboard);

adminLogout.addEventListener("click", () => {
  localStorage.removeItem(ADMIN_STORAGE_KEY);
  showDashboard(false);
});

ordersList.addEventListener("click", async (event) => {
  const acceptButton = event.target.closest("[data-order-action='accept']");
  const rejectButton = event.target.closest("[data-order-action='reject']");
  const saveButton = event.target.closest("[data-save-status]");
  const target = acceptButton || rejectButton || saveButton;
  if (!target) return;

  const orderId = target.dataset.orderId || target.dataset.saveStatus;
  const status =
    acceptButton ? "accepted" : rejectButton ? "cancelled" : document.querySelector(`[data-status-for="${orderId}"]`).value;
  const etaInput = document.querySelector(`[data-eta-for="${orderId}"]`);
  let etaMinutes = Number(etaInput?.value);
  if (status === "accepted" && (!Number.isFinite(etaMinutes) || etaMinutes <= 0)) {
    const etaPrompt = prompt("Enter delivery time in minutes for customer:");
    etaMinutes = Number(etaPrompt);
  }
  const payload = { status };
  if (status === "accepted" && Number.isFinite(etaMinutes) && etaMinutes > 0) {
    payload.etaMinutes = etaMinutes;
  } else if (status === "accepted") {
    alert("Please enter a valid ETA in minutes.");
    return;
  }

  target.disabled = true;
  try {
    await adminRequest(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
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
    await loadDashboard();
  } catch (error) {
    alert(error.message);
  }
});

menuManager.addEventListener("click", async (event) => {
  const deleteButton = event.target.closest("[data-delete-menu]");
  if (!deleteButton) return;
  if (!confirm("Remove this menu item from the site?")) return;

  try {
    await adminRequest(`/api/admin/menu/${deleteButton.dataset.deleteMenu}`, {
      method: "DELETE",
    });
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
    image: document.querySelector("#menuImage").value.trim(),
    description: document.querySelector("#menuDescription").value.trim(),
  };

  try {
    await adminRequest("/api/admin/menu", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    menuAddForm.reset();
    await loadDashboard();
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
}
