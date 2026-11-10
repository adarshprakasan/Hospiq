const { fail } = require('./record-access');

module.exports = function hospitalContact(body) {
  const fields = {};
  for (const [key, maxLength] of Object.entries({ contact: 40, email: 254, website: 2048 })) {
    if (body[key] === undefined) continue;
    if (typeof body[key] !== 'string' || body[key].length > maxLength) throw fail(400, `Invalid hospital ${key}`);
    fields[key] = body[key].trim();
  }
  if (fields.contact && !/^(?=(?:\D*\d){5,})\+?[\d ().-]+$/.test(fields.contact)) throw fail(400, 'Enter a valid hospital phone number');
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) throw fail(400, 'Enter a valid hospital email');
  if (fields.website) {
    let url;
    try { url = new URL(fields.website); } catch { throw fail(400, 'Enter a complete HTTP or HTTPS website URL'); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw fail(400, 'Enter a public HTTP or HTTPS website URL');
    fields.website = url.href;
  }
  return fields;
};
