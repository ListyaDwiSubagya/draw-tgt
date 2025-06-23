"use client";

import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Star, ChevronDown } from "lucide-react";
import { Poppins } from "next/font/google";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const font = Poppins({ subsets: ["latin"], weight: ["600"] });

interface Board {
  id: string;
  title: string;
}

interface Organization {
  id: string;
  name: string;
  boards: Board[];
}

export const OrgSidebar = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const searchParams = useSearchParams();
  const favorites = searchParams.get("favorites");
  const currentOrgId = searchParams.get("orgId");

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
    <div className="hidden lg:flex flex-col space-y-6 w-[240px] pl-5 pt-5 overflow-y-auto">
      <Link href="/dashboard">
        <div className="flex items-center gap-x-2">
          <Image alt="" height={60} width={60} src="/logo2.png" />
          <span className={cn("font-semibold text-2xl", font.className)}>
            DrawBoard
          </span>
        </div>
      </Link>

      <div className="space-y-1 w-full mt-6">
        <Button
          variant={favorites ? "outline" : "secondary"}
          asChild
          size="lg"
          className="font-normal justify-start px-2 w-full"
        >
          <Link href="/dashboard/teams">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Team boards
          </Link>
        </Button>
        <Button
          variant={favorites ? "secondary" : "outline"}
          asChild
          size="lg"
          className="font-normal justify-start px-2 w-full"
        >
          <Link href={{ pathname: "/", query: { favorites: true } }}>
            <Star className="h-4 w-4 mr-2" />
            Favorite boards
          </Link>
        </Button>
      </div>

      <div className="mt-4">
  <h4 className="text-sm text-gray-400 font-medium mb-3 px-2">My Teams</h4>
  <div className="space-y-1">
    {organizations.map((org) => (
      <div key={org.id} className="rounded-md">
        <Link href={`/dashboard?orgId=${org.id}`}>
          <div
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-gray-100",
              currentOrgId === org.id && "bg-blue-100 text-blue-700 hover:bg-blue-100"
            )}
          >
            <div className="flex items-center gap-x-2">
              <ChevronDown className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">{org.name}</span>
            </div>
          </div>
        </Link>

        <ul className="pl-9 pr-2 py-1 space-y-1">
          {org.boards.length > 0 ? (
            org.boards.map((board) => (
              <li key={board.id}>
                <Link
                  href={`/board/${board.id}`}
                  className="block text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-2 py-1 rounded-md transition"
                >
                  {board.title}
                </Link>
              </li>
            ))
          ) : (
            <li className="text-xs text-gray-400 px-2 py-1">No boards</li>
          )}
        </ul>
      </div>
    ))}
  </div>
</div>

    </div>
  );
};
