const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const http = require("node:http");
const https = require("node:https");
const path = require("node:path");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PIN = process.env.ADMIN_PIN || "123456";
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const FILES = {
  orders: path.join(DATA_DIR, "orders.json"),
  menu: path.join(DATA_DIR, "menu.json"),
  payments: path.join(DATA_DIR, "payments.json"),
};

const BUSINESS = {
  name: "Sujaan Bites",
  upiId: "6301000409@kotakbank",
  upiPayeeName: "Sujaan Bites",
  whatsappNumber: "916301000409",
  deliveryFee: 30,
};

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

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await ensureJsonFile(FILES.menu, DEFAULT_MENU);
  await ensureJsonFile(FILES.orders, []);
  await ensureJsonFile(FILES.payments, []);
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
      ? current.map((item) => ({ available: true, ...item }))
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
  return readJson(FILES.menu, DEFAULT_MENU);
}

async function saveMenu(menu) {
  await writeJson(FILES.menu, menu);
}

async function getOrders() {
  return readJson(FILES.orders, []);
}

async function saveOrders(orders) {
  await writeJson(FILES.orders, orders);
}

async function getPayments() {
  return readJson(FILES.payments, []);
}

async function savePayments(payments) {
  await writeJson(FILES.payments, payments);
}

function calculateOrder(menu, items, orderType) {
  const rows = [];

  for (const item of items || []) {
    const menuItem = menu.find((dish) => dish.id === item.id);
    const quantity = Math.max(0, Number(item.quantity || 0));
    if (!menuItem || quantity < 1) continue;
    if (menuItem.available === false) {
      throw new Error(`${menuItem.name} is currently unavailable`);
    }
    rows.push({
      id: menuItem.id,
      name: menuItem.name,
      quantity,
      price: menuItem.price,
      lineTotal: menuItem.price * quantity,
    });
  }

  const subtotal = rows.reduce((sum, item) => sum + item.lineTotal, 0);
  const delivery = subtotal > 0 && orderType === "delivery" ? BUSINESS.deliveryFee : 0;

  return {
    rows,
    totals: {
      subtotal,
      delivery,
      total: subtotal + delivery,
    },
  };
}

function validateAddress(address) {
  if (!address || typeof address !== "object") {
    throw new Error("Delivery details are required");
  }

  if (!address.name || !address.phone || !address.houseNumber || !address.streetName || !address.address) {
    throw new Error("Name, phone number, house number, street name and map address are required");
  }

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
  const calculated = calculateOrder(menu, draft.items, draft.orderType);
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
    notes: draft.notes || "",
    razorpayOrderId: body.razorpay_order_id,
    razorpayPaymentId: body.razorpay_payment_id,
    paymentVerifiedAt: new Date().toISOString(),
  };

  const orders = await getOrders();
  orders.push(order);
  await saveOrders(orders);

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
    sendJson(res, 200, { menu });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/menu") {
    if (!requireAdmin(req, res)) return;
    const menu = await getMenu();
    sendJson(res, 200, { menu });
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
      updatedAt: new Date().toISOString(),
    };

    await saveMenu(menu);
    sendJson(res, 200, { item: menu[index] });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/orders/my") {
    const phone = normalizePhone(req.headers["x-customer-phone"]);
    if (!phone) {
      sendJson(res, 200, { orders: [] });
      return;
    }

    const orders = await getOrders();
    const mine = orders.filter((order) => order.customerPhone === phone).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
    const calculated = calculateOrder(menu, body.items, orderType);

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

    if (paymentMethod !== "cod") {
      sendJson(res, 400, { error: "Prepaid orders must be verified through Razorpay" });
      return;
    }

    if (orderType === "delivery") {
      validateAddress(body.address);
    }

    const order = {
      id: `ST${Date.now().toString().slice(-7)}`,
      createdAt: new Date().toISOString(),
      status: "pending_admin_acceptance",
      adminStatus: "pending",
      paymentMethod,
      paymentStatus: "cod_pending",
      customerPhone,
      customerName,
      orderType,
      address: body.address || null,
      items: calculated.rows,
      totals: calculated.totals,
      notes: body.notes || "",
    };

    const orders = await getOrders();
    orders.push(order);
    await saveOrders(orders);
    sendJson(res, 201, { order });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/payments/razorpay/create-intent") {
    const body = await readBody(req);
    const menu = await getMenu();
    const customerPhone = normalizePhone(body.customerPhone || body.address?.phone);
    const customerName = String(body.customerName || body.address?.name || "").trim();
    const orderType = body.orderType === "pickup" ? "pickup" : "delivery";
    const calculated = calculateOrder(menu, body.items, orderType);

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
      notes: body.notes || "",
      paymentMethod: "prepaid",
    };

    const intent = await createRazorpayIntent(paymentSession);
    sendJson(res, 201, { ...intent, requestId: paymentSession.requestId });
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

    orders[index] = {
      ...orders[index],
      status: body.status,
      updatedAt: new Date().toISOString(),
    };
    if (body.status === "accepted") {
      orders[index].adminStatus = "accepted";
      orders[index].acceptedAt = new Date().toISOString();
    }
    if (body.status === "cancelled") {
      orders[index].adminStatus = "rejected";
      orders[index].rejectedAt = new Date().toISOString();
    }

    await saveOrders(orders);
    sendJson(res, 200, { order: orders[index] });
    return;
  }

  sendJson(res, 404, { error: "API route not found" });
}

async function serveStatic(res, url) {
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname === "/admin" ? "/admin.html" : url.pathname;
  const filePath = path.normalize(path.join(ROOT, requestedPath));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { "content-type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

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
  http.createServer(route).listen(PORT, () => {
    console.log(`Food ordering app running at http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
    console.log(`Default admin PIN: ${ADMIN_PIN}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
