export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('patientContext');
}

export function signOut() {
  clearSession();
  window.location.replace('/login');
}
