import type { Goal, TimeAvailability } from './constants';

export interface MatchScore {
  teamId: string;
  score: number;
  normalizedScore: number; // 0-100 scale
  breakdown: {
    skillScore: number;
    goalScore: number;
    timeScore: number;
    gapFillingScore: number;
    teamSizeScore: number;
  };
  exactPrimaryMatches: string[];
  exactSecondaryMatches: string[];
  fuzzyMatches: string[];
  fillsGaps: string[]; // Skills user has that team is missing
}

// Expanded fuzzy skill mappings - skills that relate to each other
const FUZZY_SKILL_MAP: Record<string, string[]> = {
  // Development skills
  'Full Stack': ['Frontend', 'Backend', 'Mobile Dev'],
  'Frontend': ['Full Stack', 'UI/UX Design', 'Mobile Dev'],
  'Backend': ['Full Stack', 'DevOps', 'Cloud'],
  'Mobile Dev': ['Frontend', 'Full Stack', 'UI/UX Design'],

  // Data & AI skills
  'ML/AI': ['Data Science', 'Backend', 'Cloud'],
  'Data Science': ['ML/AI', 'Backend', 'Business/Strategy'],

  // Design skills
  'UI/UX Design': ['Frontend', '3D Design', 'Product Management'],
  '3D Design': ['Game Dev', 'AR/VR', 'UI/UX Design', 'Video Editing'],
  'Video Editing': ['3D Design', 'Content Writing', 'Marketing'],

  // Infrastructure skills
  'DevOps': ['Cloud', 'Backend', 'Cybersecurity'],
  'Cloud': ['DevOps', 'Backend', 'Cybersecurity'],
  'Cybersecurity': ['DevOps', 'Cloud', 'Backend'],

  // Emerging tech
  'Game Dev': ['3D Design', 'AR/VR', 'Frontend'],
  'AR/VR': ['Game Dev', '3D Design', 'Mobile Dev'],
  'Blockchain': ['Backend', 'Cybersecurity', 'Full Stack'],

  // Business & content
  'Product Management': ['Business/Strategy', 'UI/UX Design', 'Marketing'],
  'Business/Strategy': ['Product Management', 'Marketing', 'Data Science'],
  'Marketing': ['Content Writing', 'Business/Strategy', 'Video Editing'],
  'Content Writing': ['Marketing', 'Product Management'],

  // Quality
  'Testing/QA': ['DevOps', 'Backend', 'Frontend'],
};

// Role to skill affinity - certain roles naturally align with skills
const ROLE_SKILL_AFFINITY: Record<string, string[]> = {
  'Developer': ['Frontend', 'Backend', 'Full Stack', 'Mobile Dev', 'Game Dev', 'AR/VR', 'Blockchain'],
  'Designer': ['UI/UX Design', '3D Design', 'Video Editing', 'Frontend'],
  'Product Manager': ['Product Management', 'Business/Strategy', 'Marketing'],
  'Data Scientist': ['Data Science', 'ML/AI', 'Backend'],
  'DevOps Engineer': ['DevOps', 'Cloud', 'Cybersecurity', 'Backend'],
  'Marketing': ['Marketing', 'Content Writing', 'Business/Strategy', 'Video Editing'],
  'Other': [],
};

// Scoring weights
const WEIGHTS = {
  EXACT_PRIMARY_MATCH: 100,
  EXACT_SECONDARY_MATCH: 60,
  FUZZY_PRIMARY_MATCH: 35,
  FUZZY_SECONDARY_MATCH: 20,
  GOAL_ALIGNMENT: 50,
  TIME_ALIGNMENT: 40,
  GAP_FILLING_BONUS: 30, // Per gap filled
  TEAM_SIZE_BONUS_MAX: 25, // Bonus for teams that need members
  ROLE_AFFINITY_BONUS: 15,
};

/**
 * Calculate match score between user skills and team's needed skills
 * Now includes goal, time commitment, and gap-filling factors
 */
