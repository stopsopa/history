# Timeline UI Walkthrough

I have implemented a timeline UI using `vis-timeline` that allows adding, modifying, and removing events. The events are persisted to a `events.json` file on the server.

## Changes

### Backend

- Updated `server.js` to include:
  - `express.json()` middleware for parsing JSON request bodies.
  - `POST /api/events` endpoint to save event data to `events.json`.
- Created `events.json` with initial sample data.

### Frontend

- Updated `index.html` to:
  - Include `vis-timeline` library and CSS.
  - Add an **"Add Event" button** for easier event creation.
  - Fetch events from `/events.json` on load.
  - Render the timeline with `editable: true` and a **custom template** to display **images** (stored in `/img`) next to event text.
  - Implement `onAdd`, `onUpdate`, `onMove`, and `onRemove` callbacks to sync changes to the server via `POST /api/events`.

## Verification Results

### Automated Tests

- Verified `GET /events.json` returns the event list.
- Verified `POST /api/events` successfully saves data to the file.

### Manual Verification

1.  **Start the server**:
    ```bash
    node server.js
    ```
2.  **Open the application**:
    Navigate to [http://localhost:3000](http://localhost:3000) in your browser.
3.  **Interact with the Timeline**:
    - **Add (Button)**: Click the "Add Event" button at the top. Enter text and the event will be added at the current date.
    - **Add (Double-click)**: Double-click on an empty space in the timeline to add a new event at that specific time.
    - **Edit**: Double-click on an existing event to edit its text.
    - **Move**: Drag and drop an event to a new time.
    - **Delete**: Select an event and click the "Delete" button (if available in UI) or use the delete key.
    - **Refresh**: Reload the page to see that your changes have been saved.

### Image Rendering Verification

- **Issue Identified**: `vis-timeline` was sanitizing HTML strings, stripping relative `src` attributes from `<img>` tags.
- **Fix Implemented**: Modified the `template` function in `index.html` to return a **DOM Element** (`span`) instead of an HTML string. This bypasses the string sanitizer.
- **Verification**:
  - Verified that events are rendered with images on the left side of the text.
  - Confirmed that the correct image path (e.g., `img/user.png`) is used for specific items.
  - Validated visually via screenshot and DOM inspection (confirmed `src` attribute is present and correct).
