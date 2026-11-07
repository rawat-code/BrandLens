import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in — BrandLens',
  description: 'Sign in to access your BrandLens workspace.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
