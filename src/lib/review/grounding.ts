/**
 * Grounding & Source Freshness Utilities
 * Pure TypeScript implementation with zero external dependencies,
 * safe for both server and browser runtimes.
 */

// Pure synchronous SHA-256 implementation
function sha256Sync(ascii: string): string {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i = 0;
  let j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let compositeClearHex = '';
  for (let idx = 0; idx < ascii[lengthProperty]; idx++) {
    const code = ascii.charCodeAt(idx);
    words[idx >> 2] |= (code & 0xff) << (24 - (idx % 4) * 8);
  }

  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (let blockIdx = 0; blockIdx < words[lengthProperty]; blockIdx += 16) {
    const w = words.slice(blockIdx, blockIdx + 16);
    const oldHash = [...hash];

    for (let wordIdx = 0; wordIdx < 64; wordIdx++) {
      if (wordIdx >= 16) {
        const s0 =
          ((w[wordIdx - 15] >>> 7) | (w[wordIdx - 15] << 25)) ^
          ((w[wordIdx - 15] >>> 18) | (w[wordIdx - 15] << 14)) ^
          (w[wordIdx - 15] >>> 3);
        const s1 =
          ((w[wordIdx - 2] >>> 17) | (w[wordIdx - 2] << 15)) ^
          ((w[wordIdx - 2] >>> 19) | (w[wordIdx - 2] << 13)) ^
          (w[wordIdx - 2] >>> 10);
        w[wordIdx] = (((w[wordIdx - 16] + s0) | 0) + ((w[wordIdx - 7] + s1) | 0)) | 0;
      }

      const S1 =
        ((hash[4] >>> 6) | (hash[4] << 26)) ^
        ((hash[4] >>> 11) | (hash[4] << 21)) ^
        ((hash[4] >>> 25) | (hash[4] << 7));
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = ((((hash[7] + S1) | 0) + ((ch + k[wordIdx]) | 0)) | 0) + (w[wordIdx] | 0);
      const S0 =
        ((hash[0] >>> 2) | (hash[0] << 30)) ^
        ((hash[0] >>> 13) | (hash[0] << 19)) ^
        ((hash[0] >>> 22) | (hash[0] << 10));
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (S0 + maj) | 0;

      hash = [
        (temp1 + temp2) | 0,
        hash[0],
        hash[1],
        hash[2],
        (hash[3] + temp1) | 0,
        hash[4],
        hash[5],
        hash[6],
      ];
    }

    for (let hIdx = 0; hIdx < 8; hIdx++) {
      hash[hIdx] = (hash[hIdx] + oldHash[hIdx]) | 0;
    }
  }

  for (let hIdx = 0; hIdx < 8; hIdx++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[hIdx] >> (b * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }

  return result;
}

/**
 * Computes deterministic SHA-256 hash for a library source text.
 */
export function computeSourceHash(text: string | null | undefined): string {
  if (!text) return '';
  return sha256Sync(text.trim());
}

export type FreshnessStatus = 'fresh' | 'stale' | 'deleted' | 'unknown';

/**
 * Evaluates whether a finding's cited source is fresh, stale, or deleted.
 */
export function checkSourceFreshness(params: {
  sourceId: string | null | undefined;
  findingSourceHash: string | null | undefined;
  currentSourceText: string | null | undefined;
  sourceExists: boolean;
}): FreshnessStatus {
  if (!params.sourceId || !params.findingSourceHash) {
    return 'unknown';
  }

  if (!params.sourceExists || params.currentSourceText === undefined || params.currentSourceText === null) {
    return 'deleted';
  }

  const currentHash = computeSourceHash(params.currentSourceText);
  if (currentHash === params.findingSourceHash) {
    return 'fresh';
  }

  return 'stale';
}

export interface CitationMetrics {
  citations_total: number;
  citations_verified: number;
  citations_downgraded: number;
}

/**
 * Aggregates grounding citation metrics from findings.
 */
export function aggregateCitationMetrics(
  findings: Array<{
    source_id?: string | null;
    quote_verified?: boolean;
    needs_human_check?: boolean;
  }>
): CitationMetrics {
  let citations_total = 0;
  let citations_verified = 0;
  let citations_downgraded = 0;

  for (const f of findings) {
    if (f.quote_verified) {
      citations_total++;
      citations_verified++;
    } else if (f.needs_human_check) {
      citations_total++;
      citations_downgraded++;
    } else if (f.source_id) {
      citations_total++;
    }
  }

  return {
    citations_total,
    citations_verified,
    citations_downgraded,
  };
}
