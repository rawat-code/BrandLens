import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/health/route';

describe('Health API Route', () => {
  it('returns status ok with timestamp and service name', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.service).toBe('BrandLens Governance Engine');
    expect(typeof data.timestamp).toBe('string');
  });
});
