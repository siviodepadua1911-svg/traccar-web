import { useState, useEffect, useRef } from 'react';

const GLIDE_MS = 5000;
const MAX_GLIDE_METERS = 2000;
const FRAME_MS = 66;

const glideShown = new Map();
const glideListeners = new Set();
const publishGlide = () => { glideListeners.forEach((listener) => listener()); };

export const subscribeLsGlide = (listener) => {
  glideListeners.add(listener);
  return () => glideListeners.delete(listener);
};

export const getLsGlidePoint = (deviceId) => glideShown.get(deviceId);

const metersBetween = (a, b) => {
  const rad = Math.PI / 180;
  const x = (b.longitude - a.longitude) * rad * Math.cos(((a.latitude + b.latitude) / 2) * rad);
  const y = (b.latitude - a.latitude) * rad;
  return Math.sqrt(x * x + y * y) * 6371000;
};

const ease = (t) => 1 - (1 - t) * (1 - t);

export default (positions, enabled) => {
  const [output, setOutput] = useState(positions);
  const animsRef = useRef(new Map());
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const anims = animsRef.current;
    const now = performance.now();

    positions.forEach((target) => {
      const anim = anims.get(target.deviceId);
      if (!anim) {
        anims.set(target.deviceId, { shown: target, target, start: 0 });
        glideShown.set(target.deviceId, [target.longitude, target.latitude]);
      } else if (anim.target.latitude !== target.latitude || anim.target.longitude !== target.longitude) {
        const origin = { ...anim.shown };
        if (metersBetween(origin, target) > MAX_GLIDE_METERS) {
          anims.set(target.deviceId, { shown: target, target, start: 0 });
          glideShown.set(target.deviceId, [target.longitude, target.latitude]);
        } else {
          anims.set(target.deviceId, { origin, shown: origin, target, start: now });
          glideShown.set(target.deviceId, [origin.longitude, origin.latitude]);
        }
      } else {
        anim.target = target;
      }
    });
    Array.from(anims.keys()).forEach((key) => {
      if (!positions.some((p) => p.deviceId === key)) {
        anims.delete(key);
        glideShown.delete(key);
      }
    });
    publishGlide();

    const tick = () => {
      const time = performance.now();
      let animating = false;
      const list = positions.map((target) => {
        const anim = anims.get(target.deviceId);
        if (!anim || !anim.start) {
          return anim ? anim.target : target;
        }
        const t = Math.min(1, (time - anim.start) / GLIDE_MS);
        if (t >= 1) {
          anim.start = 0;
          anim.shown = anim.target;
          glideShown.set(target.deviceId, [anim.target.longitude, anim.target.latitude]);
          return anim.target;
        }
        animating = true;
        const k = ease(t);
        anim.shown = {
          ...anim.target,
          latitude: anim.origin.latitude + (anim.target.latitude - anim.origin.latitude) * k,
          longitude: anim.origin.longitude + (anim.target.longitude - anim.origin.longitude) * k,
        };
        glideShown.set(target.deviceId, [anim.shown.longitude, anim.shown.latitude]);
        return anim.shown;
      });
      setOutput(list);
      publishGlide();
      if (!animating && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    tick();
    timerRef.current = setInterval(tick, FRAME_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [positions, enabled]);

  return enabled ? output : positions;
};
