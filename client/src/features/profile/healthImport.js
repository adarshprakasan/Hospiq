const appleTypes = {
  HKQuantityTypeIdentifierHeight: { field: 'heightCm', units: { cm: 1, m: 100, in: 2.54, ft: 30.48 } },
  HKQuantityTypeIdentifierBodyMass: { field: 'weightKg', units: { kg: 1, g: 0.001, lb: 0.45359237 } },
};

function readAppleExport(text) {
  if (/<!ENTITY/i.test(text)) throw new Error('This XML export contains unsupported entity declarations.');
  const xml = new DOMParser().parseFromString(text, 'application/xml');
  if (xml.documentElement.localName !== 'HealthData' || xml.querySelector('parsererror')) throw new Error('Choose export.xml from your Apple Health export.');
  const latest = {};
  for (const record of xml.getElementsByTagName('Record')) {
    const type = appleTypes[record.getAttribute('type')];
    if (!type) continue;
    const factor = type.units[record.getAttribute('unit')];
    const value = Number(record.getAttribute('value')) * factor;
    const rawDate = record.getAttribute('endDate') || '';
    const date = Date.parse(rawDate.replace(/^(\d{4}-\d\d-\d\d) (\d\d:\d\d:\d\d) ([+-]\d\d)(\d\d)$/, '$1T$2$3:$4'));
    if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(date) || (latest[type.field]?.date ?? -Infinity) >= date) continue;
    latest[type.field] = { value: Math.round(value * 100) / 100, date };
  }
  return Object.fromEntries(Object.entries(latest).map(([key, entry]) => [key, entry.value]));
}

export async function importMeasurements(file) {
  if (!/\.(xml|csv)$/i.test(file.name)) throw new Error('Choose an XML or CSV file.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose an export under 25 MB or use the two-column CSV template.');
  const text = await file.text();
  if (file.name.toLowerCase().endsWith('.xml')) {
    const values = readAppleExport(text);
    if (!Object.keys(values).length) throw new Error('No supported height or weight entries were found.');
    return validate({ ...values, source: 'apple-export' });
  }
  const [header, row, ...extra] = text.trim().split(/\r?\n/);
  if (header?.trim() !== 'height_cm,weight_kg' || !row || extra.length) throw new Error('Use the CSV template with one measurement row.');
  const fields = row.split(',').map(value => value.trim());
  if (fields.length !== 2 || fields.every(value => !value) || fields.some(value => value && !/^\d+(?:\.\d+)?$/.test(value))) {
    throw new Error('Enter numeric height and weight values in the CSV template.');
  }
  const values = { source: 'csv' };
  if (fields[0]) values.heightCm = Number(fields[0]);
  if (fields[1]) values.weightKg = Number(fields[1]);
  return validate(values);
}

function validate(values) {
  if ((values.heightCm !== undefined && (!Number.isFinite(values.heightCm) || values.heightCm < 20 || values.heightCm > 300)) ||
      (values.weightKg !== undefined && (!Number.isFinite(values.weightKg) || values.weightKg < 0.1 || values.weightKg > 700))) {
    throw new Error('Imported measurements must be 20–300 cm and 0.1–700 kg.');
  }
  return values;
}
