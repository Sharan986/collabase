"use client";

import { useAuth } from "@/lib/firebase-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LandingPageC1 from "@/components/sections/LandingPageC1"

const Page = () => {
  const { user, userProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && userProfile?.profileCompleted) {
      router.push('/dashboard');
    }
  }, [user, userProfile, router]);

  return (
    <>
    <LandingPageC1 />
    </>
  )
}

export default Page