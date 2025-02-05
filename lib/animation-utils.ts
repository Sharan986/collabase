import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register GSAP plugins
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Common easing functions
export const ease = {
  power1: "power1.out",
  power2: "power2.out",
  power3: "power3.out",
  power4: "power4.out",
  back: "back.out(1.7)",
  elastic: "elastic.out(1, 0.3)",
  bounce: "bounce.out",
  circ: "circ.out",
  expo: "expo.out",
} as const;

// Common scroll trigger configurations
export const scrollTriggerDefaults = {
  start: "top 80%",
  end: "top 20%",
  toggleActions: "play none none reverse",
} as const;

// Text splitting utility
export const splitText = (text: string, type: "chars" | "words" | "lines" = "chars") => {
  switch (type) {
    case "chars":
      return text.split("");
    case "words":
      return text.split(/(\s+)/);
    case "lines":
      return text.split("\n");
    default:
      return [text];
  }
};

// Random character generator for shuffle effect
export const getRandomChar = () => {
  const chars = "!<>-_\\/[]{}—=+*^?#________";
  return chars[Math.floor(Math.random() * chars.length)];
};

// Stagger configuration helper
export const getStagger = (count: number, duration: number = 0.5) => {
  return {
    each: duration / count,
    from: "start",
  };
};

export { gsap, ScrollTrigger };