export function calculateMatchScore(
  userPrimarySkills: string[],
  userSecondarySkills: string[],
  teamNeededSkills: string[],
  options?: {
    userGoal?: Goal;
    userTimeAvailability?: TimeAvailability;
    userRole?: string;
    teamGoal?: Goal;
    teamTimeCommitment?: TimeAvailability;
    teamMemberCount?: number;
    teamMemberSkills?: string[][];
  }
): {
  score: number;
  normalizedScore: number;
  breakdown: {
    skillScore: number;
    goalScore: number;
    timeScore: number;
    gapFillingScore: number;
    teamSizeScore: number;
  };
  exactPrimaryMatches: string[];
  exactSecondaryMatches: string[];
  fuzzyMatches: string[];
  fillsGaps: string[];
} {
  let skillScore = 0;
  let goalScore = 0;
  let timeScore = 0;
  let gapFillingScore = 0;
  let teamSizeScore = 0;

  const exactPrimaryMatches: string[] = [];
  const exactSecondaryMatches: string[] = [];
  const fuzzyMatches: string[] = [];
  const fillsGaps: string[] = [];
  const matchedSkills = new Set<string>();

  // Calculate missing skills the team currently has
  const teamCoveredSkills = new Set<string>();
  if (options?.teamMemberSkills) {
    for (const memberSkills of options.teamMemberSkills) {
      for (const skill of memberSkills) {
        teamCoveredSkills.add(skill);
      }
    }
  }

  for (const neededSkill of teamNeededSkills) {
    if (matchedSkills.has(neededSkill)) continue;

    // Check exact primary skill matches (highest priority)
    if (userPrimarySkills.includes(neededSkill)) {
      skillScore += WEIGHTS.EXACT_PRIMARY_MATCH;
      exactPrimaryMatches.push(neededSkill);
      matchedSkills.add(neededSkill);

      // Bonus if this fills a gap in the team
      if (!teamCoveredSkills.has(neededSkill)) {
        gapFillingScore += WEIGHTS.GAP_FILLING_BONUS;
        fillsGaps.push(neededSkill);
      }
      continue;
    }

    // Check exact secondary skill matches
    if (userSecondarySkills.includes(neededSkill)) {
      skillScore += WEIGHTS.EXACT_SECONDARY_MATCH;
      exactSecondaryMatches.push(neededSkill);
      matchedSkills.add(neededSkill);

      // Smaller bonus for filling gaps with secondary skills
      if (!teamCoveredSkills.has(neededSkill)) {
        gapFillingScore += Math.round(WEIGHTS.GAP_FILLING_BONUS * 0.5);
        fillsGaps.push(neededSkill);
      }
      continue;
    }

    // Check fuzzy matches from primary skills
    const relatedSkills = FUZZY_SKILL_MAP[neededSkill] || [];
    const primaryFuzzyMatch = userPrimarySkills.find(skill => relatedSkills.includes(skill));

    if (primaryFuzzyMatch) {
      skillScore += WEIGHTS.FUZZY_PRIMARY_MATCH;
      fuzzyMatches.push(neededSkill);
      matchedSkills.add(neededSkill);
      continue;
    }

    // Check fuzzy matches from secondary skills
    const secondaryFuzzyMatch = userSecondarySkills.find(skill => relatedSkills.includes(skill));

    if (secondaryFuzzyMatch) {
      skillScore += WEIGHTS.FUZZY_SECONDARY_MATCH;
      fuzzyMatches.push(neededSkill);
      matchedSkills.add(neededSkill);
    }
  }

  // Role affinity bonus - if user's role aligns with team's needed skills
  if (options?.userRole) {
    const roleSkills = ROLE_SKILL_AFFINITY[options.userRole] || [];
    const hasRoleAffinity = teamNeededSkills.some(skill => roleSkills.includes(skill));
    if (hasRoleAffinity) {
      skillScore += WEIGHTS.ROLE_AFFINITY_BONUS;
    }
  }

  // Goal alignment score
  if (options?.userGoal && options?.teamGoal) {
    if (options.userGoal === options.teamGoal) {
      goalScore = WEIGHTS.GOAL_ALIGNMENT;
    } else {
      // Partial alignment for compatible goals
      const goalCompatibility: Record<Goal, Goal[]> = {
        'win': ['build'], // Winners and builders can work together
        'learn': ['build'], // Learners and builders can work together
        'build': ['win', 'learn'], // Builders work with anyone
      };
      if (goalCompatibility[options.userGoal]?.includes(options.teamGoal)) {
        goalScore = Math.round(WEIGHTS.GOAL_ALIGNMENT * 0.5);
      }
    }
  }

  // Time commitment alignment score
  if (options?.userTimeAvailability && options?.teamTimeCommitment) {
    if (options.userTimeAvailability === options.teamTimeCommitment) {
      timeScore = WEIGHTS.TIME_ALIGNMENT;
    } else if (options.userTimeAvailability === 'full-time') {
      // Full-time user can join partial team (but not ideal)
      timeScore = Math.round(WEIGHTS.TIME_ALIGNMENT * 0.6);
    }
    // Partial user trying to join full-time team = no bonus
  }

  // Team size bonus - teams that need more members get a boost
  if (options?.teamMemberCount !== undefined) {
    const spotsAvailable = 5 - options.teamMemberCount;
    if (spotsAvailable > 0) {
      // More spots available = higher bonus (teams that need members)
      teamSizeScore = Math.round((spotsAvailable / 4) * WEIGHTS.TEAM_SIZE_BONUS_MAX);
    }
  }

  const totalScore = skillScore + goalScore + timeScore + gapFillingScore + teamSizeScore;

  // Calculate max possible score for normalization
  const maxSkillScore = teamNeededSkills.length * WEIGHTS.EXACT_PRIMARY_MATCH;
  const maxGapScore = teamNeededSkills.length * WEIGHTS.GAP_FILLING_BONUS;
  const maxPossibleScore = maxSkillScore + maxGapScore + WEIGHTS.GOAL_ALIGNMENT +
                          WEIGHTS.TIME_ALIGNMENT + WEIGHTS.TEAM_SIZE_BONUS_MAX +
                          WEIGHTS.ROLE_AFFINITY_BONUS;

  const normalizedScore = maxPossibleScore > 0
    ? Math.min(100, Math.round((totalScore / maxPossibleScore) * 100))
    : 0;

  return {
    score: totalScore,
    normalizedScore,
    breakdown: {
      skillScore,
      goalScore,
      timeScore,
      gapFillingScore,
      teamSizeScore,
    },
    exactPrimaryMatches,
    exactSecondaryMatches,
    fuzzyMatches,
    fillsGaps,
  };
}

