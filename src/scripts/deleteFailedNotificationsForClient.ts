import initFirebase from '../config/firebase';

async function main() {
  try {
    initFirebase();
    const db = (await import('firebase-admin')).default.firestore();
    const clientId = 'Mzbq26LzRdn5xshZRe9s'; // test client
    console.log('Deleting FAILED notifications for client:', clientId);
    const snap = await db.collection('notifications').where('clientId','==',clientId).where('status','==','FAILED').get();
    if (snap.empty) {
      console.log('No FAILED notifications found');
      process.exit(0);
    }
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    console.log('Deleted', snap.size, 'documents');
    process.exit(0);
  } catch (err) {
    console.error('Error deleting notifications:', err);
    process.exit(1);
  }
}

main();
