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
  profile: "sujaanBitesProfile",
  addresses: "sujaanBitesAddresses",
  selectedAddressId: "sujaanBitesSelectedAddressId",
  cart: "sujaanBitesCart",
  recentPlacedOrder: "sujaanBitesRecentPlacedOrder",
  lastAcceptedOrderShown: "sujaanBitesLastAcceptedOrderShown",
  lastCustomerMessageShown: "sujaanBitesLastCustomerMessageShown",
  lastCancelledOrderShown: "sujaanBitesLastCancelledOrderShown",
  lastCompletedOrderShown: "sujaanBitesLastCompletedOrderShown",
  lastDeliveryRatingShown: "sujaanBitesLastDeliveryRatingShown",
  lastProductRatingShown: "sujaanBitesLastProductRatingShown",
  couponCode: "sujaanBitesCouponCode",
  sessionToken: "sujaanBitesSessionToken",
  deviceId: "sujaanBitesDeviceId",
  theme: "sujaanBitesTheme",
};

function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEYS.theme) === "dark" ? "dark" : "light";
}

function applyTheme(theme, options = {}) {
  const { persist = true } = options;
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", nextTheme);
  document.documentElement.style.colorScheme = nextTheme;
  document.querySelectorAll(".theme-icon").forEach((icon) => {
    icon.textContent = nextTheme === "dark" ? "☀" : "◑";
  });
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", nextTheme === "dark" ? "#0c0806" : "#FAF6F0");
  if (persist) localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  applyTheme(currentTheme === "dark" ? "light" : "dark");
}

applyTheme(getStoredTheme(), { persist: false });

const state = {
  menu: [],
  menuCategories: [],
  offersConfig: null,
  activeCategory: "all",
  cart: new Map(),
  profile: null,
  addresses: [],
  selectedAddressId: null,
  activeTab: "dashboard",
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
  couponCode: "",
  searchTerm: "",
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
const accountOpenButtons = document.querySelectorAll("[data-open-account]");
const searchOpenButtons = document.querySelectorAll("[data-open-search]");
const searchDock = document.querySelector("#searchDock");
const searchBackdrop = document.querySelector("#searchBackdrop");
const searchCloseButton = document.querySelector("#searchCloseButton");
const menuSearchInput = document.querySelector("#menuSearchInput");
const searchResults = document.querySelector("#searchResults");
const accountOverlay = document.querySelector("#accountOverlay");
const accountShell = document.querySelector("#accountShell");
const accountLogoutButton = document.querySelector("#accountLogoutButton");
const closeSidebarBtn = document.querySelector("#closeSidebarBtn");
const accountShellTitle = document.querySelector("#accountShellTitle");
const accountContent = {
  get innerHTML() {
    return document.querySelector("#accountContent")?.innerHTML || "";
  },
  set innerHTML(html) {
    const primary = document.querySelector("#accountContent");
    const secondary = document.querySelector("#accountPanelContent");
    if (primary) primary.innerHTML = html;
    if (secondary) secondary.innerHTML = html;
  },
  addEventListener(event, handler, options) {
    const primary = document.querySelector("#accountContent");
    const secondary = document.querySelector("#accountPanelContent");
    primary?.addEventListener(event, handler, options);
    secondary?.addEventListener(event, handler, options);
  }
};
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
const checkoutAddressPicker = document.querySelector("#checkoutAddressPicker");
const checkoutAddressSelect = document.querySelector("#checkoutAddressSelect");
const manageAddressesButton = document.querySelector("#manageAddressesButton");
const couponCodeInput = document.querySelector("#couponCodeInput");
const applyCouponButton = document.querySelector("#applyCouponButton");
const clearCouponButton = document.querySelector("#clearCouponButton");
const couponStatus = document.querySelector("#couponStatus");
const freeDeliveryProgressBar = document.querySelector("#freeDeliveryProgressBar");
const freeDeliveryProgressLabel = document.querySelector("#freeDeliveryProgressLabel");
const freeDeliveryProgressRemaining = document.querySelector("#freeDeliveryProgressRemaining");
const discountRow = document.querySelector("#discountRow");
const couponDiscount = document.querySelector("#couponDiscount");
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
const flavorOverlay = document.querySelector("#flavorOverlay");
const flavorClose = document.querySelector("#flavorClose");
const flavorTitle = document.querySelector("#flavorTitle");
const flavorSubtitle = document.querySelector("#flavorSubtitle");
const flavorOptions = document.querySelector("#flavorOptions");
const cartToast = document.querySelector("#cartToast");
const cartToastText = document.querySelector("#cartToastText");
const cartToastAction = document.querySelector("#cartToastAction");
const reviewStage = document.querySelector(".review-video-stage");
const reviewCards = Array.from(document.querySelectorAll("[data-review-card]"));
const reviewVideos = Array.from(document.querySelectorAll(".review-video"));
const reviewMuteButtons = Array.from(document.querySelectorAll("[data-review-mute]"));
const cartPageEmpty = document.querySelector("#cartPageEmpty");
const cartPageContent = document.querySelector("#cartPageContent");
const cartPageFooter = document.querySelector("#cartPageFooter");
const cartPagePayLabel = document.querySelector("#cartPagePayLabel");
const cartSummaryPayable = document.querySelector("#cartSummaryPayable");
const cartPagePaymentMethodText = document.querySelector("#cartPagePaymentMethodText");
const paymentOptionInputs = document.querySelectorAll("[data-payment-option]");
const cartPanelOverlay = document.querySelector("#cartPanelOverlay");
const cartPanel = document.querySelector("#cartPanel");
const cartPanelClose = document.querySelector("#cartPanelClose");
const bottomTabs = document.querySelectorAll("[data-bottom-tab]");
const bottomNavIndicator = document.querySelector("#bottomNavIndicator");
const homePanel = document.querySelector("#homePanel");
const reorderPanel = document.querySelector("#reorderPanel");
const reorderList = document.querySelector("#reorderList");

let trackingMap = null;
let trackingLayerGroup = null;
let trackingOpen = false;
let trackingCurrentOrder = null;
let previewItemId = null;
let activeFlavorKey = null;
let selectedFlavorVariantId = null;
let lastVibrateAt = 0;
let navDragActive = false;
let navDragPointerId = null;
let navDragOriginX = 0;
let navDragOriginY = 0;
let navDragMoved = false;
let navDragSuppressClick = false;

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

function vibrate(pattern = 12, kind = "light") {
  const now = Date.now();
  if (now - lastVibrateAt < 35) return;
  lastVibrateAt = now;
  if (fireTelegramHaptic(kind)) return;
  if (typeof navigator?.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // no-op on browsers that block vibration
  }
}

function pulseElement(element) {
  if (!element) return;
  element.classList.remove("tap-pop");
  // Force reflow so repeated taps replay the animation.
  void element.offsetWidth;
  element.classList.add("tap-pop");
  window.setTimeout(() => element.classList.remove("tap-pop"), 220);
}

let activeReviewIndex = Math.max(0, reviewCards.findIndex((card) => card.classList.contains("review-video-card--active")));
let reviewMuted = true;
let reviewAutoTimer = null;
let reviewDragStartX = 0;
let reviewDragStartY = 0;
let reviewDragging = false;
const REVIEW_VIDEO_CONTENT = [
  {
    name: "Aarav K.",
    review: "Fresh cookies, careful packing, and the box reached in perfect condition.",
    rating: "★★★★★"
  },
  {
    name: "Riya S.",
    review: "The Double Chocolate box was rich, gooey, and worth every bite. Delivery felt smooth from start to finish.",
    rating: "★★★★★"
  },
  {
    name: "Mihir P.",
    review: "Loved the soft centre and premium taste. The cookies felt bakery-fresh even after the ride home.",
    rating: "★★★★☆"
  }
];

function getActiveReviewVideo() {
  return reviewCards[activeReviewIndex]?.querySelector(".review-video") || reviewVideos[reviewVideos.length - 1] || null;
}

function syncReviewVideoAudio(isMuted = reviewMuted) {
  reviewMuted = isMuted;
  const activeVideo = getActiveReviewVideo();
  reviewVideos.forEach((video) => {
    video.loop = true;
    video.playsInline = true;
    video.muted = video === activeVideo ? reviewMuted : true;
    video.volume = video === activeVideo && !reviewMuted ? 1 : 0;
    if (video === activeVideo) {
      video.play?.().catch(() => {});
    } else {
      video.pause?.();
      try {
        video.currentTime = 0;
      } catch {
        // Some browsers do not allow resetting video time until metadata is ready.
      }
    }
  });
  reviewMuteButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(!reviewMuted));
    button.setAttribute("aria-label", reviewMuted ? "Unmute review video" : "Mute review video");
    const icon = button.querySelector(".review-mute-icon");
    if (icon) icon.textContent = reviewMuted ? "🔇" : "🔊";
  });
}

function renderReviewStack(direction = "next") {
  const total = reviewCards.length;
  if (!total) return;
  reviewCards.forEach((card, index) => {
    const offset = (index - activeReviewIndex + total) % total;
    const review = REVIEW_VIDEO_CONTENT[index % REVIEW_VIDEO_CONTENT.length];
    const nameNode = card.querySelector("[data-review-name]");
    const textNode = card.querySelector("[data-review-text]");
    const ratingNode = card.querySelector("[data-review-rating]");
    if (nameNode) nameNode.textContent = review.name;
    if (textNode) textNode.textContent = review.review;
    if (ratingNode) {
      ratingNode.textContent = review.rating;
      ratingNode.setAttribute("aria-label", `${review.rating.replace(/☆/g, "").length} star rating`);
    }
    card.classList.remove(
      "review-video-card--active",
      "review-video-card--prev",
      "review-video-card--next",
      "review-video-card--back",
      "review-video-card--to-right",
      "review-video-card--to-left"
    );
    if (offset === 0) {
      card.classList.add("review-video-card--active");
      card.removeAttribute("aria-hidden");
    } else if (offset === 1) {
      card.classList.add("review-video-card--next");
      card.setAttribute("aria-hidden", "true");
    } else if (offset === total - 1) {
      card.classList.add("review-video-card--prev");
      card.setAttribute("aria-hidden", "true");
    } else {
      card.classList.add("review-video-card--back");
      card.setAttribute("aria-hidden", "true");
    }
  });
  syncReviewVideoAudio(reviewMuted);
}

function restartReviewAutoSlide() {
  window.clearTimeout(reviewAutoTimer);
  if (reviewCards.length < 2) return;
  reviewAutoTimer = window.setTimeout(() => {
    moveReviewStack("next", false);
  }, 7000);
}

function moveReviewStack(direction = "next", userInitiated = true) {
  if (reviewCards.length < 2) return;
  const total = reviewCards.length;
  const currentCard = reviewCards[activeReviewIndex];
  currentCard?.classList.add(direction === "next" ? "review-video-card--to-right" : "review-video-card--to-left");
  activeReviewIndex = direction === "next"
    ? (activeReviewIndex - 1 + total) % total
    : (activeReviewIndex + 1) % total;
  window.setTimeout(() => renderReviewStack(direction), 120);
  restartReviewAutoSlide();
  if (userInitiated) vibrate(8, "selection");
}

if (reviewVideos.length) {
  renderReviewStack("next");
  restartReviewAutoSlide();
}

reviewMuteButtons.forEach((button) => {
  button.addEventListener("click", () => {
    vibrate(10, "selection");
    syncReviewVideoAudio(!reviewMuted);
    restartReviewAutoSlide();
  });
});

