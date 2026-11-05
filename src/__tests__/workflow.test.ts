import { describe, it, expect } from 'vitest';
import { canTransition } from '@/lib/workflow';

describe('Workflow Engine canTransition', () => {
  const defaultCtx = {
    hasOpenHighSeverityRequiringReviewer: false,
    isOwnContent: false,
  };

  describe('Draft to ai_reviewed', () => {
    it('allows creator, manager, or admin to run review on draft', () => {
      expect(canTransition('creator', 'draft', 'ai_reviewed', { ...defaultCtx, isOwnContent: true })).toBe(true);
      expect(canTransition('manager', 'draft', 'ai_reviewed', defaultCtx)).toBe(true);
      expect(canTransition('admin', 'draft', 'ai_reviewed', defaultCtx)).toBe(true);
      expect(canTransition('reviewer', 'draft', 'ai_reviewed', defaultCtx)).toBe(false);
    });
  });

  describe('ai_reviewed to in_review (Submit for approval)', () => {
    it('allows creator to submit own ai_reviewed draft for approval', () => {
      expect(canTransition('creator', 'ai_reviewed', 'in_review', { ...defaultCtx, isOwnContent: true })).toBe(true);
    });

    it('allows manager and admin to submit for approval', () => {
      expect(canTransition('manager', 'ai_reviewed', 'in_review', defaultCtx)).toBe(true);
      expect(canTransition('admin', 'ai_reviewed', 'in_review', defaultCtx)).toBe(true);
    });

    it('denies reviewer from submitting for approval', () => {
      expect(canTransition('reviewer', 'ai_reviewed', 'in_review', defaultCtx)).toBe(false);
    });
  });

  describe('in_review to approved (Approval governance)', () => {
    it('CREATOR CAN NEVER APPROVE CONTENT (Rule 3)', () => {
      expect(canTransition('creator', 'in_review', 'approved', { ...defaultCtx, isOwnContent: true })).toBe(false);
      expect(canTransition('creator', 'in_review', 'approved', { ...defaultCtx, isOwnContent: false })).toBe(false);
    });

    it('MANAGER CANNOT APPROVE OWN CONTENT (Separation of duties)', () => {
      expect(canTransition('manager', 'in_review', 'approved', { ...defaultCtx, isOwnContent: true })).toBe(false);
    });

    it('MANAGER CANNOT APPROVE WITH OPEN HIGH-SEVERITY FINDINGS (Rule)', () => {
      expect(
        canTransition('manager', 'in_review', 'approved', {
          isOwnContent: false,
          hasOpenHighSeverityRequiringReviewer: true,
        })
      ).toBe(false);
    });

    it('manager can approve another user content when no high-severity findings remain', () => {
      expect(
        canTransition('manager', 'in_review', 'approved', {
          isOwnContent: false,
          hasOpenHighSeverityRequiringReviewer: false,
        })
      ).toBe(true);
    });

    it('REVIEWER CANNOT APPROVE OWN CONTENT', () => {
      expect(
        canTransition('reviewer', 'in_review', 'approved', {
          ...defaultCtx,
          isOwnContent: true,
        })
      ).toBe(false);
    });

    it('reviewer can approve content with open high-severity findings requiring reviewer', () => {
      expect(
        canTransition('reviewer', 'in_review', 'approved', {
          isOwnContent: false,
          hasOpenHighSeverityRequiringReviewer: true,
        })
      ).toBe(true);
    });

    it('admin can approve content', () => {
      expect(canTransition('admin', 'in_review', 'approved', defaultCtx)).toBe(true);
    });
  });

  describe('in_review to needs_changes & rejected', () => {
    it('allows manager, reviewer, and admin to request changes', () => {
      expect(canTransition('manager', 'in_review', 'needs_changes', defaultCtx)).toBe(true);
      expect(canTransition('reviewer', 'in_review', 'needs_changes', defaultCtx)).toBe(true);
      expect(canTransition('admin', 'in_review', 'needs_changes', defaultCtx)).toBe(true);
      expect(canTransition('creator', 'in_review', 'needs_changes', defaultCtx)).toBe(false);
    });

    it('allows manager, reviewer, and admin to reject', () => {
      expect(canTransition('manager', 'in_review', 'rejected', defaultCtx)).toBe(true);
      expect(canTransition('reviewer', 'in_review', 'rejected', defaultCtx)).toBe(true);
      expect(canTransition('admin', 'in_review', 'rejected', defaultCtx)).toBe(true);
      expect(canTransition('creator', 'in_review', 'rejected', defaultCtx)).toBe(false);
    });
  });

  describe('needs_changes to draft', () => {
    it('allows creator to edit draft after changes requested', () => {
      expect(canTransition('creator', 'needs_changes', 'draft', { ...defaultCtx, isOwnContent: true })).toBe(true);
    });
  });

  describe('approved to published', () => {
    it('only creator can publish own approved content', () => {
      expect(canTransition('creator', 'approved', 'published', { ...defaultCtx, isOwnContent: true })).toBe(true);
      expect(canTransition('creator', 'approved', 'published', { ...defaultCtx, isOwnContent: false })).toBe(false);
      expect(canTransition('manager', 'approved', 'published', defaultCtx)).toBe(false);
      expect(canTransition('reviewer', 'approved', 'published', defaultCtx)).toBe(false);
    });
  });
});
