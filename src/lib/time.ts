/**
 * Formats timestamps for Redline editorial ledger:
 * Relative time in visible text, exact ISO/UTC string in the title attribute.
 */
export function formatTimestamp(dateInput: string | Date | null | undefined): {
  relative: string;
  exact: string;
} {
  if (!dateInput) {
    return { relative: '—', exact: 'None' };
  }

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return { relative: '—', exact: 'Invalid date' };
  }

  const exact = date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // If in future or less than 1 min
  if (diffMs < 60000) {
    return { relative: 'just now', exact };
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 60) {
    return { relative: `${diffMinutes}m ago`, exact };
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return { relative: `${diffHours}h ago`, exact };
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return { relative: `${diffDays}d ago`, exact };
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return { relative: `${diffMonths}mo ago`, exact };
  }

  return {
    relative: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    exact,
  };
}
