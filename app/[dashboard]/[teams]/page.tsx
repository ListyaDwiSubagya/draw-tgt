"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Organization {
  id: string;
  name: string;
  boards: { id: string; title: string }[];
}

export default function TeamBoardsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/organization");
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">My Teams</h1>
      <div className="space-y-6">
        {organizations.map((org) => (
          <div key={org.id} className="border p-4 rounded shadow-sm">
            <Link
              href={`/dashboard?orgId=${org.id}`}
              className="text-xl font-semibold text-blue-600 hover:underline"
            >
              {org.name}
            </Link>
            <ul className="pl-4 mt-2 text-sm text-gray-700 list-disc">
              {org.boards.map((board) => (
                <li key={board.id}>
                  <Link href={`/board/${board.id}`} className="hover:underline">
                    {board.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
