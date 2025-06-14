"use client"

import { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ToolButtonProps {
    icon: LucideIcon;
    onClick: () => void;
    isActive?: boolean;
    isDisabled: boolean;
};

export const ToolButton = ({
    icon: Icon,
    onClick,
    isActive,
    isDisabled,
}: ToolButtonProps) => {
    return (
        <Button 
        disabled={isDisabled}
        onClick={onClick}
        variant={isActive ? "boardActive" : "board"}>
            <Icon/>
        </Button>
    )
}