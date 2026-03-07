import 'dotenv/config';
import admin from 'firebase-admin';
import logger from '../../lib/logger.js';

if (!admin.apps.length) {
  const firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
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

const COLLECTIONS = {
  WHATSAPP_LINKS: 'whatsappLinks',
  PROJECTS: 'projects',
  EXPENSES: 'expenses',
  CATEGORIES: 'categories'
};

export { admin, db, COLLECTIONS };
