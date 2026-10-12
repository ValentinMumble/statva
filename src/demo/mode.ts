const DEMO_KEY = 'statva-demo';

const readFlag = (): boolean => {
  try {
    return '1' === localStorage.getItem(DEMO_KEY);
  } catch {
    return false;
  }
};

/**
 * Whether the app runs on made-up data. Visitors choose it from the login screen; local
 * development uses it unless VITE_REAL_DATA=1 (then run `vercel dev`, which serves /api).
 */
const isDemo = (): boolean => readFlag() || (import.meta.env.DEV && '1' !== import.meta.env.VITE_REAL_DATA);

const enterDemo = () => {
  localStorage.setItem(DEMO_KEY, '1');
  window.location.assign('/');
};

const leaveDemo = () => {
  localStorage.removeItem(DEMO_KEY);
  window.location.assign('/');
};

export {enterDemo, isDemo, leaveDemo};
