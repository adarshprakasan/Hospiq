export function newestOrder(previous, incoming) {
  if (!previous) return incoming;
  if (previous._id !== incoming._id) return incoming;
  if (previous.version > incoming.version) return previous;
  if (previous.version === incoming.version && new Date(previous.updatedAt).getTime() > new Date(incoming.updatedAt).getTime()) return previous;
  return incoming;
}
