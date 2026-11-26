# Suggested changes to the timeline (`custom.html` / `index.html`)

Scope: how the timeline is rendered with vis-timeline 8.5.2. Storage (local API / Firebase) is out of scope.

Everything below applies to **both** files unless stated otherwise, because the timeline code is duplicated in them. Line numbers refer to `custom.html`; the same code sits a few dozen lines lower in `index.html`, where the item collection is named `timelineItems` instead of `items`.

Status of each finding is marked as:

- **confirmed** – verified by running the code in Node or by reading the library source in `node_modules`
- **from code reading** – follows from the code, not executed in a browser
- **unverified** – likely, but needs a check in the browser

---

# Part 1 – Bugs

## 1. Years 1–99 AD cannot be used

**Status:** confirmed (`new Date(79, 7, 24).getFullYear()` returns `1979`).

**Problem.** The JavaScript `Date` constructor treats a year between 0 and 99 as 1900 + year. Two places depend on it:

- `parseDateString` (line 1898) – an event stored as `79-08-24` is drawn in 1979.
- `validateDate` (line 1291) – it builds `new Date(79, ...)`, reads back `1979`, sees it differs from `79` and shows "Invalid date". So the form refuses any year from 1 to 99.

A related error in the same function: for BC years it builds `new Date(0, month, day)` first and sets the year afterwards. Year 1900 is not a leap year, so 29 February has already rolled over to 1 March before the real year is applied (confirmed: `-4-02-29` parses as 1 March).

**Fix.** Never pass the year to the `Date` constructor. Set year, month and day together with `setFullYear`, which takes the year literally.

Replace the body of `parseDateString` with:

```js
function parseDateString(dateStr) {
  if (!dateStr) return null;

  const match = dateStr.match(/^(-?\d+)-(\d+)-(\d+)/);
  if (!match) return null;

  const date = new Date(0);
  date.setFullYear(
    parseInt(match[1], 10),
    parseInt(match[2], 10) - 1,
    parseInt(match[3], 10)
  );
  date.setHours(0, 0, 0, 0);
  return date;
}
```

In `validateDate`, delete the `if (yearNum > 0) { ... } else { ... }` split (lines 1289–1322) and use one check for every year:

```js
const date = new Date(0);
date.setFullYear(yearNum, monthNum - 1, dayNum);

if (
  date.getFullYear() !== yearNum ||
  date.getMonth() !== monthNum - 1 ||
  date.getDate() !== dayNum
) {
  errorDiv.textContent = `Invalid date: month ${month} does not have ${day} days in year ${year}`;
  errorDiv.style.display = "block";
  return false;
}
```

## 2. BC dates are one year off

**Status:** from code reading (standard `Date` behaviour).

**Problem.** `Date` uses astronomical year numbering: year `0` is 1 BC, year `-1` is 2 BC, year `-27` is 28 BC. The data uses `-27` to mean 27 BC ("Roman Empire", `events.json`). Consequences:

- the item is drawn one year too early,
- `calculateDuration` in `lib/dateUtils.js` subtracts the raw year numbers, so any duration crossing the BC/AD boundary is one year too long (27 BC → 476 AD is reported as 503 years, the real value is 502, because there is no year zero),
- the leap-year test in `getDaysInMonth` and in the form uses `Math.abs(year)`, which picks the wrong BC years (the leap years are 1 BC, 5 BC, 9 BC…, not 4 BC, 8 BC…),
- year `0` is accepted by the form although it does not exist in the historical calendar.

**Fix.** Keep the stored format as it is (`-27` = 27 BC) and convert at the two boundaries with `Date`.

Add two helpers next to `parseDateString`:

```js
// stored year (-27 = 27 BC, no year 0)  ->  year understood by Date
const toAstronomicalYear = (year) => (year < 0 ? year + 1 : year);
// year from Date  ->  stored year
const toHistoricalYear = (year) => (year <= 0 ? year - 1 : year);
```

