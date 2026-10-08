import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Content-Type': 'application/json'
};

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.startsWith('Bearer ')) return new Response(JSON.stringify({ error:'authentication required' }), { status:401, headers });
  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global:{ headers:{ Authorization:authorization } } }
  );
  try {
    const body = await request.json();
    if (body.action === 'list') {
      const { data, error } = await client.rpc('esg_get_questions_v41', {
        p_jurisdiction:String(body.jurisdiction || 'CN'),
        p_limit:Number(body.limit || 20)
      });
      if (error) throw error;
      return new Response(JSON.stringify({ questions:data }), { headers });
    }
    if (body.action === 'submit') {
      const { data, error } = await client.rpc('esg_check_answer_v41', {
        p_question_id:String(body.question_id || ''),
        p_answer:body.answer ?? null
      });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers });
    }
    return new Response(JSON.stringify({ error:'unsupported action' }), { status:400, headers });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error:'request failed' }), { status:400, headers });
  }
});
