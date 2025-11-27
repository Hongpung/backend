import {
  isMetricsClientIpAllowed,
  parseMetricsAllowedCidrs,
} from './metrics-ip-allowlist.util';

describe('metrics-ip-allowlist.util', () => {
  describe('parseMetricsAllowedCidrs', () => {
    it('trims and splits comma list', () => {
      expect(parseMetricsAllowedCidrs(' 127.0.0.1 , 172.16.0.0/12 ')).toEqual([
        '127.0.0.1',
        '172.16.0.0/12',
      ]);
    });

    it('returns empty for undefined or blank', () => {
      expect(parseMetricsAllowedCidrs(undefined)).toEqual([]);
      expect(parseMetricsAllowedCidrs('  ')).toEqual([]);
    });
  });

  describe('isMetricsClientIpAllowed', () => {
    it('matches exact IPv4', () => {
      expect(
        isMetricsClientIpAllowed('127.0.0.1', ['127.0.0.1', '10.0.0.1']),
      ).toBe(true);
    });

    it('matches IPv4 CIDR (docker bridge range)', () => {
      expect(isMetricsClientIpAllowed('172.18.0.5', ['172.16.0.0/12'])).toBe(
        true,
      );
      expect(isMetricsClientIpAllowed('172.32.0.1', ['172.16.0.0/12'])).toBe(
        false,
      );
    });

    it('matches exact IPv6', () => {
      expect(isMetricsClientIpAllowed('::1', ['::1'])).toBe(true);
    });
  });
});
