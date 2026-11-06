import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

// Load environment variables from .env
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function main() {
  const isConfirm = process.argv.includes('--confirm');

  console.log(`\n🧹 BrandLens Demo Data Cleanup Script`);
  console.log(`Mode: ${isConfirm ? '🔴 EXECUTE (--confirm)' : '🟡 DRY RUN (default)'}\n`);

  // 1. Locate Demo Org
  const { data: orgs, error: orgError } = await supabase
    .from('orgs')
    .select('id, name')
    .order('created_at', { ascending: true });

  if (orgError || !orgs || orgs.length === 0) {
    console.error('Failed to query organisations:', orgError?.message);
    process.exit(1);
  }

  // Find demo org (prioritize "Verdant Skin (demo)" or the primary demo org)
  const demoOrg = orgs.find((o) => o.name.toLowerCase().includes('verdant')) || orgs[0];
  console.log(`Target Organization: "${demoOrg.name}" (${demoOrg.id})`);

  // 2. Fetch contents in this org
  const { data: contents, error: contentError } = await supabase
    .from('contents')
    .select('id, title, status, created_at')
    .eq('org_id', demoOrg.id)
    .order('created_at', { ascending: false });

  if (contentError) {
    console.error('Failed to query contents:', contentError.message);
    process.exit(1);
  }

  if (!contents || contents.length === 0) {
    console.log('No content rows found in target organization.');
    return;
  }

  // 3. Filter for development testing junk
  // Match criteria: starts with "Acceptance Test", starts with "Test", or clearly dev-test junk
  const junkContents = contents.filter((c) => {
    const title = (c.title || '').trim().toLowerCase();
    return (
      title.startsWith('acceptance test') ||
      title.startsWith('test') ||
      title.startsWith('tmp') ||
      title.startsWith('temp') ||
      title.includes('[test]') ||
      title.includes('development test')
    );
  });

  console.log(`Found ${contents.length} total content items in org.`);
  console.log(`Identified ${junkContents.length} development test items to clean:\n`);

  junkContents.forEach((c, idx) => {
    console.log(`  ${idx + 1}. [${c.id}] "${c.title}" (status: ${c.status}, created: ${c.created_at})`);
  });

  if (junkContents.length === 0) {
    console.log('\n✓ No test junk items found to delete.');
    return;
  }

  if (!isConfirm) {
    console.log(`\n⚠️  DRY RUN ONLY. No rows were deleted.`);
    console.log(`To delete these ${junkContents.length} test rows, re-run with:`);
    console.log(`  npx tsx scripts/reset-demo.ts --confirm\n`);
    return;
  }

  // 4. Delete with --confirm
  console.log(`\nProceeding with deletion of ${junkContents.length} items...`);
  const targetIds = junkContents.map((c) => c.id);

  // Delete dependencies in FK order
  const { error: commentErr } = await supabase.from('comments').delete().in('content_id', targetIds);
  if (commentErr) console.warn('Warning deleting comments:', commentErr.message);

  const { error: findingErr } = await supabase.from('findings').delete().in('content_id', targetIds);
  if (findingErr) console.warn('Warning deleting findings:', findingErr.message);

  const { error: aiRunErr } = await supabase.from('ai_runs').delete().in('content_id', targetIds);
  if (aiRunErr) console.warn('Warning deleting ai_runs:', aiRunErr.message);

  const { error: versionErr } = await supabase.from('content_versions').delete().in('content_id', targetIds);
  if (versionErr) console.warn('Warning deleting versions:', versionErr.message);

  const { error: deleteErr } = await supabase
    .from('contents')
    .delete()
    .in('id', targetIds)
    .eq('org_id', demoOrg.id);

  if (deleteErr) {
    console.error('Error deleting content items:', deleteErr.message);
    process.exit(1);
  }

  // 5. Write ONE audit_log entry
  const { error: auditErr } = await supabase.from('audit_log').insert({
    org_id: demoOrg.id,
    actor: null,
    action: 'demo.reset_cleanup',
    detail: {
      deleted_count: junkContents.length,
      deleted_titles: junkContents.map((c) => c.title),
      deleted_ids: targetIds,
      executed_at: new Date().toISOString(),
    },
  });

  if (auditErr) {
    console.warn('Warning writing audit log entry:', auditErr.message);
  } else {
    console.log('✓ Successfully recorded audit_log entry for demo data cleanup.');
  }

  console.log(`\n✅ Successfully deleted ${junkContents.length} development test content rows.`);
}

main().catch((err) => {
  console.error('Unexpected error in reset-demo:', err);
  process.exit(1);
});

