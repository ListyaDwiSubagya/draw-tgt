"use client";

import { SignIn, SignedOut, SignedIn } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 2000); 

    return () => clearTimeout(timer); 
  }, [router]);

  return (
    <>
      <SignedOut>
        <SignIn redirectUrl="/dashboard" />
      </SignedOut>
      <SignedIn>
        <p className="text-center mt-4 text-lg">Redirecting to dashboard...</p>
      </SignedIn>
    </>
  );
}
