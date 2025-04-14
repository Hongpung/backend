import { Global, Module } from '@nestjs/common';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';


@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE',
      useFactory: () => {
        const firebaseConfig = {
          apiKey: process.env.FIREBASE_KEY,
          authDomain: process.env.FIREBASE_AUTH_DOMAIN,
          projectId: process.env.FIREBASE_PROJECT_ID,
          databaseURL: process.env.FIREBASE_DB_URL,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.FIREBASE_MASSEGING_SENDER_ID,
          appId: process.env.FIREBASE_APP_ID,
          measurementId: process.env.FIREBASE_MESUREMENT_ID
        };
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        return db;
      },
    },
  ],
  exports: ['FIREBASE'],
})
export class FirebaseModule { }