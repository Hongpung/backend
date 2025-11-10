import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import {
  assertMonthNumber,
  assertPositiveInteger,
} from './session-log-query.validator';

describe('session-log-query.validator', () => {
  describe('assertPositiveInteger', () => {
    it('양의 정수는 통과한다', () => {
      expect(() => assertPositiveInteger(1, 'x')).not.toThrow();
    });

    it('0이면 BadRequestException', () => {
      expect(() => assertPositiveInteger(0, 'year')).toThrow(
        BadRequestException,
      );
    });

    it('음수면 BadRequestException', () => {
      expect(() => assertPositiveInteger(-1, 'memberId')).toThrow(
        BadRequestException,
      );
    });

    it('정수가 아니면 BadRequestException', () => {
      expect(() => assertPositiveInteger(1.5, 'id')).toThrow(
        BadRequestException,
      );
      expect(() => assertPositiveInteger(NaN, 'id')).toThrow(
        BadRequestException,
      );
    });

    it('문자열이면 BadRequestException', () => {
      expect(() =>
        assertPositiveInteger('1' as unknown as number, 'id'),
      ).toThrow(BadRequestException);
    });
  });

  describe('assertMonthNumber', () => {
    it('1~12는 통과한다', () => {
      expect(() => assertMonthNumber(1)).not.toThrow();
      expect(() => assertMonthNumber(12)).not.toThrow();
    });

    it('0이면 BadRequestException', () => {
      expect(() => assertMonthNumber(0)).toThrow(BadRequestException);
    });

    it('13이면 BadRequestException', () => {
      expect(() => assertMonthNumber(13)).toThrow(BadRequestException);
    });
  });
});
