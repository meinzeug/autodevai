import { useEffect, useCallback, useRef } from 'react';

type KeyboardEventHandler = (event: KeyboardEvent) => void;

interface UseKeyboardShortcutOptions {
  preventDefault?: boolean;
  stopPropagation?: boolean;
  target?: HTMLElement | Document | Window;
  enabled?: boolean;
}

// Hook for handling keyboard shortcuts
export function useKeyboardShortcut(
  keys: string | string[],
  callback: KeyboardEventHandler,
  options: UseKeyboardShortcutOptions = {}
) {
  const {
    preventDefault = true,
    stopPropagation = false,
    target = document,
    enabled = true
  } = options;

  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const keyArray = Array.isArray(keys) ? keys : [keys];
      const eventKey = getKeyString(event);

      if (keyArray.includes(eventKey)) {
        if (preventDefault) event.preventDefault();
        if (stopPropagation) event.stopPropagation();
        callbackRef.current(event);
      }
    },
    [keys, preventDefault, stopPropagation, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    const targetElement = target as EventTarget;
    targetElement.addEventListener('keydown', handleKeyDown as EventListener);

    return () => {
      targetElement.removeEventListener('keydown', handleKeyDown as EventListener);
    };
  }, [handleKeyDown, target, enabled]);
}

// Hook for handling key sequences (like Vim-style commands)
export function useKeySequence(
  sequence: string[],
  callback: () => void,
  options: { timeout?: number; enabled?: boolean } = {}
) {
  const { timeout = 1000, enabled = true } = options;
  const sequenceRef = useRef<string[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetSequence = useCallback(() => {
    sequenceRef.current = [];
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const key = getKeyString(event);
      sequenceRef.current.push(key);

      // Reset timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Check if sequence matches
      if (sequenceMatches(sequenceRef.current, sequence)) {
        event.preventDefault();
        callback();
        resetSequence();
        return;
      }

      // Check if current sequence could still match
      if (!sequenceCouldMatch(sequenceRef.current, sequence)) {
        resetSequence();
      } else {
        // Set timeout to reset sequence
        timeoutRef.current = setTimeout(resetSequence, timeout);
      }
    },
    [sequence, callback, resetSequence, timeout, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      resetSequence();
    };
  }, [handleKeyDown, resetSequence, enabled]);

  return resetSequence;
}

// Hook for detecting if user is currently typing in an input
export function useIsTyping(): boolean {
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const handleFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (isInputElement(target)) {
        setIsTyping(true);
      }
    };

    const handleBlur = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (isInputElement(target)) {
        setIsTyping(false);
      }
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  return isTyping;
}

// Hook for handling escape key to close modals/menus
export function useEscapeKey(callback: () => void, enabled = true) {
  useKeyboardShortcut('Escape', callback, { enabled });
}

// Hook for handling common navigation shortcuts
export function useNavigationShortcuts(callbacks: {
  onSearch?: () => void;
  onHelp?: () => void;
  onSettings?: () => void;
  onHome?: () => void;
  onRefresh?: () => void;
}) {
  const { onSearch, onHelp, onSettings, onHome, onRefresh } = callbacks;

  useKeyboardShortcut('ctrl+k', onSearch || (() => {}), { enabled: !!onSearch });
  useKeyboardShortcut('cmd+k', onSearch || (() => {}), { enabled: !!onSearch });
  useKeyboardShortcut('?', onHelp || (() => {}), { enabled: !!onHelp });
  useKeyboardShortcut('ctrl+,', onSettings || (() => {}), { enabled: !!onSettings });
  useKeyboardShortcut('cmd+,', onSettings || (() => {}), { enabled: !!onSettings });
  useKeyboardShortcut('g h', onHome || (() => {}), { enabled: !!onHome });
  useKeyboardShortcut('ctrl+r', onRefresh || (() => {}), { enabled: !!onRefresh });
  useKeyboardShortcut('cmd+r', onRefresh || (() => {}), { enabled: !!onRefresh });
}

// Helper functions
function getKeyString(event: KeyboardEvent): string {
  const parts: string[] = [];

  if (event.ctrlKey) parts.push('ctrl');
  if (event.metaKey) parts.push('cmd');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');

  parts.push(event.key.toLowerCase());

  return parts.join('+');
}

function sequenceMatches(current: string[], target: string[]): boolean {
  if (current.length !== target.length) return false;
  return current.every((key, index) => key === target[index]);
}

function sequenceCouldMatch(current: string[], target: string[]): boolean {
  if (current.length > target.length) return false;
  return current.every((key, index) => key === target[index]);
}

function isInputElement(element: HTMLElement): boolean {
  const tagName = element.tagName.toLowerCase();
  const isInput = tagName === 'input' || tagName === 'textarea';
  const isContentEditable = element.contentEditable === 'true';
  const isSelect = tagName === 'select';

  return isInput || isContentEditable || isSelect;
}

// Hook for global keyboard shortcuts that work even when inputs are focused
export function useGlobalKeyboardShortcut(
  keys: string | string[],
  callback: KeyboardEventHandler,
  options: Omit<UseKeyboardShortcutOptions, 'target'> = {}
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!options.enabled) return;

      const keyArray = Array.isArray(keys) ? keys : [keys];
      const eventKey = getKeyString(event);

      if (keyArray.includes(eventKey)) {
        if (options.preventDefault) event.preventDefault();
        if (options.stopPropagation) event.stopPropagation();
        callbackRef.current(event);
      }
    },
    [keys, options.preventDefault, options.stopPropagation, options.enabled]
  );

  useEffect(() => {
    if (!options.enabled) return;

    // Use capture phase to catch events before they reach inputs
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyDown, options.enabled]);
}

// Import useState for useIsTyping hook
import { useState } from 'react';