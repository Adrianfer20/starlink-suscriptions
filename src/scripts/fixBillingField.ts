import initFirebase from '../config/firebase';
import admin from 'firebase-admin';

async function main() {
  try {
    initFirebase();
    const db = admin.firestore();
    const snap = await db.collection('clients').where('name','==','Cliente Test Billing').get();
    if (snap.empty) {
      console.log('No matching clients found');
      process.exit(0);
    }
    for (const doc of snap.docs) {
      const d = doc.data();
      const next = d.nextBillingDate || d.next_billing_date;
      if (!next) {
        console.log('Client has no nextBillingDate, skipping:', doc.id);
        continue;
      }
      await doc.ref.update({ billingDate: next });
      console.log('Updated billingDate for client:', doc.id);
    }
    process.exit(0);
  } catch (err) {
    console.error('Error fixing billing field:', err);
    process.exit(1);
  }
}

main();
