const BUSINESS = {
  name: "Sujaan Bites",
  upiId: "6301000409@kotakbank",
  upiPayeeName: "Sujaan Bites",
  whatsappNumber: "9493480594",
  customerCareEmail: "sujaanbites@gmail.com",
  deliveryFee: 49,
};

const API_BASE = (() => {
  const configured = String(window.__API_BASE || window.__API_BASE__ || "").trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    return window.location.origin.replace(/\/+$/, "");
  }
  if (window.location.protocol === "file:") {
    return "http://localhost:3000";
  }
  return "";
})();

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
  cart: "spiceTableCart",
  recentPlacedOrder: "spiceTableRecentPlacedOrder",
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
  activeTab: "profile",
  drawerOpen: false,
  editingAddressId: null,
  addressMode: null,
  selectedLocation: null,
  previousOrders: [],
  deliveryMeta: null,
  quotedTotals: null,
  quoteKey: "",
  quoteLoading: false,
  map: null,
  marker: null,
  loadingMenu: false,
  checkoutNeedsAccountConfirm: true,
};

const pageMode = document.body?.dataset.page || "home";
const isCartPage = pageMode === "cart";

const DEFAULT_MENU = [
  {
    id: "butter",
    name: "Butter Cookies",
    description: "Crisp, golden butter cookies with a light vanilla finish.",
    price: 120,
    category: "classic",
    image: "assets/cookie-butter.png",
    available: true,
    stockCount: 20,
  },
  {
    id: "choco-chip",
    name: "Chocolate Chip Cookies",
    description: "Soft-centred cookies loaded with rich chocolate chips.",
    price: 150,
    category: "chocolate",
    image: "assets/cookie-chocolate.png",
    available: true,
    stockCount: 20,
  },
  {
    id: "oatmeal",
    name: "Oatmeal Raisin Cookies",
    description: "Chewy oats with raisins and a warm cinnamon note.",
    price: 130,
    category: "classic",
    image: "assets/cookie-butter.png",
    available: true,
    stockCount: 20,
  },
  {
    id: "filled-biscuit",
    name: "Stuffed Jam Cookies",
    description: "Tender cookies with a sweet strawberry jam centre.",
    price: 160,
    category: "stuffed",
    image: "assets/cookie-jam.png",
    available: true,
    stockCount: 20,
  },
  {
    id: "brownie-bite",
    name: "Chocolate Fudge Cookies",
    description: "Dense cocoa cookies with a fudgy brownie-like bite.",
    price: 170,
    category: "chocolate",
    image: "assets/cookie-chocolate.png",
    available: true,
    stockCount: 20,
  },
  {
    id: "gift-pack",
    name: "Assorted Cookie Box",
    description: "A mixed box of 12 cookies, perfect for gifting.",
    price: 420,
    category: "packs",
    image: "assets/hero-food.png",
    available: true,
    stockCount: 20,
  },
];

const menuGrid = document.querySelector("#menuGrid");
const menuFilters = document.querySelector("#menuFilters");
const orderShell = document.querySelector("#orderShell");
const accountButton = document.querySelector("#accountButton");
const heroAccountButton = document.querySelector("#heroAccountButton");
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
const trackingItems = document.querySelector("#trackingItems");
const trackingTotal = document.querySelector("#trackingTotal");
const trackingAddress = document.querySelector("#trackingAddress");
const customerMessageDialog = document.querySelector("#customerMessageDialog");
const customerMessageText = document.querySelector("#customerMessageText");
const closeCustomerMessageDialog = document.querySelector("#closeCustomerMessageDialog");
const menuFab = document.querySelector("#menuFab");
const menuFabSheet = document.querySelector("#menuFabSheet");
const menuFabBackdrop = document.querySelector("#menuFabBackdrop");
const itemPreviewOverlay = document.querySelector("#itemPreviewOverlay");
const itemPreviewClose = document.querySelector("#itemPreviewClose");
const itemPreviewImage = document.querySelector("#itemPreviewImage");
const itemPreviewName = document.querySelector("#itemPreviewName");
const itemPreviewPrice = document.querySelector("#itemPreviewPrice");
const itemPreviewDescription = document.querySelector("#itemPreviewDescription");
const itemPreviewMoreInfo = document.querySelector("#itemPreviewMoreInfo");
const itemPreviewAdd = document.querySelector("#itemPreviewAdd");
const itemPreviewBuyNow = document.querySelector("#itemPreviewBuyNow");
const flavorOverlay = document.querySelector("#flavorOverlay");
const flavorClose = document.querySelector("#flavorClose");
const flavorTitle = document.querySelector("#flavorTitle");
const flavorSubtitle = document.querySelector("#flavorSubtitle");
const flavorOptions = document.querySelector("#flavorOptions");
const cartToast = document.querySelector("#cartToast");
const cartToastText = document.querySelector("#cartToastText");
const cartToastAction = document.querySelector("#cartToastAction");
const cartPageEmpty = document.querySelector("#cartPageEmpty");
const cartPageContent = document.querySelector("#cartPageContent");
const cartPageFooter = document.querySelector("#cartPageFooter");
const cartPagePayLabel = document.querySelector("#cartPagePayLabel");
const cartSummaryPayable = document.querySelector("#cartSummaryPayable");
const cartPagePaymentMethodText = document.querySelector("#cartPagePaymentMethodText");
const paymentOptionInputs = document.querySelectorAll("[data-payment-option]");

let trackingMap = null;
let trackingLayerGroup = null;
let trackingOpen = false;
let trackingCurrentOrder = null;
let previewItemId = null;
let activeFlavorKey = null;

function vibrate(pattern = 12) {
  if (!navigator.vibrate) return;
  navigator.vibrate(pattern);
}

function pulseElement(element) {
  if (!element) return;
  element.classList.remove("tap-pop");
  // Force reflow so repeated taps replay the animation.
  void element.offsetWidth;
  element.classList.add("tap-pop");
  window.setTimeout(() => element.classList.remove("tap-pop"), 220);
}

