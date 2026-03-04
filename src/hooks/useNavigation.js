import { useState, useCallback } from 'react';

export function useNavigation() {
  const getInitialView = () => {
    const path = window.location.pathname;
    if (path === '/jornadas-caceres') return 'jornadas-caceres';
    if (path === '/jornadas-merida' || path === '/jorndas-merida') return 'jornadas-merida';
    return 'home';
  };

  const [currentView, setCurrentView] = useState(getInitialView());

  const goTo = useCallback((view) => {
    setCurrentView(view);

    // Manage URL path for navigation
    const paths = {
      'jornadas-caceres': '/jornadas-caceres',
      'jornadas-merida': '/jornadas-merida',
      'home': '/'
    };

    if (paths[view]) {
      window.history.pushState({}, '', paths[view]);
    } else if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
  }, []);

  const goHome = useCallback(() => {
    setCurrentView('home');
    window.history.pushState({}, '', '/');
  }, []);

  return {
    currentView,
    goTo,
    goHome
  };
}