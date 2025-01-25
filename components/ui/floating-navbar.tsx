"use client";
import React, { JSX } from "react";
import {
  motion,
} from "motion/react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface NavItem {
  name: string;
  link: string;
  icon?: JSX.Element;
  onClick?: () => void;
}

export const FloatingNav = ({
  navItems,
  className,
}: {
  navItems: NavItem[];
  className?: string;
}) => {
  const handleClick = (e: React.MouseEvent, item: { link: string; onClick?: () => void }) => {
    if (item.onClick) {
      e.preventDefault();
      item.onClick();
    } else if (item.link.startsWith('http')) {
      e.preventDefault();
      const newWin = window.open(item.link, '_blank', 'noopener,noreferrer');
      if (newWin) newWin.opener = null;
    }
  };

  return (
    <motion.nav
      aria-label="Primary navigation"
      initial={{
        opacity: 0,
        y: -20,
      }}
      animate={{
        y: 0,
        opacity: 1,
      }}
      transition={{
        duration: 0.4,
        ease: "easeOut",
      }}
      className={cn(
        "flex max-w-fit fixed top-4 inset-x-0 mx-auto rounded-full backdrop-blur-xl bg-white/80 border border-black/10 shadow-lg shadow-black/5 z-[5000] px-2 sm:px-3 py-2 items-center justify-center gap-0.5 sm:gap-1",
        className
      )}
    >
      {navItems.map((navItem: NavItem, idx: number) => {
        const isSignOut = navItem.name === 'Sign Out';
        const baseClasses = cn(
          "relative items-center flex gap-1.5 px-3 sm:px-4 py-2 rounded-full transition-all duration-200 text-sm font-display font-semibold",
          isSignOut 
            ? "text-red-600 hover:bg-red-50 hover:text-red-700" 
            : "text-black/70 hover:text-black hover:bg-black/5"
        );
        
        // Use button for onClick handlers and external links
        if (navItem.onClick || navItem.link.startsWith('http') || navItem.link === '#') {
          return (
            <button
              key={`link=${idx}`}
              onClick={(e) => handleClick(e, navItem)}
              className={baseClasses}
            >
              <span className="flex-shrink-0 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-current">{navItem.icon}</span>
              <span className="hidden sm:block whitespace-nowrap">{navItem.name}</span>
            </button>
          );
        }
        
        // Use Next.js Link for internal navigation
        return (
          <Link
            key={`link=${idx}`}
            href={navItem.link}
            className={baseClasses}
          >
            <span className="flex-shrink-0 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-current">{navItem.icon}</span>
            <span className="hidden sm:block whitespace-nowrap">{navItem.name}</span>
          </Link>
        );
      })}
    </motion.nav>
  );
};
