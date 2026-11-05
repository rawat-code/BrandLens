// src/lib/workflow.ts
/**
 * Workflow transition checker.
 * Implements the rules from AGENTS.md.
 */
import { Role } from "./types";

type State = "draft" | "ai_reviewed" | "needs_changes" | "in_review" | "approved" | "rejected" | "published";

type Context = {
  // Whether there are any open high‑severity findings that require reviewer
  hasOpenHighSeverityRequiringReviewer: boolean;
  // Whether the content belongs to the caller (used for creator self‑approval rule)
  isOwnContent: boolean;
};

/**
 * Determines if a role can transition from one state to another.
 */
export function canTransition(
  role: Role,
  from: State,
  to: State,
  ctx: Context
): boolean {
  // Basic role permissions
  const isCreator = role === "creator";
  const isManager = role === "manager";
  const isReviewer = role === "reviewer";
  const isAdmin = role === "admin";

  // Helper for manager/reviewer actions that require a comment (handled at UI level)

  // Transition matrix
  // Draft → ai_reviewed (creator runs review)
  if (from === "draft" && to === "ai_reviewed") {
    return isCreator || isManager || isAdmin;
  }
  // ai_reviewed → in_review (creator submits for approval)
  if (from === "ai_reviewed" && to === "in_review") {
    return isCreator || isManager || isAdmin;
  }
  // in_review → approved
  if (from === "in_review" && to === "approved") {
    if (isManager) {
      // Manager cannot approve own content and must respect high‑severity rule
      if (ctx.isOwnContent) return false;
      if (ctx.hasOpenHighSeverityRequiringReviewer) return false;
      return true;
    }
    if (isReviewer) {
      // Reviewer can approve any content (including high‑severity) but not own content
      return !ctx.isOwnContent;
    }
    if (isAdmin) return true;
    return false;
  }
  // in_review → needs_changes (request changes)
  if (from === "in_review" && to === "needs_changes") {
    return isManager || isReviewer || isAdmin;
  }
  // needs_changes → draft (creator edits after changes)
  if (from === "needs_changes" && to === "draft") {
    return isCreator || isManager || isAdmin;
  }
  // any state → rejected
  if (to === "rejected") {
    return isManager || isReviewer || isAdmin;
  }
  // approved → published
  if (from === "approved" && to === "published") {
    // Only creator can publish own approved content, manager/reviewer cannot publish.
    return isCreator && ctx.isOwnContent;
  }
  // creator cannot approve own content – enforced above (no path to approved for creator)
  // manager cannot approve with open high‑severity findings – enforced above
  // default deny
  return false;
}

