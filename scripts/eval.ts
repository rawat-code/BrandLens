import fs from 'fs';
import path from 'path';
import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { runRuleChecks } from '../src/lib/review/rules';
import { redact } from '../src/lib/review/redact';
import { retrieve } from '../src/lib/review/retrieve';
import { judgeContentWithAi } from '../src/lib/review/judge';
import type { Guideline, Fact, Term, FindingCategory } from '../src/lib/types';

loadEnvConfig(process.cwd());

interface TestSample {
  id: string;
  title: string;
  channel: string;
  should_be_clean: boolean;
  expected_rule_keys: string[];
  body: string;
}

interface TestSet {
  metadata: {
    title: string;
    brand: string;
    synthetic: boolean;
    description: string;
    total_samples: number;
    clean_samples_count: number;
    violation_samples_count: number;
  };
  samples: TestSample[];
}

interface CategoryMetric {
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
  f1: number;
}

// Fallback seed data in case Supabase credentials or database are offline
const DEFAULT_GUIDELINES: Guideline[] = [
  {
    id: 'g-tone-1',
    org_id: 'org-verdant-demo',
    title: 'Brand Tone: Friendly, Professional, Never Pushy',
    category: 'tone',
    body: 'Verdant Skin speaks with warmth, empathy, and professional expertise. Never use aggressive urgency tactics (e.g. "BUY NOW BEFORE GONE"), artificial scarcity, or shaming language.',
    clarification: 'Keep communication informative, empowering the consumer rather than pressuring them.',
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'g-msg-1',
    org_id: 'org-verdant-demo',
    title: 'Messaging Pillars: Gentle, Plant-Based, Transparent',
    category: 'messaging',
    body: 'All communications must reinforce our three core pillars: gentle formulations for sensitive skin, ethically sourced plant-based botanicals, and full ingredient transparency.',
    clarification: 'Every product story should highlight botanical integrity and clean formulation standards.',
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'g-claim-1',
    org_id: 'org-verdant-demo',
    title: 'Claims Policy: Medical & Efficacy Guardrails',
    category: 'claim',
    body: 'Never guarantee 100% results, promise immediate cures, or make medical disease-treatment claims. Any quantifiable result claim requires citing an approved fact and a survey timeframe of at least 4 weeks.',
    clarification: 'Skincare products nourish and support healthy skin; they do not diagnose, treat, or cure illness.',
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'g-a11y-1',
    org_id: 'org-verdant-demo',
    title: 'Digital Accessibility Standards',
    category: 'accessibility',
    body: 'Include meaningful alt text for images. Never write entire paragraphs or headlines in ALL CAPS. Use descriptive link text rather than "click here", and camelCase multi-word hashtags.',
    clarification: 'Ensure screen readers can interpret copy cleanly without jarring capitalization artifacts.',
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'g-brand-1',
    org_id: 'org-verdant-demo',
    title: 'Brand Naming & Identity Specification',
    category: 'terminology',
    body: 'Spell and capitalize the brand name exactly as "Verdant Skin" with two words and standard Title Case. Never concatenate as "VerdantSkin" or use lowercase "verdant skin".',
    clarification: 'Consistent typography preserves trademark and brand authority.',
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEFAULT_FACTS: Fact[] = [
  {
    id: 'f-1',
    org_id: 'org-verdant-demo',
    statement: 'Formulated without parabens and synthetic fragrance',
    owner: 'Dr. Maya Lin, R&D',
    source_note: 'Formulation Audit Report 2026-A',
    expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
    status: 'approved',
    created_at: new Date().toISOString(),
  },
  {
    id: 'f-2',
    org_id: 'org-verdant-demo',
    statement: 'In a 4-week user survey of 60 people, 78 percent reported smoother-feeling skin',
    owner: 'Sarah Chen, Clinical Studies',
    source_note: 'Perception Study VSK-2025-04',
    expires_at: new Date(Date.now() + 180 * 86400000).toISOString(),
    status: 'approved',
    created_at: new Date().toISOString(),
  },
  {
    id: 'f-3',
    org_id: 'org-verdant-demo',
    statement: 'Free shipping on orders above 999 rupees',
    owner: 'Operations Team',
    source_note: 'Domestic Logistics Policy v2.3',
    expires_at: new Date(Date.now() + 300 * 86400000).toISOString(),
    status: 'approved',
    created_at: new Date().toISOString(),
  },
  {
    id: 'f-4',
    org_id: 'org-verdant-demo',
    statement: '100% recyclable post-consumer glass packaging across all serums',
    owner: 'Eco Packaging Group',
    source_note: 'Sustainability Certification 2025-G',
    expires_at: new Date(Date.now() + 250 * 86400000).toISOString(),
    status: 'approved',
    created_at: new Date().toISOString(),
  },
  {
    id: 'f-5',
    org_id: 'org-verdant-demo',
    statement: 'Features cold-pressed rosehip seed oil harvested in Himachal Pradesh',
    owner: 'Botanical Sourcing Lead',
    source_note: 'Supplier Origin Certificate #HP-882',
    expires_at: new Date(Date.now() + 200 * 86400000).toISOString(),
    status: 'approved',
    created_at: new Date().toISOString(),
  },
  {
    id: 'f-6',
    org_id: 'org-verdant-demo',
    statement: 'Dermatologist-tested on 120 participants with sensitive skin with zero adverse reactions',
    owner: 'Dr. Maya Lin, R&D',
    source_note: 'Dermatological Patch Trial DP-601',
    expires_at: new Date(Date.now() + 270 * 86400000).toISOString(),
    status: 'approved',
    created_at: new Date().toISOString(),
  },
  {
    id: 'f-7',
    org_id: 'org-verdant-demo',
    statement: 'Introductory launch discount: 20% off all bundles until October 2025',
    owner: 'Growth Marketing',
    source_note: 'Q3 2025 Promotional Plan',
    expires_at: '2025-10-31T23:59:59.000Z',
    status: 'expired',
    created_at: new Date().toISOString(),
  },
  {
    id: 'f-8',
    org_id: 'org-verdant-demo',
    statement: 'Complimentary botanical sample kit with every monsoon order',
    owner: 'Retention Marketing',
    source_note: 'Monsoon Seasonal Campaign 2025',
    expires_at: '2025-09-15T23:59:59.000Z',
    status: 'expired',
    created_at: new Date().toISOString(),
  },
];

const DEFAULT_TERMS: Term[] = [
  {
    id: 't-1',
    org_id: 'org-verdant-demo',
    term: 'cure',
    kind: 'banned',
    replacement: 'support healthy skin',
    note: 'Cosmetics cannot claim to cure medical conditions.',
  },
  {
    id: 't-2',
    org_id: 'org-verdant-demo',
    term: 'miracle',
    kind: 'banned',
    replacement: 'effective',
    note: 'Avoid sensationalist claims unsupported by data.',
  },
  {
    id: 't-3',
    org_id: 'org-verdant-demo',
    term: 'guaranteed results',
    kind: 'banned',
    replacement: 'visible improvements',
    note: 'Every skin type reacts individually; guarantees violate compliance.',
  },
  {
    id: 't-4',
    org_id: 'org-verdant-demo',
    term: 'anti-aging magic',
    kind: 'banned',
    replacement: 'rejuvenating botanical care',
    note: 'Unscientific framing conflicting with transparent pillar.',
  },
  {
    id: 't-5',
    org_id: 'org-verdant-demo',
    term: 'chemical-free',
    kind: 'banned',
    replacement: 'synthetic additive-free',
    note: 'All matter is chemical; scientifically inaccurate.',
  },
  {
    id: 't-6',
    org_id: 'org-verdant-demo',
    term: 'dermatologist-approved',
    kind: 'caution',
    replacement: 'dermatologist-tested',
    note: 'Requires verified dermatological trial fact citation.',
  },
  {
    id: 't-7',
    org_id: 'org-verdant-demo',
    term: 'natural',
    kind: 'caution',
    replacement: 'plant-derived',
    note: 'Ambiguous marketing term; specify botanical source.',
  },
  {
    id: 't-8',
    org_id: 'org-verdant-demo',
    term: 'Verdant Skin',
    kind: 'preferred',
    replacement: null,
    note: 'Official brand identity.',
  },
];

async function loadLibraryData() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    try {
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      const [gRes, fRes, tRes] = await Promise.all([
        supabase.from('guidelines').select('*'),
        supabase.from('facts').select('*'),
        supabase.from('terms').select('*'),
      ]);

      if (gRes.data && gRes.data.length > 0) {
        return {
          guidelines: gRes.data as Guideline[],
          facts: fRes.data as Fact[],
          terms: tRes.data as Term[],
          source: 'Supabase Database',
        };
      }
    } catch {
      // Fall through to defaults
    }
  }

  return {
    guidelines: DEFAULT_GUIDELINES,
    facts: DEFAULT_FACTS,
    terms: DEFAULT_TERMS,
    source: 'Default Verdant Skin Seed Context',
  };
}

