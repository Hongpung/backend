import { describe, expect, it } from '@jest/globals';
import { SessionEventSnapshotMapper } from './session-event-snapshot.mapper';

describe('SessionEventSnapshotMapper', () => {
  it('maps reserved session json to persistence snapshot', () => {
    const snapshot = SessionEventSnapshotMapper.toSnapshot({
      session: {
        sessionId: 'session-1',
        reservationId: 12,
        reservationType: 'REGULAR',
        date: '2026-04-20',
        sessionType: 'RESERVED',
        title: 'Weekly Practice',
        startTime: '09:00',
        endTime: '10:00',
        extendCount: 2,
        creatorId: 1,
        creatorName: 'Hong',
        creatorNickname: 'hp',
        participationAvailable: true,
        status: 'AFTER',
        participators: [],
        participatorIds: [],
        borrowInstruments: [
          {
            instrumentId: 3,
            name: 'Guitar',
            instrumentType: 'STRING',
            club: 'club',
            borrowAvailable: true,
          },
        ],
        attendanceList: [],
      } as any,
      returnImageUrl: ['https://cdn.test/image.png'],
      forceEnd: false,
    });

    expect(snapshot.reservationId).toBe(12);
    expect(snapshot.reservationType).toBe('REGULAR');
    expect(snapshot.returnImageUrl).toEqual(['https://cdn.test/image.png']);
    expect(snapshot.borrowInstruments).toHaveLength(1);
    expect(snapshot.date).toBeInstanceOf(Date);
    expect(snapshot.startTime).toBeInstanceOf(Date);
    expect(snapshot.endTime).toBeInstanceOf(Date);
  });
});
