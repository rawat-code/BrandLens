import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signUpWithEmail } from '@/app/login/actions';

const mockSignUp = vi.fn();
const mockAdminFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signUp: mockSignUp,
    },
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

describe('Auth Sign Up & Provisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates required full name', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('password', 'password123');

    const result = await signUpWithEmail(formData);
    expect(result).toEqual({ error: 'Please enter your full name.' });
  });

  it('validates required email address', async () => {
    const formData = new FormData();
    formData.append('fullName', 'John Doe');
    formData.append('password', 'password123');

    const result = await signUpWithEmail(formData);
    expect(result).toEqual({ error: 'Please enter your email address.' });
  });

  it('validates minimum password length', async () => {
    const formData = new FormData();
    formData.append('fullName', 'John Doe');
    formData.append('email', 'test@example.com');
    formData.append('password', '12345');

    const result = await signUpWithEmail(formData);
    expect(result).toEqual({ error: 'Password must be at least 6 characters.' });
  });

  it('provisions profile when signup creates user with unconfirmed email', async () => {
    const formData = new FormData();
    formData.append('fullName', 'Jane Creator');
    formData.append('email', 'jane@example.com');
    formData.append('password', 'securepass123');
    formData.append('role', 'creator');

    mockSignUp.mockResolvedValue({
      data: {
        user: { id: 'new-user-id', email: 'jane@example.com' },
        session: null,
      },
      error: null,
    });

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    const mockSelect = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockReturnThis();
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'org-123', name: 'Verdant Skin' },
      error: null,
    });

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === 'orgs') {
        return {
          select: mockSelect,
          order: mockOrder,
          limit: mockLimit,
          maybeSingle: mockMaybeSingle,
        };
      }
      if (table === 'profiles') {
        return {
          upsert: mockUpsert,
        };
      }
      return {};
    });

    const result = await signUpWithEmail(formData);

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'jane@example.com',
      password: 'securepass123',
      options: {
        data: { full_name: 'Jane Creator' },
      },
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'new-user-id',
        full_name: 'Jane Creator',
        role: 'creator',
        org_id: 'org-123',
      }),
      { onConflict: 'id' }
    );

    expect(result).toEqual({
      success: true,
      message:
        'Account created. If email verification is enabled, please check your inbox to confirm your address before signing in.',
    });
  });
});

