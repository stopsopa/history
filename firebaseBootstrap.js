import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const STORAGE_KEY = "firebaseConfig";

/**
 * Main bootstrap function
 * @param {object} options
 * @param {string} options.containerId - div id where the modal will appear
 * @returns {Promise<{auth, provider, app, user, db}>} - resolves when user logged in
 */
export function bootstrapFirebase({ containerId }) {
  return new Promise((resolve, reject) => {
    const container = document.getElementById(containerId);
    if (!container) return reject(new Error("Container not found"));

    // Clear container
    container.innerHTML = "";

    // Check for saved config
    const savedConfig = localStorage.getItem(STORAGE_KEY);

    // Create modal
    const modal = document.createElement("div");
    modal.style = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
      z-index: 9999;
    `;

    const content = document.createElement("div");
    content.id = "popup";
    content.style = `
      background: white; padding: 20px; border-radius: 10px;
      max-width: 700px; width: 90%; max-height: 90vh; overflow-y: auto;
    `;
    modal.appendChild(content);
    container.appendChild(modal);

    // Load HTML content via AJAX
    fetch("firebaseSetup.html")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
      })
      .then((htmlText) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");
        const popupContent = doc.getElementById("popup");

        if (!popupContent) {
          throw new Error(
            "Could not find #popup element in firebaseSetup.html"
          );
        }

        // Inject styles if present in the fetched HTML head
        const styles = doc.querySelectorAll("style");
        styles.forEach((style) => {
          document.head.appendChild(style);
        });

        content.innerHTML = popupContent.innerHTML;

        // Initialize logic after content is injected
        initializeLogic();
      })
      .catch((err) => {
        console.error("Failed to load firebase setup HTML:", err);
        content.innerHTML = `<p style="color: red;">Failed to load setup instructions: ${err.message}</p>`;
      });

    function initializeLogic() {
      const errorMsg = content.querySelector("#error-msg");
      const initBtn = content.querySelector("#init-firebase-btn");
      const loginBtn = content.querySelector("#login-btn");
      const loginSection = content.querySelector("#login-section");
      const configTextarea = content.querySelector("#firebase-config");
      const clearConfigBtn = content.querySelector("#clear-config-btn");

      let auth, provider, app, db;

      // Pre-fill saved config if available
      if (savedConfig) {
        configTextarea.value = savedConfig;
        configTextarea.style.background = "#fffde7";
        if (clearConfigBtn) clearConfigBtn.style.display = "inline-block";
      }

      // Clear saved config handler
      if (clearConfigBtn) {
        clearConfigBtn.addEventListener("click", () => {
          localStorage.removeItem(STORAGE_KEY);
          configTextarea.value = "";
          configTextarea.style.background = "white";
          clearConfigBtn.style.display = "none";
          errorMsg.textContent = "";
          errorMsg.style.color = "green";
          errorMsg.textContent = "Saved config cleared!";
          setTimeout(() => {
            errorMsg.textContent = "";
          }, 2000);
        });
      }

      // Step 1: Initialize Firebase Logic
      const initializeFirebase = () => {
        errorMsg.textContent = "";
        errorMsg.style.color = "red";
        const configText = configTextarea.value.trim();

        if (!configText) {
          errorMsg.textContent = "Please paste your Firebase config!";
          return;
        }

        let firebaseConfig;
        try {
          // Try parsing as JSON first
          try {
            firebaseConfig = JSON.parse(configText);
          } catch (e) {
            // If JSON fails, try evaluating as a JavaScript object
            const evalFn = new Function(`return ${configText}`);
            firebaseConfig = evalFn();
          }
        } catch (err) {
          errorMsg.textContent =
            "Invalid Config! Please check format (JSON or JS object).";
          return;
        }

        // Validate required fields
        const requiredFields = ["apiKey", "authDomain", "projectId"];
        const missingFields = requiredFields.filter(
          (field) => !firebaseConfig[field]
        );
        if (missingFields.length > 0) {
          errorMsg.textContent = `Missing required fields: ${missingFields.join(
            ", "
          )}`;
          return;
        }

        try {
          app = initializeApp(firebaseConfig);
          auth = getAuth(app);
          db = getFirestore(app);
          provider = new GoogleAuthProvider();

          // Listen for auth state changes
          onAuthStateChanged(auth, (user) => {
            console.log(
              "Auth state changed:",
              user ? "User logged in" : "No user"
            );
            if (user) {
              console.log(
                "✅ Firebase initialized! User restored:",
                user.displayName
              );
              modal.remove();
              resolve({ auth, provider, app, user, db });
            }
          });

          // Save config to localStorage
          localStorage.setItem(STORAGE_KEY, configText);

          // Show login section
          initBtn.style.display = "none";
          if (clearConfigBtn) clearConfigBtn.style.display = "none";
          loginSection.style.display = "block";
          configTextarea.disabled = true;
          configTextarea.style.background = "#f5f5f5";
        } catch (err) {
          console.error("Firebase initialization error:", err);
          errorMsg.textContent = `Initialization failed: ${err.message}`;
        }
      };

      initBtn.addEventListener("click", initializeFirebase);

      // Auto-initialize if config is saved
      if (savedConfig) {
        setTimeout(initializeFirebase, 100); // Small delay to ensure UI is ready
      }

      // Step 2: Login with Google
      loginBtn.addEventListener("click", async () => {
        errorMsg.textContent = "";
        if (!auth || !provider) {
          errorMsg.textContent = "Firebase not initialized!";
          return;
        }

        loginBtn.disabled = true;
        loginBtn.textContent = "Logging in...";

        try {
          const result = await signInWithPopup(auth, provider);
          const user = result.user;

          // Cleanup modal
          container.removeChild(modal);

          resolve({ auth, provider, app, user, db });
        } catch (err) {
          console.error("Login error:", err);
          loginBtn.disabled = false;
          loginBtn.textContent = "🔐 Login with Google";

          // Provide helpful error messages
          if (err.code === "auth/popup-closed-by-user") {
            errorMsg.textContent = "Login cancelled. Please try again.";
          } else if (err.code === "auth/unauthorized-domain") {
            errorMsg.textContent =
              "Domain not authorized! Add this domain to Firebase Console → Authentication → Authorized domains.";
          } else if (err.code === "auth/popup-blocked") {
            errorMsg.textContent =
              "Popup blocked! Please allow popups for this site.";
          } else if (err.code === "auth/configuration-not-found") {
            errorMsg.textContent =
              "Google Sign-In is not enabled! Go to Firebase Console → Authentication → Sign-in method and enable Google.";
          } else {
            errorMsg.textContent = `Login failed: ${err.message}`;
          }
        }
      });
      const unbind = vanillaTabs.bind();
      vanillaTabs.active();

      {
        const el = document.querySelector("#authorised-domains");
        if (el) {
          el.value = window.location.host;
          el.addEventListener("click", () => {
            el.select();
          });
        }
      }
    }
  });
}
