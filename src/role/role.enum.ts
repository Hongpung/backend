type koRole = '패짱' | '상쇠' | '상장구' | '수북' | '수법고';
type enRole = 'LEADER' | 'SANGSOE' | 'SANGJANGGU' | 'SUBUK' | 'SUBUGGU';

export class RoleEnum {

    private EnRole: enRole[] = ['LEADER', 'SANGSOE', 'SANGJANGGU', 'SUBUK', 'SUBUGGU'];
    private KoRole: koRole[] = ['패짱', '상쇠', '상장구', '수북', '수법고'];

    public EnToKo(findEn: string): koRole {
        const EnIndex = this.EnRole.findIndex((en) => en == findEn);
        return this.KoRole[EnIndex]
    }

    public KoToEn(findKo: string): enRole {
        const KoIndex = this.KoRole.findIndex((ko) => ko == findKo);
        return this.EnRole[KoIndex]
    }
}