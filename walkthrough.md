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

### Conditional Image Rendering Verification

- **Requirement**: Events without an `image` property should render only text, no default image.
- **Implementation**: Updated template to conditionally append the `<img>` element only if `item.image` exists.
- **Verification**:
  - Removed `image` property from "item 3" in `events.json`.
  - Verified via browser that "item 3" renders as `<span>item 3</span>` (no `<img>` tag).
  - Verified that other items (e.g., "item 2") still render with their images.

## Add Event Feature

### Implementation

#### Backend (`server.js`)

- **Dependencies**: Installed `multer` for file uploads and `sharp` for image processing.
- **Endpoint**: `POST /api/events/create` handles multipart form data.
- **Image Processing**:
  - Accepts images via URL download or file upload.
  - Converts all images to JPG with 80% quality.
  - Generates unique filenames based on date and title: `img/YYYY/MM/DD-title.jpg`.
  - Automatically creates 24x24px thumbnails in `thumb/` directory.
  - Returns specific error messages for download failures.

#### Shared Module (`lib/imageUtils.js`)

- **Purpose**: Reusable image processing functions for both server and CLI.
- **Functions**:
  - `ensureDirectoryExists`: Creates directories recursively.
  - `getUniqueFilename`: Ensures filename uniqueness with counter suffix.
  - `generateThumbnail`: Creates 24x24px center-cropped thumbnails.
  - `processImage`: Complete image processing pipeline.

#### CLI Script (`scripts/regenerate_thumbnails.js`)

- **Command**: `npm run regenerate-thumbnails`
- **Purpose**: Regenerates all thumbnails from source images in `img/`.
- **Features**:
  - Recursively scans `img/` directory.
  - Supports both JPG and PNG source images.
  - Maintains directory structure in `thumb/`.
  - Converts all thumbnails to JPG format.

#### Frontend (`index.html`)

- **Modal UI**: Clean, responsive modal for event creation.
- **Form Fields**:
  - Title (required)
  - Date range toggle (checkbox)
  - Start date (required)
  - End date (conditional)
  - Image source selector (radio: Upload/URL)
- **Features**:
  - Drag & drop file upload
  - Click-to-select file upload
  - URL-based image download
  - Error display in modal (no alerts)
  - Modal stays open on error
- **Timeline Integration**:
  - Thumbnail-first loading with fallback to original image.
  - Template: `<img src="/thumb/..." onerror="this.src='/img/...'">`.

### Verification Results

#### URL Image Download

- ✅ Tested with valid URL: `https://stopsopa.github.io/imgur/images/050-9ng3PRD.png`
- ✅ Event "Error Test" created successfully
- ✅ Image saved to: `img/2025/11/21-error_test.jpg`
- ✅ Thumbnail generated: `thumb/2025/11/21-error_test.jpg`

#### Error Handling

- ✅ Invalid URL displays error message in modal
- ✅ Modal remains open for correction
- ✅ Error message: "Failed to download image from URL. Please check the URL and try again."

#### CLI Thumbnail Regeneration

- ✅ Command: `npm run regenerate-thumbnails`
- ✅ Successfully processed 6 images
- ✅ Generated thumbnails for both new events and existing images
- ✅ Maintained directory structure

#### File Uniqueness

- ✅ Filename collision handling with counter suffix
- ✅ Format: `DD-title.jpg`, `DD-title-1.jpg`, `DD-title-2.jpg`, etc.

## Date Input Enhancements

### Implementation

**UI Changes:**

- Replaced single text input with structured date inputs:
  - **Year**: Text input supporting positive (CE) and negative (BCE) values
  - **Month**: Select dropdown with all 12 months
  - **Day**: Select dropdown with days 1-31
- Added `autocomplete="off"` to form to prevent browser suggestions
- Changed "Event has duration" checkbox to unchecked by default

**JavaScript Logic:**

- `populateDays()`: Dynamically populates day dropdowns with options 1-31
- Default values set to today's date when modal opens
- Form submission constructs date string: `YYYY-MM-DD` from separate inputs
- Supports BCE dates with negative year values (e.g., `-500-03-15`)

### Verification Results

#### BCE Date Creation

- ✅ Created event "BCE Test" with date `-500-03-15`
- ✅ Event rendered correctly on timeline
- ✅ Day dropdown populated with 32 options (blank + 1-31)
- ✅ Month dropdown shows all 12 months
- ✅ Year input accepts negative values for BCE dates

#### Form Behavior

- ✅ Autocomplete disabled (no browser suggestions)
- ✅ "Event has duration" checkbox unchecked by default
- ✅ End date fields hidden when checkbox unchecked
- ✅ End date fields shown when checkbox checked
