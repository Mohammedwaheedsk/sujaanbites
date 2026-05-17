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

async function loadDashboard() {
  try {
    const [ordersPayload, menuPayload] = await Promise.all([
      adminRequest("/api/admin/orders"),
      adminRequest("/api/admin/menu"),
    ]);
    showDashboard(true);
    renderStats(ordersPayload.orders || []);
    renderOrders(ordersPayload.orders || []);
    renderMenuManager(menuPayload.menu || []);
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

if (getAdminPin()) {
  loadDashboard();
}
