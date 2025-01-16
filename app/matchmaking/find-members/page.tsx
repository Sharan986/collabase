"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase-context';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { themeClasses } from '@/lib/theme-utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { YEARS, COURSES, GENDERS } from '@/lib/constants';
import { calculateMatchScore as calculateMatchScoreLib, calculateTeamComplementScore } from '@/lib/match-algorithm';
import { motion } from 'motion/react';
import { Users, Target, Clock, Sparkles, Search, Send, UserPlus, ExternalLink, Star, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface UserCandidate {
  id: string;
  displayName: string;
  email: string;
  primarySkills: string[];
  secondarySkills: string[];
  role: string;
  goal: 'win' | 'learn' | 'build';
  timeAvailability: 'full-time' | 'partial';
  externalLinks?: {
    github?: string;
    linkedin?: string;
    portfolio?: string;
    resumeUrl?: string;
  };
  currentTeam: string | null;
  year?: string;
  course?: string;
  gender?: string;
}

interface Team {
  id: string;
  name: string;
  creatorId: string;
  creatorName: string;
  members: string[];
  skillsNeeded: string[];
  goal: 'win' | 'learn' | 'build';
  timeCommitment: 'full-time' | 'partial';
  state: 'DRAFT' | 'OPEN' | 'FINALIZED' | 'LOCKED';
  whatsappLink?: string | null;
  discordLink?: string | null;
  createdAt: number;
}

export default function FindMembersPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [candidates, setCandidates] = useState<UserCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [team, setTeam] = useState<Team | null>(null);
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
      return;
    }
    if (!loading && userProfile && !userProfile.profileCompleted) {
      router.push('/onboarding');
      return;
    }
    // Only team creators can access this page
    if (!loading && userProfile && userProfile.intent !== 'create') {
      toast.error('Only team creators can access this page');
      router.push('/matchmaking');
      return;
    }
    if (!loading && userProfile && !userProfile.currentTeam) {
      toast.error('Create a team first to find members');
      router.push('/matchmaking/create-team');
      return;
    }
  }, [user, userProfile, loading, router]);

  // Fetch team data and candidates
  useEffect(() => {
    if (!userProfile?.currentTeam) return;

    const fetchData = async () => {
      setLoadingCandidates(true);
      try {
        // Fetch team data
        const teamDoc = await getDoc(doc(db, 'teams', userProfile.currentTeam!));
        if (!teamDoc.exists()) {
          toast.error('Team not found');
          router.push('/matchmaking');
          return;
        }
        const teamData = { id: teamDoc.id, ...teamDoc.data() } as Team;
        setTeam(teamData);

        // Fetch users looking to join (intent === 'join')
        const usersQuery = query(
          collection(db, 'users'),
          where('intent', '==', 'join'),
          where('profileCompleted', '==', true)
        );
        const snapshot = await getDocs(usersQuery);
        
        const usersData: UserCandidate[] = [];
        snapshot.forEach((docSnap) => {
          const userData = { id: docSnap.id, ...docSnap.data() } as UserCandidate;
          // Exclude users who already have a team
          if (!userData.currentTeam) {
            usersData.push(userData);
          }
        });
        
        setCandidates(usersData);

        // Fetch already sent invites
        const invitesQuery = query(
          collection(db, 'teamInvites'),
          where('teamId', '==', userProfile.currentTeam),
          where('status', '==', 'pending')
        );
        const invitesSnapshot = await getDocs(invitesQuery);
        const invitedUserIds = new Set<string>();
        invitesSnapshot.forEach((docSnap) => {
          invitedUserIds.add(docSnap.data().invitedUserId);
        });
        setSentInvites(invitedUserIds);

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load candidates');
      } finally {
        setLoadingCandidates(false);
      }
    };

    fetchData();
  }, [userProfile?.currentTeam, router]);

  const handleSendInvite = async (candidate: UserCandidate) => {
    if (!team || !user) return;

    if ((team.members?.length || 0) >= 5) {
      toast.error('Team is full (max 5 members)');
      return;
    }

    setSendingInvite(candidate.id);
    try {
      // Create invite document
      await addDoc(collection(db, 'teamInvites'), {
        teamId: team.id,
        teamName: team.name,
        invitedUserId: candidate.id,
        invitedUserName: candidate.displayName,
        invitedBy: user.uid,
        invitedByName: userProfile?.displayName,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      setSentInvites(prev => new Set([...prev, candidate.id]));
      toast.success(`Invite sent to ${candidate.displayName}!`);
    } catch (error) {
      console.error('Error sending invite:', error);
      toast.error('Failed to send invite');
    } finally {
      setSendingInvite(null);
    }
  };

  // Calculate match score using improved algorithm
  const calculateMatchScore = (candidate: UserCandidate): number => {
    if (!team?.skillsNeeded) return 0;

    // Get current team member skills (excluding this candidate)
    const teamMemberSkills = candidates
      .filter(c => team.members?.includes(c.id))
      .map(c => c.primarySkills || []);

    // Use the library's improved matching algorithm
    const matchResult = calculateMatchScoreLib(
      candidate.primarySkills || [],
      candidate.secondarySkills || [],
      team.skillsNeeded,
      {
        userGoal: candidate.goal,
        userTimeAvailability: candidate.timeAvailability,
        userRole: candidate.role,
        teamGoal: team.goal,
        teamTimeCommitment: team.timeCommitment,
        teamMemberCount: team.members?.length || 0,
        teamMemberSkills,
      }
    );

    // Also calculate complement score (unique contributions)
    const complementResult = calculateTeamComplementScore(
      candidate.primarySkills || [],
      candidate.secondarySkills || [],
      team.skillsNeeded,
      teamMemberSkills
    );

    // Combine scores: normalized score (0-100) + complement bonus
    return matchResult.normalizedScore + Math.round(complementResult.complementScore * 0.1);
  };

  // Filter and sort candidates
  const filteredCandidates = candidates
    .filter(c => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = c.displayName?.toLowerCase().includes(query);
        const matchesSkill = [...(c.primarySkills || []), ...(c.secondarySkills || [])]
          .some(skill => skill.toLowerCase().includes(query));
        const matchesRole = c.role?.toLowerCase().includes(query);
        if (!matchesName && !matchesSkill && !matchesRole) return false;
      }
      // Year filter
      if (yearFilter && c.year !== yearFilter) return false;
      // Course filter
      if (courseFilter && c.course !== courseFilter) return false;
      // Gender filter
      if (genderFilter && c.gender !== genderFilter) return false;
      return true;
    })
    .map(c => ({ ...c, matchScore: calculateMatchScore(c) }))
    .sort((a, b) => b.matchScore - a.matchScore);

  // Get top matches (normalized score >= 40 indicates good compatibility)
  const topMatches = filteredCandidates.filter(c => c.matchScore >= 40);

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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/30 via-transparent to-transparent" />
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
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 text-sm text-black/60 hover:text-black mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <p className="font-mono text-xs sm:text-sm text-black/40 uppercase tracking-[0.2em] mb-2">
              Find Members
            </p>
            <h1 className="font-pixel text-3xl sm:text-4xl md:text-5xl tracking-wider mb-2">
              RECRUIT TALENT
            </h1>
            <p className="font-sans text-base sm:text-lg text-black/60">
              Browse users looking to join a team and send them invites
            </p>
          </motion.div>

          {/* Team Info Bar */}
          {team && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={cn(themeClasses.card, 'p-4 sm:p-6 mb-6 sm:mb-8')}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="flex-1">
                  <p className="font-mono text-xs text-black/40 uppercase">Recruiting for</p>
                  <h2 className="font-display font-bold text-xl">{team.name}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={cn(themeClasses.badge, themeClasses.badgeSecondary, 'flex items-center gap-1.5')}>
                    <Users className="w-3.5 h-3.5" />
                    {team.members?.length || 1}/5 members
                  </span>
                  <span className={cn(themeClasses.badge, 'bg-purple-100 text-purple-700')}>
                    Looking for: {team.skillsNeeded?.join(', ') || 'Any skills'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Search & Filters */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={cn(themeClasses.card, 'p-4 sm:p-6 mb-6 sm:mb-8')}
          >
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, skill, or role..."
                  className={cn(themeClasses.input, 'pl-10 text-sm')}
                />
              </div>
              
              {/* Filter Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Year Filter */}
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className={cn(themeClasses.input, 'text-sm')}
                >
                  <option value="">All Years</option>
                  {YEARS.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                {/* Course Filter */}
                <select
                  value={courseFilter}
                  onChange={(e) => setCourseFilter(e.target.value)}
                  className={cn(themeClasses.input, 'text-sm')}
                >
                  <option value="">All Courses</option>
                  {COURSES.map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>

                {/* Gender Filter */}
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className={cn(themeClasses.input, 'text-sm')}
                >
                  <option value="">All Genders</option>
                  {GENDERS.map(gender => (
                    <option key={gender} value={gender}>{gender}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>

          {/* Top Matches Section */}
          {topMatches.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-8"
            >
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-yellow-500" />
                <h2 className="font-display font-bold text-xl">Top Matches</h2>
                <span className="text-sm text-black/40 font-mono">({topMatches.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topMatches.slice(0, 3).map((candidate, index) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    isTopMatch
                    isInvited={sentInvites.has(candidate.id)}
                    isSending={sendingInvite === candidate.id}
                    onSendInvite={() => handleSendInvite(candidate)}
                    teamFull={(team?.members?.length || 0) >= 5}
                    delay={0.1 * index}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* All Candidates */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-500" />
              <h2 className="font-display font-bold text-xl">All Candidates</h2>
              <span className="text-sm text-black/40 font-mono">({filteredCandidates.length})</span>
            </div>

            {loadingCandidates ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-4 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4" />
                <p className="text-black/60">Loading candidates...</p>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className={cn(themeClasses.card, 'p-12 text-center')}>
                <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-black/30" />
                </div>
                <h3 className="font-display font-bold text-xl mb-2">No Candidates Found</h3>
                <p className="text-black/60">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'No users are currently looking to join a team'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCandidates.map((candidate, index) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    isTopMatch={false}
                    isInvited={sentInvites.has(candidate.id)}
                    isSending={sendingInvite === candidate.id}
                    onSendInvite={() => handleSendInvite(candidate)}
                    teamFull={(team?.members?.length || 0) >= 5}
                    delay={0.05 * index}
                  />
                ))}
              </div>
            )}
          </motion.div>

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
    </div>
  );
}

// Candidate Card Component
function CandidateCard({
  candidate,
  isTopMatch,
  isInvited,
  isSending,
  onSendInvite,
  teamFull,
  delay = 0,
}: {
  candidate: UserCandidate & { matchScore?: number };
  isTopMatch: boolean;
  isInvited: boolean;
  isSending: boolean;
  onSendInvite: () => void;
  teamFull: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={cn(
        themeClasses.card,
        'p-5 hover:border-black/20 transition-all',
        isTopMatch && 'ring-2 ring-yellow-200'
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center text-white font-display font-bold text-lg flex-shrink-0",
          isTopMatch ? "bg-gradient-to-br from-yellow-400 to-orange-500" : "bg-gradient-to-br from-blue-500 to-blue-700"
        )}>
          {candidate.displayName?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-base truncate">{candidate.displayName}</h3>
            {isTopMatch && (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-mono rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" />
                Match
              </span>
            )}
          </div>
          <p className="text-xs text-black/50 truncate">{candidate.role}</p>
        </div>
      </div>

      {/* Skills */}
      <div className="mb-4">
        <p className="font-mono text-xs text-black/40 uppercase mb-2">Skills</p>
        <div className="flex flex-wrap gap-1.5">
          {candidate.primarySkills?.slice(0, 3).map((skill) => (
            <span key={skill} className="text-xs px-2 py-1 bg-black/10 rounded-full font-medium">
              {skill}
            </span>
          ))}
          {(candidate.primarySkills?.length || 0) > 3 && (
            <span className="text-xs px-2 py-1 bg-black/5 rounded-full text-black/50">
              +{candidate.primarySkills!.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Year, Course, Gender */}
      {(candidate.year || candidate.course || candidate.gender) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {candidate.year && (
            <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
              {candidate.year}
            </span>
          )}
          {candidate.course && (
            <span className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded-full">
              {candidate.course}
            </span>
          )}
          {candidate.gender && (
            <span className="text-xs px-2 py-1 bg-pink-50 text-pink-600 rounded-full">
              {candidate.gender}
            </span>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-black/50 mb-4">
        <span className="flex items-center gap-1">
          <Target className="w-3.5 h-3.5" />
          <span className="capitalize">{candidate.goal}</span>
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span className="capitalize">{candidate.timeAvailability?.replace('-', ' ')}</span>
        </span>
      </div>

      {/* External Links */}
      {(candidate.externalLinks?.github || candidate.externalLinks?.linkedin || candidate.externalLinks?.portfolio || candidate.externalLinks?.resumeUrl) && (
        <div className="flex flex-wrap gap-3 mb-4">
          {candidate.externalLinks?.github && (
            <a href={candidate.externalLinks.github} target="_blank" rel="noopener noreferrer"
               className="text-xs text-black/50 hover:text-black flex items-center gap-1 transition-colors">
              <ExternalLink className="w-3 h-3" />
              GitHub
            </a>
          )}
          {candidate.externalLinks?.linkedin && (
            <a href={candidate.externalLinks.linkedin} target="_blank" rel="noopener noreferrer"
               className="text-xs text-black/50 hover:text-black flex items-center gap-1 transition-colors">
              <ExternalLink className="w-3 h-3" />
              LinkedIn
            </a>
          )}
          {candidate.externalLinks?.portfolio && (
            <a href={candidate.externalLinks.portfolio} target="_blank" rel="noopener noreferrer"
               className="text-xs text-black/50 hover:text-black flex items-center gap-1 transition-colors">
              <ExternalLink className="w-3 h-3" />
              Portfolio
            </a>
          )}
          {candidate.externalLinks?.resumeUrl && (
            <a href={candidate.externalLinks.resumeUrl} target="_blank" rel="noopener noreferrer"
               className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 transition-colors">
              <ExternalLink className="w-3 h-3" />
              Resume
            </a>
          )}
        </div>
      )}

      {/* Action */}
      <button
        onClick={onSendInvite}
        disabled={isInvited || isSending || teamFull}
        className={cn(
          'w-full py-2.5 px-4 rounded-xl font-display font-bold text-sm transition-all flex items-center justify-center gap-2',
          isInvited
            ? 'bg-green-100 text-green-700 cursor-default'
            : teamFull
            ? 'bg-black/5 text-black/40 cursor-not-allowed'
            : 'bg-black text-white hover:bg-black/90'
        )}
      >
        {isSending ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Sending...
          </>
        ) : isInvited ? (
          <>
            <Send className="w-4 h-4" />
            Invite Sent
          </>
        ) : teamFull ? (
          'Team Full'
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            Send Invite
          </>
        )}
      </button>
    </motion.div>
  );
}
