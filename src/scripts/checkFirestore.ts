import initFirebase from '../config/firebase';
import admin from 'firebase-admin';

async function main() {
  try {
    initFirebase();
    const db = admin.firestore();
    console.log('Querying collection: clients (limit 5)');
    const snap = await db.collection('clients').limit(5).get();
    console.log(`Found ${snap.size} document(s)`);
    snap.forEach(doc => {
      console.log(doc.id, JSON.stringify(doc.data()));
    });
    process.exit(0);
  } catch (err) {
    console.error('Error checking Firestore:', err);
    process.exit(1);
  }
}

main();
