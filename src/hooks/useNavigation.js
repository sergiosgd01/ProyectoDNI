import { useState, useCallback } from 'react';

export function useNavigation() {
  const [currentView, setCurrentView] = useState('home');

  const goTo = useCallback((view) => setCurrentView(view), []);
  const goHome = useCallback(() => setCurrentView('home'), []);

  return {
    currentView,
    goTo,
    goHome
  };
}