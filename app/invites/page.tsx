"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase-context';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { themeClasses } from '@/lib/theme-utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Mail, CheckCircle2, XCircle, Users, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface TeamInvite {
  id: string;
  teamId: string;
  teamName: string;
  invitedBy: string;
  invitedByName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
}

export default function InvitesPage() {
  const { user, userProfile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }
    if (!loading && userProfile && !userProfile.profileCompleted) {
      router.push('/onboarding');
      return;
    }
  }, [user, userProfile, loading, router]);

  // Listen for invites
  useEffect(() => {
    if (!user) return;

    const invitesQuery = query(
      collection(db, 'teamInvites'),
      where('invitedUserId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(invitesQuery, (snapshot) => {
      const invitesData: TeamInvite[] = [];
      snapshot.forEach((docSnap) => {
        invitesData.push({ id: docSnap.id, ...docSnap.data() } as TeamInvite);
      });
      // Sort by createdAt descending
      invitesData.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      setInvites(invitesData);
      setLoadingInvites(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAcceptInvite = async (invite: TeamInvite) => {
    if (!user || userProfile?.currentTeam) {
      toast.error('You are already in a team');
      return;
    }

    setProcessingInvite(invite.id);
    try {
      await runTransaction(db, async (transaction) => {
        // Get team data atomically
        const teamRef = doc(db, 'teams', invite.teamId);
        const teamDoc = await transaction.get(teamRef);
        
        if (!teamDoc.exists()) {
          throw new Error('TEAM_NOT_FOUND');
        }

        const teamData = teamDoc.data();
        if (teamData.members?.length >= 5) {
          throw new Error('TEAM_FULL');
        }

        if (teamData.state !== 'OPEN') {
          throw new Error('TEAM_CLOSED');
        }

        // All validations passed - perform atomic updates
        const updatedMembers = [...(teamData.members || []), user.uid];
        
        // Update team members
        transaction.update(teamRef, {
          members: updatedMembers,
        });

        // Update user's currentTeam
        transaction.update(doc(db, 'users', user.uid), {
          currentTeam: invite.teamId,
        });

        // Update invite status
        transaction.update(doc(db, 'teamInvites', invite.id), {
          status: 'accepted',
        });
      });

      // Decline all other pending invites (outside transaction - not critical)
      for (const otherInvite of invites.filter(i => i.id !== invite.id)) {
        await updateDoc(doc(db, 'teamInvites', otherInvite.id), {
          status: 'declined',
        });
      }

      await refreshProfile();
      toast.success(`You joined ${invite.teamName}!`);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error accepting invite:', error);
      
      // Handle specific validation errors
      if (error.message === 'TEAM_NOT_FOUND') {
        toast.error('Team no longer exists');
        await updateDoc(doc(db, 'teamInvites', invite.id), { status: 'declined' });
      } else if (error.message === 'TEAM_FULL') {
        toast.error('Team is already full');
        await updateDoc(doc(db, 'teamInvites', invite.id), { status: 'declined' });
      } else if (error.message === 'TEAM_CLOSED') {
        toast.error('Team is no longer accepting members');
        await updateDoc(doc(db, 'teamInvites', invite.id), { status: 'declined' });
      } else {
        toast.error('Failed to accept invite');
      }
    } finally {
      setProcessingInvite(null);
    }
  };

  const handleDeclineInvite = async (invite: TeamInvite) => {
    setProcessingInvite(invite.id);
    try {
      await updateDoc(doc(db, 'teamInvites', invite.id), {
        status: 'declined',
      });
      toast.success('Invite declined');
    } catch (error) {
      console.error('Error declining invite:', error);
      toast.error('Failed to decline invite');
    } finally {
      setProcessingInvite(null);
    }
  };

  if (loading || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4" />
          <p className="font-display text-lg text-black/60">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full pt-20 sm:pt-24">
      {/* Fixed Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-100/30 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 sm:mb-12"
          >
            <Link 
              href="/matchmaking" 
              className="inline-flex items-center gap-2 text-sm text-black/60 hover:text-black mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Find Teams
            </Link>
            <p className="font-mono text-xs sm:text-sm text-black/40 uppercase tracking-[0.2em] mb-2">
              Team Invites
            </p>
            <h1 className="font-pixel text-3xl sm:text-4xl md:text-5xl tracking-wider mb-2">
              YOUR INVITES
            </h1>
            <p className="font-sans text-base sm:text-lg text-black/60">
              Teams that want you to join them
            </p>
          </motion.div>

          {/* Invites List */}
          {loadingInvites ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-4 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4" />
              <p className="text-black/60">Loading invites...</p>
            </div>
          ) : invites.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(themeClasses.card, 'p-12 text-center')}
            >
              <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-black/30" />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">No Pending Invites</h3>
              <p className="text-black/60 mb-6">
                When team creators invite you to join their team, you'll see them here.
              </p>
              <Link 
                href="/matchmaking"
                className={cn(themeClasses.buttonPrimary, 'inline-flex items-center gap-2')}
              >
                <Users className="w-4 h-4" />
                Browse Teams
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {invites.map((invite, index) => (
                <motion.div
                  key={invite.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * index }}
                  className={cn(themeClasses.card, 'p-5 sm:p-6')}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Team Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-display font-bold">
                          {invite.teamName?.charAt(0)?.toUpperCase() || 'T'}
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-lg">{invite.teamName}</h3>
                          <p className="text-xs text-black/50">
                            Invited by {invite.invitedByName}
                          </p>
                        </div>
                      </div>
                      {invite.createdAt && (
                        <div className="flex items-center gap-1 text-xs text-black/40 mt-2">
                          <Clock className="w-3 h-3" />
                          {new Date(invite.createdAt.toMillis()).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 sm:flex-shrink-0">
                      <button
                        onClick={() => handleAcceptInvite(invite)}
                        disabled={processingInvite === invite.id || !!userProfile?.currentTeam}
                        className={cn(
                          'flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-display font-bold text-sm transition-all flex items-center justify-center gap-2',
                          userProfile?.currentTeam
                            ? 'bg-black/5 text-black/40 cursor-not-allowed'
                            : 'bg-green-500 text-white hover:bg-green-600'
                        )}
                      >
                        {processingInvite === invite.id ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        <span className="hidden sm:inline">Accept</span>
                      </button>
                      <button
                        onClick={() => handleDeclineInvite(invite)}
                        disabled={processingInvite === invite.id}
                        className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-display font-bold text-sm bg-black/5 text-black/60 hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Decline</span>
                      </button>
                    </div>
                  </div>

                  {userProfile?.currentTeam && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xs text-yellow-700">
                        You're already in a team. Leave your current team to accept this invite.
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
