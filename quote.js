// Función de Vercel: GET /api/quote?symbols=GGAL.BA,AAPL
// Consulta Yahoo Finance desde el servidor (el navegador no puede hacerlo directo).
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

async function one(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (r.status === 404) return { error: 'símbolo no encontrado' }
  if (!r.ok) return { error: 'Yahoo respondió ' + r.status }
  const j = await r.json()
  const res = j && j.chart && j.chart.result && j.chart.result[0]
  const m = res && res.meta
  if (!m || typeof m.regularMarketPrice !== 'number') return { error: (j && j.chart && j.chart.error && j.chart.error.description) || 'sin precio' }
  return { price: m.regularMarketPrice, currency: m.currency || '', time: new Date((m.regularMarketTime || Date.now() / 1000) * 1000).toISOString(), name: m.shortName || m.longName || '' }
}

module.exports = async (req, res) => {
  const raw = String((req.query && req.query.symbols) || '')
  const symbols = [...new Set(raw.split(',').map(s => s.trim().toUpperCase()).filter(s => /^[A-Z0-9.\-^=]{1,20}$/.test(s)))].slice(0, 40)
  if (!symbols.length) { res.status(400).json({ error: 'Falta ?symbols=' }); return }
  const out = {}
  await Promise.all(symbols.map(async s => { try { out[s] = await one(s) } catch (e) { out[s] = { error: 'sin conexión con Yahoo' } } }))
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
  res.status(200).json(out)
}
