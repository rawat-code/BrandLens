import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export async function POST() {
  try {
    const { user, profile } = await requireRole(['manager', 'admin']);
    const admin = getAdminClient();
    const orgId = profile.org_id;

    // 1. Fetch Organization Guidelines
    const { data: guidelines, error: gError } = await admin
      .from('guidelines')
      .select('id, title, category')
      .eq('org_id', orgId);

    if (gError || !guidelines || guidelines.length === 0) {
      return NextResponse.json(
        { error: 'No guidelines found for this organization. Please seed library first.' },
        { status: 400 }
      );
    }

    const messagingGuideline =
      guidelines.find((g) => g.title.toLowerCase().includes('messaging') || g.title.toLowerCase().includes('pillar')) ||
      guidelines[0];

    const a11yGuideline =
      guidelines.find((g) => g.title.toLowerCase().includes('access') || g.title.toLowerCase().includes('standard')) ||
      guidelines[1] ||
      guidelines[0];

    // 2. Ensure at least one expired fact and one expiring-soon fact exist
    const now = new Date();
    const expiredDate = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(); // 20 days ago
    const expiringSoonDate = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString(); // 12 days future

    let expiredFactId: string;
    const { data: existingExpiredFact } = await admin
      .from('facts')
      .select('id')
      .eq('org_id', orgId)
      .eq('statement', 'Phase 1 Clinical: 92% improvement in barrier hydration (Trial VRD-01)')
      .maybeSingle();

    if (existingExpiredFact) {
      expiredFactId = existingExpiredFact.id;
      await admin
        .from('facts')
        .update({ expires_at: expiredDate, status: 'expired' })
        .eq('id', expiredFactId);
    } else {
      const { data: newFact } = await admin
        .from('facts')
        .insert({
          org_id: orgId,
          statement: 'Phase 1 Clinical: 92% improvement in barrier hydration (Trial VRD-01)',
          source_note: 'Dermatological trial report 2024 (Annual renewal required)',
          status: 'expired',
          expires_at: expiredDate,
        })
        .select('id')
        .single();
      expiredFactId = newFact?.id || '';
    }

    // Ensure expiring-soon fact exists
    const { data: existingSoonFact } = await admin
      .from('facts')
      .select('id')
      .eq('org_id', orgId)
      .eq('statement', 'Ethically wild-harvested Centella Asiatica certified Fair-Trade 2026')
      .maybeSingle();

    if (existingSoonFact) {
      await admin
        .from('facts')
        .update({ expires_at: expiringSoonDate, status: 'approved' })
        .eq('id', existingSoonFact.id);
    } else {
      await admin.from('facts').insert({
        org_id: orgId,
        statement: 'Ethically wild-harvested Centella Asiatica certified Fair-Trade 2026',
        source_note: 'Supplier Fair-Trade Certificate FT-992',
        status: 'approved',
        expires_at: expiringSoonDate,
      });
    }

    // 3. Clean up any existing [Demo History] synthetic records for clean idempotency
    const { data: oldDemoContents } = await admin
      .from('contents')
      .select('id')
      .eq('org_id', orgId)
      .ilike('title', '%[Demo History]%');

    if (oldDemoContents && oldDemoContents.length > 0) {
      const oldIds = oldDemoContents.map((c) => c.id);
      await admin.from('findings').delete().in('content_id', oldIds);
      await admin.from('content_versions').delete().in('content_id', oldIds);
      await admin.from('contents').delete().in('id', oldIds);
    }

    // 4. Create synthetic demo contents across creators and channels
    const demoItems = [
      {
        title: '[Demo History] Botanical Dew Serum Carousel',
        channel: 'instagram',
        body: 'Experience our miracle hydration serum! It CURES dull skin instantly and is 100% guaranteed. CLICK HERE to order now.',
      },
      {
        title: '[Demo History] Winter Barrier Repair Blog',
        channel: 'blog',
        body: 'Formulated with 92% organic aloe to guarantee overnight results. Our botanical complex eliminates wrinkles in 7 days.',
      },
      {
        title: '[Demo History] VIP Subscriber VIP Email',
        channel: 'email',
        body: 'SPECIAL OFFER: BUY NOW BEFORE STOCK RUNS OUT! Clinically proven to reverse aging completely.',
      },
      {
        title: '[Demo History] Eco Packaging Label Copy',
        channel: 'packaging',
        body: 'Clean botanical skincare with 92% organic aloe. Guaranteed purity and chemical free.',
      },
    ];

    let createdFindingsCount = 0;

    for (let i = 0; i < demoItems.length; i++) {
      const item = demoItems[i];
      const { data: content, error: cErr } = await admin
        .from('contents')
        .insert({
          org_id: orgId,
          title: item.title,
          channel: item.channel,
          status: 'needs_changes',
          created_by: user.id,
          current_version: 1,
        })
        .select()
        .single();

      if (cErr || !content) continue;

      // Insert version
      await admin.from('content_versions').insert({
        content_id: content.id,
        version: 1,
        body: item.body,
        created_by: user.id,
      });

      // Prepare distinct findings for this content
      const findingsToInsert: Record<string, unknown>[] = [];

      if (i === 0) {
        // Content 0: Messaging guideline with multiple disputes/dismissals -> triggers "Possibly unclear"
        findingsToInsert.push(
          {
            content_id: content.id,
            version: 1,
            rule_key: 'claim.absolute',
            origin: 'rule',
            category: 'claim',
            severity: 'high',
            confidence: 0.95,
            excerpt: 'miracle hydration',
            reason: 'Violates non-hyperbolic botanical messaging standard',
            source_type: 'guideline',
            source_id: messagingGuideline.id,
            source_quote: messagingGuideline.title,
            suggestion: 'deep hydration',
            intent_check: 'preserved',
            needs_human_check: false,
            requires_reviewer: false,
            status: 'disputed',
            dispute_reason:
              'Creators frequently confuse botanical poetic descriptions with prohibited medical miracle claims.',
          },
          {
            content_id: content.id,
            version: 1,
            rule_key: 'claim.absolute',
            origin: 'rule',
            category: 'claim',
            severity: 'high',
            confidence: 0.9,
            excerpt: '100% guaranteed',
            reason: 'Satisfaction guarantees must not promise clinical cures',
            source_type: 'guideline',
            source_id: messagingGuideline.id,
            source_quote: messagingGuideline.title,
            suggestion: 'visibly supports healthy glow',
            intent_check: 'changed',
            needs_human_check: false,
            requires_reviewer: true,
            status: 'disputed',
            dispute_reason:
              'Guideline does not clarify whether customer satisfaction guarantees are permissible when separated from clinical claims.',
          },
          {
            content_id: content.id,
            version: 1,
            rule_key: 'term.banned',
            origin: 'rule',
            category: 'terminology',
            severity: 'high',
            confidence: 1.0,
            excerpt: 'CURES',
            reason: 'Cosmetics cannot claim to cure skin conditions',
            source_type: 'guideline',
            source_id: messagingGuideline.id,
            source_quote: messagingGuideline.title,
            suggestion: 'visibly soothes',
            intent_check: 'changed',
            needs_human_check: false,
            requires_reviewer: false,
            status: 'dismissed',
            dispute_reason:
              'Brand guidelines state "soothes" or "comforts" are acceptable, but reviewers disagree on allowable active ingredient context.',
          },
          {
            content_id: content.id,
            version: 1,
            rule_key: 'a11y.vague_link',
            origin: 'rule',
            category: 'accessibility',
            severity: 'low',
            confidence: 1.0,
            excerpt: 'CLICK HERE',
            reason: 'Link text lacks descriptive context for screen readers',
            source_type: 'guideline',
            source_id: a11yGuideline.id,
            source_quote: a11yGuideline.title,
            suggestion: 'Explore Botanical Dew Serum',
            intent_check: 'preserved',
            needs_human_check: false,
            requires_reviewer: false,
            status: 'open',
          }
        );
      } else if (i === 1) {
        // Content 1: Stale fact citation & timeframe claim
        findingsToInsert.push(
          {
            content_id: content.id,
            version: 1,
            rule_key: 'fact.expired',
            origin: 'rule',
            category: 'fact',
            severity: 'medium',
            confidence: 1.0,
            excerpt: '92% organic aloe',
            reason: `Referenced clinical fact expired on ${expiredDate.slice(0, 10)}`,
            source_type: 'fact',
            source_id: expiredFactId,
            source_quote: 'Phase 1 Clinical: 92% improvement in barrier hydration',
            suggestion: null,
            intent_check: null,
            needs_human_check: false,
            requires_reviewer: false,
            status: 'open',
          },
          {
            content_id: content.id,
            version: 1,
            rule_key: 'claim.timeframe',
            origin: 'rule',
            category: 'claim',
            severity: 'high',
            confidence: 0.95,
            excerpt: 'in 7 days',
            reason: 'Time-bound claims require active unexpired clinical trial evidence',
            source_type: 'guideline',
            source_id: messagingGuideline.id,
            source_quote: messagingGuideline.title,
            suggestion: 'with regular daily use',
            intent_check: 'preserved',
            needs_human_check: false,
            requires_reviewer: true,
            status: 'open',
          }
        );
      } else if (i === 2) {
        // Content 2: All caps urgency & overpromising
        findingsToInsert.push(
          {
            content_id: content.id,
            version: 1,
            rule_key: 'a11y.allcaps',
            origin: 'rule',
            category: 'accessibility',
            severity: 'low',
            confidence: 1.0,
            excerpt: 'BUY NOW BEFORE STOCK RUNS OUT',
            reason: '3+ consecutive capitalized words degrade readability',
            source_type: 'guideline',
            source_id: a11yGuideline.id,
            source_quote: a11yGuideline.title,
            suggestion: 'Shop our seasonal batch while available',
            intent_check: 'preserved',
            needs_human_check: false,
            requires_reviewer: false,
            status: 'open',
          },
          {
            content_id: content.id,
            version: 1,
            rule_key: 'claim.absolute',
            origin: 'rule',
            category: 'claim',
            severity: 'high',
            confidence: 0.95,
            excerpt: 'reverse aging completely',
            reason: 'Absolute claim unsupported by botanical skincare standards',
            source_type: 'guideline',
            source_id: messagingGuideline.id,
            source_quote: messagingGuideline.title,
            suggestion: 'support youthful, resilient-looking skin',
            intent_check: 'changed',
            needs_human_check: false,
            requires_reviewer: true,
            status: 'open',
          }
        );
      } else {
        // Content 3: Packaging terminology
        findingsToInsert.push(
          {
            content_id: content.id,
            version: 1,
            rule_key: 'term.banned',
            origin: 'rule',
            category: 'terminology',
            severity: 'high',
            confidence: 1.0,
            excerpt: 'chemical free',
            reason: 'Banned misleading clean-beauty term: all matter contains chemicals',
            source_type: 'guideline',
            source_id: messagingGuideline.id,
            source_quote: messagingGuideline.title,
            suggestion: 'free from synthetic fragrances and parabens',
            intent_check: 'preserved',
            needs_human_check: false,
            requires_reviewer: false,
            status: 'accepted',
          }
        );
      }

      const { data: inserted, error: fErr } = await admin
        .from('findings')
        .insert(findingsToInsert)
        .select('id');

      if (!fErr && inserted) {
        createdFindingsCount += inserted.length;
      }
    }

    // 5. Append audit log
    await logAudit({
      org_id: orgId,
      actor: user.id,
      action: 'insights.demo_history.seeded',
      detail: {
        synthetic_contents_count: demoItems.length,
        synthetic_findings_count: createdFindingsCount,
        note: 'Loaded demonstration history for compliance analytics',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Demo history loaded successfully',
      contents_created: demoItems.length,
      findings_created: createdFindingsCount,
    });
  } catch (err: unknown) {
    console.error('Error seeding demo history:', err);
    const errorObj = err as { message?: string; status?: number };
    return NextResponse.json(
      { error: errorObj.message || 'Failed to seed demo history' },
      { status: errorObj.status || 500 }
    );
  }
}
