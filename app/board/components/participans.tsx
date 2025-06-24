"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Member = {
  id: string;
  email: string;
};

export const Participans = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [activeUser, setActiveUser] = useState<Member | null>(null);
  const params = useParams();
  const boardId = params?.board as string;

  useEffect(() => {
    if (!boardId) return;
    const fetchMembers = async () => {
      try {
        const res = await fetch(`/api/board/${boardId}/members`);
        if (res.ok) {
          const data = await res.json();
          setMembers(data);
        } else {
          console.error("Failed to fetch members");
        }
      } catch (err) {
        console.error("Error:", err);
      }
    };

    fetchMembers();
  }, [boardId]);

  const openPopup = (member: Member) => {
    setActiveUser(member);
  };

  const closePopup = () => {
    setActiveUser(null);
  };

  return (
    <>
      {/* Participant avatars */}
      <div className="absolute h-12 top-2 right-2 bg-white rounded-md p-3 flex items-center shadow-md gap-2 z-50">
        {members.map((member) => (
          <div key={member.id} className="relative">
            <div
              onClick={() => openPopup(member)}
              className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium cursor-pointer hover:opacity-80"
            >
              {member.email[0].toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {/* Centered popup */}
      {activeUser && (
        <div
          className="fixed inset-0 bg-[rgba(0,0,0,0.5)] z-50 flex items-center justify-center"
          onClick={closePopup}
        >
            <div
              className="bg-white px-6 py-4 rounded shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-sm font-semibold mb-2">Participant Email</h2>
              <p className="text-gray-800">{activeUser.email}</p>
              <button
                onClick={closePopup}
                className="mt-4 text-sm text-blue-600 hover:underline"
              >
                Close
              </button>
            </div>
        </div>
      )}
    </>
  );
};
