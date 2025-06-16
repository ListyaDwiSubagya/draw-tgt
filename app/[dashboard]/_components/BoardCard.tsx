import Image from 'next/image';
import { StarIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export interface BoardCardProps {
  id: string;
  type: 'new' | 'existing';
  title: string;
  imageUrl?: string;
  subtitle?: string;
}

export default function BoardCard({ id, type, title, imageUrl, subtitle }: BoardCardProps) {
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

  // ✅ Wrap with Link to board detail
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
          <p className="text-gray-800 text-base font-medium truncate">{title}</p>
          {subtitle && (
            <p className="text-gray-500 text-xs mt-1 truncate">{subtitle}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
