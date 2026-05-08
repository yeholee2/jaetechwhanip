const TEST_TITLE_RE = /^(test|asdf|qwer|dld|aaa|bbb|ccc|테스트|ㄴㄴ|ㅇㅇ)$/i;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shouldExecute = process.argv.includes('--execute');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
};

async function request(path, init = {}) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, { ...init, headers: { ...headers, ...init.headers } });
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} failed: ${res.status} ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

function isTestQuestion(question) {
  const title = String(question.title || '').replace(/\s+/g, ' ').trim();
  const body = String(question.body || '').replace(/\s+/g, ' ').trim();

  return (
    TEST_TITLE_RE.test(title) ||
    TEST_TITLE_RE.test(body) ||
    (title === body && title.length < 8)
  );
}

const candidates = await request('questions?select=id,title,body,slug,created_at&order=created_at.desc&limit=200');
const targets = candidates.filter(isTestQuestion);

console.log(`Found ${targets.length} test question(s).`);
for (const question of targets) {
  console.log(`- ${question.id} ${question.slug || ''} "${question.title}"`);
}

if (!shouldExecute) {
  console.log('Dry run only. Re-run with --execute to delete these rows.');
  process.exit(0);
}

for (const question of targets) {
  const answers = await request(`answers?question_id=eq.${encodeURIComponent(question.id)}&select=id`);
  const answerIds = answers.map(answer => answer.id);

  for (const answerId of answerIds) {
    await request(`comments?answer_id=eq.${encodeURIComponent(answerId)}`, { method: 'DELETE' }).catch(() => null);
    await request(`liked_answers?answer_id=eq.${encodeURIComponent(answerId)}`, { method: 'DELETE' }).catch(() => null);
  }

  await request(`answers?question_id=eq.${encodeURIComponent(question.id)}`, { method: 'DELETE' }).catch(() => null);
  await request(`liked_questions?question_id=eq.${encodeURIComponent(question.id)}`, { method: 'DELETE' }).catch(() => null);
  await request(`questions?id=eq.${encodeURIComponent(question.id)}`, { method: 'DELETE' });
}

console.log(`Deleted ${targets.length} test question(s).`);
