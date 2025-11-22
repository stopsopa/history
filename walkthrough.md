# Firebase Integration Verification Walkthrough

## Overview

We have successfully integrated Firebase Firestore into `index.html`, replacing the local `events.json` storage. The application now allows users to "bring their own Firebase" project.

## Changes Made

1.  **Firebase Bootstrap**: Added a modal to input Firebase config and login with Google.
2.  **Data Layer**: Created `lib/firebaseData.js` to handle Firestore CRUD operations.
3.  **Application Logic**: Replaced all `fetch()` calls in `index.html` with Firestore operations.
4.  **Image Handling**: Removed file upload UI; images are now handled via external URLs only.
5.  **Dependencies**: Installed `firebase` package and updated imports to use local `node_modules`.

## Verification Steps

### 1. Setup Firebase Project

1.  Open `index.html` in your browser (via your local server).
2.  You should see the "Connect Your Firebase Project" modal.
3.  Follow the instructions in the modal to:
    - Create a Firebase project.
    - Enable Google Authentication.
    - Enable Firestore Database (Start in **Test Mode**).
    - Copy your Firebase config object.
4.  Paste the config into the text area and click "Initialize Firebase".
5.  Login with your Google account.

### 2. Verify Data Operations

1.  **Create Event**:
    - Double-click on the timeline to add an event.
    - Fill in title, date, and content.
    - (Optional) Add an image URL (e.g., `https://via.placeholder.com/150`).
    - Click "Save".
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

### 3. Verify Persistence

1.  Refresh the page.
2.  You should NOT be asked to paste the config again (it's saved in localStorage).
3.  You might need to click "Login with Google" again (unless we implemented silent auth persistence, but the current flow requires explicit login button click for security/clarity).
4.  Verify your events are loaded from Firestore.

### 4. Verify Image Handling

1.  Create/Edit an event.
2.  Select "Image URL" and paste a valid image URL.
3.  Save.
4.  Verify the image thumbnail appears on the timeline item.

## Troubleshooting

- **Login Error**: Check "Authorized domains" in Firebase Console -> Authentication -> Settings. Add `localhost` or your domain.
- **Firestore Error**: Ensure Firestore is enabled and rules allow read/write (Test Mode allows all).
- **Console Errors**: Open Developer Tools (F12) to see detailed error messages.
