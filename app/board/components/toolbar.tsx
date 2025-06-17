"use client";
import { PencilLine, Square, Circle, Type, Undo2, Redo2 } from "lucide-react";
import { CanvasMode, ToolbarProps } from "./types";

export default function Toolbar({
  canvasState,
  setCanvasState,
  canUndo,
  canRedo,
  undo,
  redo,
}: ToolbarProps) {
  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-white p-2 rounded-md shadow-md flex flex-col gap-2">
      <button
        className={`p-2 rounded-md ${
          canvasState.mode === CanvasMode.Pencil
            ? "bg-blue-500 text-white"
            : "bg-white hover:bg-gray-100"
        }`}
        onClick={() => setCanvasState({ 
          mode: CanvasMode.Pencil, 
          currentStroke: [] 
        })}
      >
        <PencilLine size={20} />
      </button>
      <button
        className={`p-2 rounded-md ${
          canvasState.mode === CanvasMode.Rectangle
            ? "bg-blue-500 text-white"
            : "bg-white hover:bg-gray-100"
        }`}
        onClick={() => setCanvasState({ mode: CanvasMode.Rectangle })}
      >
        <Square size={20} />
      </button>
      <button
        className={`p-2 rounded-md ${
          canvasState.mode === CanvasMode.Circle
            ? "bg-blue-500 text-white"
            : "bg-white hover:bg-gray-100"
        }`}
        onClick={() => setCanvasState({ mode: CanvasMode.Circle })}
      >
        <Circle size={20} />
      </button>
      <div className="border-t my-1"></div>
      <button
        className="p-2 rounded-md bg-white hover:bg-gray-100 disabled:opacity-50"
        onClick={undo}
        disabled={!canUndo}
      >
        <Undo2 size={20} />
      </button>
      <button
        className="p-2 rounded-md bg-white hover:bg-gray-100 disabled:opacity-50"
        onClick={redo}
        disabled={!canRedo}
      >
        <Redo2 size={20} />
      </button>
    </div>
  );
}