/**
 * Get top N matching teams for a user with enhanced scoring
 */
export function getTopMatches(
  userPrimarySkills: string[],
  userSecondarySkills: string[],
  teams: any[],
  topN: number = 3,
  userOptions?: {
    goal?: Goal;
    timeAvailability?: TimeAvailability;
    role?: string;
  }
): MatchScore[] {
  const scores: MatchScore[] = teams.map(team => {
    const matchResult = calculateMatchScore(
      userPrimarySkills,
      userSecondarySkills,
      team.skillsNeeded || [],
      {
        userGoal: userOptions?.goal,
        userTimeAvailability: userOptions?.timeAvailability,
        userRole: userOptions?.role,
        teamGoal: team.goal,
        teamTimeCommitment: team.timeCommitment,
        teamMemberCount: team.members?.length || 0,
        teamMemberSkills: team.memberDetails?.map((m: any) => m.primarySkills || []) || [],
      }
    );

    return {
      teamId: team.id,
      ...matchResult,
    };
  });

  // Sort by normalized score descending, then by gap-filling ability
  return scores
    .filter(s => s.score > 0)
    .sort((a, b) => {
      // Primary sort: normalized score
      if (b.normalizedScore !== a.normalizedScore) {
        return b.normalizedScore - a.normalizedScore;
      }
      // Secondary sort: gap-filling potential
      return b.fillsGaps.length - a.fillsGaps.length;
    })
    .slice(0, topN);
}

