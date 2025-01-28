"use client";

import { motion, useSpring } from "framer-motion";
import { useEffect } from "react";

const SPRING = {
  mass: 0.1,
  damping: 10,
  stiffness: 131,
};

export function SpringMouseFollow() {
  const x = useSpring(0, SPRING);
  const y = useSpring(0, SPRING);
  const opacity = useSpring(0, SPRING);
  const scale = useSpring(0, SPRING);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      opacity.set(1);
      scale.set(1);
    };

    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [x, y, opacity, scale]);

  return (
    <motion.div
      style={{
        x,
        y,
        opacity,
        scale,
        translateX: "-50%",
        translateY: "-50%",
      }}
      className="hidden lg:block fixed left-0 top-0 z-[9999] h-5 w-5 rounded-full bg-orange-500 pointer-events-none"
    />
  );
}
