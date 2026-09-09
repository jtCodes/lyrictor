const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const { default: handler } = await import('../../api/lyrictor-meta.js');
  const { default: sitemap } = await import('../../api/sitemap.js');
  const baseHtml = fs.readFileSync('index.html', 'utf8');
  const originalFetch = global.fetch;
  const originalEnv = [process.env.VITE_FIREBASE_PROJECT_ID, process.env.VITE_FIREBASE_API_KEY];
  process.env.VITE_FIREBASE_PROJECT_ID = 'test';
  process.env.VITE_FIREBASE_API_KEY = 'test';
  const project = { name: 'IVE - BLACKHOLE', songName: 'BLACKHOLE', artistName: 'IVE' };
  let mode = 'found';
  const encode = (value) => typeof value === 'string' ? { stringValue: value }
    : { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, val]) => [key, encode(val)])) } };
  global.fetch = async (url) => {
    if (url.endsWith('/index.html')) return new Response(baseHtml);
    assert.ok(url.includes('/documents/published'), 'Only publicly published data is accessed');
    if (mode === 'missing') return new Response('', { status: 404 });
    if (mode === 'error') return new Response('', { status: 503 });
    const doc = { name: 'projects/test/databases/(default)/documents/published/blackhole', fields: {
      projectDetail: encode(project), username: encode('first'),
    } };
    if (url.includes('/documents/published?')) return Response.json({ documents: [doc] });
    return Response.json(doc);
  };
  async function render(fn, id) {
    const result = { headers: {}, setHeader(k, v) { this.headers[k] = v; },
      status(code) { this.code = code; return this; }, send(body) { this.body = body; } };
    await fn({ headers: { host: 'preview.example', 'x-forwarded-proto': 'https' }, query: { publishedId: id } }, result);
    return result;
  }
  try {
    let result = await render(handler, 'blackhole');
    assert.equal(result.code, 200);
    assert.ok(result.body.includes('<title>BLACKHOLE • IVE | Lyrictor</title>'));
    assert.ok(result.body.includes('href="https://lyrictor.com/lyrictor/blackhole"'));
    const jsonLd = html => JSON.parse(html.match(/id="lyrictor-published-jsonld"[^>]*>(.*?)<\/script>/s)[1]);
    assert.equal(jsonLd(result.body).name, project.name);
    assert.ok(result.body.includes('<div id="root"></div>'));
    assert.ok(!result.body.includes('left:-9999px'));
    project.name = '</script><img src=x onerror=alert(1)> & "Song"';
    result = await render(handler, 'blackhole');
    assert.equal(jsonLd(result.body).name, project.name);
    assert.ok(!result.body.includes('<img src=x'));
    mode = 'missing';
    result = await render(handler, 'absent');
    assert.equal(result.code, 404);
    assert.ok(result.body.includes('content="noindex,follow"'));
    assert.ok(!result.body.includes('lyrictor-published-jsonld'));
    result = await render(handler, 'local');
    assert.equal(result.code, 200);
    assert.ok(result.body.includes('content="noindex,follow"'));
    mode = 'error';
    result = await render(handler, 'blackhole');
    assert.equal(result.code, 503);
    assert.equal(result.headers['Retry-After'], '60');
    mode = 'found';
    result = await render(sitemap);
    assert.equal(result.code, 200);
    assert.ok(result.body.includes('<loc>https://lyrictor.com/lyrictor/blackhole</loc>'));
    assert.ok(!result.body.includes('preview.example'));
    assert.ok(!result.body.includes('/lyrictor/local<'));
    console.log('SEO checks passed: metadata, JSON-LD escaping, initial content, status codes, canonical URLs, sitemap.');
  } finally {
    global.fetch = originalFetch;
    ['VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_API_KEY'].forEach((key, i) => {
      if (originalEnv[i] === undefined) delete process.env[key]; else process.env[key] = originalEnv[i];
    });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
