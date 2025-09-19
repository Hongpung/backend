import type {
  CreateInstrumentParams,
  UpdateInstrumentParams,
} from '../../models/instrument.commands';
import { InstrumentEnum } from '../../models/instrument-enum';
import type { CreateInstrumentReqDto } from '../../dto/request/create-instrument.req.dto';
import type { UpdateInstrumentReqDto } from '../../dto/request/update-instrument.req.dto';

export class InstrumentRequestMapper {
  static toCreateParams(dto: CreateInstrumentReqDto): CreateInstrumentParams {
    return {
      name: dto.name,
      instrumentType: InstrumentEnum.KoToEn(dto.instrumentType),
      imageUrl: dto.imageUrl ?? null,
    };
  }

  static toUpdateParams(dto: UpdateInstrumentReqDto): UpdateInstrumentParams {
    return {
      name: dto.name,
      instrumentType: dto.instrumentType
        ? InstrumentEnum.KoToEn(dto.instrumentType)
        : undefined,
      imageUrl: dto.imageUrl,
      borrowAvailable: dto.borrowAvailable,
    };
  }
}
