import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBrbDe0yBx8Q-FRcVR3V2WcrMP9JYkclGU",
  authDomain: "goal-quest-92ce2.firebaseapp.com",
  projectId: "goal-quest-92ce2",
  storageBucket: "goal-quest-92ce2.firebasestorage.app",
  messagingSenderId: "985504731352",
  appId: "1:985504731352:web:324a9d77df155d7cce47ad"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

window.firebaseStorage = {
  get: async (key, shared) => {
    try {
      const snap = await getDoc(doc(db, shared ? "shared" : "users", key));
      return snap.exists() ? { value: snap.data().value } : null;
    } catch (e) { return null; }
  },
  set: async (key, value, shared) => {
    try {
      await setDoc(doc(db, shared ? "shared" : "users", key), { value });
      return { key, value };
    } catch (e) { return null; }
  },
  delete: async (key, shared) => {
    try {
      await deleteDoc(doc(db, shared ? "shared" : "users", key));
      return { key, deleted: true };
    } catch (e) { return null; }
  },
};

window.storage = window.firebaseStorage;