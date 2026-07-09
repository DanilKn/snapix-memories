import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAzaKWF0bVJtRx0t2m-gUo1tstp1qrbVwg",
  authDomain: "snapix-aa00a.firebaseapp.com",
  projectId: "snapix-aa00a",
  storageBucket: "snapix-aa00a.firebasestorage.app",
  messagingSenderId: "553006307389",
  appId: "1:553006307389:web:f347502881d77287793254",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const eventDoc = await getDoc(doc(db, "events", "AAWtl2yw9gB99CEwa2Fe"));
  if (eventDoc.exists()) {
    console.log("Event data:", JSON.stringify(eventDoc.data(), null, 2));
  } else {
    console.log("Event document not found.");
  }
}

main().catch(console.error);
