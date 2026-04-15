"use client";

import { useEffect, useRef, useCallback } from "react";

type KeyCallback = () => void;

export function useKeyboard() {
  const pressedKeys = useRef<Set<string>>(new Set());
  const keyListeners = useRef<Map<string, KeyCallback[]>>(new Map());
  const heldListeners = useRef<Map<string, KeyCallback>>(new Map());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.code;
      if (!pressedKeys.current.has(key)) {
        pressedKeys.current.add(key);

        // Fire one-shot listeners
        const listeners = keyListeners.current.get(key);
        if (listeners) {
          listeners.forEach((cb) => cb());
        }
      }

      // Prevent space from scrolling page
      if (
        e.code === "Space" ||
        e.code === "ArrowUp" ||
        e.code === "ArrowDown" ||
        e.code === "ArrowLeft" ||
        e.code === "ArrowRight"
      ) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.current.delete(e.code);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const isPressed = useCallback((key: string): boolean => {
    return pressedKeys.current.has(key);
  }, []);

  const onPress = useCallback((key: string, callback: KeyCallback) => {
    if (!keyListeners.current.has(key)) {
      keyListeners.current.set(key, []);
    }
    keyListeners.current.get(key)!.push(callback);

    return () => {
      const listeners = keyListeners.current.get(key);
      if (listeners) {
        const idx = listeners.indexOf(callback);
        if (idx > -1) listeners.splice(idx, 1);
      }
    };
  }, []);

  const clearListeners = useCallback(() => {
    keyListeners.current.clear();
  }, []);

  return { isPressed, onPress, clearListeners, pressedKeys };
}
