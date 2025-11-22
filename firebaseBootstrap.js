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
    content.style = `
      background: white; padding: 20px; border-radius: 10px;
      max-width: 700px; width: 90%; max-height: 90vh; overflow-y: auto;
    `;
    modal.appendChild(content);

    // HTML content with comprehensive setup guide
    content.innerHTML = `
      <h2>Connect Your Firebase Project</h2>
      <p style="color: #666; font-size: 14px;">This app uses your own Firebase project to store your timeline data.</p>
      
      <details open style="margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 5px;">
        <summary style="cursor: pointer; font-weight: bold; margin-bottom: 10px;">📋 Setup Instructions</summary>
        <ol style="font-size: 14px; line-height: 1.6;">
          <li>Go to <a href="https://console.firebase.google.com/" target="_blank" style="color: #2196F3;">Firebase Console</a></li>
          <li>Click <strong>"Create a new Firebase project"</strong> (or select existing project)</li>
          <li>Enable <strong>Google Authentication</strong>:
            <ul style="margin: 5px 0;">
              <li>Go to <strong>Authentication → Sign-in method</strong></li>
              <li>Click <strong>Google</strong> and enable it</li>
              <li>Add your domain to <strong>Authorized domains</strong> (e.g., <code>localhost</code> or your GitHub Pages URL)</li>
            </ul>
          </li>
          <li>Enable <strong>Firestore Database</strong>:
            <ul style="margin: 5px 0;">
              <li>Go to <strong>Build</strong> -&gt; <strong>Firestore Database</strong> in the left menu</li>
              <li>Click <strong>"Create database"</strong></li>
              <li>Choose <strong>"Start in locked mode"</strong> (for now)</li>
              <li>Select a location and click <strong>Enable</strong></li>
              <li>Click next to <strong>Project Overview</strong> -&gt; <strong>Cog icon</strong></li>
              <li>Scroll down to <strong>"Your apps"</strong></li>
              <li>Click <strong>Project Settings</strong></li>
              <li>At the bottom you will see section <strong>Your apps</strong></li>
              <li>Click below <strong>There are no apps in your project</strong> -&gt; <strong>Web</strong></li>
              <li>Register your app (give it a name)</li>
              <li>DON'T turn on <strong>Also set up Firebase Hosting</strong> - no need for that</li>
              <li>Press <strong>Register app</strong></li>  
              <li>From step <strong>Add Firebase SDK</strong> ...</li>
              <li>... pick radio button <strong>use a &lt;script&gt; tag</strong></li>
              <li>... copy just object like <pre>{
    apiKey: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    authDomain: "history-xxxxx.firebaseapp.com",
    databaseURL: "https://history-xxxxx-default-xxxx.firebaseio.com",
    projectId: "history-xxxxx",
    storageBucket: "history-xxxxx.firebasestorage.app",
    messagingSenderId: "xxxxxxxxxxxx",
    appId: "1:xxxxxxxxxxxx:web:xxxxxxxxxxxxxxxxxxxxxx",
    measurementId: "G-xxxxxxxxxxx"
  }</pre></li>
  <li>Paste that below ... BUT WAIT!</li>
  <li>Continue in with the setup instructions in the firebase setup ...</li>
  <li>Press <strong>Continue to the console</strong></li>
  <li>Then go to Firebase console <a href="https://console.firebase.google.com/">link</a></li>
  <li>Go to <strong>Build</strong> -&gt; <strong>Authentication</strong> -&gt; <strong>Get started</strong></li>
  <li>Click <strong>Google</strong></li>
  <li>Click <strong>Enable</strong></li>
  <li>Below in field <strong>Support email for project</strong> select your email</li>
  <li>Hit <strong>Save</strong></li>


            </ul>
          </li>
        </ol>
      </details>

      <div style="margin-top: 15px;">
        <label style="font-weight: bold; display: block; margin-bottom: 5px;">Firebase Config JSON:</label>
        <textarea 
          id="firebase-config" 
          rows="10" 
          style="width:100%; font-family: monospace; font-size: 12px; padding: 8px; border: 1px solid #ccc; border-radius: 4px;" 
          placeholder='Paste your Firebase config here (JSON or JS object), e.g.:
{
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  ...
}'></textarea>
      </div>

      <div style="margin-top: 10px; display: flex; gap: 10px; align-items: center;">
        <button id="init-firebase-btn" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
          Initialize Firebase
        </button>
        ${
          savedConfig
            ? '<button id="clear-config-btn" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Clear Saved Config</button>'
            : ""
        }
        <span id="error-msg" style="color: red; font-size: 14px;"></span>
      </div>

      <div id="login-section" style="display:none; margin-top: 15px; padding: 15px; background: #e8f5e9; border-radius: 5px;">
        <p style="margin: 0 0 10px 0; color: #2e7d32;">✅ Firebase initialized successfully!</p>
        <button id="login-btn" style="padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 14px;">
          🔐 Login with Google
        </button>
      </div>
    `;

    container.appendChild(modal);

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
    }

    // Clear saved config handler
    if (clearConfigBtn) {
      clearConfigBtn.addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEY);
        configTextarea.value = "";
        configTextarea.style.background = "white";
        clearConfigBtn.remove();
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
        errorMsg.textContent = "Invalid Config! Please check format (JSON or JS object).";
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
          console.log("Auth state changed:", user ? "User logged in" : "No user");
          if (user) {
            console.log("✅ Firebase initialized! User restored:", user.displayName);
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
  });
}
