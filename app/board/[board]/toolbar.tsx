// toolbar.tsx
"use client";

import { Type, Square, Circle, PencilLine, Undo, Redo } from 'lucide-react';

// Mendefinisikan mode kanvas dan tipe status kanvas untuk komponen ini
// Catatan: Definisi ini diduplikasi di canvas.tsx untuk memastikan kedua file mandiri
export enum CanvasMode {
  None,
  Pressing,
  Pencil,
  Text,
  Rectangle,
  Circle,
}

export type CanvasState =
  | { mode: CanvasMode.None }
  | { mode: CanvasMode.Pressing; origin: { x: number; y: number } }
  | { mode: CanvasMode.Pencil; currentStroke: { x: number; y: number }[] }
  | { mode: CanvasMode.Text; }
  | { mode: CanvasMode.Rectangle; }
  | { mode: CanvasMode.Circle; };

// Mock untuk fungsi utilitas 'cn' (dari "@/lib/utils")
const cn = (...args: any[]) => args.filter(Boolean).join(" ");

// Mock untuk komponen Button (dari "@/components/ui/button")
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "board" | "default" | "tool";
}
const Button = ({ children, variant, className, ...props }: ButtonProps) => {
  const baseClasses = "flex items-center justify-center rounded-md transition-colors";
  const variantClasses = {
    board: "bg-transparent hover:bg-neutral-100",
    default: "bg-blue-500 text-white hover:bg-blue-600",
    tool: "w-12 h-12 bg-white rounded-md flex items-center justify-center shadow-md hover:bg-gray-100 transition",
  };
  return (
    <button
      className={cn(baseClasses, variantClasses[variant || "default"], className)}
      {...props}
    >
      {children}
    </button>
  );
};

interface ToolbarProps {
  canvasState: CanvasState;
  setCanvasState: (newState: CanvasState) => void;
  canRedo: boolean;
  canUndo: boolean;
  undo: () => void;
  redo: () => void;
}

export const Toolbar = ({
  canvasState,
  setCanvasState,
  canRedo,
  canUndo,
  undo,
  redo,
}: ToolbarProps) => {
  return (
    <div className="absolute top-1/2 left-2 -translate-y-1/2 bg-white rounded-md p-2 flex flex-col items-center shadow-md space-y-2">
      {/* Tool Buttons */}
      <Button variant="tool" onClick={() => setCanvasState({ mode: CanvasMode.Text })}>
        <Type className="h-5 w-5" />
      </Button>
      <Button variant="tool" onClick={() => setCanvasState({ mode: CanvasMode.Rectangle })}>
        <Square className="h-5 w-5" />
      </Button>
      <Button variant="tool" onClick={() => setCanvasState({ mode: CanvasMode.Circle })}>
        <Circle className="h-5 w-5" />
      </Button>
      <Button variant="tool" onClick={() => setCanvasState({ mode: CanvasMode.Pencil, currentStroke: [] })}>
        <PencilLine className="h-5 w-5" />
      </Button>

      {/* Visual Separator */}
      <div className="w-full h-px bg-gray-200 my-2" />

      {/* Undo/Redo Buttons */}
      <Button
        variant="tool"
        onClick={undo}
        disabled={!canUndo}
        className={cn("bg-gray-200", !canUndo && "opacity-50 cursor-not-allowed")}
      >
        <Undo className="h-5 w-5" />
      </Button>
      <Button
        variant="tool"
        onClick={redo}
        disabled={!canRedo}
        className={cn("bg-gray-200", !canRedo && "opacity-50 cursor-not-allowed")}
      >
        <Redo className="h-5 w-5" />
      </Button>

      {/* Display current canvas mode (optional, for debugging) */}
      {/* <p className="ml-4 text-sm font-medium text-gray-700">
        Current Mode:{" "}
        <span className="font-semibold">{CanvasMode[canvasState.mode]}</span>
      </p> */}
    </div>
  );
};
