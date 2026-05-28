const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");
const zlib = require("node:zlib");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PIN = process.env.ADMIN_PIN || "123456";
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const USE_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const MENU_SOURCE = (process.env.MENU_SOURCE || "supabase").toLowerCase(); // "supabase" | "file"
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const ROOT = __dirname;
const FRONTEND_DIR = path.join(ROOT, "..", "frontend");
const DATA_DIR = path.join(ROOT, "data");
const FILES = {
  orders: path.join(DATA_DIR, "orders.json"),
  menu: path.join(DATA_DIR, "menu.json"),
  payments: path.join(DATA_DIR, "payments.json"),
  customers: path.join(DATA_DIR, "customers.json"),
  settings: path.join(DATA_DIR, "settings.json"),
};

const BUSINESS = {
  name: "Sujaan Bites",
  upiId: "6301000409@kotakbank",
  upiPayeeName: "Sujaan Bites",
  whatsappNumber: "9493480594",
  customerCareEmail: "sujaanbites@gmail.com",
};
const LONG_DISTANCE_THRESHOLD_KM = 20;

const DEFAULT_STOCK_COUNT = 20;

const DEFAULT_MENU = [];

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const LONG_CACHE_TYPES = new Set([".png", ".svg"]);

let supabaseClient = null;

function sendJson(res, status, payload, req = null) {
  sendResponse(req || res.request || null, res, status, JSON.stringify(payload), "application/json; charset=utf-8", {
    "cache-control": "no-store",
  });
}

function sendResponse(req, res, status, body, contentType, extraHeaders = {}) {
  const acceptsGzip = req?.headers?.["accept-encoding"]?.includes("gzip");
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  const shouldGzip = acceptsGzip && buffer.length > 1024 && /^text\/|json|javascript|svg/.test(contentType);
  const payload = shouldGzip ? zlib.gzipSync(buffer) : buffer;
  res.writeHead(status, {
    "content-type": contentType,
    "content-length": payload.length,
    "access-control-allow-origin": CORS_ORIGIN,
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "Content-Type,X-Admin-Pin,X-Customer-Phone",
    ...(shouldGzip ? { "content-encoding": "gzip", vary: "Accept-Encoding" } : {}),
    ...extraHeaders,
  });
  res.end(payload);
}

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await ensureJsonFile(FILES.menu, DEFAULT_MENU);
  await ensureJsonFile(FILES.orders, []);
  await ensureJsonFile(FILES.payments, []);
  await ensureJsonFile(FILES.customers, []);
  await ensureJsonFile(FILES.settings, { adminLocation: null, menuCategories: [] });
}

async function getSupabaseClient() {
  if (!USE_SUPABASE) return null;
  if (supabaseClient) return supabaseClient;
  const { createClient } = await import("@supabase/supabase-js");
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseClient;
}

async function ensureJsonFile(filePath, fallback) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2));
    return;
  }

  if (filePath === FILES.menu) {
    const current = await readJson(filePath, fallback);
    const normalized = Array.isArray(current)
      ? current.map((item) => normalizeMenuItem(item))
      : fallback;
    await writeJson(filePath, normalized);
  }
}

async function readJson(filePath, fallback) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(text);
    return parsed;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

function toMenuRow(item) {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: Number(item.price || 0),
    category: String(item.category || "").trim() || "other",
    image: item.image || "",
    available: item.available !== false,
    stock_count: Number.isFinite(Number(item.stockCount)) ? Math.max(0, Math.floor(Number(item.stockCount))) : DEFAULT_STOCK_COUNT,
    updated_at: item.updatedAt || item.updated_at || new Date().toISOString(),
  };
}

function fromMenuRow(row) {
  return normalizeMenuItem({
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price || 0),
    category: row.category,
    image: row.image || "",
    available: row.available !== false,
    stockCount: row.stock_count,
    updatedAt: row.updated_at || row.updatedAt || null,
  });
}

function normalizeStockCount(value) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
  return DEFAULT_STOCK_COUNT;
}

function normalizeMenuItem(item = {}) {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: Number(item.price || 0),
    category: String(item.category || "").trim() || "other",
    image: item.image || "",
    available: item.available !== false,
    stockCount: normalizeStockCount(item.stockCount ?? item.stock_count),
    updatedAt: item.updatedAt || item.updated_at || null,
  };
}

function fromOrderRow(row) {
  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  return {
    ...payload,
    id: payload.id || row.id,
    createdAt: payload.createdAt || row.created_at || row.createdAt,
    updatedAt: payload.updatedAt || row.updated_at || row.updatedAt || null,
    customerPhone: payload.customerPhone || row.customer_phone || "",
    paymentMethod: payload.paymentMethod || row.payment_method || "prepaid",
    paymentStatus: payload.paymentStatus || row.payment_status || "",
    status: payload.status || row.status || "",
    adminStatus: payload.adminStatus || row.admin_status || "",
  };
}

function toOrderRow(order) {
  return {
    id: order.id,
    customer_phone: order.customerPhone || "",
    status: order.status || "",
    admin_status: order.adminStatus || "",
    payment_method: order.paymentMethod || "",
    payment_status: order.paymentStatus || "",
    created_at: order.createdAt || new Date().toISOString(),
    updated_at: order.updatedAt || new Date().toISOString(),
    payload: order,
  };
}

