type koType = '꽹과리' | '징' | '장구' | '북' | '소고' | '기타';
type enType = 'KWANGGWARI' | 'JING' | 'JANGGU' | 'BUK' | 'SOGO' | 'ELSE';
export class InstrumentEnum {

  private EnType: enType[] = ['KWANGGWARI', 'JING', 'JANGGU', 'BUK', 'SOGO', 'ELSE'];
  private KoType: koType[] = ['꽹과리', '징', '장구', '북', '소고', '기타'];

  public EnToKo(findEn: string): koType {
    const EnIndex = this.EnType.findIndex((en) => en == findEn);
    return this.KoType[EnIndex]
  }

  public KoToEn(findKo: string): enType {
    const KoIndex = this.KoType.findIndex((ko) => ko == findKo);
    return this.EnType[KoIndex]
  }
}