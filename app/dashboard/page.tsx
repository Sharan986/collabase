"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase-context';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { themeClasses, getStateBadgeClass } from '@/lib/theme-utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Users, Target, Clock, Sparkles, Link2, MessageCircle, Crown, Trash2, LogOut, CheckCircle2, XCircle, UserMinus, ExternalLink, Search, Send, Mail } from 'lucide-react';
import { motion } from 'motion/react';

interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userSkills: string[];
  note: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

interface SentInvite {
  id: string;
  teamId: string;
  teamName: string;
  invitedUserId: string;
  invitedUserName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
}

interface Team {
  id: string;
  name: string;
  creatorId: string;
  creatorName: string;
  members: string[];
  skillsNeeded: string[];
  goal: string;
  timeCommitment: string;
  state: 'DRAFT' | 'OPEN' | 'FINALIZED' | 'LOCKED';
  whatsappLink?: string | null;
  discordLink?: string | null;
  createdAt: number;
}

export default function DashboardPage() {
  const { user, userProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [memberDetails, setMemberDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedNewCreator, setSelectedNewCreator] = useState<string>('');
  const [whatsappLink, setWhatsappLink] = useState('');
  const [discordLink, setDiscordLink] = useState('');
  const [savingLinks, setSavingLinks] = useState(false);
  const [sentInvites, setSentInvites] = useState<SentInvite[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    if (!userProfile?.profileCompleted) {
      router.push('/onboarding');
      return;
    }
    if (!userProfile?.currentTeam) {
      router.push('/matchmaking');
      return;
    }
  }, [user, userProfile, router]);

  // Fetch team data
  useEffect(() => {
    if (!userProfile?.currentTeam) return;

    const teamId = userProfile.currentTeam;
    
    const fetchTeamData = async () => {
      try {
        const teamDoc = await getDoc(doc(db, 'teams', teamId));
        if (!teamDoc.exists()) {
          toast.error('Team not found');
          router.push('/matchmaking');
          return;
        }

        const teamData = { id: teamDoc.id, ...teamDoc.data() } as Team;
        setTeam(teamData);
        setWhatsappLink(teamData.whatsappLink || '');
        setDiscordLink(teamData.discordLink || '');

        // Fetch member details
        const details = [];
        for (const memberId of teamData.members || []) {
          const memberDoc = await getDoc(doc(db, 'users', memberId));
          if (memberDoc.exists()) {
            details.push({ id: memberId, ...memberDoc.data() });
          }
        }
        setMemberDetails(details);
      } catch (error) {
        console.error('Error fetching team:', error);
        toast.error('Failed to load team');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [userProfile?.currentTeam, router]);

  // Real-time join requests listener (for team creators)
  useEffect(() => {
    if (!team || team.creatorId !== user?.uid || team.state !== 'OPEN') {
      setJoinRequests([]);
      return;
    }

    const requestsQuery = query(
      collection(db, 'joinRequests'),
      where('teamId', '==', team.id),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requests: JoinRequest[] = [];
      snapshot.forEach((doc) => {
        requests.push({ id: doc.id, ...doc.data() } as JoinRequest);
      });
      setJoinRequests(requests.sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => unsubscribe();
  }, [team, user]);

  // Real-time sent invites listener (for team creators)
  useEffect(() => {
    if (!team || !user || team.creatorId !== user.uid) {
      setSentInvites([]);
      return;
    }

    const invitesQuery = query(
      collection(db, 'teamInvites'),
      where('teamId', '==', team.id)
    );

    const unsubscribe = onSnapshot(invitesQuery, (snapshot) => {
      const invites: SentInvite[] = [];
      snapshot.forEach((docSnap) => {
        invites.push({ id: docSnap.id, ...docSnap.data() } as SentInvite);
      });
      // Sort by status (pending first) then by createdAt
      setSentInvites(invites.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        const aTime = a.createdAt?.toMillis?.() || a.createdAt || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt || 0;
        return bTime - aTime;
      }));
    });

    return () => unsubscribe();
  }, [team, user]);

  const handleAcceptRequest = async (request: JoinRequest) => {
    if (!team || team.members.length >= 5) {
      toast.error('Team is full (max 5 members)');
      return;
    }

    try {
      const batch = writeBatch(db);
      const updatedMembers = [...team.members, request.userId];

      // Add user to team
      batch.update(doc(db, 'teams', team.id), {
        members: updatedMembers,
      });

      // Update request status
      batch.update(doc(db, 'joinRequests', request.id), {
        status: 'accepted',
      });

      // Update user's currentTeam
      batch.update(doc(db, 'users', request.userId), {
        currentTeam: team.id,
      });

      await batch.commit();

      // Refresh team data
      const teamDoc = await getDoc(doc(db, 'teams', team.id));
      setTeam({ id: teamDoc.id, ...teamDoc.data() } as Team);

      // Fetch new member details
      const memberDoc = await getDoc(doc(db, 'users', request.userId));
      if (memberDoc.exists()) {
        setMemberDetails([...memberDetails, { id: memberDoc.id, ...memberDoc.data() }]);
      }

      toast.success(`${request.userName} joined the team!`);
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept request');
    }
  };

  const handleRejectRequest = async (request: JoinRequest) => {
    try {
      await updateDoc(doc(db, 'joinRequests', request.id), {
        status: 'rejected',
      });
      
      // Note: Toast will be shown on the user's client via real-time listener
      toast.success('Request rejected');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!team || team.creatorId !== user?.uid) return;

    try {
      const batch = writeBatch(db);
      const updatedMembers = team.members.filter((id: string) => id !== memberId);
      
      batch.update(doc(db, 'teams', team.id), {
        members: updatedMembers,
      });

      batch.update(doc(db, 'users', memberId), {
        currentTeam: null,
      });

      await batch.commit();

      setTeam({ ...team, members: updatedMembers } as Team);
      setMemberDetails(memberDetails.filter(m => m.id !== memberId));

      const removedMember = memberDetails.find(m => m.id === memberId);
      toast.success(`${removedMember?.displayName} removed from team`);
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleDeleteTeam = async () => {
    if (!team || team.creatorId !== user?.uid) return;

    try {
      const batch = writeBatch(db);

      // Remove all members
      for (const memberId of team.members) {
        batch.update(doc(db, 'users', memberId), {
          currentTeam: null,
        });
      }

      // Delete all join requests
      const requestsQuery = query(
        collection(db, 'joinRequests'),
        where('teamId', '==', team.id)
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      for (const requestDoc of requestsSnapshot.docs) {
        batch.delete(requestDoc.ref);
      }

      // Delete team
      batch.delete(doc(db, 'teams', team.id));

      await batch.commit();

      await refreshProfile();
      toast.success('Team deleted');
      router.push('/matchmaking');
    } catch (error) {
      console.error('Error deleting team:', error);
      toast.error('Failed to delete team');
    }
  };

  const handleFinalizeTeam = async () => {
    if (!team || team.creatorId !== user?.uid) return;

    if (team.members.length < 3) {
      toast.error('Team must have at least 3 members to finalize');
      return;
    }

    try {
      await updateDoc(doc(db, 'teams', team.id), {
        state: 'FINALIZED',
      });

      setTeam({ ...team, state: 'FINALIZED' } as Team);
      toast.success('Team finalized!');
      setShowFinalizeConfirm(false);
    } catch (error) {
      console.error('Error finalizing team:', error);
      toast.error('Failed to finalize team');
    }
  };

  const handleSaveLinks = async () => {
    if (!team) return;

    setSavingLinks(true);
    try {
      await updateDoc(doc(db, 'teams', team.id), {
        whatsappLink: whatsappLink.trim() || null,
        discordLink: discordLink.trim() || null,
      });

      toast.success('Links saved');
    } catch (error) {
      console.error('Error saving links:', error);
      toast.error('Failed to save links');
    } finally {
      setSavingLinks(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!team || !user) return;

    try {
      const batch = writeBatch(db);
      const updatedMembers = team.members.filter((id: string) => id !== user.uid);

      // If user is creator, they must promote someone first
      if (isCreator) {
        if (!selectedNewCreator) {
          toast.error('Please select a new team leader');
          return;
        }

        // Get new creator's details for updating creatorName
        const newCreatorDetails = memberDetails.find(m => m.id === selectedNewCreator);

        // Promote new creator and remove current user
        batch.update(doc(db, 'teams', team.id), {
          creatorId: selectedNewCreator,
          creatorName: newCreatorDetails?.displayName || '',
          members: updatedMembers,
        });
      } else {
        // Regular member leaving
        batch.update(doc(db, 'teams', team.id), {
          members: updatedMembers,
        });
      }

      // Clear user's currentTeam
      batch.update(doc(db, 'users', user.uid), {
        currentTeam: null,
      });

      await batch.commit();

      await refreshProfile();
      toast.success('You left the team');
      router.push('/matchmaking');
    } catch (error) {
      console.error('Error leaving team:', error);
      toast.error('Failed to leave team');
    }
  };

  if (loading || !team) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-16">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4" />
          <p className="font-display text-lg text-black/60">Loading your team...</p>
        </motion.div>
      </div>
    );
  }

  const isCreator = team.creatorId === user?.uid;
  const canDelete = isCreator && (team.state === 'DRAFT' || team.state === 'OPEN');
  const canFinalize = isCreator && team.state === 'OPEN' && team.members.length >= 3 && team.members.length <= 5;
  const canManageMembers = isCreator && (team.state === 'OPEN' || team.state === 'FINALIZED');
  const isLocked = team.state === 'LOCKED';

  return (
    <div className="relative min-h-screen w-full pt-20 sm:pt-24">
      {/* Fixed Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100/30 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 sm:mb-12"
          >
            <p className="font-mono text-xs sm:text-sm text-black/40 uppercase tracking-[0.2em] mb-2">
              Team Dashboard
            </p>
            <h1 className="font-[family-name:var(--font-pixel)] text-3xl sm:text-4xl md:text-5xl tracking-wider mb-2">
              {team.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4">
              <span className={getStateBadgeClass(team.state)}>{team.state}</span>
              <span className={cn(themeClasses.badge, themeClasses.badgeSecondary, 'flex items-center gap-1.5')}>
                <Users className="w-3.5 h-3.5" />
                {team.members.length}/5 members
              </span>
              {isCreator && (
                <span className={cn(themeClasses.badge, 'bg-purple-100 text-purple-700 flex items-center gap-1.5')}>
                  <Crown className="w-3.5 h-3.5" />
                  Team Leader
                </span>
              )}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6 sm:space-y-8 order-2 lg:order-1">
              {/* Team Overview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className={cn(themeClasses.card, 'p-6 sm:p-8')}
              >
                <h2 className={cn(themeClasses.headingDisplay, 'text-xl sm:text-2xl mb-6 flex items-center gap-2')}>
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Team Overview
                </h2>

                {/* Team Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                  <div className={cn(themeClasses.cardInner, 'p-4 sm:p-5')}>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-black/40" />
                      <p className={themeClasses.textMono}>Goal</p>
                    </div>
                    <p className="font-display font-bold text-lg capitalize">{team.goal}</p>
                  </div>
                  <div className={cn(themeClasses.cardInner, 'p-4 sm:p-5')}>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-black/40" />
                      <p className={themeClasses.textMono}>Commitment</p>
                    </div>
                    <p className="font-display font-bold text-lg capitalize">{team.timeCommitment?.replace('-', ' ')}</p>
                  </div>
                </div>

                {/* Skills Needed */}
                <div>
                  <p className={cn(themeClasses.textMono, 'mb-3')}>Skills Needed</p>
                  <div className="flex flex-wrap gap-2">
                    {team.skillsNeeded?.map((skill: string) => (
                      <span key={skill} className="px-3 py-1.5 bg-gradient-to-r from-black/5 to-black/10 rounded-full text-sm font-sans font-medium">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Success Message */}
                {isCreator && team.state === 'OPEN' && team.members.length >= 3 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-display font-bold text-green-800">Ready to finalize!</p>
                        <p className="text-sm text-green-600">Your team meets the minimum size requirement.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Members List */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={cn(themeClasses.card, 'p-6 sm:p-8')}
              >
                <h3 className={cn(themeClasses.headingDisplay, 'text-xl sm:text-2xl mb-6 flex items-center gap-2')}>
                  <Users className="w-5 h-5 text-blue-600" />
                  Team Members
                  <span className="ml-auto text-sm font-mono text-black/40 font-normal">
                    {memberDetails.length} of 5
                  </span>
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  {memberDetails.map((member, index) => (
                    <motion.div
                      key={`${member.id}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 * index }}
                      className={cn(
                        themeClasses.cardInner,
                        'p-4 sm:p-5 hover:border-black/20 transition-all',
                        member.id === team.creatorId && 'ring-2 ring-purple-200'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className={cn(
                          "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-display font-bold text-lg flex-shrink-0",
                          member.id === team.creatorId ? "bg-gradient-to-br from-purple-500 to-purple-700" : "bg-gradient-to-br from-gray-700 to-gray-900"
                        )}>
                          {member.displayName?.charAt(0)?.toUpperCase() || '?'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <p className="font-display font-bold text-base sm:text-lg truncate">{member.displayName}</p>
                            {member.id === team.creatorId && (
                              <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-mono uppercase rounded-full flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                Leader
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {member.primarySkills?.slice(0, 4).map((skill: string) => (
                              <span key={skill} className="text-xs px-2 py-1 bg-black/5 rounded-full">
                                {skill}
                              </span>
                            ))}
                            {member.primarySkills?.length > 4 && (
                              <span className="text-xs px-2 py-1 bg-black/5 rounded-full">
                                +{member.primarySkills.length - 4}
                              </span>
                            )}
                          </div>

                          <p className="text-xs sm:text-sm text-black/50 font-sans">
                            {member.role} · <span className="capitalize">{member.goal}</span>
                          </p>

                          {/* External Links */}
                          {(member.externalLinks?.github || member.externalLinks?.linkedin || member.externalLinks?.portfolio || member.externalLinks?.resumeUrl) && (
                            <div className="flex flex-wrap gap-3 mt-3">
                              {member.externalLinks?.github && (
                                <a href={member.externalLinks.github} target="_blank" rel="noopener noreferrer"
                                   className="text-xs text-black/60 hover:text-black flex items-center gap-1 transition-colors">
                                  <ExternalLink className="w-3 h-3" />
                                  GitHub
                                </a>
                              )}
                              {member.externalLinks?.linkedin && (
                                <a href={member.externalLinks.linkedin} target="_blank" rel="noopener noreferrer"
                                   className="text-xs text-black/60 hover:text-black flex items-center gap-1 transition-colors">
                                  <ExternalLink className="w-3 h-3" />
                                  LinkedIn
                                </a>
                              )}
                              {member.externalLinks?.portfolio && (
                                <a href={member.externalLinks.portfolio} target="_blank" rel="noopener noreferrer"
                                   className="text-xs text-black/60 hover:text-black flex items-center gap-1 transition-colors">
                                  <ExternalLink className="w-3 h-3" />
                                  Portfolio
                                </a>
                              )}
                              {member.externalLinks?.resumeUrl && (
                                <a href={member.externalLinks.resumeUrl} target="_blank" rel="noopener noreferrer"
                                   className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 transition-colors">
                                  <ExternalLink className="w-3 h-3" />
                                  Resume
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        {canManageMembers && member.id !== team.creatorId && !isLocked && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-sans flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-red-50 transition-all flex-shrink-0"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Remove</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* External Links */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className={cn(themeClasses.card, 'p-6 sm:p-8')}
              >
                <h3 className={cn(themeClasses.headingDisplay, 'text-xl sm:text-2xl mb-6 flex items-center gap-2')}>
                  <Link2 className="w-5 h-5 text-green-600" />
                  Communication Links
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="font-display font-bold text-xs sm:text-sm uppercase tracking-wide mb-2 text-black/70 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp Group
                    </label>
                    <input
                      type="url"
                      value={whatsappLink}
                      onChange={(e) => setWhatsappLink(e.target.value)}
                      placeholder="https://chat.whatsapp.com/..."
                      className={cn(themeClasses.input, 'text-sm')}
                    />
                  </div>
                  <div>
                    <label className="font-display font-bold text-xs sm:text-sm uppercase tracking-wide mb-2 text-black/70 flex items-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                      </svg>
                      Discord Server
                    </label>
                    <input
                      type="url"
                      value={discordLink}
                      onChange={(e) => setDiscordLink(e.target.value)}
                      placeholder="https://discord.gg/..."
                      className={cn(themeClasses.input, 'text-sm')}
                    />
                  </div>
                </div>
                <button
                  onClick={handleSaveLinks}
                  disabled={savingLinks}
                  className={cn(themeClasses.buttonPrimary, 'mt-6 text-sm py-3 px-6')}
                >
                  {savingLinks ? 'Saving...' : 'Save Links'}
                </button>
              </motion.div>
            </div>

            {/* Sidebar - Combined Join Requests and Quick Actions */}
            <div className="lg:col-span-1 order-1 lg:order-2 space-y-6">
              {/* Join Requests - Shown first/higher for visibility */}
              {isCreator && team.state === 'OPEN' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className={cn(themeClasses.card, 'p-5 sm:p-6')}
                >
                  <h3 className={cn(themeClasses.headingDisplay, 'text-lg sm:text-xl mb-4 flex items-center gap-2')}>
                    Join Requests
                    {joinRequests.length > 0 && (
                      <span className="ml-auto px-2 py-0.5 bg-orange-500 text-white text-xs font-mono rounded-full">
                        {joinRequests.length}
                      </span>
                    )}
                  </h3>
                  {joinRequests.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Users className="w-5 h-5 text-black/30" />
                      </div>
                      <p className="text-sm text-black/40 font-sans">No pending requests</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {joinRequests.map((request, index) => (
                        <motion.div
                          key={request.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className={cn(themeClasses.cardInner, 'p-4')}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                              {request.userName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-display font-bold text-sm truncate">{request.userName}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {request.userSkills.slice(0, 2).map((skill) => (
                                  <span key={skill} className="text-xs px-1.5 py-0.5 bg-black/5 rounded">
                                    {skill}
                                  </span>
                                ))}
                                {request.userSkills.length > 2 && (
                                  <span className="text-xs text-black/40">+{request.userSkills.length - 2}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {request.note && (
                            <p className="text-xs text-black/60 font-sans mb-3 italic bg-black/5 p-2 rounded-lg">
                              "{request.note}"
                            </p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptRequest(request)}
                              disabled={team.members.length >= 5}
                              className="flex-1 px-3 py-2 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 disabled:opacity-50 transition-all flex items-center justify-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request)}
                              className="flex-1 px-3 py-2 bg-black/5 text-black/70 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Quick Actions */}
              {!isLocked && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className={cn(themeClasses.card, 'p-5 sm:p-6')}
                >
                  <h3 className={cn(themeClasses.headingDisplay, 'text-lg sm:text-xl mb-4')}>
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    {/* Find Members - for team creators with OPEN teams */}
                    {isCreator && team.state === 'OPEN' && (team.members?.length || 0) < 5 && (
                      <button
                        onClick={() => router.push('/matchmaking/find-members')}
                        className={cn(
                          'w-full py-3 px-4 rounded-xl font-display font-bold text-sm transition-all',
                          'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700',
                          'flex items-center justify-center gap-2 shadow-lg shadow-blue-200'
                        )}
                      >
                        <Search className="w-4 h-4" />
                        Find Members
                      </button>
                    )}
                    {canFinalize && (
                      <button
                        onClick={() => setShowFinalizeConfirm(true)}
                        className={cn(
                          'w-full py-3 px-4 rounded-xl font-display font-bold text-sm transition-all',
                          'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700',
                          'flex items-center justify-center gap-2 shadow-lg shadow-green-200'
                        )}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Mark Team Complete
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full py-3 px-4 rounded-xl font-display font-bold text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Team
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedNewCreator('');
                        setShowLeaveModal(true);
                      }}
                      className="w-full py-3 px-4 rounded-xl font-display font-bold text-sm border-2 border-black/10 text-black/60 hover:border-red-200 hover:text-red-600 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Leave Team
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Sent Invites - for team creators */}
              {isCreator && sentInvites.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className={cn(themeClasses.card, 'p-5 sm:p-6')}
                >
                  <h3 className={cn(themeClasses.headingDisplay, 'text-lg sm:text-xl mb-4 flex items-center gap-2')}>
                    <Send className="w-4 h-4 text-blue-500" />
                    Sent Invites
                    <span className="ml-auto text-xs font-mono text-black/40 font-normal">
                      {sentInvites.filter(i => i.status === 'pending').length} pending
                    </span>
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {sentInvites.map((invite, index) => (
                      <motion.div
                        key={invite.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * index }}
                        className={cn(
                          themeClasses.cardInner,
                          'p-3',
                          invite.status === 'accepted' && 'bg-green-50/50 border-green-200',
                          invite.status === 'rejected' && 'bg-red-50/50 border-red-200'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0",
                            invite.status === 'pending' ? "bg-gradient-to-br from-blue-400 to-blue-600" :
                            invite.status === 'accepted' ? "bg-gradient-to-br from-green-400 to-green-600" :
                            "bg-gradient-to-br from-red-400 to-red-600"
                          )}>
                            {invite.invitedUserName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-display font-bold text-sm truncate">{invite.invitedUserName}</p>
                            <span className={cn(
                              'text-xs px-2 py-0.5 rounded-full',
                              invite.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              invite.status === 'accepted' ? 'bg-green-100 text-green-700' :
                              'bg-red-100 text-red-700'
                            )}>
                              {invite.status}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Support */}
          <div className="mt-12 text-center">
            <p className="font-mono text-[0.625rem] sm:text-xs text-black/30">
              Need help?{' '}
              <a 
                href="mailto:code.computesociety@gmail.com" 
                className="text-black/50 hover:text-black transition-colors underline underline-offset-2"
              >
                code.computesociety@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(themeClasses.card, 'p-6 sm:p-8 max-w-md w-full')}
          >
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="font-[family-name:var(--font-pixel)] text-xl sm:text-2xl mb-3 text-center tracking-wider">
              DELETE TEAM?
            </h2>
            <p className="font-sans text-sm sm:text-base text-black/70 mb-6 text-center">
              This will remove all members and cancel pending requests. This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 px-4 rounded-xl font-display font-bold text-sm border-2 border-black/10 hover:border-black/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTeam}
                className="flex-1 py-3 px-4 rounded-xl font-display font-bold text-sm bg-red-600 text-white hover:bg-red-700 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Team
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Finalize Confirmation Modal */}
      {showFinalizeConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(themeClasses.card, 'p-6 sm:p-8 max-w-md w-full')}
          >
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="font-[family-name:var(--font-pixel)] text-xl sm:text-2xl mb-3 text-center tracking-wider">
              FINALIZE TEAM?
            </h2>
            <p className="font-sans text-sm sm:text-base text-black/70 mb-6 text-center">
              Your team will be marked as complete. You won't be able to accept new members after this.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowFinalizeConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl font-display font-bold text-sm border-2 border-black/10 hover:border-black/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalizeTeam}
                className="flex-1 py-3 px-4 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Finalize
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Leave Team Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(themeClasses.card, 'p-6 sm:p-8 max-w-md w-full')}
          >
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6 text-orange-600" />
            </div>
            <h2 className="font-[family-name:var(--font-pixel)] text-xl sm:text-2xl mb-3 text-center tracking-wider">
              LEAVE TEAM?
            </h2>
            
            {isCreator ? (
              <>
                <p className="font-sans text-sm sm:text-base text-black/70 mb-4 text-center">
                  As the team leader, you must promote a new leader before leaving.
                </p>
                
                {team.members.length <= 1 ? (
                  <div className="p-4 bg-red-50 rounded-xl border border-red-200 mb-6">
                    <p className="font-sans text-sm text-red-700 text-center">
                      You are the only member. Please delete the team instead.
                    </p>
                  </div>
                ) : (
                  <>
                    <label className="font-display font-bold text-xs uppercase tracking-wide mb-2 block text-black/60 text-center">
                      Select New Team Leader
                    </label>
                    <select
                      value={selectedNewCreator}
                      onChange={(e) => setSelectedNewCreator(e.target.value)}
                      className={cn(themeClasses.input, 'mb-6 text-sm')}
                    >
                      <option value="">Choose a member...</option>
                      {memberDetails
                        .filter((m) => m.id !== user?.uid)
                        .map((member, index) => (
                          <option key={`${member.id}-${index}`} value={member.id}>
                            {member.displayName}
                          </option>
                        ))}
                    </select>
                  </>
                )}
              </>
            ) : (
              <p className="font-sans text-sm sm:text-base text-black/70 mb-6 text-center">
                You can join or create another team afterwards.
              </p>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-3 px-4 rounded-xl font-display font-bold text-sm border-2 border-black/10 hover:border-black/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveTeam}
                disabled={isCreator && (team.members.length <= 1 || !selectedNewCreator)}
                className="flex-1 py-3 px-4 rounded-xl font-display font-bold text-sm bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {isCreator && team.members.length > 1 ? 'Promote & Leave' : 'Leave Team'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
