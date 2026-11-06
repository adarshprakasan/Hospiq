function publicUserId(id) {
  const value = String(id || "");
  if (!/^[a-f0-9]{24}$/i.test(value)) throw new Error("Invalid account ID");
  return `HQ-${value.toUpperCase()}`;
}
module.exports = { publicUserId };
