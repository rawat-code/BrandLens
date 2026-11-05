export interface DiffChange {
  type: 'equal' | 'insert' | 'delete';
  value: string;
}

/**
 * Computes word-level diff between two texts without any external dependencies.
 * Uses a classic Longest Common Subsequence (LCS) dynamic programming algorithm.
 */
export function computeWordDiff(oldText: string, newText: string): DiffChange[] {
  if (!oldText && !newText) {
    return [];
  }
  if (oldText === newText) {
    return [{ type: 'equal', value: newText }];
  }

  // Split into words while preserving whitespace/punctuation tokens
  const tokenize = (text: string): string[] => {
    return text.match(/\S+|\s+/g) || [];
  };

  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);

  const m = oldTokens.length;
  const n = newTokens.length;

  if (m === 0 && n === 0) {
    return [];
  }
  if (m === 0) {
    return [{ type: 'insert', value: newText }];
  }
  if (n === 0) {
    return [{ type: 'delete', value: oldText }];
  }

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldTokens[i - 1] === newTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff changes
  let i = m;
  let j = n;
  const rawChanges: DiffChange[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      rawChanges.push({ type: 'equal', value: oldTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawChanges.push({ type: 'insert', value: newTokens[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawChanges.push({ type: 'delete', value: oldTokens[i - 1] });
      i--;
    }
  }

  rawChanges.reverse();

  // Consolidate adjacent changes of the same type
  const consolidated: DiffChange[] = [];
  for (const change of rawChanges) {
    if (consolidated.length > 0 && consolidated[consolidated.length - 1].type === change.type) {
      consolidated[consolidated.length - 1].value += change.value;
    } else {
      consolidated.push({ ...change });
    }
  }

  return consolidated;
}
