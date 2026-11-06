import type { UserRole } from '@/lib/types';

const ROLE_STYLES: Record<
  UserRole,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  creator: {
    label: 'Creator',
    bg: 'bg-[#5fd1a0]/10',
    text: 'text-[#5fd1a0]',
    border: 'border-[#5fd1a0]/25',
    dot: 'bg-[#5fd1a0]',
  },
  manager: {
    label: 'Manager',
    bg: 'bg-indigo-500/10',
    text: 'text-[#a5b4fc]',
    border: 'border-indigo-500/25',
    dot: 'bg-indigo-400',
  },
  reviewer: {
    label: 'Reviewer',
    bg: 'bg-violet-500/10',
    text: 'text-[#c084fc]',
    border: 'border-violet-500/25',
    dot: 'bg-violet-400',
  },
  admin: {
    label: 'Admin',
    bg: 'bg-[#f5b74f]/10',
    text: 'text-[#f5b74f]',
    border: 'border-[#f5b74f]/25',
    dot: 'bg-[#f5b74f]',
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
    bg: 'bg-white/5',
    text: 'text-[#a3a3bb]',
    border: 'border-white/10',
    dot: 'bg-[#a3a3bb]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}
