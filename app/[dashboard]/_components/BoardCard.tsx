"use client";

import Image from 'next/image';
import Link from 'next/link';
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export interface BoardCardProps {
  id: string;
  type: 'new' | 'existing';
  title: string;
  imageUrl?: string;
  subtitle?: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function BoardCard({
  id,
  type,
  title,
  imageUrl,
  subtitle,
  onEdit,
  onDelete,
}: BoardCardProps) {
  if (type === 'new') {
    return (
      <div className="relative flex flex-col items-center justify-center bg-blue-600 rounded-lg shadow-md cursor-pointer
                      h-48 w-full p-4 overflow-hidden
                      hover:bg-blue-700 transition-colors duration-200">
        <div className="text-white text-6xl mb-2">+</div>
        <p className="text-white text-lg font-medium">{title}</p>
      </div>
    );
  }

  return (
    <Link href={`/board/${id}`}>
      <div className="relative bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200
                      h-48 w-full cursor-pointer group flex flex-col">
        <div className="relative w-full h-32 bg-gray-200 rounded-t-lg overflow-hidden">
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="rounded-t-lg object-cover"
            />
          )}
        </div>
        <div className="p-3 flex-grow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-gray-800 text-base font-medium truncate">{title}</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 hover:bg-gray-100 rounded-md"
                  onClick={(e) => e.preventDefault()} // prevent redirect
                >
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    onEdit?.(id);
                  }}
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete?.(id);
                  }}
                  className="text-red-600"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {subtitle && (
            <p className="text-gray-500 text-xs mt-1 truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
