# Firebase Integration Implementation Plan

## Overview

Migrate `index.html` from using `events.json` (via server.js API) to Firebase Firestore, while keeping `custom.html` and `server.js` unchanged. Each user will "bring their own Firebase" project and authenticate with their Google account.

## Related Documents

- [firebase-chatgpt.md](file:///Users/szdz/Workspace/STOPSOPA__history/STOPSOPA__history/firebase-chatgpt.md) - Original ChatGPT conversation about the approach
- [firebase-spec.md](file:///Users/szdz/Workspace/STOPSOPA__history/STOPSOPA__history/firebase-spec.md) - Your specification requirements

## Background

The current application:

- Stores events in `events.json`
- Uses server.js API endpoints (`/api/events`, `/api/events/create`, `/api/events/:id`)
- Loads events via `fetch("events.json")`
- Saves events via `fetch("/api/events", {method: "POST"})`
- Creates/updates/deletes events via REST API

The new Firebase-based approach:

- Each user provides their own Firebase config
- Users authenticate with Google via Firebase Auth
- Events stored in user's Firestore database
- Images are external URLs only (no uploads/processing)

## User Decisions

> [!IMPORTANT] > **Simplified Image Handling**
>
> ✅ **Decision Made**: Images will be external URLs only (no uploads). The URL will be stored in Firestore and used directly as thumbnails in the timeline. This eliminates all server-side image processing.

> [!NOTE] > **Data Migration**
>
> ✅ **Decision Made**: No migration needed. Users will start fresh with Firebase. `events.json` remains for `custom.html`.

## Proposed Changes

### Firebase Bootstrap Module

#### [MODIFY] [firebaseBootstrap.js](file:///Users/szdz/Workspace/STOPSOPA__history/STOPSOPA__history/firebaseBootstrap.js)

**Enhancements:**

- Add Firestore import and initialization
- Add localStorage support to persist Firebase config (so users don't re-enter it every time)
- Add "Clear Saved Config" button for testing/switching accounts
- Improve error messages with specific troubleshooting steps
- **Enhance modal with comprehensive setup guide** - step-by-step instructions for:
  - Creating Firebase project
  - Enabling Google Authentication
  - Adding authorized domains
  - **Enabling Firestore Database** (critical step!)
  - Getting Firebase config JSON
- Return `db` (Firestore instance) along with auth objects
- Keep all UI in `#firebase-bootstrap-container` for portability

**Key changes:**

```javascript
import { getFirestore } from "firebase/firestore";

// Check localStorage for saved config
const savedConfig = localStorage.getItem("firebaseConfig");

// Save config to localStorage after successful init
localStorage.setItem("firebaseConfig", JSON.stringify(firebaseConfig));

// Return db instance
const db = getFirestore(app);
resolve({ auth, provider, app, user, db });
```

---

### Data Access Layer

#### [NEW] [lib/firebaseData.js](file:///Users/szdz/Workspace/STOPSOPA__history/STOPSOPA__history/lib/firebaseData.js)

**Purpose**: Centralized module for all Firestore operations

**Exports:**

- `loadEventsFromFirestore(db)` - Load all events from `history-app/events`
- `saveEventToFirestore(db, event)` - Create new event
- `updateEventInFirestore(db, eventId, updates)` - Update existing event
- `deleteEventFromFirestore(db, eventId)` - Delete event
- `saveAllEventsToFirestore(db, events)` - Batch save (for drag/drop position updates)

**Firestore structure:**

```
history-app/
  events/
    {eventId}/
      - id: number
      - title: string
      - content: string
      - start: string (date)
      - end: string (date, optional)
      - type: string (optional)
      - imageUrl: string (external URL, optional)
      - group: array (optional)
      - color: string (optional)
```

**Note**: Since users use their own Firebase projects, no userId needed in path. Simple collection: `history-app/events/{eventId}`

---

### Main Application

#### [MODIFY] [index.html](file:///Users/szdz/Workspace/STOPSOPA__history/STOPSOPA__history/index.html)

**Changes in the `<script type="module">` section:**

1. **Add Firebase bootstrap container** (in HTML body, before closing `</body>`):

```html
<div id="firebase-bootstrap-container"></div>
```

2. **Import Firebase data layer**:

```javascript
import {
  loadEventsFromFirestore,
  saveEventToFirestore,
  updateEventInFirestore,
  deleteEventFromFirestore,
  saveAllEventsToFirestore,
} from "./lib/firebaseData.js";
```

3. **Bootstrap Firebase at startup** (replace current immediate `loadEvents()` call):

```javascript
// Global Firebase state
let firebaseAuth, firebaseDb, firebaseUser;

// Top-level await (allowed in ES modules)
try {
  const { auth, db, user } = await bootstrapFirebase({
    containerId: "firebase-bootstrap-container",
  });

  firebaseAuth = auth;
  firebaseDb = db;
  firebaseUser = user;

  // Now load events from Firestore
  loadEvents();
} catch (err) {
  console.error("Firebase bootstrap failed:", err);
  alert("Failed to initialize Firebase. Please refresh and try again.");
}
```

4. **Replace `loadEvents()` function** (~line 1935):

   - Remove `fetch("events.json")`
   - Call `loadEventsFromFirestore(firebaseDb)` (no userId needed)

5. **Replace `saveEvents()` function** (~line 2072):

   - Remove `fetch("/api/events", {method: "POST"})`
   - Call `saveAllEventsToFirestore(firebaseDb, dataToSave)`

6. **Replace create event handler** (~line 1830):

   - Remove `fetch("/api/events/create")`
   - Remove FormData and image upload logic
   - Use `imageUrl` field instead of `imageFile`
   - Call `saveEventToFirestore(firebaseDb, newEvent)`

7. **Replace update event handler** (~line 1829):

   - Remove `fetch(\`/api/events/${currentEditId}\`, {method: "PUT"})`
   - Remove FormData and image upload logic
   - Call `updateEventInFirestore(firebaseDb, currentEditId, updatedEvent)`

8. **Replace delete event handler** (~line 1530):

   - Remove `fetch(\`/api/events/${currentDeleteId}\`, {method: "DELETE"})`
   - Call `deleteEventFromFirestore(firebaseDb, currentDeleteId)`

9. **Update form UI** (~line 616-702):
   - Remove file upload radio option and drop zone
   - Keep only "No Image" and "Image URL" options
   - Simplify image handling (no server processing needed)

---

## Verification Plan

### Automated Tests

No existing automated tests found. Manual testing will be required.

### Manual Verification

#### 1. Firebase Project Setup

**Note**: The bootstrap modal (`#firebase-bootstrap-container`) will guide users through these steps interactively.

**Steps:**

1. Start the dev server: `npm run xx`
2. Open `http://localhost:3000/index.html` in browser
3. Verify Firebase bootstrap modal appears with step-by-step instructions:
   - Link to Firebase Console
   - Instructions to create project
   - Instructions to enable Google Auth
   - Instructions to add authorized domain
   - Instructions to enable Firestore
   - Instructions to get config JSON
4. Follow modal instructions to set up Firebase project
5. Paste Firebase config JSON into textarea
6. Click "Initialize Firebase"
7. Click "Login with Google"
8. Verify successful login and modal closes

#### 2. Event CRUD Operations

**Steps:**

1. Click "Add Event" button
2. Fill in event details (title, dates, content, etc.)
3. Submit form
4. **Verify**: Event appears on timeline
5. **Verify in Firebase Console**: Check Firestore database shows the event under `history-app/events/{eventId}`
6. Double-click the event to edit
7. Modify title and save
8. **Verify**: Timeline updates
9. **Verify in Firebase Console**: Event data updated in Firestore
10. Click event, then "Delete" button
11. Confirm deletion
12. **Verify**: Event removed from timeline
13. **Verify in Firebase Console**: Event removed from Firestore

#### 3. Persistence & Reload

**Steps:**

1. Add 2-3 events
2. Refresh the page
3. **Verify**: Firebase config is remembered (no need to re-enter)
4. **Verify**: User auto-logs in (or shows login button)
5. **Verify**: All events load correctly from Firestore

#### 4. Drag & Drop Position Updates

**Steps:**

1. Add multiple events
2. Drag an event to a new date
3. **Verify**: Event moves on timeline
4. Refresh page
5. **Verify**: Event position persists (new date saved to Firestore)

#### 5. Group Filtering

**Steps:**

1. Create events with different groups (e.g., "people", "civilisations")
2. Click group filter buttons
3. **Verify**: Events filter correctly
4. **Verify**: Filtering works with Firestore data

#### 6. Image Handling

**Steps:**

1. Create event with image URL (e.g., `https://via.placeholder.com/150`)
2. **Verify**: Image displays as thumbnail on timeline
3. **Verify**: `imageUrl` field stored in Firestore
4. Edit event and change image URL
5. **Verify**: New image displays
6. Delete event
7. **Verify**: Event removed from Firestore

#### 7. Error Scenarios

**Steps:**

1. Enter invalid Firebase config JSON
2. **Verify**: Clear error message shown
3. Try to login with Firebase project that doesn't have Google Auth enabled
4. **Verify**: Helpful error message
5. Clear localStorage and refresh
6. **Verify**: Config prompt appears again

#### 8. Verify custom.html Still Works

**Steps:**

1. Open `http://localhost:3000/custom.html`
2. **Verify**: Still loads events from `events.json`
3. **Verify**: CRUD operations still work via server.js API
4. **Verify**: No Firebase-related errors in console
