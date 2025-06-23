"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { SignInButton, SignedOut, SignedIn, UserButton } from "@clerk/nextjs";

export const InviteButton = () => {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId");

  const [email, setEmail] = useState("");

  const handleInvite = async () => {
    if (!orgId) {
      return toast.error("Organization ID not found in URL");
    }

    const res = await fetch(`/api/organization/${orgId}/invite`, {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      toast.success("User invited successfully!");
      setEmail("");
    } else {
      const err = await res.json();
      toast.error("Invite failed", {
        description: err.message,
      });
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Button trigger dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Invite members
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a user</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <DialogFooter>
            <Button onClick={handleInvite}>Send Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Section */}
      <SignedOut>
        <SignInButton>
          <Button  variant="secondary">Sign In</Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton 
        appearance={{
          elements: {
            avatarBox: "h-20 w-20 rounded-lg ",
          },
        }}/>
      </SignedIn>
    </div>
  );
};