- In `parseDateString` pass `toAstronomicalYear(parseInt(match[1], 10))` to `setFullYear`.
- In `formatDateToString` (line 2085) use `const year = toHistoricalYear(date.getFullYear());`.
- In `validateDate` reject year `0` with the message "Year 0 does not exist" and pass `toAstronomicalYear(yearNum)` to `setFullYear`; compare `date.getFullYear()` with that converted value.
- In `lib/dateUtils.js`, inside `calculateDuration`, convert both parsed years with the same `toAstronomicalYear` before subtracting, and call `getDaysInMonth` with the converted year. In `getDaysInMonth` drop `Math.abs` and test the year directly: `(year % 4 === 0 && year % 100 !== 0) || year % 400 === 0`.

`tests/dateUtils.test.js` has BC cases; the ones crossing year zero will need their expected values lowered by one year.

## 3. Item mapping is copy-pasted and has drifted (images vanish after filtering in `index.html`)

**Status:** confirmed by comparing the code.

**Problem.** The block that converts a stored event into a vis-timeline item exists three times per file: in `loadEvents` (line 1968) and twice in `applyFilters` (lines 1170 and 1208). In `index.html` the copies already differ: `loadEvents` copies `imageUrl` into `image` (line 1982 of `index.html`) and accepts any colour, while both copies in `applyFilters` do neither. After clicking any group filter in `index.html`, items with `imageUrl` lose their thumbnail.

**Fix.** One function, used everywhere:

```js
function toItem(event) {
  const item = { ...event, start: parseDateString(event.start) };

  if (event.end) {
    item.end = parseDateString(event.end);
  } else {
    item.type = "point";
  }

  if (event.imageUrl) {
    item.image = event.imageUrl;
  }

  if (event.color && /^#[0-9a-f]{6}$/i.test(event.color)) {
    item.style = `background-color: ${event.color};`;
  }

  item.className = selectionClass(event.id); // see bug 5

  return item;
}
```

Replace all three inline blocks with `data.map(toItem)` / `allEvents.map(toItem)`. After the change in bug 4 only one call remains.

## 4. Group filters get out of sync after saving an event

**Status:** from code reading.

**Problem.** After create / edit / delete, `loadEvents` runs. It calls `renderGroupFilters`, which rebuilds the buttons without the `active` class, and then puts **all** events on the timeline. The `activeFilters` set is not cleared. Result: the screen shows "no filter", but the set still contains the old group, so the next click on that button removes it from the set instead of adding it – the button behaves inverted.

Filtering itself is done by emptying and refilling the DataSet (`items.clear(); items.add(...)`), which is also the cause of bug 5.

**Fix.** Keep all events in the DataSet permanently and filter through a `DataView` (exported by the same vis-timeline bundle).

Import:

```js
import {
  Timeline,
  DataSet,
  DataView,
} from "./node_modules/vis-timeline/dist/vis-timeline-graph2d.esm.js";
```

Create the collections once, instead of `let items;`:

```js
const items = new DataSet();
const visibleItems = new DataView(items, { filter: matchesActiveFilters });

function matchesActiveFilters(item) {
  if (activeFilters.size === 0) return true;

  const groups = Array.isArray(item.group) ? item.group : [];
  if (groups.length === 0) return activeFilters.has("__NO_GROUP__");

  return groups.some((g) => activeFilters.has(g));
}
```

Give the view to the timeline: `new Timeline(container, visibleItems, options)`.

`applyFilters` becomes:

```js
function applyFilters() {
  visibleItems.refresh();
}
```

`loadEvents`, after `allEvents = data;`:

```js
// forget filters whose group no longer exists
const existing = new Set([...getAllUniqueGroups(), "__NO_GROUP__"]);
activeFilters.forEach((g) => existing.has(g) || activeFilters.delete(g));

renderGroupCheckboxes();
renderGroupFilters();

items.clear();
items.add(data.map(toItem));
visibleItems.refresh();

if (!timeline) createTimeline();
```

In `renderGroupFilters`, mark the buttons while creating them – after setting `btn.dataset.group` (and the same for `noGroupBtn`):

```js
btn.classList.toggle("active", activeFilters.has(group));
```

All other code keeps reading single events with `items.get(id)`; that now works for filtered-out events too.

## 5. Selection is lost on filter / reload, and the comparison can crash