function formatPrice(value) {
  return currency.format(value || 0);
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

function withinServiceArea(location) {
  return Boolean(location && Number.isFinite(location.lat) && Number.isFinite(location.lng));
}

function normalizeCategory(value) {
  return String(value || "").trim().toLowerCase();
}

function parseMenuVariantName(name) {
  const [base, variant] = String(name || "").split(/\s+-\s+/, 2);
  return {
    flavor: (base || String(name || "")).trim(),
    variant: (variant || "Single").trim(),
  };
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

function getMenuStock(item) {
  const parsed = Number(item?.stockCount);
  if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
  return 20;
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

function getRoute(path) {
  if (window.location.protocol === "file:") {
    return path === "/" ? "index.html" : `${String(path).replace(/^\/+/, "")}.html`;
  }
  return path;
}

function syncPageRoutes() {
  document.querySelectorAll("[data-route]").forEach((node) => {
    const route = node.dataset.route;
    if (!route) return;
    if ("href" in node) {
      node.href = getRoute(route);
    }
  });
}

function persistCart() {
  const snapshot = [...state.cart.entries()]
    .filter(([, quantity]) => Number(quantity) > 0)
    .map(([id, quantity]) => [id, quantity]);
  writeStoredJson(STORAGE_KEYS.cart, snapshot);
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
  localStorage.removeItem(STORAGE_KEYS.lastAcceptedOrderShown);
  localStorage.removeItem(STORAGE_KEYS.lastCustomerMessageShown);
  localStorage.removeItem(STORAGE_KEYS.lastCancelledOrderShown);
  localStorage.removeItem(STORAGE_KEYS.lastCompletedOrderShown);
  localStorage.removeItem(STORAGE_KEYS.lastDeliveryRatingShown);
  localStorage.removeItem(STORAGE_KEYS.lastProductRatingShown);
  localStorage.removeItem(STORAGE_KEYS.cart);
  state.cart.clear();
}

function formatReceivedAddressLine(address) {
  if (!address) return "Address not available";
  const line = [address.houseNumber, address.streetName, address.address].filter(Boolean).join(", ");
  const label = address.type ? `${address.type}: ` : "";
  return `${label}${line || "Address not available"}`;
}

function closeOrderReceivedCard() {
  orderReceivedOverlay?.classList.add("hidden");
}

function showPlacedOrderNotice(order) {
  if (!orderReceivedOverlay || !orderReceivedAddress || !orderReceivedEta) return;
  if (orderReceivedTitle) orderReceivedTitle.textContent = "Order placed";
  if (orderReceivedSymbol) orderReceivedSymbol.textContent = "✓";
  orderReceivedIcon?.classList.remove("cancelled");
  orderReceivedAddress.textContent = formatReceivedAddressLine(order?.address);
  orderReceivedEta.textContent = "Payment successful. The restaurant will confirm your order shortly.";
  orderReceivedOverlay.classList.remove("hidden");
}

function openOrderReceivedCard(order) {
  if (!orderReceivedOverlay || !orderReceivedAddress || !orderReceivedEta) return;
  const cancelled = order?.status === "cancelled";
  const completed = order?.status === "completed";
  const isLongDistance = order?.deliveryMeta?.isLongDistance === true || order?.deliveryWindow === "3-7 days";
  if (orderReceivedTitle) {
    orderReceivedTitle.textContent = cancelled
      ? "Order Update"
      : completed
        ? "Delivery Completed"
        : "Yay! Restaurant Accepted Your Order";
  }
  if (orderReceivedSymbol) {
    orderReceivedSymbol.textContent = cancelled ? "✕" : "✓";
  }
  orderReceivedIcon?.classList.toggle("cancelled", cancelled);
  orderReceivedAddress.textContent = formatReceivedAddressLine(order.address);
  orderReceivedEta.textContent = cancelled
    ? "The order can not be delivered"
    : completed
      ? "Delivery completed. Please rate the delivery and products."
      : isLongDistance
        ? "The order will be delivered within 3-7 days."
        : order.etaMinutes && Number.isFinite(Number(order.etaMinutes))
        ? `${Math.round(Number(order.etaMinutes))} minutes to reach your location`
        : "Your order is confirmed by the restaurant.";
  orderReceivedOverlay.classList.remove("hidden");
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

function getLatestOrder(orders) {
  return [...(orders || [])]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .find(Boolean);
}

function getTrackableOrder(orders) {
  return getLatestOrder(orders);
}

function renderDeliveryRatingItems(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (productRatingSummary) {
    productRatingSummary.textContent = items.length
      ? `Ordered items: ${items.map((item) => `${item.name} x ${item.quantity}`).join(", ")}`
      : "Ordered items will appear here.";
  }
  if (!productRatingItems) return;
  productRatingItems.innerHTML = items
    .map(
      (item) => `
        <label class="rating-item">
          <span>How was the taste of cookies? (${item.name} x ${item.quantity})</span>
          <input type="hidden" data-product-rating-input="${item.id}" value="0" />
          <div class="star-rating" data-product-rating="${item.id}" data-rating-target="product-${item.id}" role="radiogroup" aria-label="Rating for ${item.name}">
            <button type="button" class="star-button" data-star-value="1" aria-label="1 star">★</button>
            <button type="button" class="star-button" data-star-value="2" aria-label="2 stars">★</button>
            <button type="button" class="star-button" data-star-value="3" aria-label="3 stars">★</button>
            <button type="button" class="star-button" data-star-value="4" aria-label="4 stars">★</button>
            <button type="button" class="star-button" data-star-value="5" aria-label="5 stars">★</button>
          </div>
        </label>
      `,
    )
    .join("");
}

function paintStarRating(container, rating) {
  const safe = Math.max(0, Math.min(5, Number(rating) || 0));
  container.querySelectorAll(".star-button").forEach((starButton) => {
    const value = Number(starButton.dataset.starValue || 0);
    const active = value <= safe;
    starButton.classList.toggle("active", active);
    starButton.setAttribute("aria-checked", active ? "true" : "false");
  });
}

function setRatingFromStarButton(button) {
  const container = button.closest(".star-rating");
  if (!container) return;
  const value = Math.max(1, Math.min(5, Number(button.dataset.starValue || 0)));
  if (!Number.isFinite(value)) return;
  const target = container.dataset.ratingTarget || "";
  if (target === "deliveryRatingInput") {
    if (deliveryRatingInput) deliveryRatingInput.value = String(value);
  } else if (target.startsWith("product-")) {
    const id = target.replace("product-", "");
    const hiddenInput = productRatingItems?.querySelector(`[data-product-rating-input="${id}"]`);
    if (hiddenInput) hiddenInput.value = String(value);
  }
  paintStarRating(container, value);
}

function promptDeliveryRating(order) {
  if (!order || order.status !== "completed") return;
  if (order.review?.deliveryRating) return;
  const marker = `${order.id}:${order.completedAt || order.updatedAt || order.createdAt}`;
  const shown = localStorage.getItem(STORAGE_KEYS.lastDeliveryRatingShown) || "";
  if (shown === marker) return;
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
  if (!Number.isFinite(completedAt)) return;
  if (Date.now() < completedAt + 5 * 60 * 1000) return;
  const marker = `${order.id}:${order.completedAt || order.updatedAt || order.createdAt}`;
  const shown = localStorage.getItem(STORAGE_KEYS.lastProductRatingShown) || "";
  if (shown === marker) return;
  localStorage.setItem(STORAGE_KEYS.lastProductRatingShown, marker);
  renderDeliveryRatingItems(order);
  productRatingItems?.querySelectorAll(".star-rating").forEach((node) => paintStarRating(node, 0));
  productRatingDialog?.showModal();
  if (productRatingComment) productRatingComment.value = "";
}

function maybeShowCustomerMessage(orders) {
  const latestWithMessage = [...(orders || [])]
    .sort((a, b) => new Date(b.customerMessageAt || b.updatedAt || b.createdAt) - new Date(a.customerMessageAt || a.updatedAt || a.createdAt))
    .find((order) => typeof order.customerMessage === "string" && order.customerMessage.trim());
  if (!latestWithMessage) return;
  const marker = `${latestWithMessage.id}:${latestWithMessage.customerMessageAt || latestWithMessage.customerMessage}`;
  const shown = localStorage.getItem(STORAGE_KEYS.lastCustomerMessageShown) || "";
  if (shown === marker) return;
  localStorage.setItem(STORAGE_KEYS.lastCustomerMessageShown, marker);
  if (customerMessageText) {
    customerMessageText.textContent = latestWithMessage.customerMessage;
  }
  customerMessageDialog?.showModal();
}

function statusLabel(status) {
  return String(status || "").replaceAll("_", " ");
}

function getEtaRemainingMinutes(order) {
  const eta = Number(order?.etaMinutes);
  if (!Number.isFinite(eta) || eta <= 0) return null;
  const startTime = new Date(order?.etaUpdatedAt || order?.acceptedAt || order?.updatedAt || order?.createdAt).getTime();
  if (!Number.isFinite(startTime)) return eta;
  const endTime = startTime + eta * 60 * 1000;
  const remainingMs = endTime - Date.now();
  return Math.max(0, Math.ceil(remainingMs / 60000));
}

function isEtaExpired(order) {
  const eta = Number(order?.etaMinutes);
  if (!Number.isFinite(eta) || eta <= 0) return false;
  const startTime = new Date(order?.etaUpdatedAt || order?.acceptedAt || order?.updatedAt || order?.createdAt).getTime();
  if (!Number.isFinite(startTime)) return false;
  const endTime = startTime + eta * 60 * 1000;
  return Date.now() >= endTime;
}

function updateTrackingEtaText(order) {
  if (!trackingEta || !trackingBarEta) return;
  if (!order) {
    trackingBarEta.textContent = "Estimated delivery time will appear here.";
    trackingEta.textContent = "";
    return;
  }

  if (order.status === "cancelled") {
    trackingBarEta.textContent = "Delivery issue update";
    trackingEta.textContent = order.rejectionReason || "Order cannot be delivered.";
    return;
  }

  if (order.status === "completed") {
    trackingBarEta.textContent = "Delivery completed";
    trackingEta.textContent = "Your order has been delivered. Please check your rating popups.";
    return;
  }

  if (["pending_admin_acceptance", "received"].includes(order.status)) {
    trackingBarEta.textContent = "Waiting for restaurant confirmation";
    trackingEta.textContent = "Your order was placed successfully. The restaurant will confirm it soon.";
    return;
  }

  if (!Number.isFinite(Number(order?.etaMinutes)) || Number(order.etaMinutes) <= 0) {
    if (order?.deliveryMeta?.isLongDistance === true || order?.deliveryWindow === "3-7 days") {
      trackingBarEta.textContent = "Delivery in 3-7 days";
      trackingEta.textContent = "The order will be delivered within 3-7 days. Delivery charge is calculated by distance.";
      return;
    }
    trackingBarEta.textContent = "Order confirmed by restaurant";
    trackingEta.textContent = "Your order is confirmed by the restaurant. Delivery agent will call you for address and time confirmation.";
    return;
  }

  if (isEtaExpired(order)) {
    trackingBarEta.textContent = "Order on the way";
    trackingEta.textContent = "Delivery agent will call you with latest arrival update.";
    return;
  }

  const eta = Math.round(Number(order.etaMinutes));
  trackingBarEta.textContent = `${eta} min to your location`;
  trackingEta.textContent = `${eta} minutes to reach your location (estimated). Delivery agent will call you for address and time confirmation.`;
}

function renderTrackingMap(order) {
  if (!trackingMapEl || !window.L) return;
  trackingCurrentOrder = order || null;
  const customerPin = order?.address?.location;
  const restaurantPin = order?.restaurantLocation;
  if (!customerPin || !Number.isFinite(customerPin.lat) || !Number.isFinite(customerPin.lng)) {
    trackingMapEl.innerHTML = "<p class='empty'>Map unavailable for this order.</p>";
    return;
  }

  if (!trackingMap) {
    trackingMap = L.map(trackingMapEl).setView([customerPin.lat, customerPin.lng], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(trackingMap);
    trackingLayerGroup = L.layerGroup().addTo(trackingMap);
  } else {
    trackingMap.invalidateSize();
    trackingLayerGroup.clearLayers();
  }

  const customerMarker = L.marker([customerPin.lat, customerPin.lng]).bindPopup("Customer address");
  trackingLayerGroup.addLayer(customerMarker);

  if (restaurantPin && Number.isFinite(restaurantPin.lat) && Number.isFinite(restaurantPin.lng)) {
    const restaurantMarker = L.marker([restaurantPin.lat, restaurantPin.lng]).bindPopup("Restaurant location");
    const routeLine = L.polyline(
      [
        [restaurantPin.lat, restaurantPin.lng],
        [customerPin.lat, customerPin.lng],
      ],
      { color: "#ef5707", weight: 4, opacity: 0.9 },
    );
    trackingLayerGroup.addLayer(restaurantMarker);
    trackingLayerGroup.addLayer(routeLine);
    trackingMap.fitBounds(routeLine.getBounds(), {
      padding: [28, 28],
      maxZoom: 15,
    });
  } else {
    trackingMap.setView([customerPin.lat, customerPin.lng], 14);
  }
}

function renderTrackingPanel(order) {
  if (!trackingDock) return;
  const isTerminal = order?.status === "completed" || order?.status === "cancelled";
  if (!order || isTerminal) {
    trackingDock.classList.add("hidden");
    trackingOpen = false;
    trackingSheet?.classList.add("hidden");
    trackingToggle?.setAttribute("aria-expanded", "false");
    if (isTerminal) {
      trackingCurrentOrder = null;
    }
    return;
  }

  trackingDock.classList.remove("hidden");
  const title =
    order.status === "cancelled"
      ? "Order update"
      : order.status === "completed"
        ? "Delivery completed"
        : ["pending_admin_acceptance", "received"].includes(order.status)
          ? "Order placed"
          : "Order confirmed";
  trackingBarTitle.textContent = title;
  trackingStatusPill.textContent = statusLabel(order.status);
  trackingStatusPill.className = `tracking-toggle-right ${order.status || ""}`;
  updateTrackingEtaText(order);

  trackingReceiptId.textContent = `Order ID: ${order.id}`;
  trackingItems.innerHTML = (order.items || [])
    .map((item) => `<li>${item.name} x ${item.quantity} — ${formatPrice(item.lineTotal || item.price * item.quantity)}</li>`)
    .join("");
  trackingTotal.textContent = `Total: ${formatPrice(order?.totals?.total || 0)} (${statusLabel(order.paymentMethod)})`;
  trackingAddress.textContent = formatAddressLine(order.address);
  trackingSheet?.classList.toggle("hidden", !trackingOpen);
  trackingToggle?.setAttribute("aria-expanded", trackingOpen ? "true" : "false");
  if (trackingOpen) {
    renderTrackingMap(order);
  }
}

function loadLocalState() {
  state.profile = readStoredJson(STORAGE_KEYS.profile) || null;
  state.addresses = readStoredJson(STORAGE_KEYS.addresses) || [];
  state.selectedAddressId = localStorage.getItem(STORAGE_KEYS.selectedAddressId) || null;
  const storedCart = readStoredJson(STORAGE_KEYS.cart);
  state.cart = new Map(Array.isArray(storedCart) ? storedCart.filter((entry) => Array.isArray(entry) && entry.length === 2) : []);

  if (!state.selectedAddressId && state.addresses.length > 0) {
    state.selectedAddressId = state.addresses[0].id;
  }

  if (state.addresses.length > 0) {
    localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
  }

  const fallbackAddress = state.addresses.find((entry) => entry.id === state.selectedAddressId) || state.addresses[0] || null;
  const fallbackName = String(state.profile?.name || fallbackAddress?.name || "").trim();
  const fallbackPhone = normalizePhone(state.profile?.phone || fallbackAddress?.phone || "");
  if (fallbackName || fallbackPhone.length === 10) {
    state.profile = {
      name: fallbackName,
      phone: fallbackPhone,
    };
    writeStoredJson(STORAGE_KEYS.profile, state.profile);
  }
}

async function loadCustomerState() {
  const phone = getResolvedCustomerProfile()?.phone || getActiveAddress()?.phone;
  if (!phone) return;

  try {
    const result = await apiRequest(`/api/customer/state?phone=${encodeURIComponent(phone)}`);
    if (result.profile || Array.isArray(result.addresses)) {
      state.profile = result.profile || state.profile;
      state.addresses = Array.isArray(result.addresses) ? result.addresses.slice(0, MAX_ADDRESSES) : state.addresses;
      state.selectedAddressId = result.selectedAddressId || state.addresses[0]?.id || state.selectedAddressId;
      const resolved = getResolvedCustomerProfile();
      if (resolved) state.profile = resolved;
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
  const resolved = getResolvedCustomerProfile();
  if (!resolved?.phone) return;

  try {
    const result = await apiRequest("/api/customer/state", {
      method: "PUT",
      body: JSON.stringify({
        phone: resolved.phone,
        profile: resolved,
        addresses: state.addresses,
        selectedAddressId: state.selectedAddressId,
      }),
    });

    if (result.profile || Array.isArray(result.addresses)) {
      state.profile = result.profile || state.profile;
      state.addresses = Array.isArray(result.addresses) ? result.addresses.slice(0, MAX_ADDRESSES) : state.addresses;
      state.selectedAddressId = result.selectedAddressId || state.addresses[0]?.id || state.selectedAddressId;
      const nextResolved = getResolvedCustomerProfile();
      if (nextResolved) state.profile = nextResolved;
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

function getResolvedCustomerProfile() {
  const activeAddress = getActiveAddress();
  const name = String(state.profile?.name || activeAddress?.name || "").trim();
  const phone = normalizePhone(state.profile?.phone || activeAddress?.phone || "");
  if (!name && phone.length !== 10) return null;
  return { name, phone };
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

  return fetch(`${API_BASE}${path}`, { ...options, headers }).then(async (response) => {
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

function getMenuCategories() {
  if (Array.isArray(state.menuCategories) && state.menuCategories.length) {
    return [
      { id: "all", label: "All" },
      ...state.menuCategories.map((category) => ({
        id: normalizeCategory(category),
        label: formatCategoryLabel(category),
      })),
    ];
  }

  const categories = new Map();
  for (const item of state.menu) {
    const normalized = normalizeCategory(item.category);
    if (!normalized || categories.has(normalized)) continue;
    categories.set(normalized, formatCategoryLabel(item.category));
  }
  return [{ id: "all", label: "All" }, ...[...categories.entries()].map(([id, label]) => ({ id, label }))];
}

function getFlavorGroups(items) {
  const groups = new Map();
  for (const item of items) {
    const parsed = parseMenuVariantName(item.name);
    const key = `${normalizeCategory(item.category)}::${parsed.flavor.toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        category: item.category,
        flavor: parsed.flavor,
        description: item.description,
        image: item.image || "assets/hero-food.png",
        variants: [],
      });
    }
    groups.get(key).variants.push({
      ...item,
      variantLabel: parsed.variant,
    });
  }
  for (const group of groups.values()) {
    group.variants.sort((a, b) => a.price - b.price);
  }
  return [...groups.values()];
}

function renderFilters() {
  if (!menuFilters) return;
  const categories = getMenuCategories();
  menuFilters.innerHTML = categories
    .map(
      (category) => `
        <button class="filter ${state.activeCategory === category.id ? "active" : ""}" type="button" data-category="${category.id}">
          ${category.label}
        </button>
      `,
    )
    .join("");
}

function syncCartToStock() {
  let changed = false;
  for (const [id, quantity] of [...state.cart.entries()]) {
    const item = state.menu.find((dish) => dish.id === id);
    const stock = getMenuStock(item);
    if (!item || item.available === false || stock <= 0) {
      state.cart.delete(id);
      changed = true;
      continue;
    }
    if (quantity > stock) {
      state.cart.set(id, stock);
      changed = true;
    }
  }
  if (changed) {
    persistCart();
    renderCart();
  }
}

function renderMenu() {
  if (!menuGrid) return;
  const activeCategory = normalizeCategory(state.activeCategory) || "all";
  const dishes = state.menu.filter((item) => {
    const category = normalizeCategory(item.category);
    return activeCategory === "all" || category === activeCategory;
  });
  const flavorGroups = getFlavorGroups(dishes);
  const grouped = new Map();
  for (const group of flavorGroups) {
    const key = formatCategoryLabel(group.category || "Menu");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(group);
  }

  menuGrid.innerHTML = [...grouped.entries()]
    .map(([section, sectionGroups]) => {
      const cards = sectionGroups
        .map((group) => {
        const totalQuantity = group.variants.reduce((sum, item) => sum + (state.cart.get(item.id) || 0), 0);
        const soldOut = group.variants.every((item) => item.available === false || getMenuStock(item) <= 0);
        const startingPrice = Math.min(...group.variants.map((item) => Number(item.price) || 0));
        return `
        <article class="dish-card flavor-card ${soldOut ? "unavailable" : ""}" data-flavor-key="${group.key}">
          <img class="dish-image" src="${group.image || "assets/hero-food.png"}" alt="${group.flavor}" />
          ${soldOut ? '<span class="next-available-chip">Next available at 9:30 am</span>' : ""}
          <div class="dish-top">
            <h3>${group.flavor}</h3>
            <span class="price price-line">From ${formatPrice(startingPrice)}</span>
          </div>
          <div class="dish-actions">
            <span class="availability ${soldOut ? "off" : "on"}">
              ${soldOut ? "Sold out" : `${group.variants.length} size options`}
            </span>
            <button class="add-button" type="button" data-open-flavor="${group.key}" ${soldOut ? "disabled" : ""}>
              ${totalQuantity > 0 ? `${totalQuantity} added` : "Choose"}
            </button>
          </div>
        </article>
      `;
        })
        .join("");
      return `
        <section class="menu-section" data-menu-section="${section}">
          <h3>${section}</h3>
          <div class="menu-section-grid">${cards}</div>
        </section>
      `;
    })
    .join("");
  renderMenuFabSheet();
}

function renderMenuFabSheet() {
  if (!menuFabSheet) return;
  const sections = [...new Set(state.menu.map((item) => formatCategoryLabel(item.category || "Menu")))];
  menuFabSheet.innerHTML = sections
    .map((section) => `<button type="button" data-menu-section-target="${section}">${section}</button>`)
    .join("");
}

function openFlavorMenu(flavorKey) {
  if (!flavorOverlay || !flavorOptions) return;
  const group = getFlavorGroups(state.menu).find((entry) => entry.key === flavorKey);
  if (!group) return;
  activeFlavorKey = flavorKey;
  if (flavorTitle) flavorTitle.textContent = group.flavor;
  if (flavorSubtitle) flavorSubtitle.textContent = formatCategoryLabel(group.category || "");
  flavorOptions.innerHTML = group.variants
    .map((item) => {
      const quantity = state.cart.get(item.id) || 0;
      const stockCount = getMenuStock(item);
      const soldOut = item.available === false || stockCount <= 0;
      return `
        <div class="flavor-option ${soldOut ? "unavailable" : ""}">
          <div class="flavor-option-copy">
            <strong>${item.variantLabel}</strong>
            <small>${formatPrice(item.price)}</small>
          </div>
          ${
            soldOut
              ? `<button class="add-button compact" type="button" disabled>Sold out</button>`
              : quantity > 0
                ? `
                  <div class="menu-quantity compact" aria-label="Quantity for ${item.name}">
                    <button type="button" data-menu-decrease="${item.id}" aria-label="Remove one ${item.name}">−</button>
                    <span>${quantity}</span>
                    <button type="button" data-menu-increase="${item.id}" aria-label="Add one ${item.name}" ${quantity >= stockCount ? "disabled" : ""}>+</button>
                  </div>
                `
                : `<button class="add-button compact" type="button" data-add="${item.id}">Add</button>`
          }
        </div>
      `;
    })
    .join("");
  flavorOverlay.classList.remove("hidden");
  flavorOverlay.classList.add("show");
  flavorOverlay.setAttribute("aria-hidden", "false");
}

function closeFlavorMenu() {
  if (!flavorOverlay) return;
  flavorOverlay.classList.remove("show");
  flavorOverlay.classList.add("hidden");
  flavorOverlay.setAttribute("aria-hidden", "true");
  activeFlavorKey = null;
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

function getSinglePieceCount(rows) {
  return (rows || []).reduce((sum, item) => {
    const label = String(item?.name || "").toLowerCase();
    const isSingle = label.includes("single") || label.includes("(1 pc)") || label.includes("1 pc");
    return sum + (isSingle ? Number(item.quantity || 0) : 0);
  }, 0);
}

function getQuoteKey(rows, address) {
  if (!rows.length || !address) return "";
  return JSON.stringify({
    a: address.id || null,
    lat: Number(address?.location?.lat || 0),
    lng: Number(address?.location?.lng || 0),
    i: rows.map((item) => [item.id, Number(item.quantity || 0)]),
  });
}

async function ensureDeliveryQuote() {
  const rows = getCartRows();
  const address = getActiveAddress();
  const hasAddressPin = Boolean(address?.location && Number.isFinite(Number(address.location.lat)) && Number.isFinite(Number(address.location.lng)));
  const nextKey = hasAddressPin ? getQuoteKey(rows, address) : "";

  if (!rows.length || !nextKey) {
    state.deliveryMeta = null;
    state.quotedTotals = null;
    state.quoteKey = "";
    return;
  }

  if (state.quoteLoading || state.quoteKey === nextKey) return;
  state.quoteLoading = true;
  state.quoteKey = nextKey;
  try {
    const payload = await apiRequest("/api/delivery/quote", {
      method: "POST",
      body: JSON.stringify({
        orderType: "delivery",
        address,
        items: rows.map((item) => ({ id: item.id, quantity: item.quantity })),
      }),
    });
    if (state.quoteKey !== nextKey) return;
    state.deliveryMeta = payload.deliveryMeta || null;
    state.quotedTotals = payload.totals || null;
    renderCart();
  } catch (error) {
    console.warn("Delivery quote failed:", error.message);
    if (state.quoteKey === nextKey) {
      state.quoteKey = "";
      state.quoteLoading = false;
      state.deliveryMeta = null;
      state.quotedTotals = null;
    }
  } finally {
    if (state.quoteKey === nextKey) {
      state.quoteLoading = false;
    }
  }
}

function getTotals() {
  const rows = getCartRows();
  const subtotal = rows.reduce((sum, item) => sum + item.lineTotal, 0);
  const quantity = rows.reduce((sum, item) => sum + item.quantity, 0);
  const activeAddress = getActiveAddress();
  const activeKey = activeAddress ? getQuoteKey(rows, activeAddress) : "";
  const canUseQuote = Boolean(
    activeKey &&
    state.quoteKey === activeKey &&
    state.quotedTotals &&
    Number.isFinite(Number(state.quotedTotals.total)),
  );
  const delivery = canUseQuote ? Number(state.quotedTotals.delivery || 0) : 0;
  const total = canUseQuote ? Number(state.quotedTotals.total || 0) : subtotal + delivery;
  return {
    rows,
    subtotal,
    delivery,
    total,
    quantity,
    singlePieceCount: getSinglePieceCount(rows),
  };
}

function renderCart() {
  void ensureDeliveryQuote();
  const totals = getTotals();
  if (itemCount) itemCount.textContent = `${totals.quantity} ${totals.quantity === 1 ? "item" : "items"}`;
  if (subtotalEl) subtotalEl.textContent = formatPrice(totals.subtotal);
  if (deliveryFeeEl) deliveryFeeEl.textContent = formatPrice(totals.delivery);
  if (grandTotalEl) grandTotalEl.textContent = formatPrice(totals.total);

  if (cartItems) {
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
            <button type="button" data-increase="${item.id}" aria-label="Add one ${item.name}" ${item.quantity >= getMenuStock(item) ? "disabled" : ""}>+</button>
          </div>
        </div>
      `,
        )
        .join("");
    }
  }

  if (selectedAddressText) {
    selectedAddressText.textContent = formatAddressLine(getActiveAddress());
  }

  if (cartSummaryPayable) {
    cartSummaryPayable.textContent = formatPrice(totals.total);
  }

  const deliveryCardTitle = document.querySelector("#deliveryEtaLabel");
  const deliveryCardSub = document.querySelector("#deliveryEtaHint");
  if (deliveryCardTitle && deliveryCardSub) {
    if (state.deliveryMeta?.isLongDistance) {
      deliveryCardTitle.textContent = "Delivery in 3-7 days";
      const distanceText = Number.isFinite(Number(state.deliveryMeta.distanceKm))
        ? `${Math.round(Number(state.deliveryMeta.distanceKm))} km from restaurant`
        : "Far from restaurant location";
      deliveryCardSub.textContent = `${distanceText}. Delivery charge auto-calculated.`;
    } else {
      deliveryCardTitle.textContent = "Delivery ETA after confirmation";
      deliveryCardSub.textContent = "Restaurant confirms the delivery time after order acceptance.";
    }
  }

  if (cartPagePayLabel) {
    cartPagePayLabel.textContent = totals.total > 0 ? `Pay ${formatPrice(totals.total)}` : "Pay ₹0";
  }

  if (cartPageEmpty && cartPageContent && cartPageFooter) {
    const hasItems = totals.quantity > 0;
    cartPageEmpty.classList.toggle("hidden", hasItems);
    cartPageContent.classList.toggle("hidden", !hasItems);
    cartPageFooter.classList.toggle("hidden", !hasItems);
  }

  if (cartToast && cartToastText) {
    if (totals.quantity > 0) {
      cartToastText.textContent = `${totals.quantity} ${totals.quantity === 1 ? "Item" : "Items"} added`;
      cartToast.classList.remove("hidden");
      cartToast.classList.add("show");
    } else {
      cartToast.classList.remove("show");
      cartToast.classList.add("hidden");
    }
  }
}

function updateQuantity(id, change) {
  const item = state.menu.find((dish) => dish.id === id);
  if (!item) return;
  const stockCount = getMenuStock(item);
  if ((item.available === false || stockCount <= 0) && change > 0) {
    alert(`${item.name} is sold out right now.`);
    return;
  }
  const current = state.cart.get(id) || 0;
  const next = Math.max(0, current + change);
  if (change > 0 && next > stockCount) {
    alert(`You have reached the available stock for ${item.name}.`);
    return;
  }
  if (next === 0) {
    state.cart.delete(id);
  } else {
    state.cart.set(id, next);
  }
  persistCart();
  state.checkoutNeedsAccountConfirm = true;
  renderCart();
  renderMenu();
  if (activeFlavorKey) {
    openFlavorMenu(activeFlavorKey);
  }
}

function renderProfileSetup() {
  const existing = getResolvedCustomerProfile() || state.profile || {};
  const savedAddress = state.addresses[0] || null;
  const selectedAddress = getActiveAddress();
  const hasSavedIdentity = Boolean(existing?.name || existing?.phone || state.addresses.length);

  accountShellTitle.textContent = hasSavedIdentity ? "Your details" : "Complete your details";

  if (!hasSavedIdentity || state.addressMode === "profile") {
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
          (order) => {
            const deliveryLine =
              order.status === "cancelled"
                ? "Order cannot be delivered."
                : order?.deliveryMeta?.isLongDistance === true || order?.deliveryWindow === "3-7 days"
                  ? "Delivery in 3-7 days"
                : order.etaMinutes
                  ? `${order.etaMinutes} minutes to reach your location`
                  : "";
            return `
            <article class="history-card">
              <strong>${order.id} - ${formatPrice(order.totals.total)}</strong>
              <span>${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))}</span>
              <span>Status: ${String(order.status || "").replaceAll("_", " ")}</span>
              <span>Payment: ${String(order.paymentStatus || "").replaceAll("_", " ")}</span>
              ${deliveryLine ? `<span>${deliveryLine}</span>` : ""}
              <span>${order.items.map((item) => `${item.name} x ${item.quantity}`).join(", ")}</span>
            </article>
          `;
          },
        )
        .join("")}
    </div>
  `;
}

function calculateSpends(orders) {
  return (orders || []).reduce(
    (acc, order) => {
      if (order?.status === "cancelled") return acc;
      const amount = Number(order?.totals?.total || 0);
      acc.total += amount;
      acc.upi += amount;
      return acc;
    },
    { total: 0, upi: 0 },
  );
}

function renderSpendsTab() {
  accountShellTitle.textContent = "Past spends";
  const spends = calculateSpends(state.previousOrders);
  const totalOrders = state.previousOrders.filter((order) => order?.status !== "cancelled").length;

  accountContent.innerHTML = `
    <div class="spend-summary">
      <article class="spend-card total">
        <strong>${formatPrice(spends.total)}</strong>
        <small>Total spend (COD + UPI combined)</small>
      </article>
      <article class="spend-card">
        <strong>${formatPrice(spends.upi)}</strong>
        <small>Prepaid UPI spend</small>
      </article>
      <article class="spend-card total">
        <strong>${totalOrders}</strong>
        <small>Completed/active orders counted</small>
      </article>
    </div>
  `;
}

function renderCareTab() {
  accountShellTitle.textContent = "Customer care";
  accountContent.innerHTML = `
    <div class="saved-user">
      <strong>Need help?</strong>
      <p>Call ${BUSINESS.whatsappNumber} or email ${BUSINESS.customerCareEmail}. Share your order ID for faster help.</p>
      <div class="customer-care-actions">
        <a class="secondary-link" href="tel:${BUSINESS.whatsappNumber}">Call now</a>
        <a class="secondary-link" href="https://wa.me/91${BUSINESS.whatsappNumber}?text=${encodeURIComponent("Hi Sujaan Bites, I need help with my order.")}" target="_blank" rel="noreferrer">WhatsApp</a>
        <a class="secondary-link" href="mailto:${BUSINESS.customerCareEmail}">Email us</a>
      </div>
    </div>
  `;
}

function renderAccount() {
  if (!accountShell || !accountOverlay || !accountContent) return;
  accountShell.classList.toggle("open", state.drawerOpen);
  accountOverlay.classList.toggle("open", state.drawerOpen);
  accountLogoutButton?.classList.toggle("hidden", !getResolvedCustomerProfile());

  accountTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.accountTab === state.activeTab);
  });

  if (state.activeTab === "profile") {
    renderProfileSetup();
  } else if (state.activeTab === "addresses") {
    renderAddresses();
  } else if (state.activeTab === "orders") {
    renderOrdersTab();
  } else if (state.activeTab === "spends") {
    renderSpendsTab();
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
  const activeAddress = getActiveAddress();
  if (customerName) customerName.value = state.profile?.name || activeAddress?.name || "";
  if (customerPhone) customerPhone.value = state.profile?.phone || activeAddress?.phone || "";
  if (paymentMethod && !paymentMethod.value) {
    paymentMethod.value = "prepaid";
  }
  if (selectedAddressText) {
    selectedAddressText.textContent = formatAddressLine(getActiveAddress());
  }
}

async function loadMenu() {
  if (state.loadingMenu) return;
  state.loadingMenu = true;
  if (menuGrid) {
    menuGrid.innerHTML = '<div class="menu-loading">Loading fresh bakes...</div>';
  }
  try {
    const result = await apiRequest("/api/menu");
    state.menu = result.menu || [];
    state.menuCategories = Array.isArray(result.categories) ? result.categories : [];
    const availableCategories = new Set(state.menu.map((item) => normalizeCategory(item.category)).filter(Boolean));
    if (state.activeCategory !== "all" && !availableCategories.has(normalizeCategory(state.activeCategory))) {
      state.activeCategory = "all";
    }
    renderFilters();
    syncCartToStock();
    renderMenu();
    renderCart();
  } catch (error) {
    console.error(error);
    if (menuGrid) {
      menuGrid.innerHTML = '<div class="menu-loading">We could not load the menu right now.</div>';
    }
  } finally {
    state.loadingMenu = false;
  }
}

async function loadPreviousOrders() {
  const phone = getResolvedCustomerProfile()?.phone || getActiveAddress()?.phone;
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
      (error) => {
        useLocationButton.disabled = false;
        useLocationButton.textContent = "Try current location";
        if (state.selectedLocation) {
          setLocationMessage(`Pin already saved at ${state.selectedLocation.lat.toFixed(5)}, ${state.selectedLocation.lng.toFixed(5)}. Tap map to update if needed.`);
          return;
        }
        if (error?.code === 1) {
          setLocationMessage("Current location is blocked in browser settings. You can still tap the map to place your delivery pin.");
        } else if (error?.code === 2 || error?.code === 3) {
          setLocationMessage("Could not fetch current location right now. Please try again or tap the map to place your delivery pin.");
        } else {
          setLocationMessage("Current location is unavailable. Tap the map to place your delivery pin.");
        }
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
  const existingRecord = state.editingAddressId
    ? state.addresses.find((entry) => entry.id === state.editingAddressId)
    : null;
  const record = {
    id: state.editingAddressId || Date.now().toString(),
    name: profile.name || existingRecord?.name || getActiveAddress()?.name || "",
    phone: profile.phone || existingRecord?.phone || getActiveAddress()?.phone || "",
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

async function createPrepaidIntent() {
  await ensureDeliveryQuote();
  const activeAddress = getActiveAddress();
  const resolvedName = state.profile?.name || activeAddress?.name || "";
  const resolvedPhone = normalizePhone(state.profile?.phone || activeAddress?.phone || "");
  if (!activeAddress || !resolvedName || resolvedPhone.length !== 10) {
    openDrawer();
    state.activeTab = "profile";
    renderAccount();
    throw new Error("Please save your details before ordering.");
  }

  const payload = {
    customerName: resolvedName,
    customerPhone: resolvedPhone,
    orderType: "delivery",
    address: { ...activeAddress, name: activeAddress.name || resolvedName, phone: activeAddress.phone || resolvedPhone },
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
      name: state.profile?.name || getActiveAddress()?.name || "",
      contact: state.profile?.phone || getActiveAddress()?.phone || "",
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

        paymentSummary.textContent = `${result.order.id} payment verified. Waiting for restaurant confirmation.`;
        adminNotice.textContent = "Payment verified by the server.";
        razorpayRetryButton?.classList.add("hidden");
        state.cart.clear();
        persistCart();
        writeStoredJson(STORAGE_KEYS.recentPlacedOrder, {
          id: result.order.id,
          address: result.order.address,
          createdAt: result.order.createdAt,
        });
        await loadPreviousOrders();
        await loadOrdersForAccount();
        renderCart();
        paymentDialog?.close();
        window.location.href = getRoute("/");
      } catch (error) {
        paymentSummary.textContent = `Payment response received, but verification failed. ${error.message}`;
        razorpayRetryButton?.classList.remove("hidden");
      }
    },
    modal: {
      ondismiss: () => {
        paymentSummary.textContent = "Payment failed or was closed. Please try again.";
        adminNotice.textContent = "No order was created because the payment was not completed.";
        razorpayRetryButton?.classList.remove("hidden");
      },
    },
  });

  if (razorpayRetryButton) {
    razorpayRetryButton.onclick = () => checkoutInstance.open();
  }
  checkoutInstance.open();
}

async function handleCheckout(event) {
  event.preventDefault();

  await ensureDeliveryQuote();
  const activeAddress = getActiveAddress();
  const hasName = Boolean(state.profile?.name || activeAddress?.name);
  const hasPhone = normalizePhone(state.profile?.phone || activeAddress?.phone || "").length === 10;
  if (!activeAddress || !hasName || !hasPhone) {
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
  if (totals.singlePieceCount > 0 && totals.singlePieceCount < 3) {
    alert("Atleast 3 pieces to purchase single pieces");
    return;
  }

  try {
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
  if (!getResolvedCustomerProfile()?.phone) {
    state.previousOrders = [];
    renderTrackingPanel(null);
    return;
  }

  try {
    const result = await apiRequest("/api/orders/my");
    state.previousOrders = result.orders || [];
    maybeShowCustomerMessage(state.previousOrders);
    const latestOrder = getLatestOrder(state.previousOrders);
    maybeShowCancelledOrder(latestOrder);
    maybeShowAcceptedOrder(latestOrder);
    maybeShowCompletedOrder(latestOrder);
    if (latestOrder?.status === "completed") {
      const completedMarker = `${latestOrder.id}:${latestOrder.completedAt || latestOrder.updatedAt || latestOrder.createdAt}`;
      const completedAt = new Date(latestOrder.completedAt || latestOrder.updatedAt || latestOrder.createdAt).getTime();
      const deliveryShown = localStorage.getItem(STORAGE_KEYS.lastDeliveryRatingShown) === completedMarker;
      const productShown = localStorage.getItem(STORAGE_KEYS.lastProductRatingShown) === completedMarker;

      if (!latestOrder.review?.deliveryRating && !deliveryShown && (!Number.isFinite(completedAt) || Date.now() < completedAt + 5 * 60 * 1000)) {
        promptDeliveryRating(latestOrder);
      } else if (!latestOrder.review?.productRatings?.length && !productShown && Number.isFinite(completedAt) && Date.now() >= completedAt + 5 * 60 * 1000) {
        promptProductRating(latestOrder);
      }
    }
    renderTrackingPanel(latestOrder);
  } catch {
    state.previousOrders = [];
    renderTrackingPanel(null);
  }
}

accountButton.addEventListener("click", () => {
  state.drawerOpen = true;
  renderAccount();
});

heroAccountButton?.addEventListener("click", () => {
  state.drawerOpen = true;
  renderAccount();
});

closeSidebarBtn.addEventListener("click", closeDrawer);
accountOverlay.addEventListener("click", closeDrawer);

accountTabs.forEach((tab) => {
  tab.addEventListener("click", async () => {
    state.activeTab = tab.dataset.accountTab;
    state.drawerOpen = true;
    if (state.activeTab === "orders" || state.activeTab === "spends") {
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

paymentOptionInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (paymentMethod) {
      paymentMethod.value = input.value;
    }
    if (cartPagePaymentMethodText) {
      cartPagePaymentMethodText.textContent = input.value === "card" ? "Debit / Credit card" : "UPI / Razorpay";
    }
    paymentOptionInputs.forEach((node) => {
      node.closest(".payment-option")?.classList.toggle("active", node.checked);
    });
  });
});

menuFilters?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  pulseElement(button);
  vibrate(10);
  state.activeCategory = normalizeCategory(button.dataset.category) || "all";
  renderFilters();
  renderMenu();
});

menuGrid?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  const increase = event.target.closest("[data-menu-increase]");
  const decrease = event.target.closest("[data-menu-decrease]");
  const openFlavor = event.target.closest("[data-open-flavor]");
  const card = event.target.closest(".flavor-card");
  const actionTap = button || increase || decrease;
  if (openFlavor) {
    openFlavorMenu(openFlavor.dataset.openFlavor);
  } else if (!actionTap && card?.dataset.flavorKey) {
    openFlavorMenu(card.dataset.flavorKey);
  }
  const trigger = button || increase || decrease || openFlavor || card;
  if (trigger) {
    pulseElement(trigger);
    vibrate(12);
  }
  if (button) updateQuantity(button.dataset.add, 1);
  if (increase) updateQuantity(increase.dataset.menuIncrease, 1);
  if (decrease) updateQuantity(decrease.dataset.menuDecrease, -1);
  state.checkoutNeedsAccountConfirm = true;
});

function openItemPreview(item) {
  if (!itemPreviewOverlay || !itemPreviewImage || !itemPreviewName || !itemPreviewPrice || !itemPreviewAdd || !itemPreviewBuyNow) return;
  previewItemId = item.id;
  itemPreviewImage.src = item.image || "assets/hero-food.png";
  itemPreviewImage.alt = item.name;
  itemPreviewName.textContent = item.name;
  itemPreviewPrice.textContent = formatPrice(item.price);
  if (itemPreviewDescription) itemPreviewDescription.value = item.description || "Freshly prepared cookie with a rich homemade feel.";
  if (itemPreviewMoreInfo) itemPreviewMoreInfo.href = `${getRoute("/product-info")}?item=${encodeURIComponent(item.id)}`;
  itemPreviewOverlay.classList.remove("hidden");
  itemPreviewOverlay.classList.add("show");
  itemPreviewOverlay.setAttribute("aria-hidden", "false");
}

function closeItemPreview() {
  if (!itemPreviewOverlay) return;
  itemPreviewOverlay.classList.remove("show");
  window.setTimeout(() => {
    itemPreviewOverlay.classList.add("hidden");
    itemPreviewOverlay.setAttribute("aria-hidden", "true");
  }, 180);
  previewItemId = null;
}

function toggleMenuFab(open) {
  if (!menuFab || !menuFabSheet || !menuFabBackdrop) return;
  const shouldOpen = open ?? menuFabSheet.classList.contains("hidden");
  menuFabSheet.classList.toggle("hidden", !shouldOpen);
  menuFabBackdrop.classList.toggle("hidden", !shouldOpen);
  menuFab.classList.toggle("hidden", shouldOpen);
  menuFab.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
}

menuFab?.addEventListener("click", () => {
  vibrate(12);
  toggleMenuFab();
});

menuFabBackdrop?.addEventListener("click", () => toggleMenuFab(false));

menuFabSheet?.addEventListener("click", (event) => {
  const target = event.target.closest("[data-menu-section-target]");
  if (!target) return;
  const section = target.dataset.menuSectionTarget;
  const el = document.querySelector(`[data-menu-section="${section}"]`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  vibrate(10);
  toggleMenuFab(false);
});

itemPreviewClose?.addEventListener("click", closeItemPreview);
itemPreviewOverlay?.addEventListener("click", (event) => {
  if (event.target === itemPreviewOverlay) closeItemPreview();
});
itemPreviewAdd?.addEventListener("click", () => {
  if (!previewItemId) return;
  updateQuantity(previewItemId, 1);
  closeItemPreview();
});

itemPreviewBuyNow?.addEventListener("click", () => {
  if (!previewItemId) return;
  updateQuantity(previewItemId, 1);
  closeItemPreview();
  window.location.href = getRoute("/cart");
});

flavorClose?.addEventListener("click", closeFlavorMenu);
flavorOverlay?.addEventListener("click", (event) => {
  if (event.target === flavorOverlay) closeFlavorMenu();
});
flavorOptions?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  const increase = event.target.closest("[data-menu-increase]");
  const decrease = event.target.closest("[data-menu-decrease]");
  const trigger = button || increase || decrease;
  if (!trigger) return;
  pulseElement(trigger);
  vibrate(10);
  if (button) updateQuantity(button.dataset.add, 1);
  if (increase) updateQuantity(increase.dataset.menuIncrease, 1);
  if (decrease) updateQuantity(decrease.dataset.menuDecrease, -1);
});

cartItems?.addEventListener("click", (event) => {
  const increase = event.target.closest("[data-increase]");
  const decrease = event.target.closest("[data-decrease]");
  const trigger = increase || decrease;
  if (trigger) {
    pulseElement(trigger);
    vibrate(10);
  }
  if (increase) updateQuantity(increase.dataset.increase, 1);
  if (decrease) updateQuantity(decrease.dataset.decrease, -1);
  state.checkoutNeedsAccountConfirm = true;
});

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("button, .primary-link, .secondary-link, .filter, .account-tab");
  if (!trigger) return;
  pulseElement(trigger);
  vibrate(8);
});

checkout?.addEventListener("submit", handleCheckout);
closeOrderReceivedOverlay?.addEventListener("click", closeOrderReceivedCard);
orderReceivedOverlay?.addEventListener("click", (event) => {
  if (event.target === orderReceivedOverlay) closeOrderReceivedCard();
});
trackingToggle?.addEventListener("click", () => {
  trackingOpen = !trackingOpen;
  trackingSheet?.classList.toggle("hidden", !trackingOpen);
  trackingToggle.setAttribute("aria-expanded", trackingOpen ? "true" : "false");
  if (trackingOpen) {
    setTimeout(() => {
      trackingMap?.invalidateSize();
      if (trackingCurrentOrder) {
        renderTrackingMap(trackingCurrentOrder);
      }
    }, 160);
  }
});
closeCustomerMessageDialog?.addEventListener("click", () => customerMessageDialog?.close());
deliveryRatingDialog?.addEventListener("click", (event) => {
  const starButton = event.target.closest(".star-button");
  if (starButton) setRatingFromStarButton(starButton);
});
productRatingDialog?.addEventListener("click", (event) => {
  const starButton = event.target.closest(".star-button");
  if (starButton) setRatingFromStarButton(starButton);
});

deliveryRatingForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const order = getLatestOrder(state.previousOrders);
  if (!order) return;
  const selected = Number(deliveryRatingInput?.value || 0);
  if (!Number.isFinite(selected) || selected < 1 || selected > 5) {
    alert("Please choose a star rating.");
    return;
  }

  const payload = {
    type: "delivery",
    deliveryRating: selected,
    deliveryComment: deliveryRatingComment?.value || "",
  };

  try {
    await apiRequest(`/api/orders/${order.id}/reviews`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    localStorage.removeItem(STORAGE_KEYS.lastDeliveryRatingShown);
    deliveryRatingDialog?.close();
    await loadOrdersForAccount();
  } catch (error) {
    alert(error.message);
  }
});

productRatingForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const order = getLatestOrder(state.previousOrders);
  if (!order) return;

  const productRatings = Array.from(productRatingItems?.querySelectorAll("[data-product-rating-input]") || []).map((input) => ({
    id: input.dataset.productRatingInput,
    rating: Number(input.value || 0),
  }));
  const invalid = productRatings.find((entry) => !Number.isFinite(entry.rating) || entry.rating < 1 || entry.rating > 5);
  if (invalid) {
    alert("Please rate every ordered item with stars.");
    return;
  }

  try {
    await apiRequest(`/api/orders/${order.id}/reviews`, {
      method: "POST",
      body: JSON.stringify({
        type: "products",
        productRatings,
        productComment: productRatingComment?.value || "",
      }),
    });
    localStorage.removeItem(STORAGE_KEYS.lastProductRatingShown);
    productRatingDialog?.close();
    await loadOrdersForAccount();
  } catch (error) {
    alert(error.message);
  }
});

async function boot() {
  syncPageRoutes();
  loadLocalState();
  await loadCustomerState();
  state.drawerOpen = false;
  state.activeTab = "profile";
  renderAccount();
  renderCart();
  await loadMenu();
  if (getResolvedCustomerProfile()?.phone) {
    await loadOrdersForAccount();
  }
  const recentPlacedOrder = readStoredJson(STORAGE_KEYS.recentPlacedOrder);
  if (recentPlacedOrder && !isCartPage) {
    showPlacedOrderNotice(recentPlacedOrder);
    localStorage.removeItem(STORAGE_KEYS.recentPlacedOrder);
  }
  renderAccount();
  setInterval(loadMenu, 300000);
  setInterval(async () => {
    if (!getResolvedCustomerProfile()?.phone) return;
    await loadOrdersForAccount();
    if (state.activeTab === "orders" || state.activeTab === "spends") renderAccount();
  }, 45000);
}

boot();