function fromCustomerRow(row) {
  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  return {
    phone: row.phone || payload.phone || "",
    profile: payload.profile || null,
    addresses: Array.isArray(payload.addresses) ? payload.addresses : [],
    selectedAddressId: payload.selectedAddressId || null,
    updatedAt: row.updated_at || payload.updatedAt || null,
  };
}

function toCustomerRow(phone, state) {
  return {
    phone,
    updated_at: new Date().toISOString(),
    payload: {
      profile: state.profile || null,
      addresses: Array.isArray(state.addresses) ? state.addresses.slice(0, 10) : [],
      selectedAddressId: state.selectedAddressId || null,
      updatedAt: new Date().toISOString(),
    },
  };
}

function fromSettingsRow(row) {
  const payload = row?.payload && typeof row.payload === "object" ? row.payload : {};
  return {
    adminLocation: payload.adminLocation || null,
    menuCategories: normalizeMenuCategories(payload.menuCategories),
  };
}

function toSettingsRow(settings) {
  return {
    id: "default",
    updated_at: new Date().toISOString(),
    payload: {
      adminLocation: settings?.adminLocation || null,
      menuCategories: normalizeMenuCategories(settings?.menuCategories),
    },
  };
}

function normalizeMenuCategories(values) {
  if (!Array.isArray(values)) return [];
  const unique = new Map();
  for (const value of values) {
    const label = String(value || "").trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (!unique.has(key)) unique.set(key, label);
  }
  return [...unique.values()];
}

function normalizePhone(phone) {
  return String(phone || "").replace(/\D/g, "").slice(-10);
}