**Status:** from code reading.

**Problem.** The selection highlight is the `className` field on items. Every refill of the DataSet (filter click, save) creates fresh items without it, while `selectedEventIds` keeps the ids. So the highlight disappears but the comparison panel stays. If one of the two selected events is no longer in the DataSet and the window is resized, `renderComparison` runs, `items.get(...)` returns `null`, and `ev1.start.getTime()` (line 2301) throws.

**Fix.**

Add a helper and use it in `toItem` (bug 3), so recreated items keep their highlight:

```js
function selectionClass(id) {
  if (selectedEventIds[0] == id) return "selected-item-1";
  if (selectedEventIds[1] == id) return "selected-item-2";
  return "";
}
```

`let selectedEventIds = [];` (line 2128) must be moved above `loadEvents()` so it exists when `toItem` first runs.

In `loadEvents`, before `items.add(...)`, drop ids of deleted events and refresh the panels after adding:

```js
const ids = new Set(data.map((e) => String(e.id)));
selectedEventIds = selectedEventIds.filter((id) => ids.has(String(id)));
// ... items.clear(); items.add(...) ...
renderComparison();
if (selectedEventIds.length > 0) renderEventDetails(items.get(selectedEventIds[0]));
else clearEventDetails();
```

At the top of the two-event branch of `renderComparison`, after reading `ev1` and `ev2`:

```js
if (!ev1 || !ev2) return;
```

With the DataView from bug 4, filtering no longer removes anything from `items`, so filtered-out events can still be compared.

## 6. Dragging the timeline selects the item under the cursor

**Status:** confirmed in headless Chrome (press on an item, drag 120 px sideways, release: the item got selected).

**Problem.** Selection is handled by a native `click` listener on `document.body` (line 2131). A native click fires whenever the mouse button is pressed and released on the same element, which is also true after a pan that started on an item, because the item moves together with the cursor.

The same listener is the reason for the `parseInt` guess in `handleSelection` (lines 2160–2168): ids read from `data-id` are always strings, the real ids are numbers.

Note: the timeline's own `click` event does **not** solve the drag problem by itself. In vis-timeline 8.5.2 it is a plain `onclick` on the root element (confirmed in the library source and in the browser), so it fires after a drag too. It only solves the id-type problem.

**Fix.** Delete the `document.body.addEventListener("click", ...)` block (lines 2131–2139). In `createTimeline`, next to the existing `doubleClick` handler, remember where the button went down and ignore clicks that travelled:

```js
const CLICK_MAX_TRAVEL_PX = 5;
let pressPoint = null;

timeline.on("mouseDown", function (properties) {
  pressPoint = { x: properties.pageX, y: properties.pageY };
});

timeline.on("click", function (properties) {
  if (properties.item === null || properties.item === undefined) return;

  const travelled = pressPoint
    ? Math.hypot(properties.pageX - pressPoint.x, properties.pageY - pressPoint.y)
    : 0;
  if (travelled > CLICK_MAX_TRAVEL_PX) return;

  handleSelection(properties.item, properties.event);
});
```

`properties.item` is the id in its original type, so in `handleSelection` replace lines 2160–2168 with `const targetId = id;`. `properties.event` is the native click and carries `shiftKey` / `ctrlKey` / `altKey` / `metaKey`, so the rest of the function is unchanged. The unused first `isModifierPressed` declaration (line 2149) can be removed.

## 7. Hover-to-widen logic is fragile and logs to the console

**Status:** problem from code reading; the CSS replacement is unverified.

**Problem.** The block at lines 800–854 widens an item on hover by injecting a `<style>` rule, measuring, removing it and re-adding it across two 50 ms timers. `data-id` is present on two nested elements – the vis item (from `dataAttributes: ["id"]`) and the span created in `template` (line 2023) – so `mouseenter` fires twice per item and two timer chains race, the second measuring while the first one's rule is active. Two `console.log` calls run on every hover.

**Fix.** Delete the whole block (lines 800–854) and the line `container.dataset.id = item.id;` in `template`. Add to the `<style>` tag:

```css
.vis-item.vis-range:hover {
  min-width: max-content;
  z-index: 10;
}
```

