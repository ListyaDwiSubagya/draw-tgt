"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const NewButton = () => {
  const [name, setName] = useState("");

  const handleCreate = async () => {
    if (!name) return;

    try {
      const res = await fetch("/api/organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) throw new Error("Failed to create organization");

      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Gagal membuat organisasi");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="aspect-square">
          <button className="flex bg-white/25 h-full w-full rounded-md items-center justify-center opacity-60 hover:opacity-100 transition">
            <Plus className="text-white" />
          </button>
        </div>
      </DialogTrigger>
      <DialogContent className="p-6">
        <h2 className="text-lg font-semibold mb-2">Create New Organization</h2>
        <Input
          placeholder="Organization name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button onClick={handleCreate} className="mt-4">Create</Button>
      </DialogContent>
    </Dialog>
  );
};
