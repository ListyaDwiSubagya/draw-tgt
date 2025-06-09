"use client";

import Link from "next/link";
import Image from "next/image"
import { LayoutDashboard, Star } from "lucide-react";
import { Poppins } from "next/font/google";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

const font = Poppins ({
    subsets: ["latin"],
    weight: ["600"],
});

export const OrgSidebar = () => {

    const searchParams = useSearchParams();
    const favorites = searchParams.get("favorites")
    
    return (
        <div className="hidden lg:flex flex-col space-y-6 w-[206px] pl-5 pt-5">
            <Link href="/">
                <div className="flex items-center gap-x-2">
                    <Image alt="" height={60} width={60} src="/logo.svg"/>
                    <span className={cn(
                        "font-semibold text-2xl",
                        font.className,
                    )}>Board</span>
                </div>
            </Link>

            <div className="space-y-1 w-full mt-10">
                <Button 
                variant={favorites ? "outline" : "secondary"}
                asChild 
                size="lg"
                className="font-normal justify-start px-2 w-full">
                    <Link href="/">
                        <LayoutDashboard className="h-4 w-4 mr-2"/>
                        Team boards
                    </Link>
                </Button>
                <Button 
                variant={favorites ? "secondary" : "outline"}
                asChild 
                size="lg"
                className="font-normal justify-start px-2 w-full">
                    <Link href={{
                        pathname : "/",
                        query: {favorites: true}
                    }}>
                        <Star className="h-4 w-4 mr-2"/>
                        Favorite boards
                    </Link>
                </Button>
            </div>
        </div>
    )
}