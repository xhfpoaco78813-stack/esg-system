import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const allowedOrigins = new Set(['https://xhfpoaco78813-stack.github.io', 'http://127.0.0.1:4173', 'http://localhost:4173'])
const json = (origin: string, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://xhfpoaco78813-stack.github.io', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Vary': 'Origin' } })
const decodePayload = (token: string) => {
  const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
  return JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')))
}
const strongPassword = (value: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/.test(value)

Deno.serve(async req => {
  const origin = req.headers.get('Origin') || ''
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://xhfpoaco78813-stack.github.io', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Vary': 'Origin' } })
  if (req.method !== 'POST' || !allowedOrigins.has(origin)) return json(origin, { ok: false, error: '不允许的请求' }, 403)
  try {
    const auth = req.headers.get('Authorization') || ''
    const token = auth.replace(/^Bearer\s+/i, '')
    if (!token) return json(origin, { ok: false, error: '请先登入' }, 401)
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: identity, error: identityError } = await userClient.auth.getUser(token)
    if (identityError || !identity.user) return json(origin, { ok: false, error: '登入已失效' }, 401)
    if (decodePayload(token).aal !== 'aal2') return json(origin, { ok: false, error: '需要管理员双重验证' }, 403)
    const { data: callerRole } = await admin.from('esg_roles').select('role').eq('user_id', identity.user.id).maybeSingle()
    if (callerRole?.role !== 'admin') return json(origin, { ok: false, error: '没有账号管理权限' }, 403)
    const body = await req.json()
    const action = String(body.action || '')
    const roles = new Set(['learner', 'reviewer', 'admin'])
    if (action === 'list') {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }); if (error) throw error
      const ids = data.users.map(user => user.id)
      const { data: roleRows, error: roleError } = ids.length ? await admin.from('esg_roles').select('user_id,role').in('user_id', ids) : { data: [], error: null }; if (roleError) throw roleError
      const roleMap = new Map((roleRows || []).map(row => [row.user_id, row.role]))
      return json(origin, { ok: true, users: data.users.map(user => ({ id: user.id, email: user.email, name: user.user_metadata?.display_name || '', role: roleMap.get(user.id) || 'learner', disabled: Boolean(user.banned_until && new Date(user.banned_until) > new Date()), created_at: user.created_at, last_sign_in_at: user.last_sign_in_at, self: user.id === identity.user.id })) })
    }
    if (action === 'create') {
      const email = String(body.email || '').trim().toLowerCase(), password = String(body.password || ''), name = String(body.name || '').trim(), role = String(body.role || 'learner')
      if (!/^\S+@\S+\.\S+$/.test(email) || !strongPassword(password) || !roles.has(role)) return json(origin, { ok: false, error: '账号资料格式不正确' }, 400)
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: name } }); if (error) throw error
      const { error: roleError } = await admin.from('esg_roles').upsert({ user_id: data.user.id, role }); if (roleError) { await admin.auth.admin.deleteUser(data.user.id); throw roleError }
      await admin.from('esg_admin_audit').insert({ actor_id: identity.user.id, target_user_id: data.user.id, action: 'create_user', detail: { email, role } })
      return json(origin, { ok: true, user_id: data.user.id })
    }
    const userId = String(body.user_id || '')
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return json(origin, { ok: false, error: '使用者识别码无效' }, 400)
    if (action === 'set_role') {
      const role = String(body.role || ''); if (!roles.has(role) || userId === identity.user.id) return json(origin, { ok: false, error: '不能变更目前管理员自己的角色' }, 400)
      const { error } = await admin.from('esg_roles').upsert({ user_id: userId, role }); if (error) throw error
      await admin.from('esg_admin_audit').insert({ actor_id: identity.user.id, target_user_id: userId, action: 'set_role', detail: { role } })
      return json(origin, { ok: true })
    }
    if (action === 'set_disabled') {
      if (userId === identity.user.id) return json(origin, { ok: false, error: '不能停用目前登入的管理员' }, 400)
      const disabled = Boolean(body.disabled), { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: disabled ? '876000h' : 'none' }); if (error) throw error
      await admin.from('esg_admin_audit').insert({ actor_id: identity.user.id, target_user_id: userId, action: disabled ? 'disable_user' : 'enable_user', detail: {} })
      return json(origin, { ok: true })
    }
    if (action === 'reset_password') {
      const password = String(body.password || ''); if (!strongPassword(password)) return json(origin, { ok: false, error: '临时密码需至少12位，并包含大小写字母、数字及符号' }, 400)
      const { error } = await admin.auth.admin.updateUserById(userId, { password }); if (error) throw error
      await admin.from('esg_admin_audit').insert({ actor_id: identity.user.id, target_user_id: userId, action: 'reset_password', detail: {} })
      return json(origin, { ok: true })
    }
    return json(origin, { ok: false, error: '不支持的操作' }, 400)
  } catch (error) {
    console.error(error)
    return json(origin, { ok: false, error: '账号服务发生错误' }, 500)
  }
})

