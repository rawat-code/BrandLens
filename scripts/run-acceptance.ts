import { createClient } from '@supabase/supabase-js';
import { runReview } from '../src/lib/review/pipeline';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ORG_ID = '825e17fe-99c0-4c43-af5d-9e483f633f69';
const CREATOR_ID = 'f8d93a0f-724d-457d-aafc-664cf7e70ac5';
const SAMPLE_TEXT = 'Our miracle serum CURES acne in 7 days!! 100% guaranteed. Click here';

async function main() {
  console.log('====================================================');
  console.log('ACCEPTANCE TEST 1: Non-confidential Review Pipeline');
  console.log('Sample Text:', SAMPLE_TEXT);
  console.log('====================================================');

  // 1. Create content
  const { data: content1, error: cErr1 } = await supabase
    .from('contents')
    .insert({
      org_id: ORG_ID,
      title: 'Acceptance Test 1 - Miracle Serum',
      channel: 'social',
      audience: 'Sensitive Skin Customers',
      confidential: false,
      status: 'draft',
      created_by: CREATOR_ID,
      current_version: 1,
    })
    .select()
    .single();

  if (cErr1) throw new Error(`Create content 1 failed: ${cErr1.message}`);

  // Create version
  const { error: vErr1 } = await supabase.from('content_versions').insert({
    content_id: content1.id,
    version: 1,
    body: SAMPLE_TEXT,
    created_by: CREATOR_ID,
    note: 'Initial draft for review',
  });
  if (vErr1) throw new Error(`Create version 1 failed: ${vErr1.message}`);

  // Run pipeline
  const result1 = await runReview(content1.id, CREATOR_ID);
  console.log('\nReview Status:', result1.status);
  console.log('AI Unavailable:', result1.aiUnavailable);
  console.log('Total Findings:', result1.findings.length);

  console.log('\nFindings Breakdown:');
  for (const f of result1.findings) {
    console.log(`- [${f.origin.toUpperCase()}] ${f.rule_key} (${f.severity}): "${f.excerpt}"`);
    console.log(`  Source: ${f.source_type} -> ${f.source_quote || f.source_id}`);
    console.log(`  Suggestion: ${f.suggestion}`);
    console.log(`  Intent: ${f.intent_check} (${f.intent_note || 'N/A'})\n`);
  }

  // Check ai_runs
  const { data: aiRuns1 } = await supabase
    .from('ai_runs')
    .select('*')
    .eq('content_id', content1.id)
    .order('created_at', { ascending: false })
    .limit(1);

  console.log('AI Run Log 1:', aiRuns1?.[0]);

  // Verification checks for Acceptance Test 1
  const ruleKeys = result1.findings.map((f) => f.rule_key);
  const hasBanned = ruleKeys.some((k) => k.startsWith('term.banned') || k === 'term.banned');
  const hasAbsolute = ruleKeys.includes('claim.absolute');
  const hasUnsupported = ruleKeys.includes('claim.unsupported');
  const hasAllCaps = ruleKeys.includes('a11y.allcaps');
  const hasVagueLink = ruleKeys.includes('a11y.vague_link');

  console.log('\n--- Acceptance Test 1 Verification ---');
  console.log('Has banned term:', hasBanned ? 'PASS' : 'FAIL');
  console.log('Has absolute claim:', hasAbsolute ? 'PASS' : 'FAIL');
  console.log('Has unsupported claim:', hasUnsupported ? 'PASS' : 'FAIL');
  console.log('Has all-caps:', hasAllCaps ? 'PASS' : 'FAIL');
  console.log('Has vague link:', hasVagueLink ? 'PASS' : 'FAIL');

  if (!hasBanned || !hasAbsolute || !hasUnsupported || !hasAllCaps || !hasVagueLink) {
    throw new Error('Acceptance Test 1 FAILED required finding verifications');
  }

  console.log('\n====================================================');
  console.log('ACCEPTANCE TEST 2: Confidential Content Review');
  console.log('====================================================');

  const { data: content2, error: cErr2 } = await supabase
    .from('contents')
    .insert({
      org_id: ORG_ID,
      title: 'Acceptance Test 2 - Confidential Secret Project',
      channel: 'email',
      confidential: true,
      status: 'draft',
      created_by: CREATOR_ID,
      current_version: 1,
    })
    .select()
    .single();

  if (cErr2) throw new Error(`Create content 2 failed: ${cErr2.message}`);

  await supabase.from('content_versions').insert({
    content_id: content2.id,
    version: 1,
    body: SAMPLE_TEXT,
    created_by: CREATOR_ID,
    note: 'Confidential draft',
  });

  const result2 = await runReview(content2.id, CREATOR_ID);
  console.log('\nReview Status:', result2.status);
  console.log('Total Findings:', result2.findings.length);
  const aiFindingsInResult2 = result2.findings.filter((f) => f.origin === 'ai');
  console.log('AI Findings Count (must be 0):', aiFindingsInResult2.length);

  const { data: aiRuns2 } = await supabase
    .from('ai_runs')
    .select('*')
    .eq('content_id', content2.id)
    .order('created_at', { ascending: false })
    .limit(1);

  console.log('AI Run Log 2:', aiRuns2?.[0]);

  console.log('\n--- Acceptance Test 2 Verification ---');
  console.log('Used AI is false:', aiRuns2?.[0]?.used_ai === false ? 'PASS' : 'FAIL');
  console.log('Skipped reason is confidential_content:', aiRuns2?.[0]?.skipped_reason === 'confidential_content' ? 'PASS' : 'FAIL');
  console.log('0 AI findings:', aiFindingsInResult2.length === 0 ? 'PASS' : 'FAIL');

  if (aiRuns2?.[0]?.used_ai !== false || aiRuns2?.[0]?.skipped_reason !== 'confidential_content' || aiFindingsInResult2.length !== 0) {
    throw new Error('Acceptance Test 2 FAILED confidential verification');
  }

  console.log('\nALL ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
}

main().catch((err) => {
  console.error('Fatal error in acceptance tests:', err);
  process.exit(1);
});

