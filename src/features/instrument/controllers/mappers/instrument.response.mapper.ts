import { InstrumentEnum } from '../../models/instrument-enum';
import type { Instrument } from '../../models/instrument.model';
import {
  CreateInstrumentResDto,
  DeleteInstrumentResDto,
  InstrumentDetailResDto,
  InstrumentResDto,
  UpdateInstrumentResDto,
} from '../../dto/response';

export class InstrumentResponseMapper {
  static toInstrumentResDto(instrument: Instrument): InstrumentResDto {
    return {
      instrumentId: instrument.instrumentId,
      name: instrument.name,
      instrumentType: InstrumentEnum.EnToKo(instrument.instrumentType),
      imageUrl: instrument.imageUrl,
      borrowAvailable: instrument.borrowAvailable,
      club: instrument.club.clubName,
    };
  }

  static toInstrumentDetailResDto(
    instrument: Instrument,
  ): InstrumentDetailResDto {
    return {
      instrumentId: instrument.instrumentId,
      imageUrl: instrument.imageUrl,
      name: instrument.name,
      instrumentType: InstrumentEnum.EnToKo(instrument.instrumentType),
      club: instrument.club.clubName,
      borrowAvailable: instrument.borrowAvailable,
      borrowHistory: instrument.borrowHistory,
    };
  }

  static toCreateInstrumentResDto(
    instrument: Instrument,
    message = '악기 생성이 완료되었습니다.',
  ): CreateInstrumentResDto {
    return {
      ...this.toInstrumentResDto(instrument),
      message,
    };
  }

  static toUpdateInstrumentResDto(
    instrument: Instrument,
    message = '악기 수정이 완료되었습니다.',
  ): UpdateInstrumentResDto {
    return {
      ...this.toInstrumentResDto(instrument),
      message,
    };
  }

  static toDeleteInstrumentResDto(
    message = '악기 삭제가 완료되었습니다.',
  ): DeleteInstrumentResDto {
    return { message };
  }
}
