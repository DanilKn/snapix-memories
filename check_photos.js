import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

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
  const q = query(collection(db, "photos"), where("eventId", "==", "AAWtl2yw9gB99CEwa2Fe"));
  const snap = await getDocs(q);
  console.log(`Found ${snap.size} photos:`);
  snap.forEach(doc => {
    console.log(JSON.stringify({ id: doc.id, ...doc.data() }, null, 2));
  });
}

main().catch(console.error);
