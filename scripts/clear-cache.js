import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearAndVerify() {
  // Clear all briefs
  const { data, error } = await supabase
    .from('firms')
    .update({ ai_brief: null, ai_brief_updated_at: null })
    .not('id', 'is', null)
    .select('id');

  if (error) {
    console.error('Update error:', error.message);
    process.exit(1);
  }
  console.log(`Update touched ${data.length} rows.`);

  // Verify King & Spalding specifically
  const { data: ks } = await supabase
    .from('firms')
    .select('name, ai_brief, ai_brief_updated_at')
    .eq('name', 'King & Spalding')
    .single();
  console.log(`King & Spalding ai_brief: ${ks.ai_brief === null ? 'NULL ✓' : `"${ks.ai_brief.substring(0, 80)}..." ✗`}`);

  // Count remaining non-null briefs
  const { data: remaining } = await supabase
    .from('firms')
    .select('id, name')
    .not('ai_brief', 'is', null);

  if (remaining.length > 0) {
    console.log(`${remaining.length} firms still have cached briefs. Retrying...`);
    for (const firm of remaining) {
      console.log(`  Still cached: ${firm.name}`);
    }
    // Force clear each one individually
    for (const firm of remaining) {
      await supabase
        .from('firms')
        .update({ ai_brief: null, ai_brief_updated_at: null })
        .eq('id', firm.id);
    }
    // Verify again
    const { data: check } = await supabase
      .from('firms')
      .select('id')
      .not('ai_brief', 'is', null);
    if (check.length > 0) {
      console.error(`FAILED: ${check.length} firms still have briefs after retry.`);
      process.exit(1);
    }
  }

  // Final count
  const { count } = await supabase
    .from('firms')
    .select('id', { count: 'exact', head: true });
  console.log(`\nVerified: all ${count} firms have ai_brief = NULL ✓`);
}

clearAndVerify();
