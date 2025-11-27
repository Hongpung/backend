import { describe, expect, it } from '@jest/globals';
import type { CreateInstrumentReqDto } from '../../dto/request/create-instrument.req.dto';
import type { UpdateInstrumentReqDto } from '../../dto/request/update-instrument.req.dto';
import { InstrumentRequestMapper } from './instrument.request.mapper';

describe('InstrumentRequestMapper', () => {
  it('toCreateParams는 한글 타입을 영문 enum으로 변환하고 imageUrl 없으면 null이다', () => {
    const dto: CreateInstrumentReqDto = {
      name: '장구 A',
      instrumentType: '장구',
    };
    expect(InstrumentRequestMapper.toCreateParams(dto)).toEqual({
      name: '장구 A',
      instrumentType: 'JANGGU',
      imageUrl: null,
    });
  });

  it('toCreateParams는 imageUrl이 있으면 그대로 둔다', () => {
    const dto: CreateInstrumentReqDto = {
      name: '징',
      instrumentType: '징',
      imageUrl: 'https://example.com/z.jpg',
    };
    expect(InstrumentRequestMapper.toCreateParams(dto)).toEqual({
      name: '징',
      instrumentType: 'JING',
      imageUrl: 'https://example.com/z.jpg',
    });
  });

  it('toUpdateParams는 instrumentType 생략 시 undefined이다', () => {
    const dto: UpdateInstrumentReqDto = { name: '이름만' };
    expect(InstrumentRequestMapper.toUpdateParams(dto)).toEqual({
      name: '이름만',
      instrumentType: undefined,
      imageUrl: undefined,
      borrowAvailable: undefined,
    });
  });

  it('toUpdateParams는 한글 타입과 borrowAvailable을 반영한다', () => {
    const dto: UpdateInstrumentReqDto = {
      instrumentType: '소고',
      borrowAvailable: false,
    };
    expect(InstrumentRequestMapper.toUpdateParams(dto)).toEqual({
      name: undefined,
      instrumentType: 'SOGO',
      imageUrl: undefined,
      borrowAvailable: false,
    });
  });
});
