"use client";

import { useState } from 'react';
import { useAuth } from '@/lib/firebase-context';
import { useRouter } from 'next/navigation';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SKILLS, GOALS, TIME_AVAILABILITY } from '@/lib/constants';
import { themeClasses } from '@/lib/theme-utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CreateTeamPage() {
  const { user, userProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [teamName, setTeamName] = useState('');
  const [skillsNeeded, setSkillsNeeded] = useState<string[]>([]);
  const [goal, setGoal] = useState<'win' | 'learn' | 'build'>('win');
  const [timeCommitment, setTimeCommitment] = useState<'full-time' | 'partial'>('full-time');

  const handleSkillToggle = (skill: string) => {
    if (skillsNeeded.includes(skill)) {
      setSkillsNeeded(skillsNeeded.filter(s => s !== skill));
    } else {
      setSkillsNeeded([...skillsNeeded, skill]);
    }
  };

  const handleSubmit = async () => {
    if (!user || !userProfile) return;

    // Check if user is already in a team
    if (userProfile.currentTeam) {
      toast.error('You are already in a team. Please leave your current team first.');
      return;
    }

    if (!teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    if (skillsNeeded.length === 0) {
      toast.error('Please select at least one skill needed');
      return;
    }

    setSubmitting(true);
    try {
      // Create team document
      const teamRef = await addDoc(collection(db, 'teams'), {
        name: teamName.trim(),
        creatorId: user.uid,
        creatorName: userProfile.displayName || '',
        skillsNeeded,
        goal,
        timeCommitment,
        state: 'OPEN', // Team starts open for members to join
        members: [user.uid], // Creator is first member
        createdAt: Date.now(),
      });

      // Update user's currentTeam
      await updateDoc(doc(db, 'users', user.uid), {
        currentTeam: teamRef.id,
      });

      await refreshProfile();
      toast.success('Team created successfully!');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Error creating team:', error);
      
      // Handle specific Firestore errors
      if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
        toast.error('Permission error. Please ensure Firestore rules are updated.', {
          duration: 6000,
        });
      } else {
        toast.error('Failed to create team. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = teamName.trim().length > 0 && skillsNeeded.length > 0;

  return (
    <div className="relative min-h-screen w-full pt-20">
      {/* Fixed Background */}
      <div className="fixed inset-0 z-0 opacity-20 bg-gradient-to-br from-white via-gray-50 to-gray-100" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-4xl">
          <div className={cn(themeClasses.card, 'p-8 sm:p-12')}>
            {/* Header */}
            <div className="mb-8">
              <h1 className={cn(themeClasses.headingPixel, 'text-4xl sm:text-5xl mb-4')}>
                CREATE TEAM
              </h1>
              <p className="font-sans text-lg text-black/60">
                Set up your team and start finding the right members
              </p>
            </div>

            {/* Form */}
            <div className="space-y-8">
              {/* Team Name */}
              <div>
                <label className="font-display font-bold text-sm uppercase tracking-wide mb-3 block">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g., Code Ninjas, Team Alpha"
                  maxLength={50}
                  className={themeClasses.input}
                />
                <p className="text-xs text-black/40 mt-2 font-mono">
                  {teamName.length}/50 characters
                </p>
              </div>

              {/* Skills Needed */}
              <div>
                <label className="font-display font-bold text-sm uppercase tracking-wide mb-3 block">
                  Skills Needed *
                </label>
                <p className="text-sm text-black/60 mb-3 font-sans">
                  Select all skills your team needs to succeed
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {SKILLS.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => handleSkillToggle(skill)}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-sans transition-all ${
                        skillsNeeded.includes(skill)
                          ? 'border-black bg-black text-white'
                          : 'border-black/20 bg-white/50 hover:border-black/40'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-black/40 mt-2 font-mono">
                  {skillsNeeded.length} skill{skillsNeeded.length !== 1 ? 's' : ''} selected
                </p>
              </div>

              {/* Goal & Time Commitment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="font-display font-bold text-sm uppercase tracking-wide mb-3 block">
                    Team Goal *
                  </label>
                  <div className="space-y-2">
                    {GOALS.map((g) => (
                      <button
                        key={g}
                        onClick={() => setGoal(g)}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all text-left ${
                          goal === g
                            ? 'border-black bg-black text-white'
                            : 'border-black/20 bg-white/50 hover:border-black/40'
                        }`}
                      >
                        <span className="font-sans capitalize">{g}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-display font-bold text-sm uppercase tracking-wide mb-3 block">
                    Time Commitment *
                  </label>
                  <div className="space-y-2">
                    {TIME_AVAILABILITY.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTimeCommitment(t)}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all text-left ${
                          timeCommitment === t
                            ? 'border-black bg-black text-white'
                            : 'border-black/20 bg-white/50 hover:border-black/40'
                        }`}
                      >
                        <span className="font-sans capitalize">{t.replace('-', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Team Size Info */}
              <div className={cn(themeClasses.cardInner, 'p-6')}>
                <p className={cn(themeClasses.textMono, 'mb-2')}>Team Size Limits</p>
                <p className="font-sans text-black/60">
                  Minimum: <strong>3 members</strong> · Maximum: <strong>5 members</strong>
                </p>
                <p className="font-sans text-sm text-black/50 mt-2">
                  You'll be added as the first member. You can finalize the team once you have 3-5 members.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-4">
                <button
                  onClick={() => router.back()}
                  className={themeClasses.buttonSecondary}
                >
                  ← Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !canSubmit}
                  className={cn(
                    themeClasses.buttonPrimary,
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
                  )}
                >
                  {submitting ? 'Creating...' : 'Create Team →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
