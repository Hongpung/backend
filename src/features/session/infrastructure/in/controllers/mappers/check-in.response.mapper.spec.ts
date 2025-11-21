import { describe, expect, it } from '@jest/globals';
import { CheckInResponseMapper } from './check-in.response.mapper';

describe('CheckInResponseMapper', () => {
  it('passes through UNAVAILABLE check-in state', () => {
    const result = CheckInResponseMapper.toSessionStateResDto({
      status: 'UNAVAILABLE',
      errorMessage: '이미 참여 중인 연습이에요.',
    });

    expect(result).toEqual({
      status: 'UNAVAILABLE',
      errorMessage: '이미 참여 중인 연습이에요.',
    });
  });

  it('maps CREATABLE state with null next reservation', () => {
    const result = CheckInResponseMapper.toSessionStateResDto({
      status: 'CREATABLE',
      nextReservationSession: null,
    });

    expect(result).toEqual({
      status: 'CREATABLE',
      nextReservationSession: null,
    });
  });
});
