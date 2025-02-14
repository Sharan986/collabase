import { cn } from './utils';

// Shared theme classes matching landing page aesthetic
export const themeClasses = {
  // Cards
  card: 'backdrop-blur-lg bg-white/70 rounded-3xl border border-black/10',
  cardHover: 'hover:border-black/20 transition-all hover:scale-[1.02]',
  cardInner: 'backdrop-blur-sm bg-white/40 rounded-2xl border border-black/5',
  
  // Buttons
  buttonPrimary: 'bg-black text-white px-8 py-4 rounded-full font-display font-bold hover:bg-black/90 transition-all hover:scale-105 active:scale-95',
  buttonSecondary: 'border-2 border-black/20 text-black px-8 py-4 rounded-full font-display font-bold hover:border-black transition-all',
  buttonDanger: 'bg-red-600 text-white px-8 py-4 rounded-full font-display font-bold hover:bg-red-700 transition-all hover:scale-105 active:scale-95',
  
  // Typography
  headingPixel: 'font-pixel tracking-wider',
  headingDisplay: 'font-display font-bold',
  textMono: 'font-mono text-xs uppercase tracking-wider text-black/40',
  
  // Badges
  badge: 'px-3 py-1 rounded-full text-sm font-sans',
  badgePrimary: 'bg-black text-white',
  badgeSecondary: 'bg-black/10 text-black/70',
  
  // State badges
  stateDraft: 'bg-gray-400 text-white',
  stateOpen: 'bg-green-500 text-white',
  stateFinalized: 'bg-blue-600 text-white',
  stateLocked: 'bg-red-600 text-white',
  
  // Request status
  statusPending: 'bg-yellow-400 text-black',
  statusAccepted: 'bg-green-500 text-white',
  statusRejected: 'bg-red-500 text-white',
  
  // Inputs
  input: 'w-full px-4 py-3 rounded-lg border-2 border-black/20 bg-white/50 focus:border-black focus:outline-none',
  
  // Section
  section: 'min-h-screen w-full flex items-center justify-center px-4 py-20',
};

export function getStateBadgeClass(state: string): string {
  const baseClass = cn(themeClasses.badge, 'font-mono uppercase text-xs');
  switch (state) {
    case 'DRAFT':
      return cn(baseClass, themeClasses.stateDraft);
    case 'OPEN':
      return cn(baseClass, themeClasses.stateOpen);
    case 'FINALIZED':
      return cn(baseClass, themeClasses.stateFinalized);
    case 'LOCKED':
      return cn(baseClass, themeClasses.stateLocked);
    default:
      return cn(baseClass, themeClasses.badgeSecondary);
  }
}

export function getRequestStatusBadgeClass(status: string): string {
  const baseClass = cn(themeClasses.badge, 'font-mono uppercase text-xs');
  switch (status) {
    case 'pending':
      return cn(baseClass, themeClasses.statusPending);
    case 'accepted':
      return cn(baseClass, themeClasses.statusAccepted);
    case 'rejected':
      return cn(baseClass, themeClasses.statusRejected);
    default:
      return cn(baseClass, themeClasses.badgeSecondary);
  }
}
