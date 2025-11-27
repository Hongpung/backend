import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { NoticeMemberService } from './notice-member.service';
import { createNotice, type Notice } from '../models/notice.model';
import type { INoticeRepository } from '../repositories/notice.repository.port';

describe('NoticeMemberService (공지 조회)', () => {
  let service: NoticeMemberService;
  let repository: jest.Mocked<INoticeRepository>;

  const fixture = createNotice({
    noticeId: 1,
    title: '제목',
    content: '내용',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    updatedAt: new Date('2025-01-02T00:00:00.000Z'),
  });

  beforeEach(() => {
    repository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new NoticeMemberService(repository);
  });

  it('findAll은 repository.findAll 결과를 반환한다', async () => {
    repository.findAll.mockResolvedValue([fixture]);

    await expect(service.findAll()).resolves.toEqual([fixture]);
  });

  it('findById는 repository.findById 결과를 반환한다', async () => {
    repository.findById.mockResolvedValue(fixture);

    await expect(service.findById(1)).resolves.toBe(fixture);
  });
});
