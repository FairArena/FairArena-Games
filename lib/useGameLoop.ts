"use client";

import { useEffect, useRef, useCallback } from "react";

export interface GameLoopOptions {
  onUpdate: (deltaTime: number, elapsed: number) => void;
  onRender: (deltaTime: number) => void;
  targetFPS?: number;
}

export function useGameLoop({
  onUpdate,
  onRender,
  targetFPS = 60,
}: GameLoopOptions) {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const isRunningRef = useRef<boolean>(false);
  const fpsRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(0);

  const onUpdateRef = useRef(onUpdate);
  const onRenderRef = useRef(onRender);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onRenderRef.current = onRender;
  }, [onUpdate, onRender]);

  const loop = useCallback((timestamp: number) => {
    if (!isRunningRef.current) return;

    const maxDelta = 1000 / 20; // cap at 20 fps min to avoid spiral of death
    const rawDelta = lastTimeRef.current ? timestamp - lastTimeRef.current : 0;
    const deltaTime = Math.min(rawDelta, maxDelta);
    lastTimeRef.current = timestamp;
    elapsedRef.current += deltaTime;

    // FPS tracking
    frameCountRef.current++;
    fpsTimerRef.current += deltaTime;
    if (fpsTimerRef.current >= 1000) {
      fpsRef.current = frameCountRef.current;
      frameCountRef.current = 0;
      fpsTimerRef.current = 0;
    }

    onUpdateRef.current(deltaTime, elapsedRef.current);
    onRenderRef.current(deltaTime);

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    lastTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    elapsedRef.current = 0;
    lastTimeRef.current = 0;
  }, []);

  const getFPS = useCallback(() => fpsRef.current, []);
  const getElapsed = useCallback(() => elapsedRef.current, []);

  // Pause on tab blur
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (isRunningRef.current) {
          isRunningRef.current = false;
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
        }
      } else {
        if (!isRunningRef.current && rafRef.current === null) {
          // Don't auto-resume — game must call start() again
          // But reset the timer to avoid delta spike
          lastTimeRef.current = 0;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { start, stop, reset, getFPS, getElapsed, isRunning: isRunningRef };
}
