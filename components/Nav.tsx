"use client";

import { useAuth } from '@/lib/firebase-context';
import { useRouter, usePathname } from 'next/navigation';
import { FloatingNav } from './ui/floating-navbar';
import { Users, LayoutDashboard, UserPlus, LogOut, Search, Mail, User } from 'lucide-react';

export default function Nav() {
  const { user, userProfile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Don't show nav on landing page or if user is not authenticated
  if (!user || !userProfile?.profileCompleted || pathname === '/') return null;

  // Determine which buttons to show based on user's intent and current team status
  const hasTeam = !!userProfile.currentTeam;
  const isCreator = userProfile.intent === 'create';

  const navItems = [];

  // Find Teams - always show as first item (replaces HACKHORIZON)
  navItems.push({
    name: 'Find Teams',
    link: '/matchmaking',
    icon: <Users className="h-4 w-4" />,
  });

  // Show Find Members for creators with a team
  if (isCreator && hasTeam) {
    navItems.push({
      name: 'Find Members',
      link: '/matchmaking/find-members',
      icon: <Search className="h-4 w-4" />,
    });
  }

  // Show Invites for joiners without a team
  if (!isCreator && !hasTeam) {
    navItems.push({
      name: 'Invites',
      link: '/invites',
      icon: <Mail className="h-4 w-4" />,
    });
  }

  // Show Create Team button if user is creator and doesn't have a team yet
  if (isCreator && !hasTeam) {
    navItems.push({
      name: 'Create Team',
      link: '/matchmaking/create-team',
      icon: <UserPlus className="h-4 w-4" />,
    });
  }

  // Show Dashboard if user has a team
  if (hasTeam) {
    navItems.push({
      name: 'My Team',
      link: '/dashboard',
      icon: <LayoutDashboard className="h-4 w-4" />,
    });
  }

  // Always show Profile
  navItems.push({
    name: 'Profile',
    link: '/profile',
    icon: <User className="h-4 w-4" />,
  });

  // Always show Sign Out
  navItems.push({
    name: 'Sign Out',
    link: '#',
    icon: <LogOut className="h-4 w-4" />,
    onClick: signOut,
  });

  return <FloatingNav navItems={navItems} />;
}
