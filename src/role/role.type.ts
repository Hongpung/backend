export const ROLE_MAP = {
  LEADER: '패짱',
  SANGSOE: '상쇠',
  SANGJANGGU: '상장구',
  SUBUK: '수북',
  SUBUGGU: '수법고',
} as const;

export type EnRole = keyof typeof ROLE_MAP;
export type KoRole = (typeof ROLE_MAP)[EnRole];
