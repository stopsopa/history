import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

/**
 * Main bootstrap function
 * @param {object} options
 * @param {string} options.containerId - div id where the modal will appear
 * @returns {Promise<{auth, provider, app, user}>} - resolves when user logged in
 */
export function bootstrapFirebase({ containerId }) {
  return new Promise((resolve, reject) => {
    const container = document.getElementById(containerId);
    if (!container) return reject(new Error('Container not found'));

    // Clear container
    container.innerHTML = '';

    // Create modal
    const modal = document.createElement('div');
    modal.style = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
      z-index: 9999;
    `;

    const content = document.createElement('div');
    content.style = `
      background: white; padding: 20px; border-radius: 10px;
      max-width: 600px; width: 90%;
    `;
    modal.appendChild(content);

    // HTML content
    content.innerHTML = `
      <h2>Connect Your Firebase</h2>
      <p>Follow these steps:</p>
      <ol>
        <li>Go to <a href="https://console.firebase.google.com/" target="_blank">Firebase Console</a>.</li>
        <li>Create a project or use an existing one.</li>
        <li>Enable Google Authentication in Authentication → Sign-in Method.</li>
        <li>Add your domain (GitHub Pages URL) to Authorized domains.</li>
        <li>Copy your Firebase config object (Settings → Project Settings → SDK snippet → Config) and paste below.</li>
      </ol>
      <textarea id="firebase-config" rows="10" style="width:100%;" placeholder='Paste Firebase config JSON here'></textarea>
      <div style="margin-top: 10px;">
        <button id="init-firebase-btn">Initialize Firebase</button>
        <span id="error-msg" style="color:red; margin-left:10px;"></span>
      </div>
      <div id="login-section" style="display:none; margin-top:10px;">
        <button id="login-btn">Login with Google</button>
      </div>
    `;

    container.appendChild(modal);

    const errorMsg = content.querySelector('#error-msg');
    const initBtn = content.querySelector('#init-firebase-btn');
    const loginBtn = content.querySelector('#login-btn');
    const loginSection = content.querySelector('#login-section');
    let auth, provider, app;

    // Step 1: Initialize Firebase
    initBtn.addEventListener('click', () => {
      errorMsg.textContent = '';
      const configText = content.querySelector('#firebase-config').value;
      let firebaseConfig;
      try {
        firebaseConfig = JSON.parse(configText);
      } catch (err) {
        errorMsg.textContent = 'Invalid JSON!';
        return;
      }

      try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        provider = new GoogleAuthProvider();

        // Show login
        initBtn.style.display = 'none';
        loginSection.style.display = 'block';
      } catch (err) {
        console.error(err);
        errorMsg.textContent = 'Firebase initialization failed. Check console.';
      }
    });

    // Step 2: Login
    loginBtn.addEventListener('click', async () => {
      errorMsg.textContent = '';
      if (!auth || !provider) return;
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Cleanup modal
        container.removeChild(modal);

        resolve({ auth, provider, app, user });
      } catch (err) {
        console.error(err);
        errorMsg.textContent = 'Login failed. Check console.';
      }
    });
  });
}
