import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';
import { runReview } from '../src/lib/review/pipeline';

// Load environment variables from .env
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const demoPassword = process.env.DEMO_PASSWORD?.trim() || 'verdant12110';

if (!url || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function seed() {
  console.log('🌱 Starting idempotent BrandLens demo seed...');

  // 1. Organization: "Verdant Skin (demo)"
  let orgId: string;
  const { data: existingOrgs, error: orgFetchError } = await supabase
    .from('orgs')
    .select('id, name')
    .eq('name', 'Verdant Skin (demo)')
    .maybeSingle();

  if (orgFetchError) {
    throw new Error(`Failed to check existing org: ${orgFetchError.message}`);
  }

  if (existingOrgs) {
    orgId = existingOrgs.id;
    console.log(`✓ Organization found: ${existingOrgs.name} (${orgId})`);
  } else {
    const newOrgId = crypto.randomUUID();
    const { error: insertOrgError } = await supabase
      .from('orgs')
      .insert({ id: newOrgId, name: 'Verdant Skin (demo)' });

    if (insertOrgError) {
      throw new Error(`Failed to create org: ${insertOrgError.message}`);
    }
    orgId = newOrgId;
    console.log(`✓ Organization created: Verdant Skin (demo) (${orgId})`);
  }

  // 2. Users and Profiles
  const demoUsers: { email: string; fullName: string; role: 'creator' | 'manager' | 'reviewer' | 'admin' }[] = [
    { email: 'creator@verdant.demo', fullName: 'Chloe Creator', role: 'creator' },
    { email: 'manager@verdant.demo', fullName: 'Marcus Manager', role: 'manager' },
    { email: 'reviewer@verdant.demo', fullName: 'Rachel Reviewer', role: 'reviewer' },
    { email: 'admin@verdant.demo', fullName: 'Aiden Admin', role: 'admin' },
  ];

  const userMap: Record<string, string> = {};

  const { data: authList, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    throw new Error(`Failed to list auth users: ${listError.message}`);
  }

  for (const u of demoUsers) {
    const existing = authList.users.find((user) => user.email === u.email);
    let userId: string;

    if (existing) {
      userId = existing.id;
      // Update password and confirm email to ensure working sign-in
      await supabase.auth.admin.updateUserById(userId, {
        password: demoPassword,
        email_confirm: true,
        user_metadata: { full_name: u.fullName },
      });
      console.log(`✓ Auth user updated: ${u.email} (${userId})`);
    } else {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: u.email,
        password: demoPassword,
        email_confirm: true,
        user_metadata: { full_name: u.fullName },
      });
      if (createError || !created.user) {
        throw new Error(`Failed to create user ${u.email}: ${createError?.message}`);
      }
      userId = created.user.id;
      console.log(`✓ Auth user created: ${u.email} (${userId})`);
    }

    userMap[u.role] = userId;

    // Upsert profile
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        org_id: orgId,
        full_name: u.fullName,
        role: u.role,
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      throw new Error(`Failed to upsert profile for ${u.email}: ${profileError.message}`);
    }
  }

  // 3. Guidelines (5 guidelines)
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
    const { data: existing } = await supabase
      .from('guidelines')
      .select('id')
      .eq('org_id', orgId)
      .eq('title', g.title)
      .maybeSingle();

    if (existing) {
      await supabase.from('guidelines').update(g).eq('id', existing.id);
    } else {
      await supabase.from('guidelines').insert({
        id: crypto.randomUUID(),
        org_id: orgId,
        created_by: userMap.admin,
        ...g,
      });
    }
  }
  console.log(`✓ Seeded ${guidelines.length} guidelines`);

  // 4. Approved Facts (8 facts, 2 expired)
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
    // Expired Fact 1 (Expired by past date)
    {
      statement: 'Introductory launch discount: 20% off all bundles until October 2025',
      owner: 'Growth Marketing',
      source_note: 'Q3 2025 Promotional Plan',
      expires_at: '2025-10-31T23:59:59.000Z',
      status: 'approved',
    },
    // Expired Fact 2 (Expired by past date)
    {
      statement: 'Complimentary botanical sample kit with every monsoon order',
      owner: 'Retention Marketing',
      source_note: 'Monsoon Seasonal Campaign 2025',
      expires_at: '2025-09-15T23:59:59.000Z',
      status: 'approved',
    },
  ];

  for (const f of facts) {
    const { data: existing } = await supabase
      .from('facts')
      .select('id')
      .eq('org_id', orgId)
      .eq('statement', f.statement)
      .maybeSingle();

    if (existing) {
      await supabase.from('facts').update(f).eq('id', existing.id);
    } else {
      await supabase.from('facts').insert({
        id: crypto.randomUUID(),
        org_id: orgId,
        ...f,
      });
    }
  }
  console.log(`✓ Seeded ${facts.length} facts (including 2 expired)`);

  // 5. Terms (10 terms: banned, caution, preferred)
  const terms = [
    // Banned
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
    // Caution
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
    // Preferred
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
    const { data: existing } = await supabase
      .from('terms')
      .select('id')
      .eq('org_id', orgId)
      .eq('term', t.term)
      .maybeSingle();

    if (existing) {
      await supabase.from('terms').update(t).eq('id', existing.id);
    } else {
      await supabase.from('terms').insert({
        id: crypto.randomUUID(),
        org_id: orgId,
        ...t,
      });
    }
  }
  console.log(`✓ Seeded ${terms.length} terms`);

  // 6. Clean Showcase Set (5 items covering all key compliance flows)
  const showcaseContents = [
    {
      key: 'a',
      title: 'Showcase A: Miracle Serum Campaign (Draft)',
      channel: 'instagram',
      audience: 'Sensitive skin skincare enthusiasts',
      confidential: false,
      final_status: 'draft',
      body: 'Our miracle serum CURES acne in 7 days!! 100% guaranteed. Click here',
      note: 'Initial campaign caption draft with problematic claims',
    },
    {
      key: 'b',
      title: 'Showcase B: Clinical Skin Barrier Spotlight (In Review)',
      channel: 'blog',
      audience: 'Dermatology & skincare community',
      confidential: false,
      final_status: 'in_review',
      body: 'Our clinical formula reduces skin redness by 95% in 48 hours with guaranteed results.',
      note: 'Submitted for manager and reviewer evaluation with unsupported high claim',
    },
    {
      key: 'c',
      title: 'Showcase C: Verdant Skin Brand Transparency (Published)',
      channel: 'email',
      audience: 'Newsletter subscribers & eco-conscious buyers',
      confidential: false,
      final_status: 'published',
      body: 'At Verdant Skin, transparency is our promise. Formulated without parabens and synthetic fragrance, each bottle uses 100% recyclable post-consumer glass packaging across all serums.',
      note: 'Fully approved and published compliant post',
    },
    {
      key: 'd',
      title: 'Showcase D: Monsoon Botanical Sample Kit (Needs Changes)',
      channel: 'social',
      audience: 'Seasonal shoppers',
      confidential: false,
      final_status: 'needs_changes',
      body: 'Complimentary botanical sample kit with every monsoon order for a limited period.',
      note: 'Promotional copy citing an expired promotion fact',
    },
    {
      key: 'e',
      title: 'Showcase E: Project Aurora Formulation Brief (Confidential)',
      channel: 'internal',
      audience: 'Product formulation team',
      confidential: true,
      final_status: 'draft',
      body: 'Confidential internal formulation brief for Project Aurora barrier balm. Features cold-pressed rosehip seed oil harvested in Himachal Pradesh.',
      note: 'Confidential product brief - AI review bypassed',
    },
  ];

  for (const item of showcaseContents) {
    const { data: existingContent } = await supabase
      .from('contents')
      .select('id')
      .eq('org_id', orgId)
      .eq('title', item.title)
      .maybeSingle();

    let contentId: string;
    if (existingContent) {
      contentId = existingContent.id;
      await supabase
        .from('contents')
        .update({
          channel: item.channel,
          audience: item.audience,
          confidential: item.confidential,
          status: 'draft',
          current_version: 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contentId);
    } else {
      contentId = crypto.randomUUID();
      await supabase.from('contents').insert({
        id: contentId,
        org_id: orgId,
        title: item.title,
        channel: item.channel,
        audience: item.audience,
        confidential: item.confidential,
        status: 'draft',
        created_by: userMap.creator,
        current_version: 1,
      });
    }

    // Upsert version 1
    const { data: existingVersion } = await supabase
      .from('content_versions')
      .select('id')
      .eq('content_id', contentId)
      .eq('version', 1)
      .maybeSingle();

    if (existingVersion) {
      await supabase
        .from('content_versions')
        .update({
          body: item.body,
          note: item.note,
        })
        .eq('id', existingVersion.id);
    } else {
      await supabase.from('content_versions').insert({
        id: crypto.randomUUID(),
        content_id: contentId,
        version: 1,
        body: item.body,
        created_by: userMap.creator,
        note: item.note,
      });
    }

    // Run real review pipeline
    console.log(`  Auditing showcase item: "${item.title}"...`);
    try {
      await runReview(contentId, userMap.creator);
    } catch (reviewErr) {
      console.warn(`  Warning reviewing ${item.title}:`, (reviewErr as Error).message);
    }

    // Apply desired target status
    await supabase
      .from('contents')
      .update({ status: item.final_status })
      .eq('id', contentId);
  }

  console.log(`✓ Seeded & reviewed ${showcaseContents.length} clean showcase contents`);

  console.log('✅ Seed completed successfully!');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
