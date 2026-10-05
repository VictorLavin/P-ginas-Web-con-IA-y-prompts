// Cliente de la API del backend (servlets + MySQL)
const KernelAPI = (() => {
  const call = async (path, opts) => {
    const r = await fetch(API_BASE + path, opts);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'HTTP ' + r.status);
    return data;
  };
  return {
    save: payload => call('/boots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
    list: os => call('/boots?limit=10&os=' + os),
    stats: os => call('/stats?os=' + os)
  };
})();
