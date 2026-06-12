/* ═══════════════════════════════════════════════════════
   firebase-auth.js  —  Sujaan Bites
   Handles phone OTP via Firebase Auth (modular SDK v10)
═══════════════════════════════════════════════════════ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ── Firebase config ──────────────────────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyAJeTkxV23gxVVmojgh03QXNIYhaepvlHU",
  authDomain: "sujaanbites-app.firebaseapp.com",
  projectId: "sujaanbites-app",
  storageBucket: "sujaanbites-app.firebasestorage.app",
  messagingSenderId: "565183197421",
  appId: "1:565183197421:web:9749a21bdb5d66cde81ce4",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = "en";

/* ── State ────────────────────────────────────────── */
let confirmationResult = null;
let recaptchaVerifier  = null;

/* ── Helpers ──────────────────────────────────────── */
function $(id) { return document.getElementById(id); }
function showStep(step) {
  $("loginStep1")?.classList.toggle("hidden", step !== 1);
  $("loginStep2")?.classList.toggle("hidden", step !== 2);
}
function setBtn(id, text, disabled) {
  const b = $(id);
  if (!b) return;
  b.textContent = text;
  b.disabled = disabled;
}

function initRecaptcha() {
  if (recaptchaVerifier) return;
  recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => {
      recaptchaVerifier = null; // force re-init on next send
    },
  });
}

/* ── Step 1: Send OTP ─────────────────────────────── */
async function sendOtp(phone, name) {
  setBtn("loginSendOtpBtn", "Sending…", true);
  try {
    initRecaptcha();
    confirmationResult = await signInWithPhoneNumber(auth, "+91" + phone, recaptchaVerifier);
    // Update hint
    const hint = $("loginOtpHint");
    if (hint) hint.textContent = `OTP sent to +91 ${phone}. Enter it below.`;
    showStep(2);
    $("loginOtp")?.focus();
  } catch (err) {
    console.error("OTP send error:", err);
    // Reset recaptcha on error
    recaptchaVerifier?.clear?.();
    recaptchaVerifier = null;
    let msg = "Failed to send OTP. Please try again.";
    if (err.code === "auth/invalid-phone-number") msg = "Invalid phone number. Enter a valid 10-digit Indian number.";
    if (err.code === "auth/too-many-requests")    msg = "Too many attempts. Please wait a few minutes.";
    alert(msg);
  } finally {
    setBtn("loginSendOtpBtn", "Send OTP", false);
  }
}

/* ── Step 2: Verify OTP ───────────────────────────── */
async function verifyOtp(otp, name) {
  if (!confirmationResult) { alert("Please request an OTP first."); return; }
  setBtn("loginVerifyBtn", "Verifying…", true);
  try {
    const credential = await confirmationResult.confirm(otp);
    const idToken = await credential.user.getIdToken();

    // Send token to backend
    const API_BASE = String(window.__API_BASE || "").trim().replace(/\/+$/, "");
    const res = await fetch(API_BASE + "/api/auth/verify-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, name }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Backend verification failed");
    }

    const data = await res.json();
    // Hand off to app.js via custom event
    window.dispatchEvent(new CustomEvent("sb:firebase-login", { detail: data }));

    // Sign out of Firebase client-side (we use our own session)
    await signOut(auth);

  } catch (err) {
    console.error("OTP verify error:", err);
    let msg = "Invalid OTP. Please check and try again.";
    if (err.code === "auth/code-expired")   msg = "OTP expired. Please resend.";
    if (err.code === "auth/invalid-verification-code") msg = "Wrong OTP. Please try again.";
    if (err.message && !err.code)           msg = err.message;
    alert(msg);
  } finally {
    setBtn("loginVerifyBtn", "Verify & Sign In", false);
  }
}

/* ── Wire up forms ────────────────────────────────── */
function attach() {
  const loginForm = $("loginForm");
  const otpForm   = $("otpForm");
  const resendBtn = $("loginResendBtn");

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name  = ($("loginName")?.value || "").trim();
    const phone = ($("loginPhone")?.value || "").replace(/\D/g, "").slice(-10);
    if (!name)              { alert("Please enter your name.");              return; }
    if (phone.length !== 10){ alert("Enter a valid 10-digit phone number."); return; }
    await sendOtp(phone, name);
  });

  otpForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const otp  = ($("loginOtp")?.value || "").replace(/\D/g, "").slice(0, 6);
    const name = ($("loginName")?.value || "").trim();
    if (otp.length !== 6) { alert("Please enter the 6-digit OTP."); return; }
    await verifyOtp(otp, name);
  });

  resendBtn?.addEventListener("click", async () => {
    const name  = ($("loginName")?.value || "").trim();
    const phone = ($("loginPhone")?.value || "").replace(/\D/g, "").slice(-10);
    if (!name || phone.length !== 10) { showStep(1); return; }
    // Reset confirmationResult and recaptcha
    recaptchaVerifier?.clear?.();
    recaptchaVerifier = null;
    confirmationResult = null;
    showStep(1);
    await sendOtp(phone, name);
  });

  // Reset to step 1 whenever the login page is shown
  window.addEventListener("sb:page-change", (e) => {
    if (e.detail === "login") {
      showStep(1);
      if ($("loginOtp")) $("loginOtp").value = "";
    }
  });
}

// Wait for DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", attach);
} else {
  attach();
}

export { auth };
