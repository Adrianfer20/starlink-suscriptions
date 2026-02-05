import initFirebase from '../config/firebase';
import admin from 'firebase-admin';
import { normalizeClientForTemplates } from '../modules/notifications/client.normalizer';

async function main() {
  try {
    initFirebase();
    const db = admin.firestore();
    const col = db.collection('clients');
    console.log('Scanning clients for missing fields...');
    const snap = await col.get();
    console.log(`Found ${snap.size} clients`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    const batchSize = 500;
    let batch = db.batch();
    let opCount = 0;

    for (const doc of snap.docs) {
      try {
        const data = doc.data();
        const normalized = normalizeClientForTemplates(data as Record<string, any>);
        const toUpdate: Record<string, any> = {
          id: data.id || doc.id,
          name: normalized.name || null,
          lastName: normalized.lastName || null,
          email: normalized.email || null,
          phone: normalized.phone || null,
          idNumber: normalized.idNumber || null,
          billingDate: normalized.billingDate || null,
          plan: normalized.plan || null,
          amount: normalized.amount || null,
          balance: normalized.balance || null,
          status: data.status || null,
          createdAt: data.createdAt || null,
          updatedAt: new Date().toISOString(),
        };

        // Also remove legacy spanish keys if present
        const deletes: Record<string, any> = {};
        const f = (await import('firebase-admin')).default.firestore.FieldValue;
        if (data.nombre !== undefined) deletes['nombre'] = f.delete();
        if (data.apellido !== undefined) deletes['apellido'] = f.delete();
        if (data.telefono !== undefined) deletes['telefono'] = f.delete();
        if (data.cedula !== undefined) deletes['cedula'] = f.delete();

        // Merge canonical fields and delete legacy keys in one write
        const writePayload = { ...toUpdate, ...deletes };
        batch = batch.set(doc.ref, writePayload, { merge: true });
        opCount++;
        updated++;

        if (opCount >= batchSize) {
          await batch.commit();
          batch = db.batch();
          opCount = 0;
        }
      } catch (err) {
        console.error('Error processing client', doc.id, err);
        errors++;
      }
    }

    if (opCount > 0) await batch.commit();

    console.log(`Backfill completed. updated=${updated}, skipped=${skipped}, errors=${errors}`);
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed', err);
    process.exit(1);
  }
}

main();