`min-width` wins over the inline `width` vis-timeline sets, only when the content is wider – the same effect the script was after. Keep the existing `.vis-item .vis-item-overflow:hover { overflow: visible; }` rule. If the CSS turns out not to widen the item in the browser, keep the script but at least remove the two `console.log` calls and the duplicate `data-id` on the span.

## 8. Text colour is computed by watching the whole page

**Status:** from code reading.

**Problem.** `autocolors("[data-id]")` (`color/experiment5.js`) installs a `MutationObserver` on `document.body` for every `style` attribute change in the subtree. vis-timeline rewrites inline styles of items on every pan and zoom frame; each change calls `getComputedStyle`, which forces a style recalculation. The cost grows with the number of items and is paid during the interactions that should be smoothest.

**Fix.** Compute the text colour once, when the item is created.

In `color/experiment5.js` add at the end:

```js
export { getComplementaryColor };
```

In the page, change the import to `import { getComplementaryColor } from "./color/experiment5.js";`, delete the `autocolors("[data-id]");` call, and replace the colour part of `toItem` (bug 3) with:

```js
const DEFAULT_ITEM_COLOR = "#428bad"; // same value as .vis-item in <style>

const hasCustomColor = event.color && /^#[0-9a-f]{6}$/i.test(event.color);

if (hasCustomColor) {
  item.style = `background-color: ${event.color}; color: ${getComplementaryColor(event.color)};`;
} else if (event.end) {
  item.style = `color: ${getComplementaryColor(DEFAULT_ITEM_COLOR)};`;
}
```

A point item without its own colour gets no `style` on purpose: vis-timeline draws it without a background (only the dot and the label), so a light text colour would be unreadable on the page. This is what the observer did implicitly by skipping transparent elements.

The second-selection style forces a light background, so give it a fixed text colour in `<style>`:

```css
.vis-item.selected-item-2 {
  color: #1a1a1a !important;
}
```

## 9. First click triggers one DataSet update per item

**Status:** from code reading.

**Problem.** In `updateSelectionVisuals` (line 2231) the test `item.className !== className` compares `undefined` with `""` for every item that was never selected, so on the first click every item gets its own `items.update(...)` call, each one notifying the timeline. The variable `updatedItem` is created and never used.

**Fix.** Replace the function with one batched update of the items that really changed:

```js
function updateSelectionVisuals() {
  const changes = [];

  items.forEach((item) => {
    const className = selectionClass(item.id);
    if ((item.className || "") !== className) {
      changes.push({ id: item.id, className });
    }
  });

  if (changes.length > 0) items.update(changes);
}
```

## 10. User text is inserted as raw HTML

**Status:** from code reading.

**Problem.**

- `renderComparison` builds an SVG string and puts `ev1.title` / `ev2.title` into it unescaped (lines 2414 and 2468). A title containing `&` or `<` (for example "Smith & Wesson") produces broken markup, and a crafted title runs script.
- `updateSelectedGroupsDisplay` does the same with group names (lines 969–970).
- `renderEventDetails` assigns `marked.parse(markdown)` to `innerHTML` (line 1916). `marked` does not sanitise, so HTML inside the event description is executed.

**Fix.** Add one helper:

```js
function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
```

- In the SVG strings use `${escapeHtml(ev1.title)}` and `${escapeHtml(ev2.title)}`.
- In the group tag template use `<span>${escapeHtml(group)}</span>` and `data-group="${escapeHtml(group)}"`.
- For markdown add the `dompurify` package and change line 1916 to `contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(markdown));`, importing it with `import DOMPurify from "./node_modules/dompurify/dist/purify.es.mjs";`.

## 11. The word "undefined" is written into the comparison SVG

**Status:** from code reading.

**Problem.** `drawDim` (line 2526) has three early `return;` statements, and its result is appended with `svg += drawDim(...)`. When two compared points share the same x (for example two events starting on the same day), the string `undefined` is appended to the SVG markup. Browsers do not draw loose text in an `<svg>`, so it is invisible, but the markup is wrong.

**Fix.** Change the three bare `return;` statements inside `drawDim` to `return "";`.

