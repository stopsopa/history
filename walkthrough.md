# Firebase Integration Verification Walkthrough

## Overview

We have successfully integrated Firebase Firestore into `index.html`, replacing the local `events.json` storage. The application now allows users to "bring their own Firebase" project.

## Changes Made

1.  **Firebase Bootstrap**: Added a modal to input Firebase config and login with Google.
    - **Session Persistence**: Automatically restores session on page reload.
    - **Auto-Init**: Automatically initializes if config is saved.
    - **JS Config Support**: Accepts raw JS objects from Firebase Console.
2.  **Data Layer**: Created `lib/firebaseData.js` to handle Firestore CRUD operations.
    - **Collection Path**: Uses `history-events` (valid root collection).
3.  **Application Logic**: Replaced all `fetch()` calls in `index.html` with Firestore operations.
    - **Fallback**: Renders empty timeline if data loading fails (e.g., permission denied).
4.  **Image Handling**: Removed file upload UI; images are now handled via external URLs only.
5.  **Dependencies**: Reverted to CDN imports for browser compatibility.

## Verification Steps

### 1. Setup Firebase Project

1.  Open `index.html` in your browser (via your local server).
2.  You should see the "Connect Your Firebase Project" modal.
3.  Follow the instructions in the modal to:
    - Create a Firebase project.
    - Enable Google Authentication.
    - **CRITICAL**: Click **Build** -> **Firestore Database** (NOT Realtime Database).
    - Click **Create Database**.
    - Enable Firestore Database (Start in **Test Mode** or ensure rules allow read/write).
    - Copy your Firebase config object.
4.  Paste the config into the text area. It will auto-initialize.
5.  Login with your Google account.

### 2. Verify Data Operations

1.  **Create Event**:
    - Double-click on the timeline to add an event.
    - Fill in title, date, and content.
    - (Optional) Add an image URL (e.g., `https://via.placeholder.com/150`).
    - Click "Create Event".
    - Verify the event appears on the timeline.
2.  **Edit Event**:
    - Double-click the event you just created.
    - Change the title or date.
    - Click "Update Event".
    - Verify the changes are reflected.
3.  **Delete Event**:
    - Select the event and click the "Delete" button (trash icon).
    - Confirm deletion.
    - Verify the event is removed.
4.  **Drag and Drop**:
    - Drag an event to a new time.
    - Refresh the page.
    - Verify the new position is persisted.

### 3. Verify Persistence & Auto-Login

1.  Refresh the page.
2.  You should **NOT** see the modal.
3.  The app should auto-initialize and log you in.
4.  Events should load automatically.

### 4. Verify Image Handling

1.  Create/Edit an event.
2.  Select "Image URL" and paste a valid image URL.
3.  Save.
4.  Verify the image thumbnail appears on the timeline item.

## Troubleshooting

- **Login Error (auth/configuration-not-found)**: Enable Google Sign-In in Firebase Console.
- **Firestore Error (Permission Denied)**: Check Firestore Rules. Ensure they allow read/write (e.g., `allow read, write: if true;`). **Do not use "Locked Mode"**.
- **Console Errors**: Open Developer Tools (F12) to see detailed error messages.
