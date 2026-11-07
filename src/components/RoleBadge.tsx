import type { UserRole } from '@/lib/types';

const ROLE_STYLES: Record<
  UserRole,
  { label: string; bg: string; text: string; border: string }
> = {
  creator: {
    label: 'Creator',
    bg: 'bg-[#fffdf8]',
    text: 'text-[#1f6b3a]',
    border: 'border-[#1f6b3a]',
  },
  manager: {
    label: 'Manager',
    bg: 'bg-[#fffdf8]',
    text: 'text-[#1f1c18]',
    border: 'border-[#1f1c18]',
  },
  reviewer: {
    label: 'Reviewer',
    bg: 'bg-[#fffdf8]',
    text: 'text-[#1d4f9c]',
    border: 'border-[#1d4f9c]',
  },
  admin: {
    label: 'Admin',
    bg: 'bg-[#f6e3b4]',
    text: 'text-[#8a5a00]',
    border: 'border-[#8a5a00]',
  },
};

export function RoleBadge({
  role,
  className = '',
}: {
  role: UserRole;
  className?: string;
}) {
  const config = ROLE_STYLES[role] || {
    label: role,
    bg: 'bg-[#fffdf8]',
    text: 'text-[#5e574c]',
    border: 'border-[#ddd5c4]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-none font-mono text-[11px] font-medium tracking-[0.04em] uppercase border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className="w-1.5 h-1.5 bg-current shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}
