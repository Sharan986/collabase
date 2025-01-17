"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/firebase-context';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { calculateSkillCoverage, getMissingSkills } from '@/lib/match-algorithm';
import { themeClasses, getStateBadgeClass } from '@/lib/theme-utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function TeamDetailPage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const teamId = params.id as string;

  const [team, setTeam] = useState<any>(null);
  const [memberDetails, setMemberDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestNote, setRequestNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userRequestStatus, setUserRequestStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Refs to access latest values in snapshot callback
  const userRequestStatusRef = useRef(userRequestStatus);
  const teamRef = useRef(team);

  // Keep refs in sync with state
  useEffect(() => {
    userRequestStatusRef.current = userRequestStatus;
  }, [userRequestStatus]);

  useEffect(() => {
    teamRef.current = team;
  }, [team]);

  useEffect(() => {
    if (!teamId || !user) return;

    const fetchTeam = async () => {
      try {
        const teamDoc = await getDoc(doc(db, 'teams', teamId));
        if (!teamDoc.exists()) {
          toast.error('Team not found');
          router.push('/matchmaking');
          return;
        }

        const teamData = { id: teamDoc.id, ...teamDoc.data() } as any;
        setTeam(teamData);

        // Fetch member details in parallel
        const memberPromises = (teamData.members || []).map((memberId: string) =>
          getDoc(doc(db, 'users', memberId))
        );
        const memberDocs = await Promise.all(memberPromises);
        const details = memberDocs
          .filter((memberDoc) => memberDoc.exists())
          .map((memberDoc) => ({ id: memberDoc.id, ...memberDoc.data() }));
        setMemberDetails(details);
      } catch (error) {
        console.error('Error fetching team:', error);
        toast.error('Failed to load team');
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();

    // Check user's request status (real-time)
    const requestsQuery = query(
      collection(db, 'joinRequests'),
      where('teamId', '==', teamId),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      if (snapshot.empty) {
        setUserRequestStatus('none');
      } else {
        const request = snapshot.docs[0].data();
        const newStatus = request.status;
        
        // Handle status changes with toasts (use refs for latest values)
        if (userRequestStatusRef.current === 'pending' && newStatus === 'rejected') {
          toast.error(`Your request to ${teamRef.current?.name} was rejected`);
          // Redirect to matchmaking after rejection
          setTimeout(() => router.push('/matchmaking'), 2000);
        } else if (userRequestStatusRef.current === 'pending' && newStatus === 'accepted') {
          toast.success(`Welcome to ${teamRef.current?.name}!`);
        }
        
        setUserRequestStatus(newStatus);
      }
    });

    return () => unsubscribe();
  }, [teamId, user, router]);

  // Check pending requests count for the user
  useEffect(() => {
    if (!user) return;

    const checkPendingRequests = async () => {
      const requestsQuery = query(
        collection(db, 'joinRequests'),
        where('userId', '==', user.uid),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(requestsQuery);
      setPendingRequestsCount(snapshot.size);
    };

    checkPendingRequests();
  }, [user]);

  const handleSendRequest = async () => {
    if (!user || !userProfile) return;

    if (pendingRequestsCount >= 3) {
      toast.error('You can only have 3 pending requests at a time');
      return;
    }

    if (requestNote.length > 120) {
      toast.error('Note must be 120 characters or less');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'joinRequests'), {
        teamId,
        teamName: team.name,
        teamCreatorId: team.creatorId,
        userId: user.uid,
        userName: userProfile.displayName,
        userSkills: userProfile.primarySkills || [],
        note: requestNote.trim(),
        status: 'pending',
        createdAt: Date.now(),
      });

      toast.success('Request sent!');
      setShowRequestModal(false);
      setRequestNote('');
    } catch (error) {
      console.error('Error sending request:', error);
      toast.error('Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-pixel text-2xl">Loading...</div>
      </div>
    );
  }

  if (!team) return null;

  const memberSkills = memberDetails.map(m => m.primarySkills || []);
  const coverage = calculateSkillCoverage(team.skillsNeeded, memberSkills);
  const missingSkills = getMissingSkills(team.skillsNeeded, memberSkills);
  const isInAnotherTeam = userProfile?.currentTeam && userProfile.currentTeam !== teamId;
  const canJoin = userRequestStatus === 'none' && (team.members?.length ?? 0) < 5 && team.state === 'OPEN' && !isInAnotherTeam;

  return (
    <div className="relative min-h-screen w-full pt-20">
      {/* Fixed Background */}
      <div className="fixed inset-0 z-0 opacity-20 bg-gradient-to-br from-white via-gray-50 to-gray-100" />

      {/* Content */}
      <div className="relative z-10 min-h-screen px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-6 font-display hover:underline"
          >
            ← Back to Teams
          </button>

          {/* Team Header */}
          <div className={cn(themeClasses.card, 'p-8 mb-6')}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className={cn(themeClasses.headingPixel, 'text-4xl mb-3')}>
                  {team.name}
                </h1>
                <div className="flex items-center gap-2">
                  <span className={getStateBadgeClass(team.state)}>{team.state}</span>
                  <span className={cn(themeClasses.badge, themeClasses.badgeSecondary)}>
                    {team.members?.length || 0}/5 members
                  </span>
                </div>
              </div>
            </div>

            {/* Skill Coverage */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className={themeClasses.textMono}>Skill Coverage</p>
                <p className="font-mono text-sm font-bold">{coverage}%</p>
              </div>
              <div className="h-4 bg-black/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-black transition-all"
                  style={{ width: `${coverage}%` }}
                />
              </div>
            </div>

            {/* Missing Skills */}
            {missingSkills.length > 0 && (
              <div className="mb-6">
                <p className={cn(themeClasses.textMono, 'mb-3')}>Missing Skills</p>
                <div className="flex flex-wrap gap-2">
                  {missingSkills.map((skill) => (
                    <span
                      key={skill}
                      className="px-4 py-2 rounded-full text-sm font-sans bg-red-100 text-red-700 border-2 border-red-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Team Info Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className={cn(themeClasses.textMono, 'mb-2')}>Goal</p>
                <p className="font-sans text-lg capitalize">{team.goal}</p>
              </div>
              <div>
                <p className={cn(themeClasses.textMono, 'mb-2')}>Time Commitment</p>
                <p className="font-sans text-lg capitalize">{team.timeCommitment?.replace('-', ' ')}</p>
              </div>
            </div>
          </div>

          {/* Current Members */}
          <div className={cn(themeClasses.card, 'p-8 mb-6')}>
            <h2 className={cn(themeClasses.headingDisplay, 'text-2xl mb-6')}>
              Current Members ({memberDetails.length})
            </h2>
            <div className="space-y-4">
              {memberDetails.map((member, index) => (
                <div key={`${member.id}-${index}`} className={cn(themeClasses.cardInner, 'p-4')}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-display font-bold">{member.displayName}</p>
                        {member.id === team.creatorId && (
                          <span className="px-2 py-0.5 bg-black text-white text-xs font-mono uppercase rounded">
                            Creator
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {member.primarySkills?.map((skill: string) => (
                          <span key={skill} className={cn(themeClasses.badge, 'bg-black/10 text-black')}>
                            {skill}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 text-sm text-black/60 font-sans">
                        <span className="capitalize">{member.role}</span> · 
                        <span className="capitalize ml-1">{member.goal}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Button */}
          {isInAnotherTeam && (
            <div className={cn(themeClasses.card, 'p-6 text-center bg-amber-50 border-amber-200')}>
              <p className="font-display text-lg text-amber-800">You&apos;re already in a team</p>
              <p className="text-amber-700/80 mt-2 font-sans text-sm">Leave your current team to join this one</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-lg font-display font-bold hover:bg-amber-700 transition-colors"
              >
                Go to My Team →
              </button>
            </div>
          )}

          {canJoin && (
            <button
              onClick={() => setShowRequestModal(true)}
              disabled={pendingRequestsCount >= 3}
              className={cn(
                themeClasses.buttonPrimary,
                'w-full disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {pendingRequestsCount >= 3 ? 'Max Requests Reached (3/3)' : 'Request to Join →'}
            </button>
          )}

          {userRequestStatus === 'pending' && (
            <div className={cn(themeClasses.card, 'p-6 text-center')}>
              <p className="font-display text-lg">Your request is pending</p>
              <p className="text-black/60 mt-2">Waiting for team creator to respond</p>
            </div>
          )}

          {userRequestStatus === 'rejected' && (
            <div className={cn(themeClasses.card, 'p-6 text-center bg-red-50')}>
              <p className="font-display text-lg">Your request was rejected</p>
            </div>
          )}

          {userRequestStatus === 'accepted' && (
            <div className={cn(themeClasses.card, 'p-6 text-center bg-green-50')}>
              <p className="font-display text-lg">You're part of this team!</p>
              <button
                onClick={() => router.push('/dashboard')}
                className={cn(themeClasses.buttonPrimary, 'mt-4')}
              >
                Go to Dashboard →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className={cn(themeClasses.card, 'p-8 max-w-lg w-full')}>
            <h2 className={cn(themeClasses.headingPixel, 'text-3xl mb-4')}>
              JOIN REQUEST
            </h2>
            <p className="font-sans text-black/60 mb-6">
              Add an optional note (max 120 characters)
            </p>

            <textarea
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="e.g., I have 3 years of React experience and love hackathons!"
              maxLength={120}
              rows={3}
              className={cn(themeClasses.input, 'font-mono text-sm resize-none')}
            />
            <p className="text-xs text-black/40 mt-2 font-mono">
              {requestNote.length}/120 characters
            </p>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setRequestNote('');
                }}
                className={cn(themeClasses.buttonSecondary, 'flex-1')}
              >
                Cancel
              </button>
              <button
                onClick={handleSendRequest}
                disabled={submitting}
                className={cn(themeClasses.buttonPrimary, 'flex-1')}
              >
                {submitting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
