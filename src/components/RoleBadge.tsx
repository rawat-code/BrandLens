import type { UserRole } from '@/lib/types';

const ROLE_STYLES: Record<UserRole, { label: string; className: string }> = {
  creator: {
    label: 'Creator',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  manager: {
    label: 'Manager',
    className: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  reviewer: {
    label: 'Reviewer',
    className: 'bg-purple-100 text-purple-800 border-purple-300',
  },
  admin: {
    label: 'Admin',
    className: 'bg-amber-100 text-amber-800 border-amber-300',
  },
};

export function RoleBadge({ role, className = '' }: { role: UserRole; className?: string }) {
  const config = ROLE_STYLES[role] || {
    label: role,
    className: 'bg-slate-100 text-slate-800 border-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}

