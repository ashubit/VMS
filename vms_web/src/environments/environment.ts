export const environment = {
  apiBaseUrl: typeof window === 'undefined' ? 'http://localhost:3000/api' : `http://${window.location.hostname}:3000/api`,
};
