import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type AssistantOverlayContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const AssistantOverlayContext = createContext<AssistantOverlayContextValue | undefined>(undefined);

export function AssistantOverlayProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle],
  );

  return (
    <AssistantOverlayContext.Provider value={value}>{children}</AssistantOverlayContext.Provider>
  );
}

export function useAssistantOverlay() {
  const ctx = useContext(AssistantOverlayContext);
  if (!ctx) {
    throw new Error('useAssistantOverlay вне AssistantOverlayProvider');
  }
  return ctx;
}
