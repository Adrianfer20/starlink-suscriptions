import initFirebase from '../config/firebase';

async function main() {
  try {
    initFirebase();
    const db = (await import('firebase-admin')).default.firestore();
    const clientId = 'Mzbq26LzRdn5xshZRe9s';
    const update = {
      nombre: 'Cliente Test Billing',
      telefono: '+584161005606',
      nombreCompleto: 'Cliente Test Billing'
    };
    const ref = db.collection('clients').doc(clientId);
    await ref.update(update);
    console.log('Updated client', clientId);
    process.exit(0);
  } catch (err) {
    console.error('Error updating client:', err);
    process.exit(1);
  }
}

main();
