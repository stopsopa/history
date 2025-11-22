import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const COLLECTION_PATH = "history-app/events";

/**
 * Load all events from Firestore
 * @param {Firestore} db - Firestore instance
 * @returns {Promise<Array>} - Array of events
 */
export async function loadEventsFromFirestore(db) {
  try {
    const eventsRef = collection(db, COLLECTION_PATH);
    const querySnapshot = await getDocs(eventsRef);
    
    const events = [];
    querySnapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() });
    });
    
    return events;
  } catch (error) {
    console.error("Error loading events from Firestore:", error);
    throw new Error(`Failed to load events: ${error.message}`);
  }
}

/**
 * Save a new event to Firestore
 * @param {Firestore} db - Firestore instance
 * @param {Object} event - Event object to save
 * @returns {Promise<Object>} - Saved event with ID
 */
export async function saveEventToFirestore(db, event) {
  try {
    // Use the event's ID as the document ID
    const eventId = event.id.toString();
    const eventRef = doc(db, COLLECTION_PATH, eventId);
    
    await setDoc(eventRef, event);
    
    return event;
  } catch (error) {
    console.error("Error saving event to Firestore:", error);
    throw new Error(`Failed to save event: ${error.message}`);
  }
}

/**
 * Update an existing event in Firestore
 * @param {Firestore} db - Firestore instance
 * @param {string|number} eventId - Event ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateEventInFirestore(db, eventId, updates) {
  try {
    const eventRef = doc(db, COLLECTION_PATH, eventId.toString());
    await updateDoc(eventRef, updates);
  } catch (error) {
    console.error("Error updating event in Firestore:", error);
    throw new Error(`Failed to update event: ${error.message}`);
  }
}

/**
 * Delete an event from Firestore
 * @param {Firestore} db - Firestore instance
 * @param {string|number} eventId - Event ID
 * @returns {Promise<void>}
 */
export async function deleteEventFromFirestore(db, eventId) {
  try {
    const eventRef = doc(db, COLLECTION_PATH, eventId.toString());
    await deleteDoc(eventRef);
  } catch (error) {
    console.error("Error deleting event from Firestore:", error);
    throw new Error(`Failed to delete event: ${error.message}`);
  }
}

/**
 * Save all events to Firestore (batch operation)
 * Used for drag/drop position updates
 * @param {Firestore} db - Firestore instance
 * @param {Array} events - Array of events to save
 * @returns {Promise<void>}
 */
export async function saveAllEventsToFirestore(db, events) {
  try {
    const batch = writeBatch(db);
    
    events.forEach((event) => {
      const eventId = event.id.toString();
      const eventRef = doc(db, COLLECTION_PATH, eventId);
      batch.set(eventRef, event, { merge: true });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Error batch saving events to Firestore:", error);
    throw new Error(`Failed to save events: ${error.message}`);
  }
}
