import { getAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';

export async function restoreDemoContent(orgId: string, actorId?: string) {
  const admin = getAdminClient();

  // Find admin and creator profiles in this org to attribute creation
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, role')
    .eq('org_id', orgId);

  const adminUser = profiles?.find((p) => p.role === 'admin')?.id || actorId || null;
  const creatorUser = profiles?.find((p) => p.role === 'creator')?.id || actorId || null;

  // 1. Guidelines
  const guidelines = [
    {
      title: 'Brand Tone: Friendly, Professional, Never Pushy',
      category: 'tone',
      body: 'Verdant Skin speaks with warmth, empathy, and professional expertise. Never use aggressive urgency tactics (e.g. "BUY NOW BEFORE GONE"), artificial scarcity, or shaming language.',
      clarification: 'Keep communication informative, empowering the consumer rather than pressuring them.',
      version: 1,
    },
    {
      title: 'Messaging Pillars: Gentle, Plant-Based, Transparent',
      category: 'messaging',
      body: 'All communications must reinforce our three core pillars: gentle formulations for sensitive skin, ethically sourced plant-based botanicals, and full ingredient transparency.',
      clarification: 'Every product story should highlight botanical integrity and clean formulation standards.',
      version: 1,
    },
    {
      title: 'Claims Policy: Medical & Efficacy Guardrails',
      category: 'claim',
      body: 'Never guarantee 100% results, promise immediate cures, or make medical disease-treatment claims. Any quantifiable result claim requires citing an approved fact and a survey timeframe of at least 4 weeks.',
      clarification: 'Skincare products nourish and support healthy skin; they do not diagnose, treat, or cure illness.',
      version: 1,
    },
    {
      title: 'Digital Accessibility Standards',
      category: 'accessibility',
      body: 'Include meaningful alt text for images. Never write entire paragraphs or headlines in ALL CAPS. Use descriptive link text rather than "click here", and camelCase multi-word hashtags (e.g., #VerdantSkin #PlantGlow).',
      clarification: 'Ensure screen readers can interpret copy cleanly without jarring capitalization artifacts.',
      version: 1,
    },
    {
      title: 'Brand Naming & Identity Specification',
      category: 'general',
      body: 'Spell and capitalize the brand name exactly as "Verdant Skin" with two words and standard Title Case. Never concatenate as "VerdantSkin" or use lowercase "verdant skin".',
      clarification: 'Consistent typography preserves trademark and brand authority.',
      version: 1,
    },
  ];

  for (const g of guidelines) {
    const { data: existing } = await admin
      .from('guidelines')
      .select('id')
      .eq('org_id', orgId)
      .eq('title', g.title)
      .maybeSingle();

    if (existing) {
      await admin.from('guidelines').update(g).eq('id', existing.id);
    } else {
      await admin.from('guidelines').insert({
        id: crypto.randomUUID(),
        org_id: orgId,
        created_by: adminUser,
        ...g,
      });
    }
  }

  // 2. Approved Facts (including 2 expired)
  const facts = [
    {
      statement: 'Formulated without parabens and synthetic fragrance',
      owner: 'Dr. Maya Lin, R&D',
      source_note: 'Formulation Audit Report 2026-A',
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'approved',
    },
    {
      statement: 'In a 4-week user survey of 60 people, 78 percent reported smoother-feeling skin',
      owner: 'Sarah Chen, Clinical Studies',
      source_note: 'Perception Study VSK-2025-04',
      expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'approved',
    },
    {
      statement: 'Free shipping on orders above 999 rupees',
      owner: 'Operations Team',
      source_note: 'Domestic Logistics Policy v2.3',
      expires_at: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'approved',
    },
    {
      statement: '100% recyclable post-consumer glass packaging across all serums',
      owner: 'Eco Packaging Group',
      source_note: 'Sustainability Certification 2025-G',
      expires_at: new Date(Date.now() + 250 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'approved',
    },
    {
      statement: 'Features cold-pressed rosehip seed oil harvested in Himachal Pradesh',
      owner: 'Botanical Sourcing Lead',
      source_note: 'Supplier Origin Certificate #HP-882',
      expires_at: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'approved',
    },
    {
      statement: 'Dermatologist-tested on 120 participants with sensitive skin with zero adverse reactions',
      owner: 'Dr. Maya Lin, R&D',
      source_note: 'Dermatological Patch Trial DP-601',
      expires_at: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'approved',
    },
    {
      statement: 'Introductory launch discount: 20% off all bundles until October 2025',
      owner: 'Growth Marketing',
      source_note: 'Q3 2025 Promotional Plan',
      expires_at: '2025-10-31T23:59:59.000Z',
      status: 'approved',
    },
    {
      statement: 'Complimentary botanical sample kit with every monsoon order',
      owner: 'Retention Marketing',
      source_note: 'Monsoon Seasonal Campaign 2025',
      expires_at: '2025-09-15T23:59:59.000Z',
      status: 'approved',
    },
  ];

  for (const f of facts) {
    const { data: existing } = await admin
      .from('facts')
      .select('id')
      .eq('org_id', orgId)
      .eq('statement', f.statement)
      .maybeSingle();

    if (existing) {
      await admin.from('facts').update(f).eq('id', existing.id);
    } else {
      await admin.from('facts').insert({
        id: crypto.randomUUID(),
        org_id: orgId,
        ...f,
      });
    }
  }

  // 3. Terms
  const terms = [
    {
      term: 'cure',
      kind: 'banned',
      replacement: 'support healthy skin',
      note: 'Cosmetics cannot claim to cure medical conditions.',
    },
    {
      term: 'miracle',
      kind: 'banned',
      replacement: 'effective',
      note: 'Avoid sensationalist claims unsupported by data.',
    },
    {
      term: 'guaranteed results',
      kind: 'banned',
      replacement: 'visible improvements',
      note: 'Every skin type reacts individually; guarantees violate compliance.',
    },
    {
      term: 'anti-aging magic',
      kind: 'banned',
      replacement: 'rejuvenating botanical care',
      note: 'Unscientific framing conflicting with transparent pillar.',
    },
    {
      term: 'chemical-free',
      kind: 'banned',
      replacement: 'synthetic additive-free',
      note: 'All matter is chemical; scientifically inaccurate.',
    },
    {
      term: 'dermatologist-approved',
      kind: 'caution',
      replacement: 'dermatologist-tested',
      note: 'Requires verified dermatological trial fact citation.',
    },
    {
      term: 'natural',
      kind: 'caution',
      replacement: 'plant-derived',
      note: 'Ambiguous marketing term; specify botanical source.',
    },
    {
      term: 'Verdant Skin',
      kind: 'preferred',
      replacement: null,
      note: 'Official brand identity.',
    },
    {
      term: 'gentle',
      kind: 'preferred',
      replacement: null,
      note: 'Core brand pillar.',
    },
    {
      term: 'plant-based',
      kind: 'preferred',
      replacement: null,
      note: 'Core brand pillar.',
    },
  ];

  for (const t of terms) {
    const { data: existing } = await admin
      .from('terms')
      .select('id')
      .eq('org_id', orgId)
      .eq('term', t.term)
      .maybeSingle();

    if (existing) {
      await admin.from('terms').update(t).eq('id', existing.id);
    } else {
      await admin.from('terms').insert({
        id: crypto.randomUUID(),
        org_id: orgId,
        ...t,
      });
    }
  }

  // 4. Showcase content items
  const showcaseContents = [
    {
      title: 'Showcase A: Miracle Serum Campaign (Draft)',
      channel: 'instagram',
      audience: 'Sensitive skin skincare enthusiasts',
      confidential: false,
      final_status: 'draft',
      body: 'Our miracle serum CURES acne in 7 days!! 100% guaranteed. Click here',
      note: 'Initial campaign caption draft with problematic claims',
    },
    {
      title: 'Showcase B: Clinical Skin Barrier Spotlight (In Review)',
      channel: 'blog',
      audience: 'Dermatology & skincare community',
      confidential: false,
      final_status: 'in_review',
      body: 'Our clinical formula reduces skin redness by 95% in 48 hours with guaranteed results.',
      note: 'Submitted for manager and reviewer evaluation with unsupported high claim',
    },
    {
      title: 'Showcase C: Verdant Skin Brand Transparency (Published)',
      channel: 'email',
      audience: 'Newsletter subscribers & eco-conscious buyers',
      confidential: false,
      final_status: 'published',
      body: 'At Verdant Skin, transparency is our promise. Formulated without parabens and synthetic fragrance, each bottle uses 100% recyclable post-consumer glass packaging across all serums.',
      note: 'Fully approved and published compliant post',
    },
    {
      title: 'Showcase D: Monsoon Botanical Sample Kit (Needs Changes)',
      channel: 'social',
      audience: 'Seasonal shoppers',
      confidential: false,
      final_status: 'needs_changes',
      body: 'Complimentary botanical sample kit with every monsoon order for a limited period.',
      note: 'Promotional copy citing an expired promotion fact',
    },
    {
      title: 'Showcase E: Project Aurora Formulation Brief (Confidential)',
      channel: 'internal',
      audience: 'Product formulation team',
      confidential: true,
      final_status: 'draft',
      body: 'Confidential internal formulation brief for Project Aurora barrier balm. Features cold-pressed rosehip seed oil harvested in Himachal Pradesh.',
      note: 'Confidential product brief - AI review bypassed',
    },
  ];

  let restoredCount = 0;
  for (const item of showcaseContents) {
    const { data: existingContent } = await admin
      .from('contents')
      .select('id')
      .eq('org_id', orgId)
      .eq('title', item.title)
      .maybeSingle();

    let contentId: string;
    if (existingContent) {
      contentId = existingContent.id;
    } else {
      contentId = crypto.randomUUID();
      await admin.from('contents').insert({
        id: contentId,
        org_id: orgId,
        title: item.title,
        channel: item.channel,
        audience: item.audience,
        confidential: item.confidential,
        status: item.final_status,
        created_by: creatorUser,
        current_version: 1,
      });

      await admin.from('content_versions').insert({
        id: crypto.randomUUID(),
        content_id: contentId,
        version: 1,
        body: item.body,
        created_by: creatorUser,
        note: item.note,
      });

      restoredCount++;
    }
  }

  if (actorId) {
    await logAudit({
      org_id: orgId,
      actor: actorId,
      action: 'demo.restore',
      detail: {
        guidelines_checked: guidelines.length,
        facts_checked: facts.length,
        terms_checked: terms.length,
        showcase_restored: restoredCount,
        timestamp: new Date().toISOString(),
      },
    });
  }

  return {
    guidelinesCount: guidelines.length,
    factsCount: facts.length,
    termsCount: terms.length,
    restoredShowcases: restoredCount,
  };
}
