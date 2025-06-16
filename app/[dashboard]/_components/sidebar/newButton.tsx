"use client";

import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input"; 
import { useState } from "react";

export const NewButton = () => {
  const [orgName, setOrgName] = useState("");

  const handleCreate = async () => {
    if (!orgName.trim()) return;
    try {
      await fetch("/api/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName }),
      });
      window.location.reload(); 
    } catch (err) {
      console.error("Failed to create organization:", err);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="aspect-square">
          <button
            className="flex bg-white/25 h-full w-full rounded-md items-center justify-center opacity-60 
              hover:opacity-100 transition"
          >
            <Plus className="text-white" />
          </button>
        </div>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Create a new team</DialogTitle>
        <div className="space-y-3">
          <Input
            placeholder="Team name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
          />
          <button
            onClick={handleCreate}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition"
          >
            Create
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
