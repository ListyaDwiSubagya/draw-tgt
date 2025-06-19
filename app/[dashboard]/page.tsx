/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import BoardCard, { BoardCardProps } from "./_components/BoardCard";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId");

  const [boards, setBoards] = useState<BoardCardProps[]>([
    {
      id: "new-board",
      type: "new",
      title: "New board",
      imageUrl: "",
    },
  ]);

  useEffect(() => {
    const fetchBoards = async () => {
      if (!orgId) return;

      try {
        const res = await fetch(`/api/organization/${orgId}/boards`);
        if (!res.ok) throw new Error("Failed to fetch boards");

        const data = await res.json();

        const boardList: BoardCardProps[] = data.map((board: any) => ({
          id: board.id,
          type: "existing",
          title: board.title,
          imageUrl: board.imageUrl || "",
        }));

        setBoards((prev) => [
          { id: "new-board", type: "new", title: "New board", imageUrl: "" },
          ...boardList,
        ]);
      } catch (err) {
        console.error(err);
      }
    };

    fetchBoards();
  }, [orgId]);

  const handleAddBoard = async () => {
    if (!orgId) {
      alert("Please select a team first.");
      return;
    }

    const title = prompt("Enter board title:");
    if (!title) return;

    try {
      const res = await fetch(`/api/organization/${orgId}/boards`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          imageUrl: "/default-board-image.svg",
        }),
      });

      if (!res.ok) throw new Error("Failed to create board");

      const newBoard = await res.json();

      setBoards((prev) => [
        prev[0], 
        {
          id: newBoard.id,
          type: "existing",
          title: newBoard.title,
          imageUrl: newBoard.imageUrl || "",
        },
        ...prev.slice(1),
      ]);
    } catch (err) {
      console.error(err);
      alert("Failed to create board");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-semibold text-gray-800 mb-8">Team boards</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {boards.map((board) =>
          board.id === "new-board" ? (
            <div key={board.id} onClick={handleAddBoard}>
              <BoardCard {...board} />
            </div>
          ) : (
            <BoardCard key={board.id} {...board} />
          )
        )}
      </div>
    </div>
  );
}