function mapRuleKeyToCategory(ruleKey: string): FindingCategory {
  if (ruleKey.startsWith('term.')) return 'terminology';
  if (ruleKey.startsWith('claim.')) return 'claim';
  if (ruleKey.startsWith('fact.')) return 'fact';
  if (ruleKey.startsWith('a11y.')) return 'accessibility';
  if (ruleKey.startsWith('security.')) return 'security';
  if (ruleKey.startsWith('tone.')) return 'tone';
  if (ruleKey.startsWith('messaging.')) return 'messaging';
  return 'claim';
}

async function runEvaluation() {
  console.log('======================================================');
  console.log('🧪 BrandLens Benchmark Evaluation Harness');
  console.log('======================================================\n');

  const testsetPath = path.join(process.cwd(), 'eval', 'testset.json');
  if (!fs.existsSync(testsetPath)) {
    throw new Error(`Testset not found at ${testsetPath}`);
  }

  const testset: TestSet = JSON.parse(fs.readFileSync(testsetPath, 'utf-8'));
  const { guidelines, facts, terms, source } = await loadLibraryData();

  console.log(`Loaded library from: ${source}`);
  console.log(`Guidelines: ${guidelines.length} | Facts: ${facts.length} | Terms: ${terms.length}`);
  console.log(`Test set: ${testset.samples.length} samples (${testset.metadata.clean_samples_count} clean, ${testset.metadata.violation_samples_count} violations)\n`);

  const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
  console.log(`Mode: ${hasApiKey ? 'Full Pipeline (Fixed Rules + Gemini AI Judge)' : 'Fixed Rules Only (Deterministic Engine)'}\n`);

  let cleanFlaggedCount = 0;
  let totalFindingsCount = 0;
  let humanCheckFindingsCount = 0;

  const categoryStats: Record<string, { tp: number; fp: number; fn: number }> = {
    terminology: { tp: 0, fp: 0, fn: 0 },
    claim: { tp: 0, fp: 0, fn: 0 },
    fact: { tp: 0, fp: 0, fn: 0 },
    accessibility: { tp: 0, fp: 0, fn: 0 },
    security: { tp: 0, fp: 0, fn: 0 },
    tone: { tp: 0, fp: 0, fn: 0 },
    messaging: { tp: 0, fp: 0, fn: 0 },
    visual: { tp: 0, fp: 0, fn: 0 },
  };

  const perSampleResults: Array<{
    id: string;
    title: string;
    should_be_clean: boolean;
    detected_rules: string[];
    expected_rules: string[];
    is_correct: boolean;
  }> = [];

  for (const sample of testset.samples) {
    // 1. Run deterministic rules
    const ruleFindings = runRuleChecks({
      contentId: sample.id,
      version: 1,
      body: sample.body,
      terms,
      guidelines,
      facts,
    });

    let detectedFindings = [...ruleFindings];

    // 2. If Gemini API key is available, run AI judge
    if (hasApiKey) {
      try {
        const { redactedText, mappings } = redact(sample.body);
        const sentences = sample.body
          .split(/[.!?\n]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        const approvedFacts = facts.filter((f) => f.status === 'approved');
        const retrievedChunks = retrieve(sentences, guidelines, approvedFacts, terms);

        const aiResult = await judgeContentWithAi({
          contentId: sample.id,
          version: 1,
          originalText: sample.body,
          redactedText,
          mappings,
          retrievedChunks,
          facts: approvedFacts,
          terms,
          ruleFindings,
        });

        detectedFindings = [...detectedFindings, ...aiResult.findings];
      } catch (err) {
        // AI degradation
        console.warn(`[AI Judge degraded on ${sample.id}]: ${(err as Error).message}`);
      }
    }

    totalFindingsCount += detectedFindings.length;
    humanCheckFindingsCount += detectedFindings.filter((f) => f.needs_human_check).length;

    const detectedRuleKeys = Array.from(new Set(detectedFindings.map((f) => f.rule_key)));
    const detectedCategories = Array.from(new Set(detectedFindings.map((f) => f.category)));

    const expectedRuleKeys = sample.expected_rule_keys;
    const expectedCategories = Array.from(
      new Set(expectedRuleKeys.map((k) => mapRuleKeyToCategory(k)))
    );

    // Evaluate Clean Samples
    if (sample.should_be_clean) {
      if (detectedFindings.length > 0) {
        cleanFlaggedCount++;
        // Flag all detected categories as FP
        for (const cat of detectedCategories) {
          if (categoryStats[cat]) categoryStats[cat].fp += 1;
        }
      }
    } else {
      // Evaluate Violation Samples
      for (const cat of expectedCategories) {
        if (detectedCategories.includes(cat)) {
          categoryStats[cat].tp += 1;
        } else {
          categoryStats[cat].fn += 1;
        }
      }

      for (const cat of detectedCategories) {
        if (!expectedCategories.includes(cat)) {
          categoryStats[cat].fp += 1;
        }
      }
    }

    const isCorrect = sample.should_be_clean
      ? detectedFindings.length === 0
      : expectedRuleKeys.every((rk) => detectedRuleKeys.includes(rk));

    perSampleResults.push({
      id: sample.id,
      title: sample.title,
      should_be_clean: sample.should_be_clean,
      detected_rules: detectedRuleKeys,
      expected_rules: expectedRuleKeys,
      is_correct: isCorrect,
    });
  }

  // Calculate Category Metrics
  const calculatedCategoryMetrics: Record<string, CategoryMetric> = {};
  let totalTp = 0;
  let totalFp = 0;
  let totalFn = 0;

  for (const [cat, stat] of Object.entries(categoryStats)) {
    const precision = stat.tp + stat.fp > 0 ? stat.tp / (stat.tp + stat.fp) : 1.0;
    const recall = stat.tp + stat.fn > 0 ? stat.tp / (stat.tp + stat.fn) : 1.0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 1.0;

    calculatedCategoryMetrics[cat] = {
      tp: stat.tp,
      fp: stat.fp,
      fn: stat.fn,
      precision,
      recall,
      f1,
    };

    totalTp += stat.tp;
    totalFp += stat.fp;
    totalFn += stat.fn;
  }

  const overallPrecision = totalTp + totalFp > 0 ? totalTp / (totalTp + totalFp) : 1.0;
  const overallRecall = totalTp + totalFn > 0 ? totalTp / (totalTp + totalFn) : 1.0;
  const overallF1 =
    overallPrecision + overallRecall > 0
      ? (2 * overallPrecision * overallRecall) / (overallPrecision + overallRecall)
      : 1.0;

  const falseFlagRate =
    testset.metadata.clean_samples_count > 0
      ? cleanFlaggedCount / testset.metadata.clean_samples_count
      : 0;

  const abstentionRate =
    totalFindingsCount > 0 ? humanCheckFindingsCount / totalFindingsCount : 0;

  const resultsData = {
    metadata: {
      generated_at: new Date().toISOString(),
      dataset_size: testset.samples.length,
      clean_samples_count: testset.metadata.clean_samples_count,
      violation_samples_count: testset.metadata.violation_samples_count,
      model: hasApiKey ? (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite') : 'deterministic_rules_only',
      gemini_used: hasApiKey,
    },
    summary: {
      overall_precision: Number(overallPrecision.toFixed(4)),
      overall_recall: Number(overallRecall.toFixed(4)),
      overall_f1: Number(overallF1.toFixed(4)),
      false_flag_rate_on_clean_posts: Number(falseFlagRate.toFixed(4)),
      abstention_rate: Number(abstentionRate.toFixed(4)),
      total_findings: totalFindingsCount,
      needs_human_check_findings: humanCheckFindingsCount,
    },
    category_metrics: calculatedCategoryMetrics,
    per_sample_results: perSampleResults,
  };

  // Write results.json
  const resultsJsonPath = path.join(process.cwd(), 'eval', 'results.json');
  fs.writeFileSync(resultsJsonPath, JSON.stringify(resultsData, null, 2), 'utf-8');

  // Format RESULTS.md
  let markdown = `# BrandLens Evaluation Benchmark Results\n\n`;
  markdown += `> Generated automatically by \`scripts/eval.ts\` on ${new Date().toUTCString()}.\n`;
  markdown += `> Dataset: 40 synthetic marketing samples for fictional brand **Verdant Skin** (10 clean posts, 30 targeted violation posts).\n\n`;

  markdown += `## 1. Executive Summary\n\n`;
  markdown += `| Metric | Score | Note |\n`;
  markdown += `| :--- | :--- | :--- |\n`;
  markdown += `| **Overall Precision** | **${(overallPrecision * 100).toFixed(1)}%** | Ratio of relevant detected flags over total flags |\n`;
  markdown += `| **Overall Recall** | **${(overallRecall * 100).toFixed(1)}%** | Ratio of target violations successfully caught |\n`;
  markdown += `| **Overall F1 Score** | **${(overallF1 * 100).toFixed(1)}%** | Harmonic mean of Precision and Recall |\n`;
  markdown += `| **Clean False-Flag Rate** | **${(falseFlagRate * 100).toFixed(1)}%** | False alarms triggered on clean posts (${cleanFlaggedCount}/${testset.metadata.clean_samples_count}) |\n`;
  markdown += `| **Abstention Rate** | **${(abstentionRate * 100).toFixed(1)}%** | Findings marked \`needs_human_check: true\` without source citation (${humanCheckFindingsCount}/${totalFindingsCount}) |\n\n`;

  markdown += `## 2. Category Breakdown\n\n`;
  markdown += `| Category | TP | FP | FN | Precision | Recall | F1 Score |\n`;
  markdown += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  for (const [cat, metrics] of Object.entries(calculatedCategoryMetrics)) {
    if (metrics.tp + metrics.fp + metrics.fn === 0) continue;
    markdown += `| **${cat}** | ${metrics.tp} | ${metrics.fp} | ${metrics.fn} | ${(metrics.precision * 100).toFixed(1)}% | ${(metrics.recall * 100).toFixed(1)}% | ${(metrics.f1 * 100).toFixed(1)}% |\n`;
  }

  markdown += `\n## 3. Sample Evaluation Log\n\n`;
  markdown += `| ID | Sample Title | Type | Status | Expected Rules | Detected Rules |\n`;
  markdown += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  for (const s of perSampleResults) {
    const statusIcon = s.is_correct ? '✅ Pass' : '⚠️ Partial';
    const sampleType = s.should_be_clean ? 'Clean' : 'Violation';
    markdown += `| \`${s.id}\` | ${s.title} | ${sampleType} | ${statusIcon} | \`${s.expected_rules.join(', ') || 'none'}\` | \`${s.detected_rules.join(', ') || 'none'}\` |\n`;
  }

  markdown += `\n## 4. Benchmark Methodology & Safeguards\n\n`;
  markdown += `1. **No Source, No Flag Policy**: When a finding cannot cite a grounded guideline, fact, or term, the platform safely abstains (\`needs_human_check: true\`).\n`;
  markdown += `2. **Clean Post Integrity**: Clean posts undergo full lexical tokenization, claim sentence evaluation, and term variant matching to ensure creators are not impeded by erroneous flags.\n`;
  markdown += `3. **Adversarial Resilience**: Prompt injection attempts ("ignore instructions", "disregard prior prompts") are flagged under \`security.injection_attempt\` and handled strictly as inert data delimiters.\n`;

  const resultsMdPath = path.join(process.cwd(), 'eval', 'RESULTS.md');
  fs.writeFileSync(resultsMdPath, markdown, 'utf-8');

  console.log('------------------------------------------------------');
  console.log(`Overall Precision : ${(overallPrecision * 100).toFixed(1)}%`);
  console.log(`Overall Recall    : ${(overallRecall * 100).toFixed(1)}%`);
  console.log(`Overall F1 Score  : ${(overallF1 * 100).toFixed(1)}%`);
  console.log(`Clean False Flags : ${(falseFlagRate * 100).toFixed(1)}% (${cleanFlaggedCount}/${testset.metadata.clean_samples_count})`);
  console.log(`Abstention Rate   : ${(abstentionRate * 100).toFixed(1)}% (${humanCheckFindingsCount}/${totalFindingsCount})`);
  console.log('------------------------------------------------------');
  console.log(`\n✓ Results written to:`);
  console.log(`  - ${resultsJsonPath}`);
  console.log(`  - ${resultsMdPath}\n`);
}

runEvaluation().catch((err) => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});

