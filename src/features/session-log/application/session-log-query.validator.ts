import { BadRequestException } from '@nestjs/common';

export function assertPositiveInteger(value: unknown, fieldName: string): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new BadRequestException(`${fieldName} 값이 올바르지 않아요.`);
  }
}

export function assertMonthNumber(value: unknown): void {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 12
  ) {
    throw new BadRequestException('month 값이 올바르지 않아요.');
  }
}
