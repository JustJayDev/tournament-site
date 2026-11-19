/* XT Esports — real-time Firebase listener
   Listens to Firestore doc `tournament/xt-elite-series` (written by
   the admin panel). Applies data and re-renders on change.
   Falls back silently to the static tournament-data.json. */

(function () {
  "use strict";

  const CONFIG = window.FIREBASE_CONFIG;
  if (!CONFIG) return;

  const COLLECTION = "tournament";
  const DOC = window.XT_DOC || "xt-elite-series";

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
    const fb = await loadSdk();
    if (!fb.apps.length) {
      fb.initializeApp(CONFIG);
    }
    return fb.firestore();
  }

  function stripAdminKey(data) {
    const out = Object.assign({}, data);
    delete out.adminKey;
    return out;
  }

  init()
    .then((db) => {
      db.collection(COLLECTION).doc(DOC).onSnapshot((snap) => {
        if (!snap.exists) return;
        const data = stripAdminKey(snap.data());
        if (window.applyTournamentData) {
          window.applyTournamentData(data);
          window.initSite && window.initSite();
        }
      }, () => {});
    })
    .catch(() => {});
})();