export function toDomainOrNull<TData, TDomain>(
  data: TData | null,
  toDomain: (data: TData) => TDomain,
): TDomain | null {
  if (!data) return null;
  return toDomain(data);
}
