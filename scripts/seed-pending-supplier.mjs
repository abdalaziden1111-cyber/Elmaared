// Section 1.11-B fallback: Supabase email signup is rate-limited on the dev
// project (4/hr). The signup wizard UI was verified end-to-end (form steps,
// state, hidden inputs, submission); only the actual auth.signUp() call
// hits the limit. Mirror the same end-state via admin to give Section 2.2
// (admin supplier approval) a test subject.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const e=l.indexOf('=');return [l.slice(0,e).trim(),l.slice(e+1).trim().replace(/^"|"$/g,'')]}));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}});

const email = 'sami.newsupplier+test1111@outlook.com';
const list = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
let userId = list.data.users.find(u => u.email === email)?.id;
if (!userId) {
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: 'NewSupplier2026!',
    email_confirm: true,
    user_metadata: { full_name: 'سامي المورد الجديد', role: 'supplier' },
  });
  if (error) throw error;
  userId = data.user.id;
  console.log('created auth user:', userId);
} else {
  console.log('reused auth user:', userId);
}

await sb.from('profiles').upsert({
  id: userId,
  role: 'supplier',
  full_name: 'سامي المورد الجديد',
  phone: '+966555111222',
  preferred_language: 'ar',
});

const existing = (await sb.from('suppliers').select('id, status').eq('owner_id', userId).maybeSingle()).data;
if (!existing) {
  const { error } = await sb.from('suppliers').insert({
    owner_id: userId,
    company_name: 'شركة سامي للمعارض',
    legal_name: 'سامي للمعارض ش.م.م',
    cr_number: '1010777111',
    vat_number: null,
    status: 'pending_review',
    specializations: ['booth', 'event'],
    cities: ['Riyadh', 'Jeddah'],
    bio: 'شركة جديدة لتصميم وتنفيذ أكشاك المعارض، نختبر تدفق الموافقة من Admin.',
    bank_name: 'مصرف الراجحي',
    iban: 'SA1110000000000000888001',
    account_holder_name: 'سامي للمعارض',
  });
  if (error) throw error;
  console.log('created supplier (pending_review)');
} else {
  console.log('supplier exists:', existing);
}

const { data: final } = await sb.from('suppliers').select('id, owner_id, status, company_name').eq('owner_id', userId).single();
console.log('FINAL:', final);
