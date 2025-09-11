/**
 * METRICS_ALLOWED_CIDRS 파싱 및 클라이언트 IP 허용 여부.
 * - 항목 예: `127.0.0.1`, `172.16.0.0/12`, `::1` (정확 일치만; IPv6 CIDR 미지원)
 */
export function parseMetricsAllowedCidrs(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function ipv4ToUint(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) throw new Error('invalid ipv4');
  let n = 0;
  for (const p of parts) {
    const octet = Number(p);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) {
      throw new Error('invalid ipv4');
    }
    n = (n << 8) + octet;
  }
  return n >>> 0;
}

function ipv4InCidr(ip: string, cidr: string): boolean {
  const [base, bitsStr] = cidr.split('/');
  const bits = Number(bitsStr ?? '32');
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  try {
    const ipNum = ipv4ToUint(ip);
    const baseNum = ipv4ToUint(base);
    if (bits === 0) return true;
    const mask = (0xffffffff << (32 - bits)) >>> 0;
    return (ipNum & mask) === (baseNum & mask);
  } catch {
    return false;
  }
}

/** 단일 주소는 정확 일치, IPv4 + `/prefix` 는 CIDR 매칭 */
export function isMetricsClientIpAllowed(
  clientIp: string,
  allowEntries: string[],
): boolean {
  if (!clientIp || allowEntries.length === 0) return false;

  for (const entry of allowEntries) {
    if (entry.includes('/')) {
      const [network] = entry.split('/');
      const looksV4 =
        /^\d{1,3}(\.\d{1,3}){3}$/.test(network) ||
        /^\d{1,3}(\.\d{1,3}){3}$/.test(clientIp);
      if (looksV4 && ipv4InCidr(clientIp, entry)) {
        return true;
      }
      continue;
    }
    if (clientIp === entry) {
      return true;
    }
  }
  return false;
}
