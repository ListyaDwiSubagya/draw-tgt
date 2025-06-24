"use client";
import { 
  PencilLine, 
  Square, 
  Circle, 
  Undo2, 
  Redo2, 
  TextCursorInput,
  ArrowRight,
  Eraser,
  Triangle
} from "lucide-react";
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
      {/* Text Tool */}
      <button
        className={`p-2 rounded-md ${
          canvasState.mode === CanvasMode.Text ? "bg-blue-500 text-white" : "bg-white hover:bg-gray-100"
        }`}
        onClick={() => setCanvasState({ mode: CanvasMode.Text, text: "" })}
        title="Text Tool (T)"
      >
        <TextCursorInput size={20} />
      </button>
      
      {/* Arrow Tool */}
      <button
        className={`p-2 rounded-md ${
          canvasState.mode === CanvasMode.Arrow ? "bg-blue-500 text-white" : "bg-white hover:bg-gray-100"
        }`}
        onClick={() => setCanvasState({ mode: CanvasMode.Arrow })}
        title="Arrow Tool (A)"
      >
        <ArrowRight size={20} />
      </button>

      {/* Pencil Tool */}
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
        title="Pencil Tool (P)"
      >
        <PencilLine size={20} />
      </button>

      {/* Rectangle Tool */}
      <button
        className={`p-2 rounded-md ${
          canvasState.mode === CanvasMode.Rectangle
            ? "bg-blue-500 text-white"
            : "bg-white hover:bg-gray-100"
        }`}
        onClick={() => setCanvasState({ mode: CanvasMode.Rectangle })}
        title="Rectangle Tool (R)"
      >
        <Square size={20} />
      </button>

      {/* Circle Tool */}
      <button
        className={`p-2 rounded-md ${
          canvasState.mode === CanvasMode.Circle
            ? "bg-blue-500 text-white"
            : "bg-white hover:bg-gray-100"
        }`}
        onClick={() => setCanvasState({ mode: CanvasMode.Circle })}
        title="Circle Tool (C)"
      >
        <Circle size={20} />
      </button>

      {/* Triangle Tool */}
      <button
        className={`p-2 rounded-md ${
          canvasState.mode === CanvasMode.Triangle
            ? "bg-blue-500 text-white"
            : "bg-white hover:bg-gray-100"
        }`}
        onClick={() => setCanvasState({ mode: CanvasMode.Triangle })}
        title="Triangle Tool (T)"
      >
        <Triangle size={20} />
      </button>

      {/* Eraser Tool - Simplified */}
      <button
        className={`p-2 rounded-md ${
          canvasState.mode === CanvasMode.Eraser 
            ? "bg-blue-500 text-white" 
            : "bg-white hover:bg-gray-100"
        }`}
        onClick={() => setCanvasState({ 
          mode: CanvasMode.Eraser,
          eraserSize: 20 // Fixed size
        })}
        title="Eraser (E)"
      >
        <Eraser size={20} />
      </button>

      {/* Divider */}
      <div className="border-t my-1"></div>

      {/* Undo Button */}
      <button
        className="p-2 rounded-md bg-white hover:bg-gray-100 disabled:opacity-50"
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 size={20} />
      </button>

      {/* Redo Button */}
      <button
        className="p-2 rounded-md bg-white hover:bg-gray-100 disabled:opacity-50"
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
      >
        <Redo2 size={20} />
      </button>
    </div>
  );
}