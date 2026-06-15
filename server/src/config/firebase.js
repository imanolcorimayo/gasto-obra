import 'dotenv/config';
import admin from 'firebase-admin';
import logger from '../../lib/logger.js';

if (!admin.apps.length) {
  const firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
  };

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString()
    );
    firebaseConfig.credential = admin.credential.cert(serviceAccount);
  }

  admin.initializeApp(firebaseConfig);
  logger.info('Firebase initialized successfully');
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

const COLLECTIONS = {
  WHATSAPP_LINKS: 'whatsappLinks',
  PROVIDERS: 'providers',
  PROJECTS: 'projects',
  EXPENSES: 'expenses',
  CATEGORIES: 'categories',
  RECIPIENTS: 'recipients',
  VENDORS: 'vendors',
  PROJECT_ITEMS: 'projectItems',
  PROJECT_MATERIALS: 'projectMaterials',
  PROJECT_MATERIAL_PROPOSALS: 'projectMaterialProposals',
  FAQ: 'faq',
  SUPPORT_QUERIES: 'supportQueries',
  DEMO_SUBMISSIONS: 'demoSubmissions'
};

export { admin, db, bucket, COLLECTIONS };
