import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create account — BrandLens',
  description: 'Create an account to access your BrandLens governance workspace.',
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
