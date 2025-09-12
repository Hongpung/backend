import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const resolved = path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      ? process.env.GOOGLE_APPLICATION_CREDENTIALS
      : path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const serviceAccountString = Buffer.from(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64,
    'base64',
  ).toString('utf-8');

  if (!serviceAccountString) {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64 or GOOGLE_APPLICATION_CREDENTIALS env var is not set.',
    );
  }

  const serviceAccount = JSON.parse(serviceAccountString);

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
};

export const AdminFirestoreProvider = {
  provide: 'ADMIN_FIRESTORE',
  useFactory: () => {
    initializeFirebaseAdmin();
    return admin.firestore();
  },
};