## 12. Dead code and leftovers

**Status:** from code reading.

**Problem and fix, one by one:**

- **Edit callbacks never run.** Every flag in `editable` is `false`, so `onMove`, `onUpdate` and `onRemove` (lines 2050–2064) are never called. Replace the `editable: { ... }` object with `editable: false` and delete the three callbacks. Then `window.pendingDeleteCallback` is never set either: in `confirmDeleteBtn.onclick` delete the `if (window.pendingDeleteCallback) { ... } else {` branch (lines 1507–1515) and keep only the body of the `else`.
- **`saveEvents` would corrupt the data if it were called.** It serialises timeline items, which carry the display-only fields `className`, `style` and `type`. After removing the callbacks above nothing calls it; delete the function (lines 2092–2116). If it is kept, strip those fields: `const { className, style, type, ...rest } = event;` and save `rest`.
- **Tooltips are configured, then hidden with CSS.** Delete the `tooltip: { ... }` option (lines 2004–2007) and the `body .vis-tooltip { display: none; }` rule (lines 113–115), and set `showTooltips: false` in the options.
- **CSS rule with a typo.** `.vis-item-ovegrflow` (line 124) matches nothing. Delete the rule (lines 124–126).
- **Stray comments.** `// Render event details functions` (line 2067) and `// Add select listener to show event details` (line 2077) describe code that is not there. Delete them.
- **`index.html` only – detail title flashes the markdown body.** `handleSelection` sets `detailTitle` to `ev.content` (lines 2257–2258 of `index.html`) right before `renderEventDetails` overwrites it with the title. Delete those two lines.
- **`index.html` only – debug logging.** `loadEvents` logs every event on each load (lines 1961–1966 of `index.html`). Delete the `console.log` block.

---

# Part 2 – Suggestions

## A. Limit zoom and the visible range

**Why.** No limits are set, so the user can zoom in to milliseconds (the data has day precision) or pan into empty millennia and get lost.

**Change.** Add to the timeline options:

```js
zoomMin: 1000 * 60 * 60 * 24 * 7, // one week
zoomMax: 1000 * 60 * 60 * 24 * 365.25 * 10000, // ten thousand years
```

## B. Stop the mouse wheel from hijacking page scroll, and cap the height

**Why.** The wheel always zooms when the cursor is over the timeline, and the timeline grows taller with every row of stacked items, so scrolling the page past it becomes hard.

**Change.** Add to the options:

```js
zoomKey: "ctrlKey", // wheel zooms only with Ctrl; trackpad pinch also sends Ctrl+wheel
maxHeight: "70vh",
verticalScroll: true, // plain wheel scrolls the stacked rows
```

## C. Show BC years as "27 BC" on the axis

**Why.** The axis prints negative years as `-0027`, and after bug 2 the internal year differs by one from the historical one anyway.

**Change.** `format.minorLabels` and `format.majorLabels` accept a function `(date, scale, step)` in this version, where `date` is a moment object (confirmed in the library source). A function replaces the label for **every** scale, so it has to reproduce the library defaults for the scales it does not care about. The patterns below are copied from `TimeStep.FORMAT` in the installed build; only the year part is swapped.

Add above `createTimeline`:

```js
const AXIS_FORMATS = {
  minorLabels: {
    millisecond: "SSS",
    second: "s",
    minute: "HH:mm",
    hour: "HH:mm",
    weekday: "ddd D",
    day: "D",
    week: "w",
    month: "MMM",
    year: "YYYY",
  },
  majorLabels: {
    millisecond: "HH:mm:ss",
    second: "D MMMM HH:mm",
    minute: "ddd D MMMM",
    hour: "ddd D MMMM",
    weekday: "MMMM YYYY",
    day: "MMMM YYYY",
    week: "MMMM YYYY",
    month: "YYYY",
    year: "",
  },
};

// Date year (astronomical, 0 = 1 BC)  ->  "27 BC" / "476"
function yearLabel(year) {
  return year <= 0 ? `${1 - year} BC` : String(year);
}

function axisLabel(kind) {
  return function (date, scale) {
    const pattern = AXIS_FORMATS[kind][scale];
    if (!pattern) return "";
    // "[...]" makes moment print the text literally instead of its own year
    return date.format(pattern.replace("YYYY", `[${yearLabel(date.year())}]`));
  };
}
```

