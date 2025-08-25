
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const payload = JSON.parse(event.body || '{}');
    const store = getStore('reports');
    const line = JSON.stringify({ ...payload, at: new Date().toISOString() }) + '\n';
    await store.append('issues.log', line, { addRandomSuffix: false });
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    return { statusCode: 500, body: 'error' };
  }
};
