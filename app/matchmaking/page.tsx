"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase-context';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getTopMatches, calculateSkillCoverage, getMissingSkills } from '@/lib/match-algorithm';
import { themeClasses, getStateBadgeClass } from '@/lib/theme-utils';
import { cn } from '@/lib/utils';
import { Search, Target, Clock, Users, Trophy, Lightbulb, Wrench, X, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface Team {
  id: string;
  name: string;
  creatorId: string;
  skillsNeeded: string[];
  goal: 'win' | 'learn' | 'build';
  timeCommitment: 'full-time' | 'partial';
  state: 'DRAFT' | 'OPEN' | 'FINALIZED' | 'LOCKED';
  members: string[];
  memberDetails?: any[];
  createdAt: number;
}

export default function MatchmakingPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [topMatchIds, setTopMatchIds] = useState<string[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [goalFilter, setGoalFilter] = useState<'all' | 'win' | 'learn' | 'build'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'full-time' | 'partial'>('all');
  const [showTopMatchesOnly, setShowTopMatchesOnly] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
    if (!loading && userProfile && !userProfile.profileCompleted) {
      router.push('/onboarding');
    }
  }, [user, userProfile, loading, router]);

  useEffect(() => {
    if (!userProfile?.intent) return;

    const fetchTeams = async () => {
      setLoadingTeams(true);
      setTeamsError(null);
      try {
        if (userProfile.intent === 'join') {
          // Fetch teams looking for members (OPEN state)
          const teamsQuery = query(
            collection(db, 'teams'),
            where('state', '==', 'OPEN')
          );
          const snapshot = await getDocs(teamsQuery);
          
          const teamsData: Team[] = [];
          const allMemberIds = new Set<string>();
          
          // First pass: collect all teams and member IDs
          for (const docSnap of snapshot.docs) {
            const teamData = { id: docSnap.id, ...docSnap.data() } as Team;
            teamsData.push(teamData);
            
            // Collect all unique member IDs
            for (const memberId of teamData.members || []) {
              allMemberIds.add(memberId);
            }
          }
          
          // Batch fetch all member details (max 10 per query due to Firestore 'in' limit)
          const memberIdsArray = Array.from(allMemberIds);
          const membersMap = new Map<string, any>();
          
          for (let i = 0; i < memberIdsArray.length; i += 10) {
            const batch = memberIdsArray.slice(i, i + 10);
            if (batch.length > 0) {
              const membersQuery = query(
                collection(db, 'users'),
                where(documentId(), 'in', batch)
              );
              const membersSnapshot = await getDocs(membersQuery);
              membersSnapshot.forEach((memberDoc) => {
                membersMap.set(memberDoc.id, memberDoc.data());
              });
            }
          }
          
          // Second pass: populate member details from map
          for (const teamData of teamsData) {
            const memberDetails = [];
            for (const memberId of teamData.members || []) {
              const memberData = membersMap.get(memberId);
              if (memberData) {
                memberDetails.push(memberData);
              }
            }
            teamData.memberDetails = memberDetails;
          }
          
          setTeams(teamsData);

          // Calculate top matches with enhanced algorithm
          if (userProfile.primarySkills && userProfile.secondarySkills) {
            const matches = getTopMatches(
              userProfile.primarySkills,
              userProfile.secondarySkills,
              teamsData,
              3,
              {
                goal: userProfile.goal,
                timeAvailability: userProfile.timeAvailability,
                role: userProfile.role,
              }
            );
            setTopMatchIds(matches.map(m => m.teamId));
          }
        } else if (userProfile.intent === 'create') {
          // For creators, show potential team members (users looking to join)
          // This will be implemented when we add the create team flow
          // For now, just show empty state
          setTeams([]);
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
        setTeamsError('Failed to load teams. Please try again.');
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchTeams();
  }, [userProfile]);

  if (loading || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-pixel text-2xl">Loading...</div>
      </div>
    );
  }

  const handleCreateTeam = () => {
    router.push('/matchmaking/create-team');
  };

  // Filter teams based on search and filters
  const filteredTeams = teams.filter(team => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = team.name?.toLowerCase().includes(query);
      const matchesSkill = team.skillsNeeded?.some(skill =>
        skill.toLowerCase().includes(query)
      );
      if (!matchesName && !matchesSkill) return false;
    }
    // Goal filter
    if (goalFilter !== 'all' && team.goal !== goalFilter) return false;
    // Time commitment filter
    if (timeFilter !== 'all' && team.timeCommitment !== timeFilter) return false;
    // Top matches only filter
    if (showTopMatchesOnly && !topMatchIds.includes(team.id)) return false;
    return true;
  });

  // Check if any filters are active
  const hasActiveFilters = searchQuery || goalFilter !== 'all' || timeFilter !== 'all' || showTopMatchesOnly;

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setGoalFilter('all');
    setTimeFilter('all');
    setShowTopMatchesOnly(false);
  };

  return (
    <div className="relative min-h-screen w-full pt-20 sm:pt-24">
      {/* Fixed Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100/30 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 sm:mb-12"
          >
            <p className="font-mono text-xs sm:text-sm text-black/40 uppercase tracking-[0.2em] mb-2">
              Matchmaking
            </p>
            <h1 className={cn(themeClasses.headingPixel, 'text-3xl sm:text-4xl md:text-5xl mb-2')}>
              {userProfile.intent === 'join' ? 'FIND TEAM' : 'BUILD TEAM'}
            </h1>
            <p className="font-sans text-base sm:text-lg text-black/60">
              {userProfile.intent === 'join'
                ? 'Browse teams looking for members and find your perfect match'
                : 'Create your team and find the right members'}
            </p>
          </motion.div>

          {/* Warning banner for users already in a team */}
          {userProfile.currentTeam && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-sans text-sm text-amber-800">
                  <span className="font-semibold">You&apos;re already in a team.</span>{' '}
                  To join another team, you&apos;ll need to leave your current team first.
                </p>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="mt-2 text-sm font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2"
                >
                  Go to My Team →
                </button>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
            {/* Sidebar - User Info & Filters */}
            <div className="lg:col-span-1 space-y-6">
              {/* User Profile Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className={cn(themeClasses.card, 'p-5 sm:p-6')}
              >
                <p className={themeClasses.textMono}>Your Profile</p>
                <h3 className="font-display text-lg sm:text-xl font-bold mt-2 mb-4">
                  {userProfile.displayName}
                </h3>

                <div className="space-y-4">
                  <div>
                    <p className={cn(themeClasses.textMono, 'mb-2')}>Intent</p>
                    <span className={cn(themeClasses.badge, themeClasses.badgePrimary, 'uppercase')}>
                      {userProfile.intent}
                    </span>
                  </div>

                  <div>
                    <p className={cn(themeClasses.textMono, 'mb-2')}>Primary Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {userProfile.primarySkills?.slice(0, 4).map((skill) => (
                        <span key={skill} className={cn(themeClasses.badge, themeClasses.badgeSecondary, 'text-xs')}>
                          {skill}
                        </span>
                      ))}
                      {(userProfile.primarySkills?.length || 0) > 4 && (
                        <span className="text-xs text-black/40">+{userProfile.primarySkills!.length - 4}</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className={cn(themeClasses.textMono, 'mb-2')}>Role</p>
                    <p className="font-sans capitalize text-sm">{userProfile.role}</p>
                  </div>
                </div>
              </motion.div>

              {/* Filters - Only show for joiners */}
              {userProfile.intent === 'join' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className={cn(themeClasses.card, 'p-5 sm:p-6')}
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className={themeClasses.textMono}>Filters</p>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-xs text-black/50 hover:text-black flex items-center gap-1 transition-colors"
                      >
                        <X className="w-3 h-3" />
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search teams or skills..."
                        className={cn(themeClasses.input, 'pl-9 text-sm py-2.5')}
                      />
                    </div>

                    {/* Goal Filter */}
                    <div>
                      <p className="font-mono text-xs text-black/40 uppercase mb-2">Goal</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(['all', 'win', 'learn', 'build'] as const).map((goal) => (
                          <button
                            key={goal}
                            onClick={() => setGoalFilter(goal)}
                            className={cn(
                              'py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
                              goalFilter === goal
                                ? 'bg-black text-white'
                                : 'bg-black/5 text-black/70 hover:bg-black/10'
                            )}
                          >
                            {goal === 'win' && <Trophy className="w-3 h-3" />}
                            {goal === 'learn' && <Lightbulb className="w-3 h-3" />}
                            {goal === 'build' && <Wrench className="w-3 h-3" />}
                            <span className="capitalize">{goal === 'all' ? 'All Goals' : goal}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Time Commitment Filter */}
                    <div>
                      <p className="font-mono text-xs text-black/40 uppercase mb-2">Commitment</p>
                      <div className="grid grid-cols-1 gap-2">
                        {(['all', 'full-time', 'partial'] as const).map((time) => (
                          <button
                            key={time}
                            onClick={() => setTimeFilter(time)}
                            className={cn(
                              'py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
                              timeFilter === time
                                ? 'bg-black text-white'
                                : 'bg-black/5 text-black/70 hover:bg-black/10'
                            )}
                          >
                            <Clock className="w-3 h-3" />
                            <span className="capitalize">{time === 'all' ? 'Any Time' : time.replace('-', ' ')}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Top Matches Toggle */}
                    {topMatchIds.length > 0 && (
                      <button
                        onClick={() => setShowTopMatchesOnly(!showTopMatchesOnly)}
                        className={cn(
                          'w-full py-2.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2',
                          showTopMatchesOnly
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                        )}
                      >
                        <Target className="w-3.5 h-3.5" />
                        Top Matches Only ({topMatchIds.length})
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Support */}
              <div className="hidden lg:block">
                <p className="font-mono text-[0.625rem] text-black/30">
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

            {/* Main Content */}
            <div className="lg:col-span-3">
              {userProfile.intent === 'create' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className={cn(themeClasses.card, 'p-8 sm:p-12 text-center')}
                >
                  <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8 text-black/40" />
                  </div>
                  <h2 className={cn(themeClasses.headingPixel, 'text-2xl sm:text-3xl mb-4')}>
                    CREATE YOUR TEAM
                  </h2>
                  <p className="font-sans text-base sm:text-lg text-black/60 mb-8 max-w-md mx-auto">
                    Start building your dream hackathon team and find talented members
                  </p>
                  <button onClick={handleCreateTeam} className={themeClasses.buttonPrimary}>
                    Create Team →
                  </button>
                </motion.div>
              )}

              {userProfile.intent === 'join' && (
                <>
                  {/* Results Header */}
                  {!loadingTeams && !teamsError && teams.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between mb-4"
                    >
                      <p className="font-mono text-xs text-black/40">
                        {filteredTeams.length} {filteredTeams.length === 1 ? 'team' : 'teams'} found
                        {hasActiveFilters && ` (${teams.length} total)`}
                      </p>
                    </motion.div>
                  )}

                  {loadingTeams ? (
                    <div className="text-center py-16">
                      <div className="w-10 h-10 border-4 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4" />
                      <p className="font-mono text-sm text-black/40">Loading teams...</p>
                    </div>
                  ) : teamsError ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(themeClasses.card, 'p-8 sm:p-12 text-center')}
                    >
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <h3 className={cn(themeClasses.headingPixel, 'text-xl sm:text-2xl mb-4')}>
                        OOPS!
                      </h3>
                      <p className="font-sans text-black/60 mb-6">
                        {teamsError}
                      </p>
                      <button
                        onClick={() => window.location.reload()}
                        className={themeClasses.buttonPrimary}
                      >
                        Retry
                      </button>
                    </motion.div>
                  ) : filteredTeams.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(themeClasses.card, 'p-8 sm:p-12 text-center')}
                    >
                      <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-black/30" />
                      </div>
                      <h3 className={cn(themeClasses.headingPixel, 'text-xl sm:text-2xl mb-4')}>
                        {hasActiveFilters ? 'NO MATCHES' : 'NO TEAMS YET'}
                      </h3>
                      <p className="font-sans text-black/60 mb-6">
                        {hasActiveFilters
                          ? 'Try adjusting your filters to see more teams'
                          : 'Be the first to create a team or check back later'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={clearFilters}
                          className="text-sm text-black/60 hover:text-black underline underline-offset-2"
                        >
                          Clear all filters
                        </button>
                      )}
                    </motion.div>
                  ) : (
                    <div className="space-y-4 sm:space-y-6">
                      {filteredTeams.map((team, index) => {
                        const isTopMatch = topMatchIds.includes(team.id);
                        const memberSkills = team.memberDetails?.map(m => m.primarySkills || []) || [];
                        const coverage = calculateSkillCoverage(team.skillsNeeded, memberSkills);
                        const missingSkills = getMissingSkills(team.skillsNeeded, memberSkills);

                        return (
                          <motion.div
                            key={team.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.05 * index }}
                            className={cn(
                              themeClasses.card,
                              'p-5 sm:p-6 relative overflow-hidden',
                              isTopMatch && 'ring-2 ring-purple-200'
                            )}
                          >
                            {isTopMatch && (
                              <div className="absolute top-0 right-0 bg-purple-600 text-white px-3 py-1 text-xs font-mono rounded-bl-lg">
                                TOP MATCH
                              </div>
                            )}

                            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                              {/* Team Info */}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-display text-xl sm:text-2xl font-bold mb-2 truncate pr-20 sm:pr-0">
                                  {team.name}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                  <span className={getStateBadgeClass(team.state)}>
                                    {team.state}
                                  </span>
                                  <span className={cn(themeClasses.badge, themeClasses.badgeSecondary, 'flex items-center gap-1')}>
                                    <Users className="w-3 h-3" />
                                    {team.members?.length || 0}/5
                                  </span>
                                  <span className={cn(
                                    themeClasses.badge,
                                    'flex items-center gap-1',
                                    team.goal === 'win' ? 'bg-amber-100 text-amber-700' :
                                    team.goal === 'learn' ? 'bg-blue-100 text-blue-700' :
                                    'bg-green-100 text-green-700'
                                  )}>
                                    {team.goal === 'win' && <Trophy className="w-3 h-3" />}
                                    {team.goal === 'learn' && <Lightbulb className="w-3 h-3" />}
                                    {team.goal === 'build' && <Wrench className="w-3 h-3" />}
                                    <span className="capitalize">{team.goal}</span>
                                  </span>
                                  <span className={cn(themeClasses.badge, 'bg-gray-100 text-gray-700 flex items-center gap-1')}>
                                    <Clock className="w-3 h-3" />
                                    <span className="capitalize">{team.timeCommitment?.replace('-', ' ')}</span>
                                  </span>
                                </div>

                                {/* Skill Coverage Bar */}
                                <div className="mb-4">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <p className="font-mono text-xs text-black/40 uppercase">Skill Coverage</p>
                                    <p className="font-mono text-xs font-bold">{coverage}%</p>
                                  </div>
                                  <div className="h-2 bg-black/10 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        'h-full transition-all rounded-full',
                                        coverage >= 80 ? 'bg-green-500' :
                                        coverage >= 50 ? 'bg-amber-500' : 'bg-red-400'
                                      )}
                                      style={{ width: `${coverage}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Skills */}
                                <div className="mb-4">
                                  <p className="font-mono text-xs text-black/40 uppercase mb-2">Looking for</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {team.skillsNeeded?.map((skill: string) => {
                                      const isMissing = missingSkills.includes(skill);
                                      return (
                                        <span
                                          key={skill}
                                          className={cn(
                                            'px-2 py-1 rounded-full text-xs font-sans',
                                            isMissing
                                              ? 'bg-red-100 text-red-700 border border-red-200'
                                              : 'bg-green-100 text-green-700 border border-green-200'
                                          )}
                                        >
                                          {skill}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Current Members */}
                                <div>
                                  <p className="font-mono text-xs text-black/40 uppercase mb-2">Team Members</p>
                                  <div className="flex flex-wrap gap-2">
                                    {team.memberDetails?.map((member, idx) => (
                                      <div key={idx} className="flex items-center gap-2 bg-black/5 rounded-full pl-1 pr-3 py-1">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white text-xs font-bold">
                                          {member.displayName?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <span className="text-xs font-medium truncate max-w-[100px]">{member.displayName}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Action Button */}
                              <div className="sm:flex-shrink-0">
                                <button
                                  onClick={() => router.push(`/matchmaking/team/${team.id}`)}
                                  className={cn(
                                    'w-full sm:w-auto px-6 py-3 rounded-xl font-display font-bold text-sm transition-all',
                                    isTopMatch
                                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                                      : 'bg-black text-white hover:bg-black/90'
                                  )}
                                >
                                  View Team →
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Mobile Support Link */}
          <div className="lg:hidden mt-12 text-center">
            <p className="font-mono text-[0.625rem] text-black/30">
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
    </div>
  );
}