reviewStage?.addEventListener("pointerdown", (event) => {
  if (event.target.closest("[data-review-mute]")) return;
  reviewDragging = true;
  reviewDragStartX = event.clientX;
  reviewDragStartY = event.clientY;
  reviewStage.classList.add("is-dragging");
  reviewStage.setPointerCapture?.(event.pointerId);
});

reviewStage?.addEventListener("pointermove", (event) => {
  if (!reviewDragging) return;
  const deltaX = event.clientX - reviewDragStartX;
  const deltaY = event.clientY - reviewDragStartY;
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
    event.preventDefault();
  }
  reviewStage.style.setProperty("--review-drag-x", `${Math.max(-48, Math.min(48, deltaX))}px`);
});

function finishReviewDrag(event) {
  if (!reviewDragging) return;
  const clientX = Number.isFinite(event.clientX) ? event.clientX : reviewDragStartX;
  const clientY = Number.isFinite(event.clientY) ? event.clientY : reviewDragStartY;
  const deltaX = clientX - reviewDragStartX;
  const deltaY = clientY - reviewDragStartY;
  reviewDragging = false;
  reviewStage?.classList.remove("is-dragging");
  reviewStage?.style.removeProperty("--review-drag-x");
  if (Math.abs(deltaX) > 46 && Math.abs(deltaX) > Math.abs(deltaY)) {
    moveReviewStack(deltaX > 0 ? "next" : "prev");
  } else {
    restartReviewAutoSlide();
  }
}

reviewStage?.addEventListener("pointerup", finishReviewDrag);
reviewStage?.addEventListener("pointercancel", finishReviewDrag);
reviewStage?.addEventListener("lostpointercapture", (event) => {
  if (reviewDragging) finishReviewDrag(event);
});

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

function normalizeCouponCode(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function randomId(prefix = "") {
  if (window.crypto?.randomUUID) return `${prefix}${window.crypto.randomUUID()}`;
  const block = () => Math.random().toString(36).slice(2);
  return `${prefix}${Date.now().toString(36)}-${block()}-${block()}`;
}

function getDeviceId() {
  let value = localStorage.getItem(STORAGE_KEYS.deviceId);
  if (!value) {
    value = randomId("dev_");
    localStorage.setItem(STORAGE_KEYS.deviceId, value);
  }
  return value;
}

function getSessionToken() {
  let value = localStorage.getItem(STORAGE_KEYS.sessionToken);
  if (!value) {
    value = randomId("sess_");
    localStorage.setItem(STORAGE_KEYS.sessionToken, value);
  }
  return value;
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
  localStorage.removeItem(STORAGE_KEYS.couponCode);
  localStorage.removeItem(STORAGE_KEYS.cart);
  localStorage.removeItem(STORAGE_KEYS.sessionToken);
  state.cart.clear();
  state.couponCode = "";
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
  state.couponCode = normalizeCouponCode(localStorage.getItem(STORAGE_KEYS.couponCode) || "");
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
    if (isSessionLockedError(error)) {
      explainSessionLock();
      clearSession();
      return;
    }
    console.warn("Customer state sync skipped:", error.message);
  }
}

