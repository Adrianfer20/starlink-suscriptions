import initFirebase from '../config/firebase';
import { processBilling } from '../cron/billing.cron';

async function main() {
  try {
    initFirebase();
    console.log('Running processBilling()...');
    await processBilling();
    console.log('processBilling finished');
    process.exit(0);
  } catch (err) {
    console.error('Error running billing:', err);
    process.exit(1);
  }
}

main();