function makeId(prefix) {
  return `${prefix}${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;
}

function timingSafeEqual(a, b) {
  const left = Buffer.from(a || "");
  const right = Buffer.from(b || "");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function withinServiceArea(location) {
  return Boolean(location && Number.isFinite(location.lat) && Number.isFinite(location.lng));
}

function toRad(value) {
  return (Number(value) * Math.PI) / 180;
}

function haversineDistanceKm(from, to) {
  if (!withinServiceArea(from) || !withinServiceArea(to)) return null;
  const lat1 = Number(from.lat);
  const lng1 = Number(from.lng);
  const lat2 = Number(to.lat);
  const lng2 = Number(to.lng);
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function getSinglePieceCount(rows = []) {
  return rows.reduce((sum, row) => {
    const label = String(row?.name || "").toLowerCase();
    const isSingle = label.includes("single") || label.includes("(1 pc)") || label.includes("1 pc");
    return sum + (isSingle ? Number(row.quantity || 0) : 0);
  }, 0);
}

function buildDeliveryMeta({ orderType, quantity, address, settings }) {
  if (orderType !== "delivery" || quantity < 1) {
    return {
      baseDelivery: 0,
      distanceSurcharge: 0,
      delivery: 0,
      distanceKm: null,
      isLongDistance: false,
      estimatedWindow: "",
      etaMessage: "",
      restaurantLocation: null,
    };
  }

  const restaurantLocation = settings?.adminLocation && withinServiceArea(settings.adminLocation)
    ? {
      lat: Number(settings.adminLocation.lat),
      lng: Number(settings.adminLocation.lng),
      address: String(settings.adminLocation.address || ""),
      updatedAt: settings.adminLocation.updatedAt || null,
    }
    : null;

  const customerLocation = address?.location && withinServiceArea(address.location)
    ? { lat: Number(address.location.lat), lng: Number(address.location.lng) }
    : null;

  const distanceKm = restaurantLocation && customerLocation
    ? haversineDistanceKm(restaurantLocation, customerLocation)
    : null;

  const isLongDistance = Number.isFinite(distanceKm) && distanceKm > LONG_DISTANCE_THRESHOLD_KM;
  const delivery = Number.isFinite(distanceKm)
    ? distanceKm <= 180
      ? 49
      : distanceKm <= 250
        ? 59
        : 79
    : 49;

  return {
    delivery,
    distanceKm: Number.isFinite(distanceKm) ? Number(distanceKm.toFixed(2)) : null,
    isLongDistance,
    estimatedWindow: isLongDistance ? "3-7 days" : "",
    etaMessage: isLongDistance
      ? "The order will be delivered within 3-7 days."
      : "",
    restaurantLocation,
  };
}

function verifyRazorpaySignature(orderId, paymentId, signature) {
  if (!RAZORPAY_KEY_SECRET) return false;
  const generated = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return timingSafeEqual(generated, signature || "");
}

function verifyRazorpayWebhook(rawBody, signature) {
  if (!RAZORPAY_WEBHOOK_SECRET) return false;
  const generated = crypto.createHmac("sha256", RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  return timingSafeEqual(generated, signature || "");
}

function razorpayRequest(method, apiPath, payload) {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay keys are not configured on the server");
  }

  const body = payload ? JSON.stringify(payload) : "";
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "api.razorpay.com",
        path: `/v1${apiPath}`,
        method,
        headers: {
          authorization: `Basic ${auth}`,
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
        },
      },
      (response) => {
        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          const parsed = data ? JSON.parse(data) : {};
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(parsed);
            return;
          }
          reject(new Error(parsed.error?.description || parsed.error || "Razorpay request failed"));
        });
      },
    );

    request.on("error", reject);
    request.end(body);
  });
}

async function readBody(req) {
  const rawBody = await readRawBody(req);
  return rawBody ? JSON.parse(rawBody) : {};
}

async function readRawBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Request body too large");
  }
  return body;
}

function requireAdmin(req, res) {
  if (req.headers["x-admin-pin"] !== ADMIN_PIN) {
    sendJson(res, 401, { error: "Invalid admin PIN" });
    return false;
  }
  return true;
}

async function getMenu() {
  if (MENU_SOURCE === "file") {
    const menu = await readJson(FILES.menu, DEFAULT_MENU);
    return Array.isArray(menu) ? menu.map(normalizeMenuItem) : DEFAULT_MENU;
  }

  if (USE_SUPABASE) {
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.from("menu_items").select("*").order("name", { ascending: true });
      if (error) throw error;
      if (Array.isArray(data) && data.length > 0) {
        const hasStockCount = data.some((row) => Object.prototype.hasOwnProperty.call(row, "stock_count"));
        if (!hasStockCount) {
          const localMenu = await readJson(FILES.menu, DEFAULT_MENU);
          const localStockById = new Map(
            (Array.isArray(localMenu) ? localMenu : DEFAULT_MENU).map((item) => [
              item.id,
              normalizeStockCount(item.stockCount ?? item.stock_count),
            ]),
          );
          return data.map((row) =>
            fromMenuRow({
              ...row,
              stock_count: localStockById.get(row.id) ?? DEFAULT_STOCK_COUNT,
            }),
          );
        }
        return data.map(fromMenuRow);
      }
      const localMenu = await readJson(FILES.menu, DEFAULT_MENU);
      return Array.isArray(localMenu) ? localMenu.map(normalizeMenuItem) : DEFAULT_MENU;
    } catch (error) {
      console.warn(`Supabase menu read failed, falling back to local files: ${error.message}`);
    }
  }

  const menu = await readJson(FILES.menu, DEFAULT_MENU);
  return Array.isArray(menu) ? menu.map(normalizeMenuItem) : DEFAULT_MENU;
}

async function saveMenu(menu) {
  const normalized = Array.isArray(menu) ? menu.map(normalizeMenuItem) : [];
  if (MENU_SOURCE === "file") {
    await writeJson(FILES.menu, normalized);
    return;
  }
  if (USE_SUPABASE) {
    try {
      const supabase = await getSupabaseClient();
      const rows = normalized.map(toMenuRow);
      const { error } = await supabase.from("menu_items").upsert(rows, { onConflict: "id" });
      if (error) throw error;
      const ids = normalized.map((item) => item.id).filter(Boolean);
      if (ids.length > 0) {
        const inFilter = `(${ids.map((id) => `"${String(id).replaceAll('"', '\\"')}"`).join(",")})`;
        const { error: deleteError } = await supabase.from("menu_items").delete().not("id", "in", inFilter);
        if (deleteError) throw deleteError;
      } else {
        const { error: clearError } = await supabase.from("menu_items").delete().not("id", "is", null);
        if (clearError) throw clearError;
      }
      await writeJson(FILES.menu, normalized);
      return;
    } catch (error) {
      const message = String(error?.message || "");
      if (message.includes("stock_count")) {
        throw new Error("Supabase schema is missing stock_count. Run the latest supabase.sql and redeploy.");
      }
      throw new Error(`Supabase menu write failed: ${message || "unknown error"}`);
    }
  }

  await writeJson(FILES.menu, normalized);
}

async function getOrders() {
  if (USE_SUPABASE) {
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      if (Array.isArray(data)) {
        return data.map(fromOrderRow);
      }
    } catch (error) {
      console.warn(`Supabase orders read failed, falling back to local files: ${error.message}`);
    }
  }

  return readJson(FILES.orders, []);
}

async function getOrdersForPhone(phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return [];

  if (USE_SUPABASE) {
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_phone", normalizedPhone)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (Array.isArray(data)) {
        return data.map(fromOrderRow);
      }
    } catch (error) {
      console.warn(`Supabase customer order read failed, falling back to local files: ${error.message}`);
    }
  }

  const orders = await readJson(FILES.orders, []);
  return orders
    .filter((order) => order.customerPhone === normalizedPhone)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function saveOrders(orders) {
  if (USE_SUPABASE) {
    try {
      const supabase = await getSupabaseClient();
      const rows = orders.map(toOrderRow);
      const { error } = await supabase.from("orders").upsert(rows, { onConflict: "id" });
      if (error) throw error;
      return;
    } catch (error) {
      console.warn(`Supabase orders write failed, falling back to local files: ${error.message}`);
    }
  }

  await writeJson(FILES.orders, orders);
}

async function getPayments() {
  return readJson(FILES.payments, []);
}

async function getSettings() {
  if (USE_SUPABASE) {
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.from("settings").select("*").eq("id", "default").maybeSingle();
      if (error) throw error;
      if (data) {
        const settings = fromSettingsRow(data);
        await writeJson(FILES.settings, settings);
        return settings;
      }
      const localSettings = await readJson(FILES.settings, { adminLocation: null, menuCategories: [] });
      const row = toSettingsRow(localSettings);
      const { error: upsertError } = await supabase.from("settings").upsert(row, { onConflict: "id" });
      if (upsertError) throw upsertError;
      return localSettings;
    } catch (error) {
      console.warn(`Supabase settings read failed, falling back to local files: ${error.message}`);
    }
  }
  const settings = await readJson(FILES.settings, { adminLocation: null, menuCategories: [] });
  return {
    adminLocation: settings?.adminLocation || null,
    menuCategories: normalizeMenuCategories(settings?.menuCategories),
  };
}

async function saveSettings(settings) {
  const normalized = {
    adminLocation: settings?.adminLocation || null,
    menuCategories: normalizeMenuCategories(settings?.menuCategories),
  };
  if (USE_SUPABASE) {
    try {
      const supabase = await getSupabaseClient();
      const row = toSettingsRow(normalized);
      const { error } = await supabase.from("settings").upsert(row, { onConflict: "id" });
      if (error) throw error;
      await writeJson(FILES.settings, normalized);
      return;
    } catch (error) {
      console.warn(`Supabase settings write failed, falling back to local files: ${error.message}`);
    }
  }
  await writeJson(FILES.settings, normalized);
}

async function savePayments(payments) {
  await writeJson(FILES.payments, payments);
}

async function getCustomerRecord(phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;

  if (USE_SUPABASE) {
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.from("customers").select("*").eq("phone", normalizedPhone).maybeSingle();
      if (error) throw error;
      if (data) return fromCustomerRow(data);
      return null;
    } catch (error) {
      console.warn(`Supabase customer read failed, falling back to local files: ${error.message}`);
    }
  }

  const customers = await readJson(FILES.customers, []);
  return fromCustomerRow(customers.find((entry) => entry.phone === normalizedPhone) || {});
}

async function saveCustomerRecord(phone, state) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    throw new Error("A valid phone number is required");
  }

  const record = toCustomerRow(normalizedPhone, state);

  if (USE_SUPABASE) {
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.from("customers").upsert(record, { onConflict: "phone" });
      if (error) throw error;
      return fromCustomerRow(record);
    } catch (error) {
      console.warn(`Supabase customer write failed, falling back to local files: ${error.message}`);
    }
  }

  const customers = await readJson(FILES.customers, []);
  const next = customers.filter((entry) => entry.phone !== normalizedPhone);
  next.push(record);
  await writeJson(FILES.customers, next);
  return fromCustomerRow(record);
}

async function seedMenuIfNeeded() {
  if (!USE_SUPABASE) return;
  if (!Array.isArray(DEFAULT_MENU) || DEFAULT_MENU.length === 0) return;

  try {
    const supabase = await getSupabaseClient();
    const { count, error } = await supabase.from("menu_items").select("id", { count: "exact", head: true });
    if (error) throw error;
    if (!count) {
      const rows = DEFAULT_MENU.map(toMenuRow);
      const { error: seedError } = await supabase.from("menu_items").upsert(rows, { onConflict: "id" });
      if (seedError) throw seedError;
    }
  } catch (error) {
    console.warn(`Supabase menu seed skipped: ${error.message}`);
  }
}

function calculateOrder(menu, items, orderType, options = {}) {
  const rows = [];
  const requestedCounts = new Map();

  for (const item of items || []) {
    const menuItem = menu.find((dish) => dish.id === item.id);
    const quantity = Math.max(0, Number(item.quantity || 0));
    if (!menuItem || quantity < 1) continue;
    if (menuItem.available === false) {
      throw new Error(`${menuItem.name} is currently unavailable`);
    }
    const stockCount = normalizeStockCount(menuItem.stockCount);
    const requested = (requestedCounts.get(menuItem.id) || 0) + quantity;
    if (stockCount <= 0) {
      throw new Error(`Only 0 of ${menuItem.name} are available at the moment`);
    }
    if (requested > stockCount) {
      throw new Error(`Only ${stockCount} of ${menuItem.name} are available at the moment`);
    }
    requestedCounts.set(menuItem.id, requested);
    rows.push({
      id: menuItem.id,
      name: menuItem.name,
      quantity,
      price: menuItem.price,
      lineTotal: menuItem.price * quantity,
    });
  }

  const subtotal = rows.reduce((sum, item) => sum + item.lineTotal, 0);
  const quantity = rows.reduce((sum, item) => sum + item.quantity, 0);
  const singlePieceCount = getSinglePieceCount(rows);
  if (singlePieceCount > 0 && singlePieceCount < 3) {
    throw new Error("Atleast 3 pieces to purchase single pieces");
  }
  const deliveryMeta = buildDeliveryMeta({
    orderType,
    quantity,
    address: options.address || null,
    settings: options.settings || null,
  });
  const delivery = subtotal > 0 ? deliveryMeta.delivery : 0;

  return {
    rows,
    deliveryMeta,
    totals: {
      subtotal,
      delivery,
      total: subtotal + delivery,
    },
  };
}

function applyMenuStockChange(menu, items, direction) {
  const updated = menu.map((item) => ({ ...normalizeMenuItem(item) }));
  for (const orderItem of items || []) {
    const quantity = Math.max(0, Number(orderItem.quantity || 0));
    if (quantity < 1) continue;
    const index = updated.findIndex((item) => item.id === orderItem.id);
    if (index === -1) continue;
    const current = updated[index];
    const nextStock = normalizeStockCount(current.stockCount) + direction * quantity;
    if (direction < 0 && nextStock < 0) {
      throw new Error(`Only ${current.stockCount} of ${current.name} are available at the moment`);
    }
    updated[index] = {
      ...current,
      stockCount: Math.max(0, nextStock),
      updatedAt: new Date().toISOString(),
    };
  }
  return updated;
}

function validateAddress(address) {
  if (!address || typeof address !== "object") {
    throw new Error("Delivery details are required");
  }

  if (!address.name || !address.phone || !address.houseNumber || !address.streetName || !address.address) {
    throw new Error("Name, phone number, house number, street name and map address are required");
  }

}

function getDateKey(value) {
  const date = new Date(value || Date.now());
  if (!Number.isFinite(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

async function createRazorpayIntent(orderDraft) {
  const paymentSession = {
    id: makeId("pay_"),
    createdAt: new Date().toISOString(),
    status: "pending",
    orderDraft,
  };

  if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
    const razorpayOrder = await razorpayRequest("POST", "/orders", {
      amount: orderDraft.totals.total * 100,
      currency: "INR",
      receipt: orderDraft.requestId,
      notes: {
        request_id: orderDraft.requestId,
        customer_phone: orderDraft.customerPhone,
      },
    });

    paymentSession.razorpayOrderId = razorpayOrder.id;
    paymentSession.amount = razorpayOrder.amount;
    paymentSession.currency = razorpayOrder.currency;

    await savePayments([...(await getPayments()), paymentSession]);

    return {
      paymentSessionId: paymentSession.id,
      razorpay: {
        keyId: RAZORPAY_KEY_ID,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: BUSINESS.name,
      },
    };
  }

  throw new Error("Razorpay is not configured on this server");
}

async function finalizeRazorpayOrder(body) {
  if (!verifyRazorpaySignature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)) {
    throw new Error("Payment signature verification failed");
  }

  const payments = await getPayments();
  const paymentSession = payments.find((entry) => entry.id === body.paymentSessionId);
  if (!paymentSession) {
    throw new Error("Payment session not found");
  }

  if (paymentSession.status === "completed") {
    return paymentSession.order;
  }

  const menu = await getMenu();
  const draft = paymentSession.orderDraft;
  const settings = await getSettings();
  const calculated = calculateOrder(menu, draft.items, draft.orderType, {
    address: draft.address || null,
    settings,
  });
  const order = {
    id: `ST${Date.now().toString().slice(-7)}`,
    createdAt: new Date().toISOString(),
    status: "received",
    adminStatus: "pending",
    paymentMethod: "prepaid",
    paymentStatus: "captured",
    customerPhone: draft.customerPhone,
    customerName: draft.customerName,
    orderType: draft.orderType,
    address: draft.address,
    items: calculated.rows,
    totals: calculated.totals,
    deliveryMeta: calculated.deliveryMeta,
    notes: draft.notes || "",
    razorpayOrderId: body.razorpay_order_id,
    razorpayPaymentId: body.razorpay_payment_id,
    paymentVerifiedAt: new Date().toISOString(),
  };
  if (calculated.deliveryMeta?.restaurantLocation) {
    order.restaurantLocation = calculated.deliveryMeta.restaurantLocation;
  }
  if (calculated.deliveryMeta?.isLongDistance) {
    order.deliveryWindow = "3-7 days";
  }

  const reservedMenu = applyMenuStockChange(menu, calculated.rows, -1);
  const orders = await getOrders();
  orders.push(order);
  try {
    await saveMenu(reservedMenu);
    await saveOrders(orders);
  } catch (error) {
    try {
      await saveMenu(menu);
    } catch {
      // ignore rollback failures
    }
    throw error;
  }

  paymentSession.status = "completed";
  paymentSession.order = order;
  paymentSession.razorpayPaymentId = body.razorpay_payment_id;
  paymentSession.paymentVerifiedAt = order.paymentVerifiedAt;
  await savePayments(payments);

  return order;
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/menu") {
    const menu = await getMenu();
    const settings = await getSettings();
    sendJson(res, 200, { menu, categories: settings.menuCategories || [] });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/delivery/quote") {
    const body = await readBody(req);
    const menu = await getMenu();
    const settings = await getSettings();
    const orderType = body.orderType === "pickup" ? "pickup" : "delivery";
    const calculated = calculateOrder(menu, body.items, orderType, {
      address: body.address || null,
      settings,
    });
    sendJson(res, 200, {
      totals: calculated.totals,
      deliveryMeta: calculated.deliveryMeta,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/customer/state") {
    const phone = normalizePhone(url.searchParams.get("phone") || req.headers["x-customer-phone"]);
    if (!phone) {
      sendJson(res, 200, { profile: null, addresses: [], selectedAddressId: null });
      return;
    }

    const customer = await getCustomerRecord(phone);
    if (!customer) {
      sendJson(res, 200, { profile: null, addresses: [], selectedAddressId: null });
      return;
    }

    sendJson(res, 200, {
      profile: customer.profile,
      addresses: customer.addresses,
      selectedAddressId: customer.selectedAddressId,
    });
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/customer/state") {
    const body = await readBody(req);
    const phone = normalizePhone(body.phone || body.profile?.phone || req.headers["x-customer-phone"]);
    if (!phone) {
      sendJson(res, 400, { error: "A valid phone number is required" });
      return;
    }

    const profile = body.profile && typeof body.profile === "object" ? body.profile : null;
    const addresses = Array.isArray(body.addresses) ? body.addresses.slice(0, 10) : [];
    const selectedAddressId = body.selectedAddressId || addresses[0]?.id || null;
    const saved = await saveCustomerRecord(phone, {
      profile: profile ? { ...profile, phone } : null,
      addresses,
      selectedAddressId,
    });

    sendJson(res, 200, {
      profile: saved.profile,
      addresses: saved.addresses,
      selectedAddressId: saved.selectedAddressId,
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/menu") {
    if (!requireAdmin(req, res)) return;
    const menu = await getMenu();
    sendJson(res, 200, { menu });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/location") {
    if (!requireAdmin(req, res)) return;
    const settings = await getSettings();
    sendJson(res, 200, { adminLocation: settings.adminLocation || null });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/categories") {
    if (!requireAdmin(req, res)) return;
    const settings = await getSettings();
    sendJson(res, 200, { categories: settings.menuCategories || [] });
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/admin/categories") {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    const categories = normalizeMenuCategories(body?.categories);
    const settings = await getSettings();
    settings.menuCategories = categories;
    await saveSettings(settings);
    sendJson(res, 200, { categories });
    return;
  }

  if (req.method === "PUT" && url.pathname === "/api/admin/location") {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    const location = body?.location;
    if (
      !location ||
      !Number.isFinite(Number(location.lat)) ||
      !Number.isFinite(Number(location.lng))
    ) {
      sendJson(res, 400, { error: "Valid location coordinates are required" });
      return;
    }

    const nextLocation = {
      lat: Number(location.lat),
      lng: Number(location.lng),
      address: typeof location.address === "string" ? location.address.trim() : "",
      updatedAt: new Date().toISOString(),
    };
    const settings = await getSettings();
    settings.adminLocation = nextLocation;
    await saveSettings(settings);
    sendJson(res, 200, { adminLocation: nextLocation });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/admin/menu") {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const category = String(body.category || "").trim() || "Cookies";
    const price = Number(body.price);
    const stockCount = normalizeStockCount(body.stockCount);

    if (!name) {
      sendJson(res, 400, { error: "Menu item name is required" });
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      sendJson(res, 400, { error: "Valid price is required" });
      return;
    }

    const menu = await getMenu();
    const item = {
      id: `item_${Date.now().toString(36)}`,
      name,
      description,
      category,
      image: "assets/hero-food.png",
      price,
      available: body.available === false ? false : true,
      stockCount,
      updatedAt: new Date().toISOString(),
    };
    menu.push(item);
    await saveMenu(menu);
    sendJson(res, 201, { item });
    return;
  }

  if (req.method === "PATCH" && url.pathname.startsWith("/api/admin/menu/")) {
    if (!requireAdmin(req, res)) return;
    const menuId = url.pathname.split("/").pop();
    const body = await readBody(req);
    const menu = await getMenu();
    const index = menu.findIndex((item) => item.id === menuId);
    if (index === -1) {
      sendJson(res, 404, { error: "Menu item not found" });
      return;
    }

    const current = menu[index];
    menu[index] = {
      ...current,
      name: typeof body.name === "string" ? body.name.trim() || current.name : current.name,
      description: typeof body.description === "string" ? body.description.trim() || current.description : current.description,
      category: typeof body.category === "string" ? body.category.trim() || current.category : current.category,
      price: Number.isFinite(Number(body.price)) ? Math.max(0, Number(body.price)) : current.price,
      available: typeof body.available === "boolean" ? body.available : current.available,
      stockCount: Number.isFinite(Number(body.stockCount)) ? Math.max(0, Math.floor(Number(body.stockCount))) : current.stockCount,
      updatedAt: new Date().toISOString(),
    };

    await saveMenu(menu);
    sendJson(res, 200, { item: menu[index] });
    return;
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/admin/menu/")) {
    if (!requireAdmin(req, res)) return;
    const menuId = url.pathname.split("/").pop();
    const menu = await getMenu();
    const index = menu.findIndex((item) => item.id === menuId);
    if (index === -1) {
      sendJson(res, 404, { error: "Menu item not found" });
      return;
    }
    const [deleted] = menu.splice(index, 1);
    await saveMenu(menu);
    sendJson(res, 200, { item: deleted });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/orders/my") {
    const phone = normalizePhone(req.headers["x-customer-phone"]);
    if (!phone) {
      sendJson(res, 200, { orders: [] });
      return;
    }

    const mine = await getOrdersForPhone(phone);
    sendJson(res, 200, { orders: mine });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/orders") {
    const body = await readBody(req);
    const menu = await getMenu();
    const customerPhone = normalizePhone(body.customerPhone || body.address?.phone);
    const customerName = String(body.customerName || body.address?.name || "").trim();
    const orderType = body.orderType === "pickup" ? "pickup" : "delivery";
    const paymentMethod = body.paymentMethod === "cod" ? "cod" : "prepaid";
    const settings = await getSettings();
    const calculated = calculateOrder(menu, body.items, orderType, {
      address: body.address || null,
      settings,
    });

    if (!customerPhone) {
      sendJson(res, 400, { error: "A valid phone number is required to place an order" });
      return;
    }

    if (!customerName) {
      sendJson(res, 400, { error: "Customer name is required" });
      return;
    }

    if (!calculated.rows.length) {
      sendJson(res, 400, { error: "Cart is empty" });
      return;
    }

    if (paymentMethod === "cod") {
      sendJson(res, 400, { error: "Cash on delivery is not available. Please pay by UPI." });
      return;
    }

    sendJson(res, 400, { error: "Direct order placement is disabled. Complete prepaid UPI payment first." });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/payments/razorpay/create-intent") {
    const body = await readBody(req);
    const menu = await getMenu();
    const customerPhone = normalizePhone(body.customerPhone || body.address?.phone);
    const customerName = String(body.customerName || body.address?.name || "").trim();
    const orderType = body.orderType === "pickup" ? "pickup" : "delivery";
    const settings = await getSettings();
    const calculated = calculateOrder(menu, body.items, orderType, {
      address: body.address || null,
      settings,
    });

    if (!customerPhone) {
      sendJson(res, 400, { error: "A valid phone number is required" });
      return;
    }

    if (!customerName) {
      sendJson(res, 400, { error: "Customer name is required" });
      return;
    }

    if (!calculated.rows.length) {
      sendJson(res, 400, { error: "Cart is empty" });
      return;
    }

    if (orderType === "delivery") {
      validateAddress(body.address);
    }

    const paymentSession = {
      requestId: makeId("req_"),
      customerPhone,
      customerName,
      orderType,
      address: body.address || null,
      items: calculated.rows,
      totals: calculated.totals,
      deliveryMeta: calculated.deliveryMeta,
      notes: body.notes || "",
      paymentMethod: "prepaid",
    };

    const intent = await createRazorpayIntent(paymentSession);
    sendJson(res, 201, {
      ...intent,
      requestId: paymentSession.requestId,
      deliveryMeta: calculated.deliveryMeta,
      totals: calculated.totals,
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/payments/razorpay/verify") {
    const body = await readBody(req);
    try {
      const order = await finalizeRazorpayOrder(body);
      sendJson(res, 200, { order, paymentStatus: order.paymentStatus });
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Payment verification failed" });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/payments/razorpay/webhook") {
    const rawBody = await readRawBody(req);
    const signature = req.headers["x-razorpay-signature"];

    if (!verifyRazorpayWebhook(rawBody, signature)) {
      sendJson(res, 400, { error: "Invalid webhook signature" });
      return;
    }

    const event = JSON.parse(rawBody);
    const paymentEntity = event.payload?.payment?.entity;
    const orderEntity = event.payload?.order?.entity;
    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;

    if (razorpayOrderId) {
      const payments = await getPayments();
      const paymentSession = payments.find((entry) => entry.razorpayOrderId === razorpayOrderId);
      if (paymentSession) {
        paymentSession.razorpayPaymentId = paymentEntity?.id || paymentSession.razorpayPaymentId;
        paymentSession.paymentVerifiedAt = new Date().toISOString();
        if (event.event === "payment.captured" || event.event === "order.paid") {
          paymentSession.status = "completed";
        }
        await savePayments(payments);
      }
    }

    sendJson(res, 200, { received: true });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/orders") {
    if (!requireAdmin(req, res)) return;
    const orders = await getOrders();
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    sendJson(res, 200, { orders });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/history") {
    if (!requireAdmin(req, res)) return;
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const orders = await getOrders();

    const filtered = orders.filter((order) => {
      const dateKey = getDateKey(order.createdAt);
      if (from && dateKey < from) return false;
      if (to && dateKey > to) return false;
      return true;
    });

    const byDay = new Map();
    let totalOrders = 0;
    let totalIncome = 0;
    let cancelledOrders = 0;
    let codOrders = 0;
    let prepaidOrders = 0;

    for (const order of filtered) {
      totalOrders += 1;
      const dateKey = getDateKey(order.createdAt);
      const amount = Number(order?.totals?.total || 0);
      const isCancelled = order.status === "cancelled";
      if (isCancelled) cancelledOrders += 1;
      if (order.paymentMethod === "cod") codOrders += 1;
      if (order.paymentMethod === "prepaid") prepaidOrders += 1;
      if (!isCancelled) totalIncome += amount;

      if (!byDay.has(dateKey)) {
        byDay.set(dateKey, {
          date: dateKey,
          orders: 0,
          income: 0,
          cancelled: 0,
          cod: 0,
          prepaid: 0,
          details: [],
        });
      }

      const bucket = byDay.get(dateKey);
      bucket.orders += 1;
      if (!isCancelled) bucket.income += amount;
      if (isCancelled) bucket.cancelled += 1;
      if (order.paymentMethod === "cod") bucket.cod += 1;
      if (order.paymentMethod === "prepaid") bucket.prepaid += 1;
      bucket.details.push({
        id: order.id,
        createdAt: order.createdAt,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        amount,
        customerName: order.customerName || "",
        customerPhone: order.customerPhone || "",
      });
    }

    const days = [...byDay.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
    sendJson(res, 200, {
      summary: {
        totalOrders,
        totalIncome,
        cancelledOrders,
        codOrders,
        prepaidOrders,
        dayCount: days.length,
      },
      days,
    });
    return;
  }

  const orderMatch = url.pathname.match(/^\/api\/admin\/orders\/([^/]+)$/);
  if (req.method === "PATCH" && orderMatch) {
    if (!requireAdmin(req, res)) return;
    const body = await readBody(req);
    const allowed = new Set([
      "pending_admin_acceptance",
      "received",
      "accepted",
      "preparing",
      "out_for_delivery",
      "completed",
      "cancelled",
    ]);

    const etaMinutes = Number(body.etaMinutes);
    const hasEtaMinutes = Number.isFinite(etaMinutes) && etaMinutes > 0;
    if (!allowed.has(body.status)) {
      sendJson(res, 400, { error: "Invalid status" });
      return;
    }

    const orders = await getOrders();
    const index = orders.findIndex((order) => order.id === orderMatch[1]);
    if (index === -1) {
      sendJson(res, 404, { error: "Order not found" });
      return;
    }

    const currentOrder = orders[index];
    const menu = await getMenu();
    orders[index] = {
      ...currentOrder,
      status: body.status,
      updatedAt: new Date().toISOString(),
    };
    if (typeof body.customerMessage === "string" && body.customerMessage.trim()) {
      orders[index].customerMessage = body.customerMessage.trim();
      orders[index].customerMessageAt = new Date().toISOString();
    }
    if (body.status === "accepted") {
      const settings = await getSettings();
      orders[index].adminStatus = "accepted";
      orders[index].acceptedAt = new Date().toISOString();
      if (settings.adminLocation) {
        orders[index].restaurantLocation = settings.adminLocation;
      }
      const isLongDistance = orders[index]?.deliveryMeta?.isLongDistance === true;
      if (hasEtaMinutes && !isLongDistance) {
        orders[index].etaMinutes = Math.round(etaMinutes);
        orders[index].etaUpdatedAt = new Date().toISOString();
      } else if (isLongDistance) {
        orders[index].etaMinutes = null;
        orders[index].etaUpdatedAt = new Date().toISOString();
        orders[index].deliveryWindow = "3-7 days";
      }
    }
    if (body.status === "cancelled") {
      orders[index].adminStatus = "rejected";
      orders[index].rejectedAt = new Date().toISOString();
      orders[index].rejectionReason =
        typeof body.rejectionReason === "string" && body.rejectionReason.trim()
          ? body.rejectionReason.trim()
          : "Order cannot be delivered to your location.";
    }
    if (body.status === "completed") {
      orders[index].completedAt = new Date().toISOString();
    }

    let nextMenu = menu;
    try {
      if (currentOrder.status !== "cancelled" && body.status === "cancelled") {
        nextMenu = applyMenuStockChange(menu, currentOrder.items || [], 1);
      } else if (currentOrder.status === "cancelled" && body.status !== "cancelled") {
        nextMenu = applyMenuStockChange(menu, currentOrder.items || [], -1);
      }
      if (nextMenu !== menu) {
        await saveMenu(nextMenu);
      }
      await saveOrders(orders);
    } catch (error) {
      try {
        await saveMenu(menu);
      } catch {
        // ignore rollback failures
      }
      throw error;
    }
    sendJson(res, 200, { order: orders[index] });
    return;
  }

  const reviewMatch = url.pathname.match(/^\/api\/orders\/([^/]+)\/reviews$/);
  if (req.method === "POST" && reviewMatch) {
    const customerPhone = normalizePhone(req.headers["x-customer-phone"]);
    const body = await readBody(req);
    const orders = await getOrders();
    const index = orders.findIndex((order) => order.id === reviewMatch[1]);
    if (index === -1) {
      sendJson(res, 404, { error: "Order not found" });
      return;
    }
    if (!customerPhone || customerPhone !== normalizePhone(orders[index].customerPhone)) {
      sendJson(res, 403, { error: "Not allowed for this order" });
      return;
    }

    const type = body.type === "products" ? "products" : "delivery";
    const review = orders[index].review && typeof orders[index].review === "object" ? orders[index].review : {};
    if (type === "delivery") {
      const rating = Number(body.deliveryRating);
      if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
        sendJson(res, 400, { error: "Delivery rating must be between 1 and 5" });
        return;
      }
      review.deliveryRating = Math.round(rating);
      review.deliveryComment = typeof body.deliveryComment === "string" ? body.deliveryComment.trim() : "";
      review.deliveryRatedAt = new Date().toISOString();
    } else {
      const entries = Array.isArray(body.productRatings) ? body.productRatings : [];
      const valid = entries
        .map((entry) => ({
          id: String(entry.id || ""),
          rating: Math.round(Number(entry.rating)),
        }))
        .filter((entry) => entry.id && Number.isFinite(entry.rating) && entry.rating >= 1 && entry.rating <= 5);
      if (!valid.length) {
        sendJson(res, 400, { error: "At least one product rating is required" });
        return;
      }
      review.productRatings = valid;
      review.productComment = typeof body.productComment === "string" ? body.productComment.trim() : "";
      review.productRatedAt = new Date().toISOString();
    }

    orders[index].review = review;
    orders[index].updatedAt = new Date().toISOString();
    await saveOrders(orders);
    sendJson(res, 200, { order: orders[index] });
    return;
  }

  sendJson(res, 404, { error: "API route not found" });
}

async function serveStatic(res, url) {
  const requestedPath =
    url.pathname === "/"
      ? "/index.html"
      : url.pathname === "/admin"
        ? "/admin.html"
        : url.pathname === "/cart"
          ? "/cart.html"
          : url.pathname === "/product-info"
            ? "/product-info.html"
          : url.pathname;
  const filePath = path.normalize(path.join(FRONTEND_DIR, requestedPath));

  if (!filePath.startsWith(FRONTEND_DIR)) {
    sendResponse(null, res, 403, "Forbidden", "text/plain; charset=utf-8", { "cache-control": "no-store" });
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    const cacheControl = LONG_CACHE_TYPES.has(ext)
      ? "public, max-age=604800"
      : "no-cache";
    sendResponse(
      res.request || null,
      res,
      200,
      data,
      MIME_TYPES[ext] || "application/octet-stream",
      { "cache-control": cacheControl },
    );
  } catch {
    sendResponse(res.request || null, res, 404, "Not found", "text/plain; charset=utf-8", { "cache-control": "no-store" });
  }
}

async function route(req, res) {
  res.request = req;
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "OPTIONS") {
    sendResponse(req, res, 204, "", "text/plain; charset=utf-8");
    return;
  }

  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
    } else {
      await serveStatic(res, url);
    }
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Server error" });
  }
}

async function main() {
  await ensureStore();
  await seedMenuIfNeeded();
  http.createServer(route).listen(PORT, () => {
    console.log(`Sujaan Bites server running at http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
    console.log(`Default admin PIN: ${ADMIN_PIN}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