async function syncCustomerState() {
  const resolved = getResolvedCustomerProfile();
  if (!resolved?.phone) return;

  const result = await apiRequest("/api/customer/state", {
    method: "PUT",
    body: JSON.stringify({
      phone: resolved.phone,
      profile: resolved,
      addresses: state.addresses,
      selectedAddressId: state.selectedAddressId,
      sessionToken: getSessionToken(),
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
}

function isSessionLockedError(error) {
  return error?.code === "SESSION_LOCKED" || Number(error?.status) === 409;
}

function explainSessionLock() {
  alert("This mobile number is already active on another device/browser. Please logout there first, then try again.");
}

function restoreLocalIdentity(snapshot) {
  if (!snapshot) return;
  state.profile = snapshot.profile;
  state.addresses = snapshot.addresses;
  state.selectedAddressId = snapshot.selectedAddressId;
  if (snapshot.profile) {
    writeStoredJson(STORAGE_KEYS.profile, snapshot.profile);
  } else {
    localStorage.removeItem(STORAGE_KEYS.profile);
  }
  writeStoredJson(STORAGE_KEYS.addresses, snapshot.addresses || []);
  if (snapshot.selectedAddressId) {
    localStorage.setItem(STORAGE_KEYS.selectedAddressId, snapshot.selectedAddressId);
  } else {
    localStorage.removeItem(STORAGE_KEYS.selectedAddressId);
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
  headers["x-customer-session"] = getSessionToken();
  headers["x-customer-device"] = getDeviceId();

  return fetch(`${API_BASE}${path}`, { ...options, headers }).then(async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || "Request failed");
      error.status = response.status;
      error.code = payload.code || "";
      throw error;
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

function openSearchDock() {
  if (!searchDock) return;
  window.setTimeout(() => menuSearchInput?.focus(), 80);
}

function closeSearchDock() {
  if (!searchDock) return;
}

function setBottomTab(tabName, animate = true) {
  bottomTabs.forEach((tab) => {
    const active = tab.dataset.bottomTab === tabName;
    tab.classList.toggle("active", active);
    if (active) {
      tab.setAttribute("aria-current", "page");
    } else {
      tab.removeAttribute("aria-current");
    }
  });
  positionBottomNavIndicator(tabName, animate);
}

function positionBottomNavIndicator(tabName, animate = true) {
  const activeTab = [...bottomTabs].find((tab) => tab.dataset.bottomTab === tabName);
  const nav = activeTab?.closest(".bottom-app-nav");
  if (!activeTab || !bottomNavIndicator || !nav) return;
  const navRect = nav.getBoundingClientRect();
  const tabRect = activeTab.getBoundingClientRect();
  const paddingLeft = parseFloat(getComputedStyle(nav).paddingLeft) || 0;
  const left = Math.max(0, Math.min(navRect.width - tabRect.width, tabRect.left - navRect.left - paddingLeft));
  bottomNavIndicator.style.transition = animate ? "" : "none";
  bottomNavIndicator.style.width = `${tabRect.width}px`;
  bottomNavIndicator.style.transform = `translateX(${Math.round(left)}px)`;
  if (!animate) {
    window.requestAnimationFrame(() => {
      if (bottomNavIndicator) bottomNavIndicator.style.transition = "";
    });
  }
}

function openCartPanel() {
  if (!cartPanel || !cartPanelOverlay) {
    window.location.href = getRoute("/cart");
    return;
  }
  closeSearchDock();
  if (state.drawerOpen) closeDrawer();
  closeFlavorMenu();
  closeItemPreview();
  renderCart();
  cartPanelOverlay.classList.remove("hidden");
  cartPanelOverlay.classList.add("show");
  cartPanel.classList.remove("hidden");
  cartPanel.classList.add("show");
  cartPanel.setAttribute("aria-hidden", "false");
  document.body.classList.add("cart-panel-open");
  setBottomTab("menu");
}

function closeCartPanel(nextTab = null) {
  if (!cartPanel || !cartPanelOverlay) return;
  cartPanel.classList.remove("show");
  cartPanelOverlay.classList.remove("show");
  cartPanel.setAttribute("aria-hidden", "true");
  document.body.classList.remove("cart-panel-open");
  window.setTimeout(() => {
    cartPanel.classList.add("hidden");
    cartPanelOverlay.classList.add("hidden");
  }, 180);
  if (nextTab) setBottomTab(nextTab);
}

function scrollPanelToTop(page) {
  if (!page) return;
  if (typeof page.scrollTo === "function") {
    page.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  page.scrollTop = 0;
}

function showMainPanels(tabName) {
  const pages = {
    home: document.getElementById("page-home"),
    menu: document.getElementById("page-menu"),
    account: document.getElementById("page-account"),
    search: document.getElementById("page-search"),
  };
  const reorderPanel = document.getElementById("reorderPanel");
  const orderShell = document.getElementById("orderShell");
  
  Object.values(pages).forEach(page => {
    if (page) page.classList.remove("active");
  });
  orderShell?.classList.toggle("hidden", tabName === "reorder");
  reorderPanel?.classList.toggle("hidden", tabName !== "reorder");

  if (tabName === "search" && pages.search) {
    pages.search.classList.add("active");
  } else if ((tabName === "menu" || tabName === "reorder") && pages.menu) {
    pages.menu.classList.add("active");
  } else if (tabName === "account" && pages.account) {
    pages.account.classList.add("active");
  } else if (pages.home) {
    pages.home.classList.add("active");
  }
}

function showHomePanel(options = {}) {
  const { scrollToTop = true, animate = true } = options;
  closeCartPanel();
  if (state.drawerOpen) closeDrawer();
  showMainPanels("home");
  if (scrollToTop) {
    const page = document.getElementById("page-home");
    scrollPanelToTop(page);
  }
  setBottomTab("home", animate);
}

function showMenuPanel(options = {}) {
  const { scrollToTop = true, animate = true } = options;
  closeCartPanel();
  if (state.drawerOpen) closeDrawer();
  showMainPanels("menu");
  if (scrollToTop) {
    const page = document.getElementById("page-menu");
    scrollPanelToTop(page);
  }
  setBottomTab("menu", animate);
}

function showReorderPanel(options = {}) {
  const { scrollToTop = true, animate = true } = options;
  closeCartPanel();
  if (state.drawerOpen) closeDrawer();
  renderReorderPanel();
  showMainPanels("reorder");
  if (scrollToTop) {
    const page = document.getElementById("page-menu");
    scrollPanelToTop(page);
  }
  setBottomTab("reorder", animate);
}

function showAccountPanel(options = {}) {
  const { scrollToTop = true, animate = true } = options;
  closeCartPanel();
  if (state.drawerOpen) closeDrawer();
  const hasProfile = getResolvedCustomerProfile() || state.profile;
  state.activeTab = hasProfile?.phone ? "dashboard" : "profile";
  state.addressMode = state.activeTab === "profile" ? "profile" : null;
  showMainPanels("account");
  renderAccount();
  if (scrollToTop) {
    const page = document.getElementById("page-account");
    scrollPanelToTop(page);
  }
  setBottomTab("account", animate);
}

function showSearchPanel(options = {}) {
  const { scrollToTop = true, animate = true } = options;
  closeCartPanel();
  showMainPanels("search");
  renderSearchResults();
  if (scrollToTop) {
    const page = document.getElementById("page-search");
    scrollPanelToTop(page);
  }
  window.setTimeout(() => document.getElementById("menuSearchInput")?.focus(), 80);
  setBottomTab("search", animate);
}

function openTabByName(tabName, options = {}) {
  if (tabName === "home") {
    showHomePanel(options);
    return;
  }
  if (tabName === "menu") {
    showMenuPanel(options);
    return;
  }
  if (tabName === "reorder") {
    showReorderPanel(options);
    return;
  }
  if (tabName === "account") {
    showAccountPanel(options);
    return;
  }
  if (tabName === "search") {
    showSearchPanel(options);
  }
}

bottomTabs.forEach((tab) => {
  tab.addEventListener("click", (event) => {
    if (navDragSuppressClick) return;
    const targetTab = tab.dataset.bottomTab;
    if (!targetTab) return;
    event.preventDefault();
    event.stopPropagation();
    openTabByName(targetTab, { scrollToTop: true, animate: true });
  });
});

function getCurrentBottomTab() {
  const active = [...bottomTabs].find((tab) => tab.classList.contains("active"));
  return active?.dataset.bottomTab || "home";
}

function shiftTabBy(direction, options = {}) {
  const tabOrder = ["home", "menu", "reorder", "account", "search"];
  const current = getCurrentBottomTab();
  const index = Math.max(0, tabOrder.indexOf(current));
  const nextIndex = Math.max(0, Math.min(tabOrder.length - 1, index + direction));
  if (nextIndex === index) return;
  openTabByName(tabOrder[nextIndex], options);
}

function renderSearchResults() {
  if (!searchResults) return;
  searchResults.classList.remove("hidden");
  const term = String(state.searchTerm || "").trim().toLowerCase();
  if (!term) {
    searchResults.innerHTML = `
      <div class="search-empty-state">
        <strong>Search cookies</strong>
        <p>Type a flavour, box size, category, or combo name.</p>
      </div>
    `;
    return;
  }

  const groups = getFlavorGroups(state.menu);
  const matches = groups.filter((group) => {
    const searchable = [
      group.flavor,
      group.category,
      group.description || "",
      ...group.variants.map((variant) => variant.description || ""),
      ...group.variants.map((variant) => `${variant.name} ${variant.variantLabel}`),
    ]
      .join(" ")
      .toLowerCase();
    return searchable.includes(term);
  });

  if (!matches.length) {
    searchResults.innerHTML = `
      <div class="search-empty-state">
        <strong>No results found</strong>
        <p>No items found. Try a different search.</p>
        <button class="secondary-button small" type="button" data-clear-search>Clear search</button>
      </div>
    `;
    return;
  }

  searchResults.innerHTML = matches
    .slice(0, 16)
    .map(
      (group) => `
        <button class="search-result-item" type="button" data-search-open-flavor="${group.key}">
          <img src="${group.image || "assets/hero-food.png"}" alt="${group.flavor}" />
          <span>
            <strong>${group.flavor}</strong>
            <small>${formatCategoryLabel(group.category)} • ${group.variants.length} options</small>
          </span>
        </button>
      `,
    )
    .join("");
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
  const searchTerm = String(state.searchTerm || "").trim().toLowerCase();
  const dishes = state.menu.filter((item) => {
    const category = normalizeCategory(item.category);
    const searchable = [item.name, item.description, item.category].join(" ").toLowerCase();
    return (activeCategory === "all" || category === activeCategory) && (!searchTerm || searchable.includes(searchTerm));
  });
  const flavorGroups = getFlavorGroups(dishes);
  if (!flavorGroups.length) {
    menuGrid.innerHTML = `<div class="menu-loading">${searchTerm ? "No cookies match your search." : "No menu items are available right now."}</div>`;
    renderMenuFabSheet();
    return;
  }
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
        <article
          class="dish-card flavor-card ${soldOut ? "unavailable" : ""}"
          data-flavor-key="${group.key}"
          role="button"
          tabindex="${soldOut ? "-1" : "0"}"
          aria-label="Open ${group.flavor} options"
        >
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
  const firstAvailable = group.variants.find((item) => item.available !== false && getMenuStock(item) > 0) || group.variants[0];
  const alreadyInCart = group.variants.find((item) => (state.cart.get(item.id) || 0) > 0);
  if (!selectedFlavorVariantId || !group.variants.some((item) => item.id === selectedFlavorVariantId)) {
    selectedFlavorVariantId = alreadyInCart?.id || firstAvailable?.id || null;
  }
  const selectedItem = group.variants.find((item) => item.id === selectedFlavorVariantId) || firstAvailable;
  const productDescription = String(
    selectedItem?.description
      || group.variants.find((item) => item.description)?.description
      || `${group.flavor} cookies baked fresh by Sujaan Bites. Choose your pack size and continue to cart.`,
  ).trim();
  const infoHref = `${getRoute("/product-info")}?item=${encodeURIComponent(selectedItem?.id || firstAvailable?.id || "")}`;
  if (flavorTitle) flavorTitle.textContent = group.flavor;
  if (flavorSubtitle) flavorSubtitle.textContent = formatCategoryLabel(group.category || "");
  const variantRows = group.variants
    .map((item) => {
      const quantity = state.cart.get(item.id) || 0;
      const stockCount = getMenuStock(item);
      const soldOut = item.available === false || stockCount <= 0;
      const selected = selectedFlavorVariantId === item.id;
      return `
        <div class="flavor-option ${soldOut ? "unavailable" : ""} ${selected ? "selected" : ""}" data-select-flavor-variant="${item.id}">
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
  flavorOptions.innerHTML = `
    <div class="flavor-product-hero">
      <img src="${group.image || selectedItem?.image || "assets/hero-food.png"}" alt="${group.flavor}" />
      <div class="flavor-product-copy">
        <strong>${group.flavor}</strong>
        <p>${productDescription}</p>
      </div>
    </div>
    <div class="flavor-option-list">${variantRows}</div>
    <div class="flavor-sheet-footer">
      <div class="flavor-sheet-actions">
        <a class="secondary-link flavor-more-info" href="${infoHref}">More info</a>
        <a class="pay-button" href="${getRoute("/cart")}" data-route="/cart">View cart</a>
      </div>
    </div>
  `;
  flavorOverlay.classList.remove("hidden");
  flavorOverlay.classList.add("show");
  flavorOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeFlavorMenu() {
  if (!flavorOverlay) return;
  flavorOverlay.classList.remove("show");
  flavorOverlay.classList.add("hidden");
  flavorOverlay.setAttribute("aria-hidden", "true");
  activeFlavorKey = null;
  selectedFlavorVariantId = null;

  // Only clear the modal state if no other modal is still open.
  const stillOpen = itemPreviewOverlay?.classList.contains("show");
  if (!stillOpen) document.body.classList.remove("modal-open");
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

function isSinglePieceItem(item) {
  const label = String(item?.name || "").toLowerCase();
  return label.includes("single") || label.includes("(1 pc)") || label.includes("1 pc");
}

function getSinglePieceCount(rows) {
  return (rows || []).reduce((sum, item) => {
    const isSingle = isSinglePieceItem(item);
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
    c: state.couponCode || "",
  });
}

function syncCouponUi() {
  const normalized = normalizeCouponCode(state.couponCode);
  const couponMessage = String(state.quotedTotals?.couponMessage || state.quotedTotals?.offerMeta?.couponMessage || "").trim();
  const applied = Boolean(normalized && (state.quotedTotals?.couponApplied || Number(state.quotedTotals?.discount || 0) > 0 || couponMessage));
  if (couponCodeInput) couponCodeInput.value = normalized;
  if (couponStatus) {
    couponStatus.classList.toggle("success", applied);
    couponStatus.classList.toggle("error", Boolean(normalized) && !applied);
    couponStatus.textContent = normalized
      ? couponMessage || (applied ? "Offer unlocked. Your payable amount has been updated." : "Coupon not recognized.")
      : "No coupon applied.";
  }
  if (clearCouponButton) {
    clearCouponButton.classList.toggle("hidden", !normalized);
  }
}

function applyCouponCode(rawCode) {
  const normalized = normalizeCouponCode(rawCode);
  state.couponCode = normalized;
  localStorage.setItem(STORAGE_KEYS.couponCode, normalized);
  syncCouponUi();
  if (couponCodeInput) couponCodeInput.value = normalized;
  state.quoteKey = "";
  state.quoteLoading = false;
  void ensureDeliveryQuote();
  renderCart();
}

function clearCouponCode() {
  state.couponCode = "";
  localStorage.removeItem(STORAGE_KEYS.couponCode);
  syncCouponUi();
  state.quoteKey = "";
  state.quoteLoading = false;
  void ensureDeliveryQuote();
  renderCart();
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
        couponCode: state.couponCode || "",
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
  const delivery = canUseQuote ? Number(state.quotedTotals.delivery || 0) : (rows.length ? BUSINESS.deliveryFee : 0);
  const couponCode = normalizeCouponCode(state.couponCode);
  const quotedTotal = canUseQuote ? Number(state.quotedTotals.total || 0) : subtotal + delivery;
  const discount = canUseQuote ? Number(state.quotedTotals?.discount || 0) : 0;
  const couponApplied = Boolean(couponCode && (state.quotedTotals?.couponApplied || discount > 0 || state.quotedTotals?.couponMessage));
  const total = quotedTotal;
  return {
    rows,
    subtotal,
    delivery,
    total,
    discount,
    couponCode,
    couponApplied,
    quantity,
    singlePieceCount: getSinglePieceCount(rows),
    onlySinglePieceItems: rows.length > 0 && rows.every((item) => isSinglePieceItem(item)),
  };
}

function renderCart() {
  void ensureDeliveryQuote();
  const totals = getTotals();
  syncCouponUi();
  const freeDeliveryThreshold = Number(state.offersConfig?.progressOffer?.minSubtotal || state.deliveryMeta?.freeDeliveryThreshold || 1599);
  const progressMeta = state.quotedTotals?.offerMeta?.progressOffer || null;
  if (itemCount) itemCount.textContent = `${totals.quantity} ${totals.quantity === 1 ? "item" : "items"}`;
  
  const headerCartBadge = document.getElementById("headerCartBadge");
  if (headerCartBadge) {
    headerCartBadge.textContent = totals.quantity;
    if (totals.quantity > 0) {
      headerCartBadge.classList.remove("hidden");
    } else {
      headerCartBadge.classList.add("hidden");
    }
  }

  if (subtotalEl) subtotalEl.textContent = formatPrice(totals.subtotal);
  if (deliveryFeeEl) {
    const qualifiesFree = totals.subtotal >= freeDeliveryThreshold;
    const metaFree = Boolean(state.deliveryMeta?.freeDelivery) || Boolean(progressMeta?.unlocked);
    const showFree = qualifiesFree || metaFree;
    if (showFree) {
      const actual = Number(state.deliveryMeta?.calculatedDelivery || progressMeta?.deliveryBeforeDiscount || totals.delivery || BUSINESS.deliveryFee);
      deliveryFeeEl.innerHTML = `<span class="delivery-free"><span class="delivery-strike">${formatPrice(actual)}</span><span class="free-badge">FREE DELIVERY</span></span>`;
    } else {
      deliveryFeeEl.textContent = formatPrice(totals.delivery);
    }
  }
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

  renderCheckoutAddressPicker();

  if (cartSummaryPayable) {
    cartSummaryPayable.textContent = formatPrice(totals.total);
  }

  if (discountRow && couponDiscount) {
    const showDiscount = totals.discount > 0;
    discountRow.classList.toggle("hidden", !showDiscount);
    couponDiscount.textContent = `-${formatPrice(totals.discount)}`;
  }

  const singlePieceWarning = document.getElementById("singlePieceWarning");
  const cartPagePayLabel = document.getElementById("cartPagePayLabel");
  const invalidSingleOrder = totals.onlySinglePieceItems && totals.singlePieceCount > 0 && totals.singlePieceCount < 3;

  if (singlePieceWarning) {
    singlePieceWarning.classList.toggle("hidden", !invalidSingleOrder);
  }

  if (cartPagePayLabel) {
    cartPagePayLabel.disabled = invalidSingleOrder;
    if (invalidSingleOrder) {
      cartPagePayLabel.textContent = "Minimum 3 pieces required";
      cartPagePayLabel.style.opacity = "0.5";
    } else {
      cartPagePayLabel.textContent = `Pay ${formatPrice(totals.total)}`;
      cartPagePayLabel.style.opacity = "1";
    }
  }

  const progress = progressMeta
    ? Math.max(0, Math.min(1, Number(progressMeta.progress || 0)))
    : Math.max(0, Math.min(1, totals.subtotal / freeDeliveryThreshold));
  if (freeDeliveryProgressBar) {
    freeDeliveryProgressBar.style.width = `${Math.round(progress * 100)}%`;
  }
  if (freeDeliveryProgressLabel) {
    freeDeliveryProgressLabel.textContent = `${formatPrice(totals.subtotal)} / ${formatPrice(freeDeliveryThreshold)}`;
  }
  if (freeDeliveryProgressRemaining) {
    const remaining = progressMeta
      ? Math.max(0, Number(progressMeta.remainingSubtotal || 0))
      : Math.max(0, freeDeliveryThreshold - totals.subtotal);
    freeDeliveryProgressRemaining.textContent = remaining > 0
      ? `${formatPrice(remaining)} away from free delivery`
      : "Free delivery unlocked";
  }

  const deliveryCardTitle = document.querySelector("#deliveryEtaLabel");
  const deliveryCardSub = document.querySelector("#deliveryEtaHint");
  if (deliveryCardTitle && deliveryCardSub) {
    if (Boolean(state.deliveryMeta?.freeDelivery) || Boolean(progressMeta?.unlocked)) {
      deliveryCardTitle.textContent = "Free delivery unlocked";
      deliveryCardSub.textContent = `Your cart value is above ${formatPrice(freeDeliveryThreshold)}, so delivery is free.`;
    } else if (state.deliveryMeta?.isLongDistance) {
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
  const savedAddress = getActiveAddress() || state.addresses[0] || null;
  const selectedAddress = getActiveAddress();
  const hasSavedIdentity = Boolean(existing?.name || existing?.phone || state.addresses.length);

  accountShellTitle.textContent = hasSavedIdentity ? "Your details" : "Complete your details";

  accountContent.innerHTML = `
    <div class="account-page-view slide-in profile-setup-page">
      <form class="auth-form ios-form" id="profileSetupForm">
        <div class="profile-edit-intro">
          <strong>${hasSavedIdentity ? "Edit your account" : "Create your account"}</strong>
          <p>${hasSavedIdentity ? "Update your name, phone number, and selected delivery address." : "Save your details once and checkout faster next time."}</p>
        </div>
        <label class="ios-input-group">
          <span>Name</span>
          <input id="profileName" type="text" placeholder="Your name" value="${existing.name || ""}" required />
        </label>
        <label class="ios-input-group">
          <span>Phone number</span>
          <input id="profilePhone" type="tel" inputmode="numeric" placeholder="10-digit mobile" value="${existing.phone || ""}" required />
        </label>
        <div class="map-picker ios-map-picker">
          <div class="map-actions ios-map-actions">
            <div>
              <strong>Pin your delivery location</strong>
              <small>Choose the exact pin point anywhere in India.</small>
            </div>
            <button class="secondary-button ios-location-btn" id="useLocationButton" type="button">Use current location</button>
          </div>
          <div class="map-canvas ios-map-canvas" id="locationMap" aria-label="Map for choosing delivery location"></div>
          <p class="form-note" id="locationStatus">Choose your location on the map before saving.</p>
        </div>
        <label class="ios-input-group">
          <span>House number</span>
          <input id="houseNumber" type="text" placeholder="Flat / house / shop number" value="${savedAddress?.houseNumber || ""}" required />
        </label>
        <label class="ios-input-group">
          <span>Street name</span>
          <input id="streetName" type="text" placeholder="Street / building / area" value="${savedAddress?.streetName || ""}" required />
        </label>
        <label class="ios-input-group">
          <span>Address type</span>
          <select id="addressType" required>
            <option value="Home" ${savedAddress?.type === "Home" ? "selected" : ""}>Home</option>
            <option value="Work" ${savedAddress?.type === "Work" ? "selected" : ""}>Work</option>
            <option value="Other" ${savedAddress?.type === "Other" ? "selected" : ""}>Other</option>
          </select>
        </label>
        <label class="ios-input-group">
          <span>Map address</span>
          <textarea id="savedAddress" rows="2" placeholder="Area from selected pin" required>${savedAddress?.address || ""}</textarea>
        </label>
        <label class="ios-input-group">
          <span>Nearby landmark</span>
          <input id="savedLandmark" type="text" placeholder="Optional landmark" value="${savedAddress?.landmark || ""}" />
        </label>
        <button class="pay-button ios-submit-btn" type="submit">Save details</button>
        <p class="form-note">Up to 10 addresses can be saved. All-India delivery is supported.</p>
      </form>
    </div>
    `;

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
    <div class="account-page-view slide-in addresses-page">
      <div class="saved-address ios-grouped-container">
        ${state.addresses.length ? state.addresses.map((address) => `
          <div class="address-item ios-address-card ${address.id === state.selectedAddressId ? "selected" : ""}">
            <div class="ios-address-head">
              <span class="address-badge-icon">📍</span>
              <div>
                <strong>${address.type || "Delivery"} Address${address.id === state.selectedAddressId ? " (Selected)" : ""}</strong>
                <p class="ios-address-text">${formatMultilineAddress(address).replaceAll("\n", "<br>")}</p>
              </div>
            </div>
            <div class="account-actions ios-card-actions">
              <button class="ios-action-btn select" type="button" data-select-address="${address.id}">Use</button>
              <button class="ios-action-btn edit" type="button" data-edit-address="${address.id}">Edit</button>
              <button class="ios-action-btn delete danger" type="button" data-delete-address="${address.id}">Delete</button>
            </div>
          </div>
        `).join("") : '<p class="empty">No saved addresses yet.</p>'}
        
        <div class="add-address-btn-container">
          <button class="ios-add-address-btn" type="button" data-account-action="add-address" ${state.addresses.length >= MAX_ADDRESSES ? "disabled" : ""}>
            + Add New Address
          </button>
        </div>
        <p class="form-note">Saved addresses are stored locally on this device.</p>
      </div>

      ${addressFormOpen ? `
        <div class="ios-form-container slide-in">
          <form class="auth-form ios-form" id="addressForm">
            <h3>${addressToEdit ? "Edit Address Details" : "New Address Details"}</h3>
            <label class="ios-input-group">
              <span>House Number</span>
              <input id="houseNumber" type="text" placeholder="Flat / house / shop number" value="${addressToEdit?.houseNumber || ""}" required />
            </label>
            <label class="ios-input-group">
              <span>Street Name</span>
              <input id="streetName" type="text" placeholder="Street / building / area" value="${addressToEdit?.streetName || ""}" required />
            </label>
            <label class="ios-input-group">
              <span>Address Type</span>
              <select id="addressType" required>
                <option value="Home" ${addressToEdit?.type === "Home" ? "selected" : ""}>Home</option>
                <option value="Work" ${addressToEdit?.type === "Work" ? "selected" : ""}>Work</option>
                <option value="Other" ${addressToEdit?.type === "Other" ? "selected" : ""}>Other</option>
              </select>
            </label>
            <div class="map-picker ios-map-picker">
              <div class="map-actions ios-map-actions">
                <div>
                  <strong>Pin your delivery location</strong>
                  <small>Pick the exact delivery point on the map.</small>
                </div>
                <button class="secondary-button ios-location-btn" id="useLocationButton" type="button">Current Location</button>
              </div>
              <div class="map-canvas ios-map-canvas" id="locationMap" aria-label="Map for choosing delivery location"></div>
              <p class="form-note" id="locationStatus">Choose your location on the map before saving.</p>
            </div>
            <label class="ios-input-group">
              <span>Map Address</span>
              <textarea id="savedAddress" rows="2" placeholder="Area from selected pin" required>${addressToEdit?.address || ""}</textarea>
            </label>
            <label class="ios-input-group">
              <span>Nearby Landmark</span>
              <input id="savedLandmark" type="text" placeholder="Optional landmark" value="${addressToEdit?.landmark || ""}" />
            </label>
            <button class="pay-button ios-submit-btn" type="submit">${addressToEdit ? "Save Address" : "Add Address"}</button>
          </form>
        </div>
      ` : ""}
    </div>
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
    accountContent.innerHTML = `
      <div class="account-page-view slide-in empty-orders-page">
        <p class="empty">No previous orders yet. Start adding treats to your cart!</p>
      </div>
    `;
    return;
  }

  accountContent.innerHTML = `
    <div class="account-page-view slide-in order-history-page">
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
              
              let statusClass = "pending";
              if (order.status === "delivered") statusClass = "success";
              if (order.status === "cancelled") statusClass = "danger";
              
              return `
              <article class="history-card ios-card">
                <div class="ios-card-header">
                  <strong>Order #${order.id.slice(-6).toUpperCase()}</strong>
                  <span class="status-pill ${statusClass}">${String(order.status || "").replaceAll("_", " ")}</span>
                </div>
                <div class="ios-card-body">
                  <span>${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))}</span>
                  <span>Payment: <strong>${String(order.paymentStatus || "").replaceAll("_", " ")}</strong></span>
                  ${deliveryLine ? `<span class="delivery-time">${deliveryLine}</span>` : ""}
                  <p class="order-items">${order.items.map((item) => `${item.name} x ${item.quantity}`).join(", ")}</p>
                </div>
                <div class="ios-card-footer">
                  <span>Total Amount</span>
                  <strong>${formatPrice(order.totals.total)}</strong>
                </div>
              </article>
            `;
          },
        )
        .join("")}
    </div>
  </div>
  `;
}

function renderReorderPanel() {
  if (!reorderList) return;
  const orders = state.previousOrders || [];
  if (!orders.length) {
    reorderList.innerHTML = '<p class="menu-loading">No previous orders yet.</p>';
    return;
  }
  reorderList.innerHTML = orders
    .map((order) => {
      const lineItems = Array.isArray(order.items) ? order.items : [];
      const itemsLine = lineItems.length
        ? lineItems.map((item) => `${item.name} x ${item.quantity}`).join(", ")
        : "No items";
      return `
        <article class="reorder-card">
          <div class="reorder-card-head">
            <strong>${order.id}</strong>
            <span>${formatPrice(Number(order?.totals?.total || 0))}</span>
          </div>
          <p>${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(order.createdAt))}</p>
          <p>${itemsLine}</p>
          <button class="secondary-button" type="button" data-reorder-order="${order.id}">Add these items again</button>
        </article>
      `;
    })
    .join("");
}

function reorderFromOrder(orderId) {
  const order = (state.previousOrders || []).find((entry) => entry.id === orderId);
  if (!order) return;
  const menuById = new Map((state.menu || []).map((item) => [item.id, item]));
  const menuByName = new Map((state.menu || []).map((item) => [String(item.name || "").toLowerCase(), item]));
  let added = 0;
  for (const line of order.items || []) {
    const byId = menuById.get(line.id);
    const byName = menuByName.get(String(line.name || "").toLowerCase());
    const menuItem = byId || byName;
    if (!menuItem) continue;
    const stock = getMenuStock(menuItem);
    if (!stock || menuItem.available === false) continue;
    const currentQty = Number(state.cart.get(menuItem.id) || 0);
    const targetQty = Math.min(stock, currentQty + Number(line.quantity || 0));
    if (targetQty > currentQty) {
      state.cart.set(menuItem.id, targetQty);
      added += targetQty - currentQty;
    }
  }
  persistCart();
  renderCart();
  renderMenu();
  if (added > 0) {
    cartToastText && (cartToastText.textContent = `${added} ${added === 1 ? "Item" : "Items"} added`);
    cartToast?.classList.remove("hidden");
    cartToast?.classList.add("show");
    showMenuPanel();
  } else {
    alert("Those previous items are currently unavailable.");
  }
}

function calculateSpends(orders) {
  return (orders || []).reduce(
    (acc, order) => {
      if (!isVisibleCustomerOrder(order)) return acc;
      const amount = Number(order?.totals?.total || 0);
      acc.total += amount;
      acc.upi += amount;
      return acc;
    },
    { total: 0, upi: 0 },
  );
}

function isVisibleCustomerOrder(order) {
  if (!order || typeof order !== "object") return false;
  if (order.status === "cancelled") return false;
  // Hide legacy/failed orders that were never paid/verified.
  const paymentStatus = String(order.paymentStatus || "").toLowerCase();
  const status = String(order.status || "").toLowerCase();
  if (status === "payment_pending") return false;
  if (paymentStatus === "not_verified") return false;
  return true;
}

function renderSpendsTab() {
  accountShellTitle.textContent = "Past spends";
  const spends = calculateSpends(state.previousOrders);
  const totalOrders = state.previousOrders.filter((order) => order?.status !== "cancelled").length;
  const activeOrders = state.previousOrders.filter(isVisibleCustomerOrder);
  const avgOrder = totalOrders > 0 ? spends.total / totalOrders : 0;

  const ordersForChart = [...activeOrders].slice(0, 5).reverse();
  let chartHtml = "";
  if (ordersForChart.length) {
    const maxTotal = Math.max(...ordersForChart.map(o => Number(o?.totals?.total || 0)), 1);
    chartHtml = ordersForChart.map(order => {
      const amt = Number(order?.totals?.total || 0);
      const pct = Math.max(12, Math.round((amt / maxTotal) * 100));
      const dateLabel = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(order.createdAt));
      return `
        <div class="chart-bar-container">
          <div class="chart-bar-value">${formatPrice(amt)}</div>
          <div class="chart-bar" style="height: ${pct}%">
            <div class="chart-bar-fill"></div>
          </div>
          <div class="chart-bar-label">${dateLabel}</div>
        </div>
      `;
    }).join("");
  } else {
    chartHtml = `
      <div class="chart-bar-container placeholder">
        <div class="chart-bar" style="height: 40%"><div class="chart-bar-fill"></div></div>
        <div class="chart-bar-label">Mon</div>
      </div>
      <div class="chart-bar-container placeholder">
        <div class="chart-bar" style="height: 70%"><div class="chart-bar-fill"></div></div>
        <div class="chart-bar-label">Tue</div>
      </div>
      <div class="chart-bar-container placeholder">
        <div class="chart-bar" style="height: 50%"><div class="chart-bar-fill"></div></div>
        <div class="chart-bar-label">Wed</div>
      </div>
      <div class="chart-bar-container placeholder">
        <div class="chart-bar" style="height: 85%"><div class="chart-bar-fill"></div></div>
        <div class="chart-bar-label">Thu</div>
      </div>
      <div class="chart-bar-container placeholder">
        <div class="chart-bar" style="height: 60%"><div class="chart-bar-fill"></div></div>
        <div class="chart-bar-label">Fri</div>
      </div>
    `;
  }

  accountContent.innerHTML = `
    <div class="account-page-view slide-in spend-analytics-page">
      <div class="apple-card-mockup">
        <div class="apple-card-chip"></div>
        <div class="apple-card-balance">
          <small>CURRENT STATEMENT</small>
          <h2>${formatPrice(spends.total)}</h2>
        </div>
        <div class="apple-card-footer">
          <strong>Sujaan Platinum Cookie Card</strong>
          <span>Visa Platinum</span>
        </div>
      </div>

      <div class="analytics-metrics-grid">
        <div class="metric-card">
          <small>TOTAL SPENT</small>
          <strong>${formatPrice(spends.total)}</strong>
        </div>
        <div class="metric-card">
          <small>AVG ORDER COST</small>
          <strong>${formatPrice(avgOrder)}</strong>
        </div>
        <div class="metric-card">
          <small>ORDERS PLACED</small>
          <strong>${totalOrders}</strong>
        </div>
      </div>

      <div class="apple-card-chart-section">
        <h3>Statement Activity</h3>
        <div class="apple-card-chart">
          ${chartHtml}
        </div>
        ${!activeOrders.length ? '<p class="chart-hint">Mock activity shown. Start ordering to unlock your real statement graphs!</p>' : ""}
      </div>
    </div>
  `;
}

function renderCareTab() {
  accountShellTitle.textContent = "Customer care";
  accountContent.innerHTML = `
    <div class="account-page-view slide-in customer-care-page">
      <div class="ios-support-card">
        <div class="ios-support-icon">🎧</div>
        <h3>Need Help with an Order?</h3>
        <p>We're here for you 24/7. Have your Order ID ready for lightning-fast support.</p>
      </div>
      <div class="customer-care-grid">
        <a class="support-action-card call" href="tel:${BUSINESS.whatsappNumber}">
          <span class="support-icon">📞</span>
          <strong>Call Hotline</strong>
          <small>Direct voice support</small>
        </a>
        <a class="support-action-card whatsapp" href="https://wa.me/91${BUSINESS.whatsappNumber}?text=${encodeURIComponent("Hi Sujaan Bites, I need help with my order.")}" target="_blank" rel="noreferrer">
          <span class="support-icon">💬</span>
          <strong>WhatsApp</strong>
          <small>Instant text chat</small>
        </a>
        <a class="support-action-card email" href="mailto:${BUSINESS.customerCareEmail}">
          <span class="support-icon">✉️</span>
          <strong>Email Support</strong>
          <small>Send us an email</small>
        </a>
      </div>
    </div>
  `;
}

function renderGeneralInfoTab() {
  accountShellTitle.textContent = "General info";
  accountContent.innerHTML = `
    <div class="account-page-view slide-in general-info-page">
      <article class="general-info-card">
        <p class="eyebrow">Offerings</p>
        <h3>What Sujaan Bites offers</h3>
        <p>Sujaan Bites serves fresh baked cookies, single pieces, cookie boxes, combo packs, and gifting-friendly packs with a simple prepaid checkout. Customers can save addresses, reorder from past orders, and track restaurant updates after purchase.</p>
      </article>
      <article class="general-info-card">
        <p class="eyebrow">Cookie recipes</p>
        <h3>Our recipe style</h3>
        <p>Our cookies are built around premium flour, butter, sugar, cocoa, chocolate chips, dry fruits, biscuit crumbs, and flavour-specific fillings. Each flavour is prepared in small batches so the cookies stay rich, soft inside, and neatly packed for delivery.</p>
      </article>
      <article class="general-info-card">
        <p class="eyebrow">Why us</p>
        <h3>Why choose Sujaan Bites?</h3>
        <p>We focus on clear menu choices, transparent pricing, saved customer details, responsive support, and reliable order updates. The goal is a quick mobile ordering experience with cookies that feel fresh, personal, and worth coming back for.</p>
      </article>
    </div>
  `;
}

function renderAccount() {
  if (!accountShell || !accountContent) return;
  
  accountLogoutButton?.classList.add("hidden");

  const hasProfile = getResolvedCustomerProfile() || state.profile;
  const isDashboardView = state.activeTab === "dashboard";

  const backBtn = document.querySelector("#accountBackButton");
  const eyebrow = document.querySelector("#accountShellEyebrow");
  const title = document.querySelector("#accountShellTitle");

  if (backBtn) {
    if (isDashboardView) {
      backBtn.classList.add("hidden");
    } else {
      backBtn.classList.remove("hidden");
    }
  }

  if (eyebrow) {
    eyebrow.textContent = isDashboardView ? "Account" : "Settings";
  }

  if (title) {
    if (isDashboardView) {
      title.textContent = "Dashboard";
    } else if (state.activeTab === "profile") {
      title.textContent = hasProfile ? "Edit Profile" : "Complete your details";
    } else if (state.activeTab === "addresses") {
      title.textContent = "Saved Addresses";
    } else if (state.activeTab === "orders") {
      title.textContent = "Order History";
    } else if (state.activeTab === "spends") {
      title.textContent = "Spend Analytics";
    } else if (state.activeTab === "care") {
      title.textContent = "Customer Care";
    } else if (state.activeTab === "general") {
      title.textContent = "General Info";
    }
  }

  accountTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.accountTab === state.activeTab);
  });

  if (isDashboardView) {
    renderAccountDashboard();
  } else if (state.activeTab === "profile") {
    renderProfileSetup();
  } else if (state.activeTab === "addresses") {
    renderAddresses();
  } else if (state.activeTab === "orders") {
    renderOrdersTab();
  } else if (state.activeTab === "spends") {
    renderSpendsTab();
  } else if (state.activeTab === "general") {
    renderGeneralInfoTab();
  } else {
    renderCareTab();
  }

  renderCart();
  syncCheckoutFields();
  renderReorderPanel();
}

function renderAccountDashboard() {
  const profile = getResolvedCustomerProfile() || state.profile || {};
  const isNew = !profile.phone;
  const orderCount = (state.previousOrders || []).filter(isVisibleCustomerOrder).length;
  const addressCount = (state.addresses || []).length;

  let profileCardHTML = "";
  if (isNew) {
    profileCardHTML = `
      <div class="wf-profile-card wf-profile-card-new">
        <div class="wf-profile-info">
          <h3>Welcome to Sujaan Bites</h3>
          <p>Create your account to save addresses and view orders.</p>
        </div>
        <button class="primary-button wf-signup-button" type="button" data-nav-subpage="profile">Login / Sign Up</button>
      </div>
    `;
  } else {
    profileCardHTML = `
      <div class="wf-profile-card">
        <div class="wf-profile-info">
          <h3>${profile.name || "Customer"}</h3>
          <p>${profile.phone || ""}</p>
        </div>
        <div class="wf-avatar-circle">
          <span>${(profile.name || "S").trim()[0]?.toUpperCase() || "S"}</span>
        </div>
      </div>
    `;
  }

  accountContent.innerHTML = `
    <div class="account-dashboard-page slide-active">
      <!-- Profile Header Card -->
      ${profileCardHTML}
      
      ${isNew ? "" : `
      <!-- Quick Actions Row -->
      <div class="wf-quick-actions">
        <button class="wf-action-btn" type="button" data-nav-subpage="orders">
          <strong>${orderCount}</strong>
          <span>Your<br>Orders</span>
        </button>
        <button class="wf-action-btn" type="button" data-nav-subpage="care">
          <strong>24/7</strong>
          <span>Help &<br>Support</span>
        </button>
        <button class="wf-action-btn" type="button" data-account-action="edit-profile">
          <strong>${addressCount}</strong>
          <span>Your<br>Profile</span>
        </button>
      </div>

      <!-- Section 1: Your Information -->
      <div class="wf-section">
        <h4 class="wf-section-title">Your Information</h4>
        <div class="wf-list-group">
          <button class="wf-list-row" type="button" data-nav-subpage="orders">
            <span class="wf-row-label">Previous Orders</span>
            <span class="wf-row-chevron">›</span>
          </button>
          <button class="wf-list-row" type="button" data-nav-subpage="addresses">
            <span class="wf-row-label">Saved addresses</span>
            <span class="wf-row-chevron">›</span>
          </button>
          <button class="wf-list-row" type="button" data-nav-subpage="care">
            <span class="wf-row-label">Help & Support</span>
            <span class="wf-row-chevron">›</span>
          </button>
        </div>
      </div>

      <!-- Section 2: Other Information -->
      <div class="wf-section">
        <h4 class="wf-section-title">Other Information</h4>
        <div class="wf-list-group">
          <button class="wf-list-row" type="button" data-nav-subpage="general">
            <span class="wf-row-label">General info</span>
            <span class="wf-row-chevron">›</span>
          </button>
          <div class="wf-logout-wrapper">
             <button class="wf-logout-btn" type="button" id="iosLogoutBtn" data-account-action="logout">Log out</button>
          </div>
        </div>
      </div>
      `}
    </div>
  `;
}

async function logoutCustomer() {
  const profile = getResolvedCustomerProfile();
  try {
    if (profile?.phone) {
      await apiRequest("/api/customer/logout", {
        method: "POST",
        body: JSON.stringify({
          phone: profile.phone,
          sessionToken: getSessionToken(),
        }),
      });
    }
  } catch {
    // proceed with local logout anyway
  }
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
  renderCheckoutAddressPicker();
}

function formatAddressOption(address) {
  const type = String(address?.type || "Delivery").trim() || "Delivery";
  const line1 = `${address?.houseNumber || ""} ${address?.streetName || ""}`.trim();
  const line2 = String(address?.address || "").trim();
  const compact = [line1, line2].filter(Boolean).join(" - ");
  return compact ? `${type}: ${compact}` : `${type} address`;
}

function renderCheckoutAddressPicker() {
  if (!checkoutAddressPicker || !checkoutAddressSelect) return;

  const addresses = state.addresses || [];
  if (addresses.length <= 1) {
    checkoutAddressPicker.classList.add("hidden");
    checkoutAddressSelect.innerHTML = "";
    return;
  }

  checkoutAddressPicker.classList.remove("hidden");
  const selected = getActiveAddress();
  checkoutAddressSelect.innerHTML = addresses
    .map((address) => {
      const label = formatAddressOption(address);
      const isSelected = selected && address.id === selected.id;
      return `<option value="${address.id}" ${isSelected ? "selected" : ""}>${label}</option>`;
    })
    .join("");
}

function normalizeMenuPayload(payload) {
  const menu = Array.isArray(payload) ? payload : payload?.menu;
  const categories = Array.isArray(payload?.categories) ? payload.categories : [];
  const offers = payload?.offers && typeof payload.offers === "object" ? payload.offers : null;
  return {
    menu: Array.isArray(menu) ? menu.filter((item) => item && item.id && item.name) : [],
    categories,
    offers,
  };
}

async function loadMenuFromJsonFile() {
  const pagePath = window.location.pathname || "/";
  const repoBase = pagePath.includes("/frontend/")
    ? pagePath.slice(0, pagePath.indexOf("/frontend/") + 1)
    : "/";
  const candidates = [
    "data/menu.json",
    "./data/menu.json",
    "menu.json",
    "./menu.json",
    "frontend/data/menu.json",
    `${repoBase}frontend/data/menu.json`,
    "backend/data/menu.json",
    "../backend/data/menu.json",
    `${repoBase}backend/data/menu.json`,
  ];
  let lastError = null;
  const seen = new Set();
  for (const path of candidates) {
    if (!path || seen.has(path)) continue;
    seen.add(path);
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) throw new Error(`Menu file ${path} returned ${response.status}`);
      const parsed = normalizeMenuPayload(await response.json());
      if (parsed.menu.length > 0) return parsed;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("No menu JSON file found");
}

function applyLoadedMenu(result) {
  state.menu = (result.menu && result.menu.length > 0) ? result.menu : DEFAULT_MENU;
  state.menuCategories = Array.isArray(result.categories) ? result.categories : [];
  state.offersConfig = result.offers && typeof result.offers === "object" ? result.offers : null;
  const availableCategories = new Set(state.menu.map((item) => normalizeCategory(item.category)).filter(Boolean));
  if (state.activeCategory !== "all" && !availableCategories.has(normalizeCategory(state.activeCategory))) {
    state.activeCategory = "all";
  }
  renderFilters();
  syncCartToStock();
  renderMenu();
  renderCart();
  initInteractiveWidgets();
}

async function loadMenu() {
  if (state.loadingMenu) return;
  state.loadingMenu = true;
  if (menuGrid) {
    menuGrid.innerHTML = '<div class="menu-loading">Loading fresh bakes...</div>';
  }
  try {
    const result = await apiRequest("/api/menu");
    applyLoadedMenu(normalizeMenuPayload(result));
  } catch (error) {
    console.warn("API menu failed, trying menu.json:", error);
    try {
      const result = await loadMenuFromJsonFile();
      applyLoadedMenu(result);
    } catch (fileError) {
      console.warn("Menu JSON failed, using default menu:", fileError);
      applyLoadedMenu({ menu: DEFAULT_MENU, categories: [] });
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

  if (!locationMap) return;

  function setFallbackLocationMessage(message) {
    if (locationStatus) locationStatus.textContent = message;
  }

  function requestFallbackLocation() {
    if (!navigator.geolocation) {
      setFallbackLocationMessage("Your browser does not support location access. Please open the page in a mobile browser with location enabled.");
      return;
    }

    useLocationButton.disabled = true;
    setFallbackLocationMessage("Requesting location permission...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        useLocationButton.disabled = false;
        state.selectedLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setFallbackLocationMessage(`Location saved at ${state.selectedLocation.lat.toFixed(5)}, ${state.selectedLocation.lng.toFixed(5)}. Fetching address...`);
        reverseGeocode(state.selectedLocation.lat, state.selectedLocation.lng, setFallbackLocationMessage, savedAddress);
      },
      () => {
        useLocationButton.disabled = false;
        setFallbackLocationMessage("Location permission was not allowed. Please allow location access and try again.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  if (!window.L) {
    setFallbackLocationMessage("Map is still loading. Press Use current location to save your exact delivery pin.");
    useLocationButton?.addEventListener("click", requestFallbackLocation);
    return;
  }

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
  const currentAddress = getActiveAddress() || state.addresses[0] || null;
  const addressRecord = {
    id: currentAddress?.id || Date.now().toString(),
    name,
    phone,
    houseNumber,
    streetName,
    type: addressType,
    address,
    landmark,
    location: state.selectedLocation,
  };

  const snapshot = {
    profile: state.profile ? { ...state.profile } : null,
    addresses: state.addresses.map((entry) => ({ ...entry })),
    selectedAddressId: state.selectedAddressId || null,
  };

  state.profile = profile;
  if (state.addresses.length) {
    state.addresses = state.addresses.map((entry) => (
      entry.id === addressRecord.id
        ? addressRecord
        : {
            ...entry,
            name,
            phone,
          }
    ));
    if (!state.addresses.some((entry) => entry.id === addressRecord.id)) {
      state.addresses.unshift(addressRecord);
    }
  } else {
    state.addresses = [addressRecord];
  }
  state.selectedAddressId = addressRecord.id;
  state.activeTab = "dashboard";
  state.addressMode = null;
  state.drawerOpen = false;

  writeStoredJson(STORAGE_KEYS.profile, profile);
  writeStoredJson(STORAGE_KEYS.addresses, state.addresses);
  localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
  try {
    await syncCustomerState();
    renderAccount();
  } catch (error) {
    if (isSessionLockedError(error)) {
      restoreLocalIdentity(snapshot);
      explainSessionLock();
      renderAccount();
      return;
    }
    console.warn("Customer details saved locally. Backend sync skipped:", error);
    renderAccount();
  }
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
  try {
    await syncCustomerState();
    renderAccount();
  } catch (error) {
    if (isSessionLockedError(error)) {
      explainSessionLock();
      clearSession();
      renderAccount();
      return;
    }
    alert(error.message || "Could not save address right now.");
  }
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

  try {
    await syncCustomerState();
    renderAccount();
  } catch (error) {
    if (isSessionLockedError(error)) {
      explainSessionLock();
      clearSession();
      renderAccount();
      return;
    }
    alert(error.message || "Could not update address right now.");
  }
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
    couponCode: state.couponCode || "",
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
        await loadPreviousOrders();
        await loadOrdersForAccount();
        renderCart();
        paymentDialog?.close();
        if (cartPanel) {
          closeCartPanel("home");
          showPlacedOrderNotice(result.order);
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          writeStoredJson(STORAGE_KEYS.recentPlacedOrder, {
            id: result.order.id,
            address: result.order.address,
            createdAt: result.order.createdAt,
          });
          window.location.href = getRoute("/");
        }
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
  if (totals.onlySinglePieceItems && totals.singlePieceCount > 0 && totals.singlePieceCount < 3) {
    alert("Atleast 3 pieces to purchase single pieces");
    return;
  }

  try {
    const intent = await createPrepaidIntent();
    paymentSummary.textContent = `Pay ${formatPrice(totals.total)} using Razorpay.`;
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
    state.previousOrders = (result.orders || []).filter((order) => isVisibleCustomerOrder(order));
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
    renderReorderPanel();
  } catch {
    state.previousOrders = [];
    renderTrackingPanel(null);
    renderReorderPanel();
  }
}

accountButton?.addEventListener("click", (event) => {
  event.preventDefault();
  showAccountPanel({ scrollToTop: true, animate: true });
});

heroAccountButton?.addEventListener("click", (event) => {
  event.preventDefault();
  showAccountPanel({ scrollToTop: true, animate: true });
});

accountOpenButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    showAccountPanel({ scrollToTop: true, animate: true });
  });
});

searchOpenButtons.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    showSearchPanel({ scrollToTop: true, animate: true });
  });
});

searchCloseButton?.addEventListener("click", closeSearchDock);
searchBackdrop?.addEventListener("click", closeSearchDock);
menuSearchInput?.addEventListener("input", (event) => {
  state.searchTerm = event.target.value || "";
  renderMenu();
  renderSearchResults();
});
menuSearchInput?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSearchDock();
  }
});

manageAddressesButton?.addEventListener("click", async () => {
  state.drawerOpen = true;
  state.activeTab = "addresses";
  renderAccount();
});

checkoutAddressSelect?.addEventListener("change", async (event) => {
  const nextId = event.target.value;
  if (!nextId || nextId === state.selectedAddressId) return;
  state.selectedAddressId = nextId;
  localStorage.setItem(STORAGE_KEYS.selectedAddressId, state.selectedAddressId);
  try {
    await syncCustomerState();
  } catch (error) {
    if (isSessionLockedError(error)) {
      explainSessionLock();
      clearSession();
      renderAccount();
      return;
    }
    alert(error.message || "Could not switch address right now.");
  }
  renderCart();
  syncCheckoutFields();
});

applyCouponButton?.addEventListener("click", () => {
  applyCouponCode(couponCodeInput?.value || "");
});

clearCouponButton?.addEventListener("click", () => {
  clearCouponCode();
});

couponCodeInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    applyCouponCode(couponCodeInput.value || "");
  }
});

closeSidebarBtn?.addEventListener("click", closeDrawer);
accountOverlay?.addEventListener("click", closeDrawer);

const accountBackButton = document.querySelector("#accountBackButton");
if (accountBackButton) {
  accountBackButton.addEventListener("click", () => {
    state.activeTab = "dashboard";
    state.addressMode = null;
    renderAccount();
  });
}

const accountPanelBackButton = document.querySelector("#accountPanelBackButton");
if (accountPanelBackButton) {
  accountPanelBackButton.addEventListener("click", () => {
    state.activeTab = "dashboard";
    state.addressMode = null;
    renderAccount();
  });
}

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

async function handleAccountClick(event) {
  const subpage = event.target.closest("[data-nav-subpage]")?.dataset.navSubpage;
  if (subpage) {
    state.activeTab = subpage;
    if (subpage === "profile") {
      state.addressMode = "profile";
    } else {
      state.addressMode = null;
    }
    if (subpage === "orders" || subpage === "spends") {
      await loadOrdersForAccount();
    }
    renderAccount();
    return;
  }

  if (event.target.closest("#iosEditProfileBtn")) {
    state.activeTab = "profile";
    state.addressMode = "profile";
    renderAccount();
    return;
  }

  if (event.target.closest("#iosLogoutBtn")) {
    await logoutCustomer();
    return;
  }

  const action = event.target.closest("[data-account-action]")?.dataset.accountAction;
  if (action === "edit-profile") {
    state.activeTab = "profile";
    state.addressMode = "profile";
    renderAccount();
    return;
  }

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
    try {
      await syncCustomerState();
    } catch (error) {
      if (isSessionLockedError(error)) {
        explainSessionLock();
        clearSession();
        renderAccount();
        return;
      }
      alert(error.message || "Could not switch address right now.");
    }
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
}

const accountPanelContent = document.querySelector("#accountPanelContent");

const accountContentEl = document.querySelector("#accountContent");
if (accountContentEl) accountContentEl.addEventListener("click", handleAccountClick);
accountPanelContent?.addEventListener("click", handleAccountClick);

const handleAccountSubmit = async (event) => {
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
};

if (accountContentEl) accountContentEl.addEventListener("submit", handleAccountSubmit);
accountPanelContent?.addEventListener("submit", handleAccountSubmit);

accountShell?.addEventListener("click", async (event) => {
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
      cartPagePaymentMethodText.textContent = input.value === "card" ? "Debit / Credit card" : "Razorpay";
    }
    paymentOptionInputs.forEach((node) => {
      node.closest(".payment-option")?.classList.toggle("active", node.checked);
    });
  });
});

document.addEventListener("click", (event) => {
  const themeButton = event.target.closest("#themeToggleBtn");
  if (themeButton) {
    event.preventDefault();
    toggleTheme();
    return;
  }

  const homeButton = event.target.closest("[data-nav-home]");
  if (homeButton) {
    event.preventDefault();
    showHomePanel();
    return;
  }

  const menuButton = event.target.closest("[data-nav-menu]");
  if (menuButton) {
    event.preventDefault();
    showMenuPanel();
    return;
  }

  const cartButton = event.target.closest("[data-open-cart], a[data-route='/cart']");
  if (cartButton && cartPanel) {
    event.preventDefault();
    openCartPanel();
    return;
  }

  const reorderButton = event.target.closest("[data-nav-reorder]");
  if (reorderButton) {
    event.preventDefault();
    showReorderPanel();
    return;
  }

  const reorderAction = event.target.closest("[data-reorder-order]");
  if (reorderAction) {
    event.preventDefault();
    reorderFromOrder(reorderAction.dataset.reorderOrder);
    return;
  }

  const searchResult = event.target.closest("[data-search-open-flavor]");
  if (searchResult) {
    event.preventDefault();
    closeSearchDock();
    showMenuPanel();
    openFlavorMenu(searchResult.dataset.searchOpenFlavor);
    return;
  }

  const clearSearchButton = event.target.closest("[data-clear-search]");
  if (clearSearchButton) {
    event.preventDefault();
    state.searchTerm = "";
    if (menuSearchInput) menuSearchInput.value = "";
    renderMenu();
    renderSearchResults();
    menuSearchInput?.focus();
    return;
  }
});

const bottomNav = document.querySelector(".bottom-app-nav");
function getNearestBottomTab(clientX) {
  if (!bottomTabs.length) return null;
  let nearest = bottomTabs[0];
  let nearestDistance = Number.POSITIVE_INFINITY;
  bottomTabs.forEach((tab) => {
    const rect = tab.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const distance = Math.abs(centerX - clientX);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = tab;
    }
  });
  return nearest;
}

function positionBottomNavIndicatorAtX(clientX, animate = false) {
  if (!bottomNav || !bottomNavIndicator || !bottomTabs.length) return;
  const navRect = bottomNav.getBoundingClientRect();
  const nearest = getNearestBottomTab(clientX) || bottomTabs[0];
  const tabRect = nearest.getBoundingClientRect();
  const width = tabRect.width;
  const paddingLeft = parseFloat(getComputedStyle(bottomNav).paddingLeft) || 0;
  const left = Math.max(0, Math.min(navRect.width - width, clientX - navRect.left - paddingLeft - width / 2));
  bottomNavIndicator.style.transition = animate ? "" : "none";
  bottomNavIndicator.style.width = `${width}px`;
  bottomNavIndicator.style.transform = `translateX(${Math.round(left)}px)`;
  if (!animate) {
    window.requestAnimationFrame(() => {
      if (bottomNavIndicator) bottomNavIndicator.style.transition = "";
    });
  }
}

function settleBottomNavToTab(tabName, animate = true) {
  if (!tabName) return;
  openTabByName(tabName, { scrollToTop: false, animate });
}

bottomNav?.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  if (itemPreviewOverlay?.classList.contains("show") || flavorOverlay?.classList.contains("show")) return;
  navDragActive = true;
  navDragPointerId = event.pointerId;
  navDragOriginX = event.clientX;
  navDragOriginY = event.clientY;
  navDragMoved = false;
  navDragSuppressClick = false;
  bottomNav.classList.add("dragging");
  positionBottomNavIndicatorAtX(event.clientX, false);
  try {
    bottomNav.setPointerCapture(event.pointerId);
  } catch {
    // Some browsers do not allow capture on hidden or detached nodes.
  }
});

bottomNav?.addEventListener("pointermove", (event) => {
  if (!navDragActive || event.pointerId !== navDragPointerId) return;
  const dx = event.clientX - navDragOriginX;
  const dy = event.clientY - navDragOriginY;
  if (!navDragMoved) {
    navDragMoved = Math.abs(dx) > 6 || Math.abs(dy) > 6;
  }
  if (!navDragMoved) return;

  event.preventDefault();
  positionBottomNavIndicatorAtX(event.clientX, false);
  const nearest = getNearestBottomTab(event.clientX);
  const targetTab = nearest?.dataset?.bottomTab;
  if (targetTab && targetTab !== getCurrentBottomTab()) {
    settleBottomNavToTab(targetTab, false);
  }
});

function finishBottomNavDrag(event) {
  if (!navDragActive || event.pointerId !== navDragPointerId) return;
  const clientX = event.clientX;
  navDragActive = false;
  navDragPointerId = null;
  bottomNav?.classList.remove("dragging");
  try {
    bottomNav?.releasePointerCapture(event.pointerId);
  } catch {
    // Ignore if capture was never granted.
  }
  if (!navDragMoved) return;
  event.preventDefault();
  navDragSuppressClick = true;
  const nearest = getNearestBottomTab(clientX);
  const targetTab = nearest?.dataset?.bottomTab || getCurrentBottomTab();
  settleBottomNavToTab(targetTab, true);
  window.setTimeout(() => {
    navDragSuppressClick = false;
  }, 0);
}

bottomNav?.addEventListener("pointerup", finishBottomNavDrag);
bottomNav?.addEventListener("pointercancel", finishBottomNavDrag);
bottomNav?.addEventListener("lostpointercapture", finishBottomNavDrag);
bottomNav?.addEventListener("click", (event) => {
  if (!navDragSuppressClick) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  navDragSuppressClick = false;
}, true);

cartPanelClose?.addEventListener("click", () => closeCartPanel("home"));
cartPanelOverlay?.addEventListener("click", () => closeCartPanel("home"));

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

menuGrid?.addEventListener("pointerup", (event) => {
  const card = event.target.closest(".flavor-card");
  const directAction = event.target.closest("[data-add], [data-menu-increase], [data-menu-decrease], [data-open-flavor]");
  if (!card || directAction || !card.dataset.flavorKey) return;
  openFlavorMenu(card.dataset.flavorKey);
});

menuGrid?.addEventListener("touchend", (event) => {
  const card = event.target.closest(".flavor-card");
  const directAction = event.target.closest("[data-add], [data-menu-increase], [data-menu-decrease], [data-open-flavor]");
  if (!card || directAction || !card.dataset.flavorKey) return;
  openFlavorMenu(card.dataset.flavorKey);
}, { passive: true });

menuGrid?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".flavor-card");
  if (!card?.dataset.flavorKey) return;
  event.preventDefault();
  openFlavorMenu(card.dataset.flavorKey);
});

function openItemPreview(item) {
  if (!itemPreviewOverlay || !itemPreviewImage || !itemPreviewName || !itemPreviewPrice) return;
  previewItemId = item.id;
  itemPreviewImage.src = item.image || "assets/hero-food.png";
  itemPreviewImage.alt = item.name;
  itemPreviewName.textContent = item.name;
  itemPreviewPrice.textContent = formatPrice(item.price);
  if (itemPreviewDescription) itemPreviewDescription.textContent = item.description || "Freshly prepared cookie with a rich homemade feel.";
  if (itemPreviewMoreInfo) itemPreviewMoreInfo.href = `${getRoute("/product-info")}?item=${encodeURIComponent(item.id)}`;
  itemPreviewOverlay.classList.remove("hidden");
  itemPreviewOverlay.classList.add("show");
  itemPreviewOverlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeItemPreview() {
  if (!itemPreviewOverlay) return;
  itemPreviewOverlay.classList.remove("show");
  window.setTimeout(() => {
    itemPreviewOverlay.classList.add("hidden");
    itemPreviewOverlay.setAttribute("aria-hidden", "true");
  }, 180);
  previewItemId = null;

  const stillOpen = flavorOverlay?.classList.contains("show");
  if (!stillOpen) document.body.classList.remove("modal-open");
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

flavorClose?.addEventListener("click", closeFlavorMenu);
flavorOverlay?.addEventListener("click", (event) => {
  if (event.target === flavorOverlay) closeFlavorMenu();
});
flavorOptions?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  const increase = event.target.closest("[data-menu-increase]");
  const decrease = event.target.closest("[data-menu-decrease]");
  const trigger = button || increase || decrease;
  const selectedRow = event.target.closest("[data-select-flavor-variant]");
  if (selectedRow) {
    selectedFlavorVariantId = selectedRow.dataset.selectFlavorVariant;
  }
  if (!trigger) {
    if (selectedRow && activeFlavorKey) openFlavorMenu(activeFlavorKey);
    return;
  }
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

document.addEventListener("pointerdown", (event) => {
  const trigger = event.target.closest(
    "button, a, input[type='button'], input[type='submit'], [role='button'], .primary-link, .secondary-link, .filter, .account-tab",
  );
  if (!trigger) return;
  vibrate(8, "selection");
});

document.addEventListener("click", (event) => {
  const trigger = event.target.closest(
    "button, a, input[type='button'], input[type='submit'], [role='button'], .primary-link, .secondary-link, .filter, .account-tab",
  );
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
  syncCouponUi();
  await loadCustomerState();
  state.drawerOpen = false;
  state.activeTab = getResolvedCustomerProfile()?.phone ? "dashboard" : "profile";
  renderAccount();
  renderCart();
  await loadMenu();
  if (getResolvedCustomerProfile()?.phone) {
    await loadOrdersForAccount();
  }
  showHomePanel();
  requestAnimationFrame(() => setBottomTab("home"));
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

// ── Interactive Homepage Widgets (Mood Quiz & Custom Box Builder) ─────────
let boxSize = 6; // Default size: Big Jumbo (6 Pcs)
let customBoxSlots = Array(boxSize).fill(null);
let activeQuizMatch = null;

function initInteractiveWidgets() {
  initMoodQuiz();
  initBoxBuilder();
}

function initMoodQuiz() {
  const moodGrid = document.querySelector("#moodGrid");
  const quizResetBtn = document.querySelector("#quizResetBtn");
  const quizAddBtn = document.querySelector("#quizAddBtn");

  if (!moodGrid) return;

  // Mood selection click handler
  moodGrid.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-mood]");
    if (!btn) return;

    // Toggle active state
    moodGrid.querySelectorAll(".mood-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const mood = btn.dataset.mood;
    if (typeof vibrateTap === "function") vibrateTap(12);
    selectCookieMood(mood);
  });

  quizResetBtn?.addEventListener("click", () => {
    if (typeof vibrateTap === "function") vibrateTap(8);
    resetCookieQuiz();
  });

  quizAddBtn?.addEventListener("click", () => {
    if (!activeQuizMatch) return;
    if (typeof vibrateTap === "function") vibrateTap(15);
    
    // Add to cart
    updateQuantity(activeQuizMatch.id, 1);
    
    // Animate button success state
    const originalText = quizAddBtn.innerHTML;
    quizAddBtn.classList.add("added-success");
    quizAddBtn.innerHTML = "Matched & Added! 🍪✨";
    
    setTimeout(() => {
      quizAddBtn.classList.remove("added-success");
      quizAddBtn.innerHTML = originalText;
    }, 2000);
  });
}

function selectCookieMood(mood) {
  const quizResultCard = document.querySelector("#quizResultCard");
  const quizMatchTitle = document.querySelector("#quizMatchTitle");
  const quizMatchPrice = document.querySelector("#quizMatchPrice");
  const quizMatchDescription = document.querySelector("#quizMatchDescription");
  const quizMatchImage = document.querySelector("#quizMatchImage");
  const quizBtnPrice = document.querySelector("#quizBtnPrice");

  if (!quizResultCard || !state.menu.length) return;

  // Decide recommendation based on mood and state.menu availability
  let match = null;

  if (mood === "intense") {
    // Look for Double Chocolate single, fallback to Chocolate single
    match = state.menu.find((item) => item.id === "classic-doublechocolate-single" && item.available) 
         || state.menu.find((item) => item.id === "classic-chocolate-single");
  } else if (mood === "biscoff") {
    // Look for Biscoff single
    match = state.menu.find((item) => item.id === "premium-biscoff-single" && item.available);
  } else if (mood === "nutty") {
    // Look for Dry Fruit single
    match = state.menu.find((item) => item.id === "premium-dryfruit-single" && item.available);
  } else {
    // Classic - look for Oreo or Chocolate
    match = state.menu.find((item) => item.id === "classic-oreo-single" && item.available)
         || state.menu.find((item) => item.id === "classic-chocolate-single");
  }

  if (!match) return;
  activeQuizMatch = match;

  // Populate recommended card
  const cleanName = match.name.split(" - ")[0]; // Strip the "- Single" suffix
  quizMatchTitle.textContent = cleanName;
  quizMatchPrice.textContent = formatPrice(match.price);
  quizBtnPrice.textContent = formatPrice(match.price);
  quizMatchDescription.textContent = match.description || "Freshly rolled gourmet cookie stuffed with our signature warm molten core.";
  quizMatchImage.src = match.image || "assets/hero-food.png";

  // Show container with fade-in effect
  quizResultCard.classList.remove("hidden");
  quizResultCard.style.opacity = "0";
  requestAnimationFrame(() => {
    quizResultCard.style.transition = "opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
    quizResultCard.style.opacity = "1";
  });
}

function resetCookieQuiz() {
  const quizResultCard = document.querySelector("#quizResultCard");
  const moodGrid = document.querySelector("#moodGrid");
  if (quizResultCard) quizResultCard.classList.add("hidden");
  if (moodGrid) {
    moodGrid.querySelectorAll(".mood-btn").forEach((b) => b.classList.remove("active"));
  }
  activeQuizMatch = null;
}

function initBoxBuilder() {
  const builderFlavorGrid = document.querySelector("#builderFlavorGrid");
  const addBoxToCartBtn = document.querySelector("#addBoxToCartBtn");
  const clearTrayBtn = document.querySelector("#clearTrayBtn");
  const trayGrid = document.querySelector("#trayGrid");
  const sizeSelector = document.querySelector("#traySizeSelector");

  if (!builderFlavorGrid || !state.menu.length) return;

  // Listen to Segmented size switch
  sizeSelector?.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-size]");
    if (!tab) return;
    const newSize = parseInt(tab.dataset.size, 10);
    if (newSize === boxSize) return;

    sizeSelector.querySelectorAll(".size-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    boxSize = newSize;
    customBoxSlots = Array(boxSize).fill(null);
    if (typeof vibrateTap === "function") vibrateTap(10);
    renderBoxSlots();
  });

  // Extract all single-pack cookie items from the menu
  const singleItems = state.menu.filter((item) => 
    item.name.toLowerCase().includes("single") || 
    item.id.endsWith("-single")
  );

  if (!singleItems.length) {
    builderFlavorGrid.innerHTML = '<p class="empty-builder-notes">No single cookie flavors are currently available in the menu to construct a box.</p>';
    return;
  }

  // Render flavors inside the flavor choices grid
  builderFlavorGrid.innerHTML = singleItems
    .map((item) => {
      const parsed = parseMenuVariantName(item.name);
      const soldOut = item.available === false || getMenuStock(item) <= 0;
      return `
        <button class="flavor-choice-card ${soldOut ? "sold-out" : ""}" type="button" data-flavor-id="${item.id}" ${soldOut ? "disabled" : ""}>
          <img src="${item.image || "assets/hero-food.png"}" alt="${parsed.flavor}" />
          <div class="choice-meta">
            <strong>${parsed.flavor}</strong>
            <span>${formatPrice(item.price)}</span>
          </div>
          <span class="choice-add-badge">+</span>
        </button>
      `;
    })
    .join("");

  // Handle tapping a flavor in the grid
  builderFlavorGrid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-flavor-id]");
    if (!card) return;
    const item = state.menu.find((entry) => entry.id === card.dataset.flavorId);
    if (!item) return;

    addCookieToBox(item);
  });

  // Handle removing flavor from slot on slot click
  trayGrid?.addEventListener("click", (event) => {
    const slotNode = event.target.closest("[data-slot]");
    if (!slotNode) return;
    const index = parseInt(slotNode.dataset.slot, 10);
    if (customBoxSlots[index]) {
      if (typeof vibrateTap === "function") vibrateTap(8);
      removeCookieFromSlot(index);
    }
  });

  clearTrayBtn?.addEventListener("click", () => {
    if (typeof vibrateTap === "function") vibrateTap(10);
    clearAllSlots();
  });

  addBoxToCartBtn?.addEventListener("click", () => {
    if (typeof vibrateTap === "function") vibrateTap(20);
    addCustomBoxToCart();
  });

  renderBoxSlots();
}

function addCookieToBox(item) {
  const emptyIndex = customBoxSlots.indexOf(null);
  if (emptyIndex === -1) {
    const boxName = boxSize === 3 ? "Starter Box" : "Big Jumbo";
    alert(`Your ${boxName} is already full! Tap a cookie in the tray to remove it and make room.`);
    return;
  }

  const parsed = parseMenuVariantName(item.name);
  customBoxSlots[emptyIndex] = {
    id: item.id,
    name: item.name,
    price: item.price,
    image: item.image,
    flavor: parsed.flavor
  };

  if (typeof vibrateTap === "function") vibrateTap(12);
  renderBoxSlots();
}

function removeCookieFromSlot(index) {
  customBoxSlots[index] = null;
  renderBoxSlots();
}

function clearAllSlots() {
  customBoxSlots = Array(boxSize).fill(null);
  renderBoxSlots();
}

function renderBoxSlots() {
  const trayGrid = document.querySelector("#trayGrid");
  const trayTally = document.querySelector("#trayTally");
  const clearTrayBtn = document.querySelector("#clearTrayBtn");
  const addBoxToCartBtn = document.querySelector("#addBoxToCartBtn");
  const trayProgressFill = document.querySelector("#trayProgressFill");
  const builderPriceTally = document.querySelector("#builderPriceTally");
  const customBoxTotalPrice = document.querySelector("#customBoxTotalPrice");
  const customBoxSaving = document.querySelector("#customBoxSaving");

  if (!trayGrid) return;

  // Set correct grid columns class based on size
  trayGrid.style.gridTemplateColumns = boxSize === 3 ? "repeat(3, 1fr)" : "repeat(3, 1fr)";

  let filledCount = 0;
  let totalPrice = 0;
  let slotsHtml = "";

  for (let index = 0; index < boxSize; index++) {
    const slot = customBoxSlots[index];
    if (slot) {
      filledCount++;
      totalPrice += slot.price;
      
      slotsHtml += `
        <div class="tray-slot" data-slot="${index}" title="Click to remove">
          <div class="slot-circle filled animate-pop">
            <img src="${slot.image || "assets/hero-food.png"}" alt="${slot.flavor}" />
            <span class="slot-remove-badge">×</span>
          </div>
          <span class="slot-label filled">${slot.flavor}</span>
        </div>
      `;
    } else {
      slotsHtml += `
        <div class="tray-slot" data-slot="${index}" title="Click to add">
          <div class="slot-circle empty">
            <span class="slot-num">${index + 1}</span>
            <span class="slot-add-icon">+</span>
          </div>
          <span class="slot-label">Empty Slot</span>
        </div>
      `;
    }
  }

  trayGrid.innerHTML = slotsHtml;

  // Update progress bar
  const progressPercent = (filledCount / boxSize) * 100;
  if (trayProgressFill) trayProgressFill.style.width = `${progressPercent}%`;

  // Update tallies
  const boxName = boxSize === 3 ? "Starter Box" : "Big Jumbo";
  if (trayTally) trayTally.textContent = `${filledCount} / ${boxSize} cookies selected`;
  if (clearTrayBtn) {
    clearTrayBtn.classList.toggle("hidden", filledCount === 0);
  }

  // Pricing & Buttons
  if (filledCount === boxSize) {
    if (addBoxToCartBtn) {
      addBoxToCartBtn.removeAttribute("disabled");
      addBoxToCartBtn.classList.remove("disabled");
      addBoxToCartBtn.innerHTML = `Assemble & Add ${boxName} to Cart ✨`;
    }

    if (builderPriceTally) builderPriceTally.classList.remove("hidden");
    
    // Regular price sum calculation (No discount!)
    if (customBoxTotalPrice) {
      customBoxTotalPrice.textContent = formatPrice(totalPrice);
    }
    if (customBoxSaving) {
      customBoxSaving.textContent = `Premium Assorted ${boxName}`;
      customBoxSaving.style.color = "var(--text-secondary-apple)";
    }
  } else {
    if (addBoxToCartBtn) {
      addBoxToCartBtn.setAttribute("disabled", "true");
      addBoxToCartBtn.classList.add("disabled");
      addBoxToCartBtn.innerHTML = `Assemble & Add ${boxName} to Cart`;
    }
    if (builderPriceTally) builderPriceTally.classList.add("hidden");
  }
}

async function addCustomBoxToCart() {
  const filled = customBoxSlots.filter(Boolean);
  if (filled.length < boxSize) return;

  // Count items of each ID selected
  const itemsToAdd = new Map();
  filled.forEach((slot) => {
    itemsToAdd.set(slot.id, (itemsToAdd.get(slot.id) || 0) + 1);
  });

  // Add them by modifying state.cart directly
  for (const [id, qty] of itemsToAdd.entries()) {
    const current = state.cart.get(id) || 0;
    state.cart.set(id, current + qty);
  }

  // Persist and render
  persistCart();
  state.checkoutNeedsAccountConfirm = true;
  renderCart();
  renderMenu();

  // Highlight cart panel to make it feel premium
  if (typeof openCartPanel === "function") openCartPanel();

  // Reset tray
  const boxName = boxSize === 3 ? "Starter Box" : "Big Jumbo";
  clearAllSlots();
  if (typeof vibrateTap === "function") vibrateTap(30);

  // Success feedback message
  setTimeout(() => {
    alert(`✨ Your custom ${boxName} has been assembled and added to your cart!`);
  }, 100);
}

// Initialize App Navigation
window.addEventListener("DOMContentLoaded", () => {
  applyTheme(getStoredTheme(), { persist: false });

  if (isCartPage) return;
  // Make sure the bottom tab matches the default active page
  const defaultTab = pageMode || "home";
  setBottomTab(defaultTab, false);
});
