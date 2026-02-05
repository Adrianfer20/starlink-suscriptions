import initFirebase from '../config/firebase';
import admin from 'firebase-admin';

async function main() {
  try {
    initFirebase();
    const db = admin.firestore();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const payload = {
      name: 'Cliente Test Billing',
      phone: '+584161005606',
      status: 'ACTIVO',
      plan: 'starlink-basic',
      nextBillingDate: yesterday,
      dueDate: null,
      createdAt: new Date().toISOString(),
    };
    const ref = await db.collection('clients').add(payload);
    console.log('Created test client id:', ref.id);
    process.exit(0);
  } catch (err) {
    console.error('Error creating test client:', err);
    process.exit(1);
  }
}

main();