/**
 * Calculate skill coverage percentage for a team
 * Now includes fuzzy matching for coverage
 */
export function calculateSkillCoverage(
  teamNeededSkills: string[],
  memberSkills: string[][],
  includeFuzzy: boolean = false
): number {
  if (teamNeededSkills.length === 0) return 100;

  const coveredSkills = new Set<string>();

  for (const neededSkill of teamNeededSkills) {
    for (const skills of memberSkills) {
      // Direct match
      if (skills.includes(neededSkill)) {
        coveredSkills.add(neededSkill);
        break;
      }

      // Fuzzy match (optional)
      if (includeFuzzy) {
        const relatedSkills = FUZZY_SKILL_MAP[neededSkill] || [];
        if (skills.some(skill => relatedSkills.includes(skill))) {
          coveredSkills.add(neededSkill);
          break;
        }
      }
    }
  }

  return Math.round((coveredSkills.size / teamNeededSkills.length) * 100);
}

/**
 * Get missing skills for a team
 */
export function getMissingSkills(
  teamNeededSkills: string[],
  memberSkills: string[][]
): string[] {
  const coveredSkills = new Set<string>();

  for (const neededSkill of teamNeededSkills) {
    for (const skills of memberSkills) {
      if (skills.includes(neededSkill)) {
        coveredSkills.add(neededSkill);
        break;
      }
    }
  }

  return teamNeededSkills.filter(skill => !coveredSkills.has(skill));
}

/**
 * Get partially covered skills (covered by fuzzy match only)
 */
export function getPartiallyCoveredSkills(
  teamNeededSkills: string[],
  memberSkills: string[][]
): string[] {
  const exactlyCovered = new Set<string>();
  const fuzzyCovered = new Set<string>();

  for (const neededSkill of teamNeededSkills) {
    for (const skills of memberSkills) {
      if (skills.includes(neededSkill)) {
        exactlyCovered.add(neededSkill);
        break;
      }

      const relatedSkills = FUZZY_SKILL_MAP[neededSkill] || [];
      if (skills.some(skill => relatedSkills.includes(skill))) {
        fuzzyCovered.add(neededSkill);
      }
    }
  }

  // Return skills that are fuzzy covered but not exactly covered
  return Array.from(fuzzyCovered).filter(skill => !exactlyCovered.has(skill));
}

/**
 * Calculate how well a user would complement a team
 */
export function calculateTeamComplementScore(
  userPrimarySkills: string[],
  userSecondarySkills: string[],
  teamNeededSkills: string[],
  teamMemberSkills: string[][]
): {
  complementScore: number;
  uniqueContributions: string[];
  overlappingSkills: string[];
} {
  const teamCoveredSkills = new Set<string>();
  for (const skills of teamMemberSkills) {
    for (const skill of skills) {
      teamCoveredSkills.add(skill);
    }
  }

  const uniqueContributions: string[] = [];
  const overlappingSkills: string[] = [];

  const allUserSkills = [...new Set([...userPrimarySkills, ...userSecondarySkills])];

  for (const skill of allUserSkills) {
    if (teamNeededSkills.includes(skill)) {
      if (teamCoveredSkills.has(skill)) {
        overlappingSkills.push(skill);
      } else {
        uniqueContributions.push(skill);
      }
    }
  }

  // Higher score for unique contributions, lower for overlap
  const complementScore = (uniqueContributions.length * 100) - (overlappingSkills.length * 20);

  return {
    complementScore: Math.max(0, complementScore),
    uniqueContributions,
    overlappingSkills,
  };
}
