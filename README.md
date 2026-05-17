# Sujaan Bites Full-Stack Food Ordering Site

## Run locally

```bash
node server.js
```

Customer site:

```text
http://localhost:3000
```

Admin panel:

```text
http://localhost:3000/admin
```

Default admin PIN:

```text
123456
```

Change the admin PIN before going live:

```bash
ADMIN_PIN=your-secret-pin node server.js
```

## Razorpay UPI automatic verification

Create Razorpay API keys from your Razorpay Dashboard, then start the server with:

```bash
RAZORPAY_KEY_ID=rzp_test_xxxxx \
RAZORPAY_KEY_SECRET=your_key_secret \
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret \
ADMIN_PIN=your-secret-pin \
node server.js
```

Razorpay webhook URL:

```text
https://your-domain.com/api/payments/razorpay/webhook
```

Subscribe to Razorpay events such as:

```text
payment.captured
order.paid
```

Orders are saved in `data/orders.json`.

## Important

The backend creates Razorpay Orders and verifies Razorpay Checkout signatures. For automatic capture, enable auto-capture in your Razorpay Dashboard. Webhooks keep the admin panel updated even if the customer closes the browser after paying.
