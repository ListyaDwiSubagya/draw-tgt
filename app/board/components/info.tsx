import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { Poppins } from "next/font/google";
import { Link as LinkIcon } from "lucide-react"; 

const font = Poppins ({
    subsets: ["latin"],
    weight: ["600"],
});

const TabSeparator = () => {
    return (
        <div className="text-neutral-300 px-1.5">
            |
        </div>
    )
}

export const Info = () => {
    return (
        <div className="absolute top-2 left-2 bg-white rounded-md
        px-1.5 h-12 flex items-center shadow-md">
            <Link href="../dsahboard">
                <Button variant="board" className="px-2">
                    <Image
                    src="/logo.svg"
                    alt="logo"
                    height={40}
                    width={40}
                    />
                    <span className={cn("font-semibold text-xl ml-2 text-black",
                        font.className
                    )}>
                        Board
                    </span>
                </Button>
            </Link>
            <TabSeparator/>
            <Button
                variant="board"
                className="px-2"
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                >
                <LinkIcon className="h-4 w-4 text-black" />
                <span className={cn("font-light text-sm ml-1 text-black", font.className)}>
                    Copy board link
                </span>
            </Button>
        </div>
    )
}