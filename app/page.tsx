import { SignIn, SignedOut, SignedIn } from "@clerk/nextjs";

export default function HomePage() {
  return (
    <>
      <SignedOut>
        <SignIn redirectUrl="/dashboard" />
      </SignedOut>
      <SignedIn>
        <p className="text-center mt-4">Redirecting to dashboard...</p>
      </SignedIn>
    </>
  );
}