and to the options:

```js
format: {
  minorLabels: axisLabel("minorLabels"),
  majorLabels: axisLabel("majorLabels"),
},
```

`yearLabel` assumes bug 2 is fixed (dates held in astronomical years). Without that fix use ``year < 0 ? `${-year} BC` : String(year)`` instead.

Also change `formatDateForDisplay` in `lib/dateUtils.js` to print `27 BC` instead of `-27`: replace `const year = match[1];` with

```js
const yearNumber = parseInt(match[1], 10);
const year = yearNumber < 0 ? `${-yearNumber} BC` : String(yearNumber);
```

The test `'15 January -100'` in `tests/dateUtils.test.js` then becomes `'15 January 100 BC'`.

## D. Swimlanes from the `group` field

**Why.** People, wars and civilisations currently stack in one area. vis-timeline can draw one labelled row per group.

**Change.** vis-timeline expects a single group id per item, while `group` here is an array. Decide on one of:

- use the first entry: in `toItem` set `item.group = (event.group && event.group[0]) || "__NO_GROUP__";` and keep the original array under another name (`item.groups = event.group`) for the filters and the edit form, or
- emit one timeline item per group the event belongs to (ids like `` `${event.id}:${group}` ``), which shows the event in every row but requires mapping the id back in the click handler.

Then pass the rows as the third argument: `new Timeline(container, visibleItems, new DataSet(groupNames.map((g) => ({ id: g, content: g }))), options)`.

Until this is done, do not pass a groups collection to the timeline: with one present, the current array value in `group` would be read as a group id.

## E. Cluster dense events when zoomed out

**Why.** With hundreds of point events, a zoomed-out view becomes a tall pile of labels.

**Change.** Add to the options:

```js
cluster: {
  maxItems: 3, // start merging when more than 3 items overlap
  titleTemplate: "{count} events – zoom in to see them",
},
```

## F. Jump-to navigation

**Why.** On a timeline spanning two thousand years, finding one event by panning is slow.

**Change.**

- After an event is created or edited, call `timeline.focus(id)` so the saved item is brought into view.
- Add a search box or list that calls `timeline.focus(id)` for the chosen event.
- Add era buttons that call `timeline.setWindow(start, end)` with fixed ranges (for example "20th century").
- `custom.html` has no "fit" button, `index.html` does; copy the button and its `timeline.fit()` handler over.

## G. One shared timeline module instead of two diverging pages

**Why.** `custom.html` and `index.html` differ in about 700 diff lines, almost all of it storage. Every fix above has to be made twice, and bug 3 shows the copies already drift.

**Change.** Move the timeline code (item mapping, options, selection, comparison, filters) into one ES module, for example `lib/timeline.js`, exporting a function that takes a storage adapter:

```js
initTimeline({
  container: document.getElementById("visualization"),
  storage: { load, create, update, remove }, // local API in custom.html, Firestore in index.html
});
```

Each page keeps its own HTML, its own `<style>` tag and a short script that builds the adapter and calls `initTimeline`.

## H. Smaller points

- **"Mobile" detection is too broad.** `isMobileDevice` (line 2122) returns true for touch-screen laptops and for any window narrower than 1024 px, switching them to the two-tap selection. Replace the body with `return window.matchMedia("(pointer: coarse)").matches;`.
- **Thumbnail path.** `item.image.replace("img/", "thumb/")` (line 2028) rewrites the first `img/` anywhere in the string, including inside a remote URL. Limit it to local paths: `const thumbPath = item.image.startsWith("img/") ? "thumb/" + item.image.slice(4) : item.image;`.
- **Item field names collide with vis-timeline's meaning.** In vis-timeline `title` is the tooltip text and `content` is the label; here `title` is the label and `content` is markdown. It works because `template` overrides the label and tooltips are off (bug 12). Leave it, but keep it in mind before enabling tooltips or removing the template.
