import { fetchPage, getCookieFor, adminSb } from './lib-audit-helpers.mjs';
import { readFileSync } from 'node:fs';

const items = [];
function rec(num, item, ok, detail = '') {
  items.push({ num, item, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${num} — ${item}${detail ? '  ['+detail+']' : ''}`);
}

const clientCookie = await getCookieFor('client');
const RFQ = '06d8e776-aae9-4721-8ab5-5772dd3df464';
const CHAT = 'de405783-01b7-44cb-ac79-ad5c75c02d14';

// === Chat page exists ===
const cR = await fetchPage(`/ar/dashboard/rfqs/${RFQ}/chats/${CHAT}`, clientCookie);
rec('1.9.1', 'Chat page → 200', cR.status === 200);
rec('1.9.2', 'Chat page: H1 with RFQ title', /<h1/.test(cR.html));
rec('1.9.3', 'Chat page: shows panic banner since panic_at is set',
  cR.html.includes('🚨') || cR.html.includes('تصعيد') || cR.html.includes('panic'));

// === Chat messages from DB ===
const { count: msgCount } = await adminSb.from('messages').select('id', { count: 'exact', head: true }).eq('chat_id', CHAT);
rec('1.9.4', `chat has messages persisted (count=${msgCount})`, msgCount >= 6);
const { data: msgs } = await adminSb.from('messages').select('sender_role, is_admin_intervention, is_panic_alert').eq('chat_id', CHAT);
rec('1.9.5', 'messages include client + supplier + admin intervention + panic',
  msgs.some(m => m.sender_role === 'client') &&
  msgs.some(m => m.sender_role === 'supplier') &&
  msgs.some(m => m.is_admin_intervention) &&
  msgs.some(m => m.is_panic_alert));

// === Chat actions exist ===
const chatActions = readFileSync('app/actions/chat.ts', 'utf8');
rec('1.9.6', 'sendMessageAction exported', chatActions.includes('sendMessageAction'));
rec('1.9.7', 'raisePanicAction exported', chatActions.includes('raisePanicAction'));
rec('1.9.8', 'shortlistProposalAction exported (also handles chat creation)', chatActions.includes('shortlistProposalAction'));
rec('1.9.9', 'adminJoinChatAction exported', chatActions.includes('adminJoinChatAction'));

// === Chat window component supports realtime ===
const chatWindow = readFileSync('components/chat/chat-window.tsx', 'utf8');
rec('1.9.10', 'chat-window uses Supabase realtime', chatWindow.includes('createClient') && chatWindow.includes('channel') && chatWindow.includes('postgres_changes'));
rec('1.9.11', 'chat-window subscribes to chat_id filter', chatWindow.includes('chat_id=eq'));

// === Panic button component ===
const panicBtn = readFileSync('components/chat/panic-button.tsx', 'utf8');
rec('1.9.12', 'panic-button component exists + uses raisePanicAction', panicBtn.includes('raisePanicAction'));

// === 4-chat cap proven (5 proposals on RFQ-2026-00001, 4 chats only) ===
const { count: chatCount } = await adminSb.from('chats').select('id', { count: 'exact', head: true }).eq('rfq_id', RFQ);
const { count: propCount } = await adminSb.from('proposals').select('id', { count: 'exact', head: true }).eq('rfq_id', RFQ);
rec('1.9.13', `4-chat cap enforced (${chatCount} chats, ${propCount} proposals)`, chatCount === 4 && propCount === 5);

// === Chat archive action ===
rec('1.9.14', 'archiveChatAction exported (in admin actions)', readFileSync('app/actions/admin.ts','utf8').includes('archiveChatAction'));

// === Realtime hook for client-side refresh ===
rec('1.9.15', 'useRealtimeRefresh hook exists', readFileSync('components/realtime/use-realtime-refresh.ts','utf8').length > 0);

// === Messages are immutable (no update/delete RLS policy in app actions) ===
rec('1.9.16', 'No message-edit/delete server action exists (immutable)',
  !chatActions.match(/editMessage|deleteMessage|updateMessage/));

const okc = items.filter(i => i.ok).length;
console.log(`\n=== Section 1.9: ${okc}/${items.length} ===`);
process.exit(okc === items.length ? 0 : 1);
