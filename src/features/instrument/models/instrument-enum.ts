import type { EnInstrumentType, KoInstrumentType } from './instrument.model';

export class InstrumentEnum {
  private static readonly EN_TYPE: EnInstrumentType[] = [
    'KWANGGWARI',
    'JING',
    'JANGGU',
    'BUK',
    'SOGO',
    'ELSE',
  ];
  private static readonly KO_TYPE: KoInstrumentType[] = [
    '꽹과리',
    '징',
    '장구',
    '북',
    '소고',
    '기타',
  ];

  static EnToKo(findEn: string): KoInstrumentType {
    const enIndex = this.EN_TYPE.findIndex((en) => en === findEn);
    return this.KO_TYPE[enIndex];
  }

  static KoToEn(findKo: string): EnInstrumentType {
    const koIndex = this.KO_TYPE.findIndex((ko) => ko === findKo);
    return this.EN_TYPE[koIndex];
  }
}
