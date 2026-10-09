// Node 22+ built-in fetch. Server credentials never go to the browser.
function createGateway(env, transport = fetch) {
  const url = env.SUPABASE_URL?.replace(/\/$/, '');
  const publishable = env.SUPABASE_PUBLISHABLE_KEY;
  const secret = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publishable || !secret) throw new Error('Configure backend Supabase environment variables.');
  async function call(path, { token, method = 'GET', body, server = false, headers = {} } = {}) {
    const credential = server ? secret : publishable;
    const response = await transport(`${url}${path}`, {
      method, headers: { apikey: credential, Authorization: `Bearer ${server ? secret : token}`,
        'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000),
    });
    const text = await response.text(); let data;
    try { data = text ? JSON.parse(text) : null; } catch { throw Object.assign(new Error('Unexpected database response.'), { status: 502 }); }
    if (!response.ok) throw Object.assign(new Error(data?.message || data?.msg || data?.error_description || 'Database request failed.'), { status: response.status >= 500 ? 502 : response.status, code: data?.code });
    return { data, headers: response.headers };
  }
  async function rpc(name, body) { return (await call(`/rest/v1/rpc/${name}`, { server: true, method: 'POST', body })).data; }
  async function table(table, select, token, filters = {}) {
    const rows = [];
    for (let offset = 0; offset < 20000;) {
      const query = new URLSearchParams({ select, order: 'id', ...filters, offset: String(offset), limit: '500' });
      const result = await call(`/rest/v1/${table}?${query}`, { token, headers: { Prefer: 'count=exact' } });
      const batch = result.data; rows.push(...batch); offset += batch.length;
      const total = Number(result.headers.get('content-range')?.split('/')[1]);
      if (Number.isFinite(total) && offset >= total) return rows;
      if (!batch.length) throw Object.assign(new Error('Incomplete database response.'), { status: 502 });
    }
    throw Object.assign(new Error('Too many records. Server aggregation is needed.'), { status: 413 });
  }
  async function authenticate(token, roles = ['property_staff', 'system_admin']) {
    if (!token) throw Object.assign(new Error('Sign in required.'), { status: 401 });
    const user = (await call('/auth/v1/user', { token })).data;
    if (!user?.id) throw Object.assign(new Error('Invalid session.'), { status: 401 });
    const profile = (await table('app_users', 'id,role,status', token, { id: `eq.${user.id}` }))[0];
    if (!profile || profile.status !== 'active' || !roles.includes(profile.role)) throw Object.assign(new Error('Active staff account required.'), { status: 403 });
    return { id: user.id, token, role: profile.role };
  }
  return { call, rpc, table, authenticate };
}
module.exports = { createGateway };
