import { FirestoreSessionSnapshotAdapter } from './firestore-session-snapshot.adapter';
import { Logger } from '@nestjs/common';
import { SessionCacheMapper } from '../cache/mappers/session-cache.mapper';
import { SessionRestoreMapper } from '../mappers/session.persistence.mapper';
import { SessionEntity } from '../../../application/ports/out/session-snapshot-store.port';
import { RealtimeSession } from '../../../domain/entities/realtime-session.entity';
import { ReservationSession } from '../../../domain/entities/reservation-session.entity';
import { SessionUser } from '../../../domain/value-objects/session-user.vo';
import { SessionReservationType } from '../../../domain/value-objects/session-reservation-type.vo';

// Mock firebase-admin
const mockSet = jest.fn();
const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({
  set: mockSet,
  get: mockGet,
}));
const mockCollection = jest.fn(() => ({
  doc: mockDoc,
}));

jest.mock('firebase-admin', () => ({
  ...jest.requireActual('firebase-admin'),
  firestore: jest.fn(() => ({
    collection: mockCollection,
  })),
}));

// Mock Mappers
jest.mock('../cache/mappers/session-cache.mapper');
jest.mock('../mappers/session.persistence.mapper');

// --- Helper Mock Data ---
const mockUser: SessionUser = {
  memberId: 1,
  email: 'test@test.com',
  name: '테스트유저',
  club: '디veloper',
  enrollmentNumber: '20기',
  role: ['LEAD'],
};

const mockRealtimeSession = RealtimeSession.create({
  participationAvailable: true,
  attendanceList: [],
  creatorName: '실시간세션 생성자',
  creatorId: 1,
});

const mockReservationSession = ReservationSession.create({
  reservationId: 100,
  reservationType: 'COMMON',
  date: '2023-01-01',
  startTime: '10:00',
  endTime: '11:00',
  title: '예약세션 제목',
  participationAvailable: true,
  creatorName: '예약세션 생성자',
  attendanceList: [],
});
// --- End Helper Mock Data ---

