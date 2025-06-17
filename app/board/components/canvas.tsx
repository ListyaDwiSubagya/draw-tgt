"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Toolbar from "./toolbar";
import { Info } from "./info";
import { Participans } from "./participans";
import { CanvasMode, Point, CanvasState } from "./types";

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasState, setCanvasState] = useState<CanvasState>({ 
    mode: CanvasMode.None 
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingHistory, setDrawingHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#000000";
      ctx.fillStyle = "transparent";
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setDrawingHistory(prev => [...prev.slice(0, historyIndex + 1), imageData]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);

    if (canvasState.mode === CanvasMode.Pencil) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      setCanvasState({
        mode: CanvasMode.Pencil,
        currentStroke: [{ x, y }]
      });
    } else {
      setCanvasState({
        mode: canvasState.mode,
        origin: { x, y },
        currentPosition: { x, y }
      });
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Clear canvas for preview
    if (historyIndex >= 0) {
      ctx.putImageData(drawingHistory[historyIndex], 0, 0);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (canvasState.mode === CanvasMode.Pencil) {
      if (canvasState.currentStroke) {
        ctx.beginPath();
        ctx.moveTo(canvasState.currentStroke[0].x, canvasState.currentStroke[0].y);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        setCanvasState(prev => ({
          ...prev,
          currentStroke: [...prev.currentStroke!, { x, y }]
        }));
      }
    } 
    else if (canvasState.origin) {
      if (canvasState.mode === CanvasMode.Rectangle) {
        ctx.beginPath();
        ctx.rect(
          canvasState.origin.x,
          canvasState.origin.y,
          x - canvasState.origin.x,
          y - canvasState.origin.y
        );
        ctx.stroke();
      } 
      else if (canvasState.mode === CanvasMode.Circle) {
        const radius = Math.sqrt(
          Math.pow(x - canvasState.origin.x, 2) + 
          Math.pow(y - canvasState.origin.y, 2)
        );
        ctx.beginPath();
        ctx.arc(
          canvasState.origin.x,
          canvasState.origin.y,
          radius,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }

      setCanvasState(prev => ({
        ...prev,
        currentPosition: { x, y }
      }));
    }
  };

  const endDrawing = () => {
    if (isDrawing) {
      saveToHistory();
      setIsDrawing(false);
    }
  };

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.putImageData(drawingHistory[historyIndex - 1], 0, 0);
    setHistoryIndex(prev => prev - 1);
  }, [drawingHistory, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex >= drawingHistory.length - 1) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.putImageData(drawingHistory[historyIndex + 1], 0, 0);
    setHistoryIndex(prev => prev + 1);
  }, [drawingHistory, historyIndex]);

  return (
    <main className="h-screen w-screen relative bg-neutral-100 touch-none overflow-hidden">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        className="absolute inset-0 w-full h-full bg-white"
        />
      <Toolbar
        canvasState={canvasState}
        setCanvasState={setCanvasState}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < drawingHistory.length - 1}
        undo={undo}
        redo={redo}
        />
        <Info/>
        <Participans/>
    </main>
  );
}