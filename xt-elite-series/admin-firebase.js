/* XT Esports Admin — Firebase sync module
   Publishes admin state to Firestore (`tournament/xt-elite-series`). */

window.AdminFirebase = (() => {
  "use strict";

  const FB_CONFIG = window.FIREBASE_CONFIG;
  const COLLECTION = "tournament";
  const DOC = window.XT_DOC || "xt-elite-series";
  const ADMIN_KEY = "KZSK-9f4c2a7e8b1d6f0c3a9e7b4d2f8c1a";

  const STATUS = { idle: "idle", loading: "loading", ready: "ready", offline: "offline", error: "error" };
  let status = STATUS.idle;
  let errorMsg = "";
  let firestore = null;

  function getStatus() {
    return { status, error: errorMsg };
  }

  function loadSdk() {
    return new Promise((resolve, reject) => {
      if (window.firebase && window.firebase.firestore) {
        resolve(window.firebase);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js";
      script.onload = () => {
        const fs = document.createElement("script");
        fs.src = "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore-compat.js";
        fs.onload = () => resolve(window.firebase);
        fs.onerror = () => reject(new Error("Firestore SDK failed to load"));
        document.head.append(fs);
      };
      script.onerror = () => reject(new Error("Firebase SDK failed to load"));
      document.head.append(script);
    });
  }

  async function init() {
    if (status === STATUS.ready || status === STATUS.loading) return getStatus();
    status = STATUS.loading;
    try {
      const fb = await loadSdk();
      if (!fb.apps.length) fb.initializeApp(FB_CONFIG);
      firestore = fb.firestore();
      status = STATUS.ready;
    } catch (e) {
      status = STATUS.error;
      errorMsg = e && e.message ? e.message : "Firebase init failed";
    }
    return getStatus();
  }

  async function fetch() {
    if (!firestore) {
      const s = await init();
      if (s.status !== STATUS.ready) return null;
    }
    try {
      const snap = await firestore.collection(COLLECTION).doc(DOC).get();
      if (!snap.exists) return null;
      const data = snap.data();
      delete data.adminKey;
      return data;
    } catch (e) {
      return null;
    }
  }

  async function publish(payload) {
    if (!firestore) {
      const s = await init();
      if (s.status !== STATUS.ready) return s;
    }
    try {
      const data = Object.assign({}, payload, { adminKey: ADMIN_KEY });
      await firestore.collection(COLLECTION).doc(DOC).set(data);
      status = STATUS.ready;
      errorMsg = "";
      return { status: STATUS.ready, publishedAt: new Date().toISOString() };
    } catch (e) {
      status = STATUS.error;
      errorMsg = e && e.message ? e.message : "Publish failed";
      return { status: STATUS.error, error: errorMsg };
    }
  }

  return { init, publish, getStatus, STATUS };
})();