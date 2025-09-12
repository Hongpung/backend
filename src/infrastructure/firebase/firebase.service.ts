import { Injectable, Inject } from '@nestjs/common';
import { collection, getDocs, Firestore, addDoc } from 'firebase/firestore';

@Injectable()
export class FirebaseService {
  constructor(@Inject('FIREBASE') private readonly firestore: Firestore) {}

  private batchCollection = collection(this.firestore, 'BatchLogs');

  async createBatchLog(data: Record<string, any>) {
    await addDoc(this.batchCollection, data);
    return { message: '로그가 생성되었어요.' };
  }

  async getBatchLog() {
    const querySnapshot = await getDocs(this.batchCollection);
    const logs = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return logs;
  }
}
