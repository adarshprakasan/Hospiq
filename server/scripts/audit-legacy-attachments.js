// Read-only inventory. Never print record identifiers, provider URLs, or credentials.
const mongoose = require('mongoose');
require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env'), quiet: true });

async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 8000 });
  const collection = mongoose.connection.collection('medicalrecords');
  const [inventory] = await collection.aggregate([
    { $match: { 'testResults.0': { $exists: true } } },
    { $project: { testResults: 1 } },
    { $unwind: '$testResults' },
    { $group: {
      _id: '$_id',
      references: { $sum: 1 },
      cloudinary: { $sum: { $cond: [
        { $regexMatch: { input: { $convert: { input: '$testResults', to: 'string', onError: '', onNull: '' } }, regex: '^https?://res\\.cloudinary\\.com/', options: 'i' } },
        1, 0,
      ] } },
    } },
    { $group: { _id: null, records: { $sum: 1 }, references: { $sum: '$references' }, cloudinary: { $sum: '$cloudinary' } } },
    { $project: { _id: 0 } },
  ]).toArray();
  console.log(JSON.stringify(inventory || { records: 0, references: 0, cloudinary: 0 }));
}
run().catch(err => {
  console.error('Legacy attachment inventory failed:', err.name);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