describe('FirestoreSessionSnapshotAdapter', () => {
  let adapter: FirestoreSessionSnapshotAdapter;
  let logger: Logger;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock Logger
    logger = new Logger(FirestoreSessionSnapshotAdapter.name);
    jest.spyOn(logger, 'log').mockImplementation(() => {});
    jest.spyOn(logger, 'error').mockImplementation(() => {});
    jest.spyOn(logger, 'warn').mockImplementation(() => {});

    // Instantiate the adapter after mocks are set up
    adapter = new FirestoreSessionSnapshotAdapter();

    // Manually assign the mocked logger instance
    (adapter as any)['logger'] = logger;
  });

  // 1. save 메서드 - Happy Path:
  describe('save 메서드', () => {
    it('유효한 세션 목록을 받아 Firestore에 성공적으로 스냅샷을 저장해야 한다.', async () => {
      const mockSessions: SessionEntity[] = [
        mockRealtimeSession,
        mockReservationSession,
      ];
      const mockSerializedSessions = [{ id: 'snapshot1' }, { id: 'snapshot2' }];

      (SessionCacheMapper.toSnapshot as jest.Mock)
        .mockReturnValueOnce(mockSerializedSessions[0])
        .mockReturnValueOnce(mockSerializedSessions[1]);

      mockSet.mockResolvedValueOnce({});

      await adapter.save(mockSessions);

      expect(mockCollection).toHaveBeenCalledWith('session_snapshots');
      expect(mockDoc).toHaveBeenCalledWith('latest');
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.any(String),
          list: mockSerializedSessions,
        }),
      );
      expect(logger.log).toHaveBeenCalledWith(
        `${mockSessions.length} sessions saved to Firestore snapshot.`,
      );
    });

    // 2. save 메서드 - 빈 세션 목록:
    it('빈 세션 목록을 받을 때 Firestore에 스냅샷을 저장해야 한다.', async () => {
      const mockSessions: SessionEntity[] = [];
      const mockSerializedSessions: any[] = [];

      mockSet.mockResolvedValueOnce({});

      await adapter.save(mockSessions);

      expect(mockCollection).toHaveBeenCalledWith('session_snapshots');
      expect(mockDoc).toHaveBeenCalledWith('latest');
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          date: expect.any(String),
          list: mockSerializedSessions,
        }),
      );
      expect(logger.log).toHaveBeenCalledWith(
        `${mockSessions.length} sessions saved to Firestore snapshot.`,
      );
      expect(SessionCacheMapper.toSnapshot).not.toHaveBeenCalled(); // No sessions to map
    });

    // 3. save 메서드 - Firestore 저장 실패:
    it('Firestore 저장 중 오류 발생 시 예외를 전파하고 오류를 로깅해야 한다.', async () => {
      const mockSessions: SessionEntity[] = [mockRealtimeSession];
      const mockError = new Error('Firestore save failed');
      (SessionCacheMapper.toSnapshot as jest.Mock).mockReturnValueOnce({});
      mockSet.mockRejectedValueOnce(mockError);

      await expect(adapter.save(mockSessions)).rejects.toThrow(mockError);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to save session snapshot to Firestore',
        mockError,
      );
    });
  });

  // 4. load 메서드 - Happy Path:
  describe('load 메서드', () => {
    it('Firestore에서 기존 스냅샷을 성공적으로 불러오고 SessionEntity 배열로 변환해야 한다.', async () => {
      const mockSnapshotData = {
        date: new Date().toISOString(),
        list: [{ id: 'snapshot1' }, { id: 'snapshot2' }],
      };
      const mockRestoredSessions: SessionEntity[] = [
        mockRealtimeSession,
        mockReservationSession,
      ];

      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => mockSnapshotData,
      });
      (SessionRestoreMapper.fromSnapshot as jest.Mock)
        .mockReturnValueOnce(mockRestoredSessions[0])
        .mockReturnValueOnce(mockRestoredSessions[1]);

      const result = await adapter.load();

      expect(mockCollection).toHaveBeenCalledWith('session_snapshots');
      expect(mockDoc).toHaveBeenCalledWith('latest');
      expect(mockGet).toHaveBeenCalled();
      expect(result).toEqual({
        date: mockSnapshotData.date,
        list: mockRestoredSessions,
      });
      expect(logger.log).toHaveBeenCalledWith(
        `Successfully loaded ${mockRestoredSessions.length} sessions from Firestore snapshot dated ${mockSnapshotData.date}.`,
      );
    });

    // 5. load 메서드 - 스냅샷이 존재하지 않을 때:
    it('Firestore에 스냅샷 문서가 존재하지 않을 때 null을 반환하고 경고를 로깅해야 한다.', async () => {
      mockGet.mockResolvedValueOnce({
        exists: false,
        data: () => null,
      });

      const result = await adapter.load();

      expect(mockCollection).toHaveBeenCalledWith('session_snapshots');
      expect(mockDoc).toHaveBeenCalledWith('latest');
      expect(mockGet).toHaveBeenCalled();
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'No session snapshot found in Firestore.',
      );
    });

    // 6. load 메서드 - 유효하지 않은 스냅샷 데이터:
    it('유효하지 않은 스냅샷 데이터가 있을 때 null을 반환하고 경고를 로깅해야 한다.', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          date: new Date().toISOString(),
          // 'list' is missing or invalid
        }),
      });

      const result = await adapter.load();

      expect(mockCollection).toHaveBeenCalledWith('session_snapshots');
      expect(mockDoc).toHaveBeenCalledWith('latest');
      expect(mockGet).toHaveBeenCalled();
      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid session snapshot data in Firestore.',
      );
    });

    // 7. load 메서드 - Firestore 불러오기 실패:
    it('Firestore 불러오기 중 오류 발생 시 예외를 전파하고 오류를 로깅해야 한다.', async () => {
      const mockError = new Error('Firestore load failed');
      mockGet.mockRejectedValueOnce(mockError);

      await expect(adapter.load()).rejects.toThrow(mockError);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to load session snapshot from Firestore',
        mockError,
      );
    });
  });
});
