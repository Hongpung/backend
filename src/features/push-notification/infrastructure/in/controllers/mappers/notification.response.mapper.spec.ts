import { describe, expect, it } from '@jest/globals';
import { AppKstDateTime } from 'src/common/time-format/app-kst-datetime';
import { NotificationEntity } from '../../../../domain/notification.entity';
import { NotificationResponseMapper } from './notification.response.mapper';

describe('NotificationResponseMapper', () => {
  const fixedDate = new Date('2024-06-01T12:00:00.000Z');

  it('NotificationEntity를 응답 DTO 필드(ownerId→memberId)로 변환한다', () => {
    const entity = NotificationEntity.create({
      notificationId: 7,
      memberId: 99,
      timestamp: fixedDate,
      isRead: false,
      data: { title: '안내', body: '내용' },
    });

    expect(NotificationResponseMapper.toResponseDto(entity)).toEqual({
      notificationId: 7,
      memberId: 99,
      timestamp: AppKstDateTime.dateTimeFormmatForClient(fixedDate),
      isRead: false,
      data: { title: '안내', body: '내용' },
    });
  });

  it('entityArrayToResponseDtoArray는 각 엔티티에 toResponseDto를 적용한다', () => {
    const entities = [
      NotificationEntity.create({
        notificationId: 1,
        memberId: 1,
        data: { a: 1 },
      }),
      NotificationEntity.create({
        notificationId: 2,
        memberId: 2,
        data: { b: 2 },
      }),
    ];

    const dtos =
      NotificationResponseMapper.entityArrayToResponseDtoArray(entities);
    expect(dtos).toHaveLength(2);
    expect(dtos[0].notificationId).toBe(1);
    expect(dtos[0].memberId).toBe(1);
    expect(dtos[1].notificationId).toBe(2);
    expect(dtos[1].memberId).toBe(2);
  });
});
