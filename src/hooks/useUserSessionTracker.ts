import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiRequest } from '../lib/apiClient';

export function useUserSessionTracker() {
  const location = useLocation();

  useEffect(() => {
    // Only track if inside user panel (not on admin or login)
    if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/login')) {
      return;
    }

    const employeeCode = 'EMP001';

    // 1. Start or resume session
    apiRequest('/user/session/start', {
      method: 'POST',
      body: JSON.stringify({
        employeeCode,
        device: navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser',
      }),
    }).catch(() => {});

    // 2. Periodic heartbeat every 10 seconds (tracks active duration on user panel)
    const interval = setInterval(() => {
      apiRequest('/user/session/heartbeat', {
        method: 'POST',
        body: JSON.stringify({ employeeCode, elapsedSeconds: 10 }),
      }).catch(() => {});
    }, 10000);

    // 3. Tab visibility / Page leave listener
    const handleBeforeUnload = () => {
      navigator.sendBeacon?.(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1'}/user/session/heartbeat`,
        JSON.stringify({ employeeCode, elapsedSeconds: 5 })
      );
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [location.pathname]);
}

export async function recordUserLogout(employeeCode: string = 'EMP001') {
  try {
    await apiRequest('/user/session/logout', {
      method: 'POST',
      body: JSON.stringify({ employeeCode }),
    });
  } catch (e) {
    console.error('Logout session record failed:', e);
  }
}
