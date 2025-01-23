"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/firebase-context';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SKILLS, ROLES, TIME_AVAILABILITY, GOALS, GENDERS, YEARS, COURSES } from '@/lib/constants';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { User, Save, ArrowLeft, Github, Linkedin, Globe, Mail, Clock, Target, ChevronDown, ChevronUp } from 'lucide-react';

export default function ProfilePage() {
  const { user, userProfile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Form state - initialized from userProfile
  const [intent, setIntent] = useState<'join' | 'create'>('join');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer-not-to-say'>('prefer-not-to-say');
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
  const [showAllSkills, setShowAllSkills] = useState(false);

  // Number of skills to show initially
  const INITIAL_SKILLS_COUNT = 8;

  // Initialize form with existing data
  useEffect(() => {
    if (userProfile) {
      setIntent(userProfile.intent || 'join');
      setGender(userProfile.gender || 'prefer-not-to-say');
      setYear(userProfile.year || '');
      setCourse(userProfile.course || '');
      setPrimarySkills(userProfile.primarySkills || []);
      setSecondarySkills((userProfile.secondarySkills || []).join(', '));
      setRole(userProfile.role || '');
      setTimeAvailability(userProfile.timeAvailability || 'full-time');
      setGoal(userProfile.goal || 'win');
      setGithub(userProfile.externalLinks?.github || '');
      setLinkedin(userProfile.externalLinks?.linkedin || '');
      setPortfolio(userProfile.externalLinks?.portfolio || '');
      setResumeUrl(userProfile.externalLinks?.resumeUrl || '');
    }
  }, [userProfile]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
    if (!loading && userProfile && !userProfile.profileCompleted) {
      router.push('/onboarding');
    }
  }, [user, userProfile, loading, router]);

  const handlePrimarySkillToggle = (skill: string) => {
    if (primarySkills.includes(skill)) {
      setPrimarySkills(primarySkills.filter(s => s !== skill));
    } else if (primarySkills.length < 3) {
      setPrimarySkills([...primarySkills, skill]);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (primarySkills.length === 0) {
      toast.error('Please select at least one primary skill');
      return;
    }

    if (!role) {
      toast.error('Please select a role');
      return;
    }

    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      
      const secondarySkillsArray = secondarySkills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      await updateDoc(userRef, {
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
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-pixel text-2xl">Loading...</div>
      </div>
    );
  }

  if (!userProfile) return null;

  return (
    <div className="relative min-h-screen w-full">
      {/* Fixed Background */}
      <div className="fixed inset-0 z-0 opacity-20 bg-linear-to-br from-white via-gray-50 to-gray-100" />

      {/* Content */}
      <div className="relative z-10 min-h-screen px-4 py-24">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-black/60 hover:text-black transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-sans text-sm">Back</span>
            </button>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              {/* Avatar */}
              {userProfile.photoURL ? (
                <img
                  src={userProfile.photoURL}
                  alt={userProfile.displayName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-black/10 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-linear-to-br from-purple-400 to-pink-400 flex items-center justify-center shrink-0">
                  <User className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="font-pixel text-2xl sm:text-3xl md:text-4xl tracking-wider mb-1 overflow-wrap-break-word">
                  {userProfile.displayName}
                </h1>
                <p className="font-mono text-xs sm:text-sm text-black/60 flex items-center gap-2 break-all">
                  <Mail className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                  <span className="truncate">{userProfile.email}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`px-2 sm:px-3 py-1 rounded-full text-xs font-mono ${
                    userProfile.intent === 'create' 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {userProfile.intent === 'create' ? 'Team Creator' : 'Team Joiner'}
                  </span>
                  {userProfile.currentTeam && (
                    <span className="px-2 sm:px-3 py-1 rounded-full text-xs font-mono bg-green-100 text-green-700">
                      In a Team
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="backdrop-blur-lg bg-white/70 p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border border-black/10 space-y-6 sm:space-y-8"
          >
            {/* Intent & Gender Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Intent */}
              <div>
                <label className="font-display font-bold text-xs sm:text-sm uppercase tracking-wide mb-2 sm:mb-3 block">
                  Your Intent
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setIntent('join')}
                    disabled={!!userProfile?.currentTeam}
                    className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 text-xs sm:text-sm font-sans transition-all ${
                      intent === 'join'
                        ? 'border-black bg-black text-white'
                        : 'border-black/20 bg-white/50 hover:border-black/40'
                    } ${userProfile?.currentTeam ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Join Team
                  </button>
                  <button
                    onClick={() => setIntent('create')}
                    disabled={!!userProfile?.currentTeam}
                    className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 text-xs sm:text-sm font-sans transition-all ${
                      intent === 'create'
                        ? 'border-black bg-black text-white'
                        : 'border-black/20 bg-white/50 hover:border-black/40'
                    } ${userProfile?.currentTeam ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Create Team
                  </button>
                </div>
                {userProfile?.currentTeam && (
                  <p className="text-xs text-black/40 mt-2 font-mono">
                    Leave your team to change intent
                  </p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="font-display font-bold text-xs sm:text-sm uppercase tracking-wide mb-2 sm:mb-3 block">
                  Gender
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {GENDERS.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 text-xs sm:text-sm font-sans transition-all ${
                        gender === g
                          ? 'border-black bg-black text-white'
                          : 'border-black/20 bg-white/50 hover:border-black/40'
                      }`}
                    >
                      <span className="capitalize">{g.replace(/-/g, ' ')}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Year & Course Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Year */}
              <div>
                <label className="font-display font-bold text-xs sm:text-sm uppercase tracking-wide mb-2 sm:mb-3 block">
                  Year
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {YEARS.map((y) => (
                    <button
                      key={y}
                      onClick={() => setYear(y)}
                      className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 text-xs sm:text-sm font-sans transition-all ${
                        year === y
                          ? 'border-black bg-black text-white'
                          : 'border-black/20 bg-white/50 hover:border-black/40'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* Course */}
              <div>
                <label className="font-display font-bold text-xs sm:text-sm uppercase tracking-wide mb-2 sm:mb-3 block">
                  Course
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COURSES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCourse(c)}
                      className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 text-xs sm:text-sm font-sans transition-all ${
                        course === c
                          ? 'border-black bg-black text-white'
                          : 'border-black/20 bg-white/50 hover:border-black/40'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Primary Skills */}
            <div>
              <label className="font-display font-bold text-xs sm:text-sm uppercase tracking-wide mb-2 sm:mb-3 block">
                Primary Skills (Max 3) *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                {(showAllSkills ? SKILLS : SKILLS.slice(0, INITIAL_SKILLS_COUNT)).map((skill) => (
                  <button
                    key={skill}
                    onClick={() => handlePrimarySkillToggle(skill)}
                    disabled={!primarySkills.includes(skill) && primarySkills.length >= 3}
                    className={`px-3 sm:px-4 py-2 sm:py-3 rounded-lg border-2 text-xs sm:text-sm font-sans transition-all ${
                      primarySkills.includes(skill)
                        ? 'border-black bg-black text-white'
                        : 'border-black/20 bg-white/50 hover:border-black/40 disabled:opacity-30'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              {SKILLS.length > INITIAL_SKILLS_COUNT && (
                <button
                  onClick={() => setShowAllSkills(!showAllSkills)}
                  className="flex items-center gap-1 text-sm text-black/60 hover:text-black transition-colors mt-3 font-sans"
                >
                  {showAllSkills ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Show More ({SKILLS.length - INITIAL_SKILLS_COUNT} more)
                    </>
                  )}
                </button>
              )}
              <p className="text-xs text-black/40 mt-2 font-mono">
                {primarySkills.length}/3 selected
              </p>
            </div>

            {/* Secondary Skills */}
            <div>
              <label className="font-display font-bold text-xs sm:text-sm uppercase tracking-wide mb-2 sm:mb-3 block">
                Secondary Skills (Optional)
              </label>
              <input
                type="text"
                value={secondarySkills}
                onChange={(e) => setSecondarySkills(e.target.value)}
                placeholder="e.g., Python, Figma, AWS (comma separated)"
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 border-black/20 bg-white/50 font-mono text-xs sm:text-sm focus:border-black focus:outline-none"
              />
            </div>

            {/* Role */}
            <div>
              <label className="font-display font-bold text-xs sm:text-sm uppercase tracking-wide mb-2 sm:mb-3 block">
                Preferred Role *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 border-black/20 bg-white/50 font-sans text-sm focus:border-black focus:outline-none"
              >
                <option value="">Select a role</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Time & Goal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="font-display font-bold text-xs sm:text-sm uppercase tracking-wide mb-2 sm:mb-3 flex items-center gap-2">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  Time Availability
                </label>
                <div className="space-y-2">
                  {TIME_AVAILABILITY.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTimeAvailability(t)}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 transition-all text-left text-sm ${
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
                <label className="font-display font-bold text-xs sm:text-sm uppercase tracking-wide mb-2 sm:mb-3 flex items-center gap-2">
                  <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                  Your Goal
                </label>
                <div className="space-y-2">
                  {GOALS.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGoal(g)}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border-2 transition-all text-left text-sm ${
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

            {/* External Links */}
            <div className="space-y-3 sm:space-y-4">
              <label className="font-display font-bold text-xs sm:text-sm uppercase tracking-wide block">
                External Links
              </label>
              
              <div className="relative">
                <Github className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-black/40" />
                <input
                  type="url"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  placeholder="GitHub Profile URL"
                  className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg border-2 border-black/20 bg-white/50 font-mono text-xs sm:text-sm focus:border-black focus:outline-none"
                />
              </div>

              <div className="relative">
                <Linkedin className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-black/40" />
                <input
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="LinkedIn Profile URL"
                  className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg border-2 border-black/20 bg-white/50 font-mono text-xs sm:text-sm focus:border-black focus:outline-none"
                />
              </div>

              <div className="relative">
                <Globe className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-black/40" />
                <input
                  type="url"
                  value={portfolio}
                  onChange={(e) => setPortfolio(e.target.value)}
                  placeholder="Portfolio Website URL"
                  className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg border-2 border-black/20 bg-white/50 font-mono text-xs sm:text-sm focus:border-black focus:outline-none"
                />
              </div>

              {/* Resume Link */}
              <div className="relative">
                <Globe className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-black/40" />
                <input
                  type="url"
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                  placeholder="Resume Link (Google Drive, Dropbox, etc.)"
                  className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg border-2 border-black/20 bg-white/50 font-mono text-xs sm:text-sm focus:border-black focus:outline-none"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-center sm:justify-end pt-2 sm:pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-black text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full font-display text-base sm:text-lg font-bold hover:bg-black/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
              >
                <Save className="h-4 w-4 sm:h-5 sm:w-5" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
