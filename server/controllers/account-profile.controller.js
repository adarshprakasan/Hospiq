const mongoose = require('mongoose');
const AccountProfile = require('../models/AccountProfile');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Hospital = require('../models/Hospital');
const { fail } = require('../services/record-access');
const { validatedType } = require('../services/medical-files');

const visibleHospital = { deletedAt: null, status: { $ne: 'suspended' }, approvalStatus: { $ne: 'pending' } };

function profileUpdate(id, update) {
  return AccountProfile.updateOne({ _id: id }, update, { upsert: true });
}

exports.get = async (req, res) => {
  const account = req.account;
  const profile = await AccountProfile.findById(account.id).lean();
  const measurements = profile?.measurements;
  const { heightCm, weightKg } = measurements || {};
  res.json({
    name: account.name, email: account.email, phone: account.phone || '', role: account.role,
    publicId: account.publicId, createdAt: account.createdAt,
    preferredName: account.preferredName || '', photo: profile?.photo || null,
    measurements: measurements ? { ...measurements, bmi: heightCm && weightKg ? Math.round(weightKg / (heightCm / 100) ** 2 * 10) / 10 : null } : null,
    savedDoctorIds: profile?.savedDoctors || [], savedHospitalIds: profile?.savedHospitals || [],
  });
};

exports.update = async (req, res) => {
  const { name, preferredName, phone } = req.body;
  if (typeof name !== 'string' || !name.trim() || name.length > 200 ||
      typeof preferredName !== 'string' || preferredName.length > 100 ||
      typeof phone !== 'string' || phone.length > 40) throw fail(400, 'Enter a name and valid contact details');
  // Account contact and public display name are stored together on the signed-in account.
  await User.updateOne({ _id: req.account.id }, { $set: { name: name.trim(), phone: phone.trim(), preferredName: preferredName.trim() } });
  res.sendStatus(204);
};

exports.photo = async (req, res) => {
  const value = req.body.photo;
  if (value === null) {
    await AccountProfile.updateOne({ _id: req.account.id }, { $unset: { photo: 1 } });
  } else {
    const match = typeof value === 'string' && value.length <= 82000 && /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match) throw fail(400, 'Choose a JPEG or PNG profile photo');
    validatedType({ mimetype: match[1], buffer: Buffer.from(match[2], 'base64') });
    await profileUpdate(req.account.id, { $set: { photo: value } });
  }
  res.sendStatus(204);
};

exports.measurements = async (req, res) => {
  const { heightCm, weightKg, source } = req.body;
  const valid = (value, min, max) => value === null || (Number.isFinite(value) && value >= min && value <= max);
  if (!valid(heightCm, 20, 300) || !valid(weightKg, 0.1, 700) || !['manual', 'apple-export', 'csv'].includes(source)) {
    throw fail(400, 'Enter height in centimetres and weight in kilograms within the accepted ranges');
  }
  if (heightCm === null && weightKg === null) {
    await AccountProfile.updateOne({ _id: req.account.id }, { $unset: { measurements: 1 } });
  } else {
    await profileUpdate(req.account.id, { $set: { measurements: { heightCm, weightKg, source, updatedAt: new Date() } } });
  }
  res.sendStatus(204);
};

exports.saved = async (req, res) => {
  const profile = await AccountProfile.findById(req.account.id).select('savedDoctors savedHospitals').lean();
  const [hospitals, doctors] = await Promise.all([
    Hospital.find({ _id: { $in: profile?.savedHospitals || [] }, ...visibleHospital }).select('name address type').lean(),
    Doctor.find({ _id: { $in: profile?.savedDoctors || [] }, deletedAt: null }).select('name department hospitalId').populate({ path: 'hospitalId', match: visibleHospital, select: 'name' }).lean(),
  ]);
  res.json({ hospitals, doctors: doctors.filter(doctor => doctor.hospitalId) });
};

exports.bookmark = async (req, res) => {
  const { kind, id } = req.params;
  if (!['doctor', 'hospital'].includes(kind) || !mongoose.isObjectIdOrHexString(id)) throw fail(400, 'Invalid care provider');
  const field = kind === 'doctor' ? 'savedDoctors' : 'savedHospitals';
  if (req.method === 'DELETE') {
    await AccountProfile.updateOne({ _id: req.account.id }, { $pull: { [field]: id } });
  } else {
    const doctor = kind === 'doctor' ? await Doctor.findOne({ _id: id, deletedAt: null }).select('hospitalId') : null;
    const hospitalId = kind === 'doctor' ? doctor?.hospitalId : id;
    if (!hospitalId || !await Hospital.exists({ _id: hospitalId, ...visibleHospital })) throw fail(404, 'Care provider is unavailable');
    await AccountProfile.updateOne({ _id: req.account.id }, { $setOnInsert: { _id: req.account.id } }, { upsert: true });
    const saved = await AccountProfile.updateOne({
      _id: req.account.id,
      $or: [{ [field]: id }, { [field + '.99']: { $exists: false } }],
    }, { $addToSet: { [field]: id } });
    if (!saved.matchedCount) throw fail(409, 'You can save up to 100 providers of each type');
  }
  res.sendStatus(204);
};
