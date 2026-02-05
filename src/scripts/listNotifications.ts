import initFirebase from '../config/firebase';
import admin from 'firebase-admin';

async function main() {
  try {
    initFirebase();
    const db = admin.firestore();
    console.log('Querying collection: notifications (limit 20)');
    const snap = await db.collection('notifications').orderBy('createdAt','desc').limit(20).get();
    console.log(`Found ${snap.size} document(s)`);
    snap.forEach(doc => {
      const data = doc.data();
      console.log('---');
      console.log('id:', doc.id);
      try {
        console.log(JSON.stringify(data, null, 2));
      } catch (e) {
        console.log(data);
      }
    });
    process.exit(0);
  } catch (err) {
    console.error('Error listing notifications:', err);
    process.exit(1);
  }
}

main();
