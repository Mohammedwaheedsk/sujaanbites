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
let signupData         = null; // Temporary storage for signup registration details

/* ── Helpers ──────────────────────────────────────── */
function $(id) { return document.getElementById(id); }
function showStep(step) {
  $("loginStep1")?.classList.toggle("hidden", step !== 1);
  $("loginStep2")?.classList.toggle("hidden", step !== 2);
}
function showSignupStep(step) {
  $("signupStep1")?.classList.toggle("hidden", step !== 1);
  $("signupStep2")?.classList.toggle("hidden", step !== 2);
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
async function sendOtp(phone, name, mode = "login") {
  const btnId = mode === "signup" ? "signupSubmitBtn" : "loginSendOtpBtn";
  const label = mode === "signup" ? "Save & Continue" : "Send OTP";
  setBtn(btnId, "Sending…", true);
  try {
    initRecaptcha();
    confirmationResult = await signInWithPhoneNumber(auth, "+91" + phone, recaptchaVerifier);
    
    // Update hint and toggle step view
    if (mode === "signup") {
      const hint = $("signupOtpHint");
      if (hint) hint.textContent = `OTP sent to +91 ${phone}. Enter it below.`;
      showSignupStep(2);
      $("signupOtp")?.focus();
    } else {
      const hint = $("loginOtpHint");
      if (hint) hint.textContent = `OTP sent to +91 ${phone}. Enter it below.`;
      showStep(2);
      $("loginOtp")?.focus();
    }
  } catch (err) {
    console.error("OTP send error details:", err);
    // Reset recaptcha on error
    recaptchaVerifier?.clear?.();
    recaptchaVerifier = null;
    let msg = "Failed to send OTP. Please try again.";
    if (err.code === "auth/invalid-phone-number") msg = "Invalid phone number. Enter a valid 10-digit Indian number.";
    if (err.code === "auth/too-many-requests")    msg = "Too many attempts. Please wait a few minutes.";
    if (err.code === "auth/unauthorized-domain") {
      msg = `Failed to send OTP: This domain/IP (${window.location.hostname}) is not authorized in your Firebase Project.\n\nPlease open Firebase Console -> Authentication -> Settings -> Authorized Domains, and add "${window.location.hostname}" to the authorized domains list to allow testing from this address.`;
    }
    if (err.code === "auth/operation-not-allowed") {
      msg = `Failed to send OTP: Phone Sign-In is disabled in your Firebase Project.\n\nPlease go to Firebase Console -> Authentication -> Sign-in method, click "Add new provider" (or edit "Phone"), enable Phone authentication, and click Save.`;
    }
    alert(msg + (err.code ? `\n(Error code: ${err.code})` : ""));
  } finally {
    setBtn(btnId, label, false);
  }
}

/* ── Step 2: Verify OTP ───────────────────────────── */
async function verifyOtp(otp, name, mode = "login") {
  if (!confirmationResult) { alert("Please request an OTP first."); return; }
  const btnId = mode === "signup" ? "signupVerifyBtn" : "loginVerifyBtn";
  const label = mode === "signup" ? "Verify & Create Account" : "Verify & Sign In";
  setBtn(btnId, "Verifying…", true);
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
    
    if (mode === "signup") {
      // Hand off to app.js for signup completion
      window.dispatchEvent(new CustomEvent("sb:firebase-signup", {
        detail: {
          profile: data.profile,
          addressRecord: signupData?.addressRecord
        }
      }));
    } else {
      // Hand off to app.js for login completion
      window.dispatchEvent(new CustomEvent("sb:firebase-login", { detail: data }));
    }

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
    setBtn(btnId, label, false);
  }
}

/* ── Custom trigger for Signup OTP ────────────────── */
window.addEventListener("sb:trigger-signup-otp", async (e) => {
  const { name, phone, addressRecord } = e.detail || {};
  signupData = { name, phone, addressRecord };
  await sendOtp(phone, name, "signup");
});

/* ── Wire up forms ────────────────────────────────── */
function attach() {
  const loginForm = $("loginForm");
  const otpForm   = $("otpForm");
  const resendBtn = $("loginResendBtn");

  const signupOtpForm = $("signupOtpForm");
  const signupResendBtn = $("signupResendBtn");

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name  = ($("loginName")?.value || "").trim();
    const phone = ($("loginPhone")?.value || "").replace(/\D/g, "").slice(-10);
    if (!name)              { alert("Please enter your name.");              return; }
    if (phone.length !== 10){ alert("Enter a valid 10-digit phone number."); return; }
    await sendOtp(phone, name, "login");
  });

  otpForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const otp  = ($("loginOtp")?.value || "").replace(/\D/g, "").slice(0, 6);
    const name = ($("loginName")?.value || "").trim();
    if (otp.length !== 6) { alert("Please enter the 6-digit OTP."); return; }
    await verifyOtp(otp, name, "login");
  });

  resendBtn?.addEventListener("click", async () => {
    const name  = ($("loginName")?.value || "").trim();
    const phone = ($("loginPhone")?.value || "").replace(/\D/g, "").slice(-10);
    if (!name || phone.length !== 10) { showStep(1); return; }
    recaptchaVerifier?.clear?.();
    recaptchaVerifier = null;
    confirmationResult = null;
    showStep(1);
    await sendOtp(phone, name, "login");
  });

  signupOtpForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const otp = ($("signupOtp")?.value || "").replace(/\D/g, "").slice(0, 6);
    if (otp.length !== 6) { alert("Please enter the 6-digit OTP."); return; }
    if (!signupData) { alert("Registration data missing. Please start over."); showSignupStep(1); return; }
    await verifyOtp(otp, signupData.name, "signup");
  });

  signupResendBtn?.addEventListener("click", async () => {
    if (!signupData) { showSignupStep(1); return; }
    recaptchaVerifier?.clear?.();
    recaptchaVerifier = null;
    confirmationResult = null;
    showSignupStep(1);
    await sendOtp(signupData.phone, signupData.name, "signup");
  });

  // Reset to step 1 whenever the login or signup page is shown
  window.addEventListener("sb:page-change", (e) => {
    if (e.detail === "login") {
      showStep(1);
      if ($("loginOtp")) $("loginOtp").value = "";
    } else if (e.detail === "signup") {
      showSignupStep(1);
      if ($("signupOtp")) $("signupOtp").value = "";
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
