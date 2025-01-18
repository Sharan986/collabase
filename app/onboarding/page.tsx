"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase-context';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SKILLS, ROLES, TIME_AVAILABILITY, GOALS, GENDERS, YEARS, COURSES } from '@/lib/constants';
import { toast } from 'sonner';

export default function OnboardingPage() {
  const { user, userProfile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [intent, setIntent] = useState<'join' | 'create' | null>(null);
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer-not-to-say' | null>(null);
  const [year, setYear] = useState<string>('');
  const [course, setCourse] = useState<string>('');
  const [primarySkills, setPrimarySkills] = useState<string[]>([]);
  const [secondarySkills, setSecondarySkills] = useState('');
  const [role, setRole] = useState('');
  const [timeAvailability, setTimeAvailability] = useState<'full-time' | 'partial'>('full-time');
  const [goal, setGoal] = useState<'win' | 'learn' | 'build'>('win');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
    if (!loading && userProfile?.profileCompleted) {
      router.push('/matchmaking');
    }
  }, [user, userProfile, loading, router]);

  const handlePrimarySkillToggle = (skill: string) => {
    if (primarySkills.includes(skill)) {
      setPrimarySkills(primarySkills.filter(s => s !== skill));
    } else if (primarySkills.length < 3) {
      setPrimarySkills([...primarySkills, skill]);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      
      const secondarySkillsArray = secondarySkills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      await updateDoc(userRef, {
        profileCompleted: true,
        intent,
        gender,
        year,
        course,
        primarySkills,
        secondarySkills: secondarySkillsArray,
        role,
        timeAvailability,
        goal,
        externalLinks: {
          github: github || null,
          linkedin: linkedin || null,
          portfolio: portfolio || null,
          resumeUrl: resumeUrl || null,
        },
      });

      await refreshProfile();
      toast.success('Profile completed!');
      router.push('/matchmaking');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceedToStep2 = intent !== null && gender !== null && year !== '' && course !== '';
  const canProceedToStep3 = primarySkills.length > 0 && role;
  const canSubmit = canProceedToStep3;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-pixel text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full">
      {/* Fixed Background */}
      <div className="fixed inset-0 z-0 opacity-20 bg-gradient-to-br from-white via-gray-50 to-gray-100" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-4xl">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-12">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-2 w-16 rounded-full transition-all ${
                  s <= step ? 'bg-black' : 'bg-black/20'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Intent */}
          {step === 1 && (
            <div className="backdrop-blur-lg bg-white/70 p-8 sm:p-12 rounded-3xl border border-black/10 space-y-8">
              <div>
                <p className="font-mono text-xs text-black/40 uppercase tracking-wider mb-3">Step 1 of 4</p>
                <h1 className="font-pixel text-4xl sm:text-5xl tracking-wider mb-4">
                  Let&apos;s get started
                </h1>
                <p className="font-sans text-lg text-black/60">
                  Tell us about yourself and your goal.
                </p>
              </div>

              {/* Gender Selection */}
              <div>
                <label className="font-display font-bold text-sm uppercase tracking-wide mb-3 block">
                  Gender *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {GENDERS.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`px-4 py-3 rounded-lg border-2 transition-all text-sm ${
                        gender === g
                          ? 'border-black bg-black text-white'
                          : 'border-black/20 bg-white/50 hover:border-black/40'
                      }`}
                    >
                      <span className="font-sans capitalize">{g.replace(/-/g, ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Year & Course Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Year */}
                <div>
                  <label className="font-display font-bold text-sm uppercase tracking-wide mb-3 block">
                    Year *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {YEARS.map((y) => (
                      <button
                        key={y}
                        onClick={() => setYear(y)}
                        className={`px-4 py-3 rounded-lg border-2 transition-all text-sm ${
                          year === y
                            ? 'border-black bg-black text-white'
                            : 'border-black/20 bg-white/50 hover:border-black/40'
                        }`}
                      >
                        <span className="font-sans">{y}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Course */}
                <div>
                  <label className="font-display font-bold text-sm uppercase tracking-wide mb-3 block">
                    Course *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {COURSES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCourse(c)}
                        className={`px-4 py-3 rounded-lg border-2 transition-all text-sm ${
                          course === c
                            ? 'border-black bg-black text-white'
                            : 'border-black/20 bg-white/50 hover:border-black/40'
                        }`}
                      >
                        <span className="font-sans">{c}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Intent Selection */}
              <div>
                <label className="font-display font-bold text-sm uppercase tracking-wide mb-3 block">
                  What brings you here? *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <button
                    onClick={() => setIntent('join')}
                    className={`p-8 rounded-2xl border-2 transition-all hover:scale-105 ${
                      intent === 'join'
                        ? 'border-black bg-black text-white'
                        : 'border-black/20 bg-white/50 hover:border-black/40'
                    }`}
                  >
                    <div className="font-pixel text-2xl mb-2">JOIN</div>
                    <div className="font-sans text-sm">Find an existing team</div>
                  </button>

                  <button
                    onClick={() => setIntent('create')}
                    className={`p-8 rounded-2xl border-2 transition-all hover:scale-105 ${
                      intent === 'create'
                        ? 'border-black bg-black text-white'
                        : 'border-black/20 bg-white/50 hover:border-black/40'
                    }`}
                  >
                    <div className="font-pixel text-2xl mb-2">CREATE</div>
                    <div className="font-sans text-sm">Build a new team</div>
                  </button>
                </div>
                <p className="text-xs text-black/40 mt-2 font-mono">
                  You can change this later in your profile settings.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!canProceedToStep2}
                  className="bg-black text-white px-8 py-4 rounded-full font-display text-lg font-bold hover:bg-black/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Skills */}
          {step === 2 && (
            <div className="backdrop-blur-lg bg-white/70 p-8 sm:p-12 rounded-3xl border border-black/10 space-y-8">
              <div>
                <p className="font-mono text-xs text-black/40 uppercase tracking-wider mb-3">Step 2 of 4</p>
                <h1 className="font-pixel text-4xl sm:text-5xl tracking-wider mb-4">
                  Your Skills
                </h1>
                <p className="font-sans text-lg text-black/60">
                  Pick up to 3 primary skills. Add more if needed.
                </p>
              </div>

              {/* Primary Skills */}
              <div>
                <label className="font-display font-bold text-sm uppercase tracking-wide mb-3 block">
                  Primary Skills (Max 3) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {SKILLS.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => handlePrimarySkillToggle(skill)}
                      disabled={!primarySkills.includes(skill) && primarySkills.length >= 3}
                      className={`px-4 py-3 rounded-lg border-2 text-sm font-sans transition-all ${
                        primarySkills.includes(skill)
                          ? 'border-black bg-black text-white'
                          : 'border-black/20 bg-white/50 hover:border-black/40 disabled:opacity-30'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-black/40 mt-2 font-mono">
                  {primarySkills.length}/3 selected
                </p>
              </div>

              {/* Secondary Skills */}
              <div>
                <label className="font-display font-bold text-sm uppercase tracking-wide mb-3 block">
                  Secondary Skills (Optional)
                </label>
                <input
                  type="text"
                  value={secondarySkills}
                  onChange={(e) => setSecondarySkills(e.target.value)}
                  placeholder="e.g., Python, Figma, AWS (comma separated)"
                  className="w-full px-4 py-3 rounded-lg border-2 border-black/20 bg-white/50 font-mono text-sm focus:border-black focus:outline-none"
                />
              </div>

              {/* Role */}
              <div>
                <label className="font-display font-bold text-sm uppercase tracking-wide mb-3 block">
                  Preferred Role *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border-2 border-black/20 bg-white/50 font-sans focus:border-black focus:outline-none"
                >
                  <option value="">Select a role</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Time & Goal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="font-display font-bold text-sm uppercase tracking-wide mb-3 block">
                    Time Availability
                  </label>
                  <div className="space-y-2">
                    {TIME_AVAILABILITY.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTimeAvailability(t)}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-all text-left ${
                          timeAvailability === t
                            ? 'border-black bg-black text-white'
                            : 'border-black/20 bg-white/50 hover:border-black/40'
                        }`}
                      >
                        <span className="font-sans capitalize">{t.replace('-', ' ')}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-display font-bold text-sm uppercase tracking-wide mb-3 block">
                    Your Goal
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
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="border-2 border-black/20 text-black px-8 py-4 rounded-full font-display text-lg font-bold hover:border-black transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canProceedToStep3}
                  className="bg-black text-white px-8 py-4 rounded-full font-display text-lg font-bold hover:bg-black/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: External Links */}
          {step === 3 && (
            <div className="backdrop-blur-lg bg-white/70 p-8 sm:p-12 rounded-3xl border border-black/10 space-y-8">
              <div>
                <p className="font-mono text-xs text-black/40 uppercase tracking-wider mb-3">Step 3 of 4</p>
                <h1 className="font-pixel text-4xl sm:text-5xl tracking-wider mb-4">
                  External Links
                </h1>
                <p className="font-sans text-lg text-black/60">
                  Optional. Share your work.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="font-display font-bold text-sm uppercase tracking-wide mb-3 block">
                    GitHub
                  </label>
                  <input
                    type="url"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="https://github.com/username"
                    className="w-full px-4 py-3 rounded-lg border-2 border-black/20 bg-white/50 font-mono text-sm focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-display font-bold text-sm uppercase tracking-wide mb-3 block">
                    LinkedIn
                  </label>
                  <input
                    type="url"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-4 py-3 rounded-lg border-2 border-black/20 bg-white/50 font-mono text-sm focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-display font-bold text-sm uppercase tracking-wide mb-3 block">
                    Portfolio
                  </label>
                  <input
                    type="url"
                    value={portfolio}
                    onChange={(e) => setPortfolio(e.target.value)}
                    placeholder="https://yourportfolio.com"
                    className="w-full px-4 py-3 rounded-lg border-2 border-black/20 bg-white/50 font-mono text-sm focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-display font-bold text-sm uppercase tracking-wide mb-3 block">
                    Resume Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={resumeUrl}
                    onChange={(e) => setResumeUrl(e.target.value)}
                    placeholder="Paste resume link (Google Drive, Dropbox, etc.)"
                    className="w-full px-4 py-3 rounded-lg border-2 border-black/20 bg-white/50 font-mono text-sm focus:border-black focus:outline-none"
                  />
                  <p className="text-xs text-black/40 mt-2 font-mono">
                    Share your resume to help team leaders learn more about you
                  </p>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="border-2 border-black/20 text-black px-8 py-4 rounded-full font-display text-lg font-bold hover:border-black transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="bg-black text-white px-8 py-4 rounded-full font-display text-lg font-bold hover:bg-black/90 transition-all"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Preview */}
          {step === 4 && (
            <div className="backdrop-blur-lg bg-white/70 p-8 sm:p-12 rounded-3xl border border-black/10 space-y-8">
              <div>
                <p className="font-mono text-xs text-black/40 uppercase tracking-wider mb-3">Step 4 of 4</p>
                <h1 className="font-pixel text-4xl sm:text-5xl tracking-wider mb-4">
                  Preview
                </h1>
                <p className="font-sans text-lg text-black/60">
                  Everything look good?
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-white/50 rounded-xl border border-black/10">
                    <p className="font-mono text-xs text-black/40 mb-2">INTENT</p>
                    <p className="font-display text-2xl uppercase">{intent}</p>
                  </div>
                  <div className="p-6 bg-white/50 rounded-xl border border-black/10">
                    <p className="font-mono text-xs text-black/40 mb-2">GENDER</p>
                    <p className="font-sans capitalize">{gender?.replace(/-/g, ' ')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-white/50 rounded-xl border border-black/10">
                    <p className="font-mono text-xs text-black/40 mb-2">YEAR</p>
                    <p className="font-sans">{year}</p>
                  </div>
                  <div className="p-6 bg-white/50 rounded-xl border border-black/10">
                    <p className="font-mono text-xs text-black/40 mb-2">COURSE</p>
                    <p className="font-sans">{course}</p>
                  </div>
                </div>

                <div className="p-6 bg-white/50 rounded-xl border border-black/10">
                  <p className="font-mono text-xs text-black/40 mb-2">PRIMARY SKILLS</p>
                  <div className="flex flex-wrap gap-2">
                    {primarySkills.map((skill) => (
                      <span key={skill} className="px-3 py-1 bg-black text-white rounded-full text-sm font-sans">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {secondarySkills && (
                  <div className="p-6 bg-white/50 rounded-xl border border-black/10">
                    <p className="font-mono text-xs text-black/40 mb-2">SECONDARY SKILLS</p>
                    <p className="font-sans">{secondarySkills}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-white/50 rounded-xl border border-black/10">
                    <p className="font-mono text-xs text-black/40 mb-2">ROLE</p>
                    <p className="font-sans">{role}</p>
                  </div>
                  <div className="p-6 bg-white/50 rounded-xl border border-black/10">
                    <p className="font-mono text-xs text-black/40 mb-2">TIME</p>
                    <p className="font-sans capitalize">{timeAvailability.replace('-', ' ')}</p>
                  </div>
                </div>

                <div className="p-6 bg-white/50 rounded-xl border border-black/10">
                  <p className="font-mono text-xs text-black/40 mb-2">GOAL</p>
                  <p className="font-sans capitalize">{goal}</p>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="border-2 border-black/20 text-black px-8 py-4 rounded-full font-display text-lg font-bold hover:border-black transition-all"
                >
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !canSubmit}
                  className="bg-black text-white px-8 py-4 rounded-full font-display text-lg font-bold hover:bg-black/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : 'Complete Setup →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
