import initFirebase from '../config/firebase';
import admin from 'firebase-admin';

async function main() {
  try {
    initFirebase();
    const db = admin.firestore();
    console.log('Querying collection: clients (limit 50)');
    const snap = await db.collection('clients').limit(50).get();
    console.log(`Found ${snap.size} document(s)`);
    snap.forEach(doc => {
      const d = doc.data();
      const out = {
        id: doc.id,
        name: d.name,
        phone: d.phone,
        status: d.status,
        plan: d.plan,
        nextBillingDate: d.nextBillingDate || d.next_billing_date || null,
        dueDate: d.dueDate || d.due_date || null,
        createdAt: d.createdAt || null,
      };
      console.log('---');
      console.log(JSON.stringify(out, null, 2));
    });
    process.exit(0);
  } catch (err) {
    console.error('Error listing clients:', err);
    process.exit(1);
  }
}

main();
