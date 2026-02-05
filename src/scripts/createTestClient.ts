import initFirebase from '../config/firebase';
import admin from 'firebase-admin';

async function main() {
  try {
    initFirebase();
    const db = admin.firestore();
    const billingDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const payload = {
      name: 'Test Client',
      email: 'test@example.com',
      phone: '+584223552627',
      billingDate,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    const ref = await db.collection('clients').add(payload);
    console.log('Created client id:', ref.id);
    process.exit(0);
  } catch (err) {
    console.error('Error creating test client:', err);
    process.exit(1);
  }
}

main();
