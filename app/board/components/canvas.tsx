"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import io from "socket.io-client";
import Toolbar from "./toolbar";
import { Info } from "./info";
import { Participans } from "./participans";
import { CanvasMode, Point, CanvasState } from "./types";
import { useParams } from "next/navigation";

type CanvasData = {
  imageData: string;
  textElements: { text: string; position: Point }[];
  arrows: { start: Point; end: Point }[];
};

let socket: any;

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    mode: CanvasMode.None,
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingHistory, setDrawingHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [textElements, setTextElements] = useState<
    { text: string; position: Point }[]
  >([]);
  const [arrows, setArrows] = useState<{ start: Point; end: Point }[]>([]);
  const [eraserSize, setEraserSize] = useState(20);
  const [isSyncing, setIsSyncing] = useState(false);

  const params = useParams();
  const boardId = params?.board as string;

  // Socket.io connection and event handlers
  useEffect(() => {
    socket = io({ path: "/api/socket" });

    socket.emit("join", boardId);

    socket.on("drawing", (data: { x0: number; y0: number; x1: number; y1: number }) => {
      if (isSyncing) return;
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(data.x0, data.y0);
      ctx.lineTo(data.x1, data.y1);
      ctx.stroke();
    });

    socket.on("sync-canvas", (data: CanvasData) => {
      setIsSyncing(true);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        setTextElements(data.textElements || []);
        setArrows(data.arrows || []);

        // Update history
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setDrawingHistory([imageData]);
        setHistoryIndex(0);
        setIsSyncing(false);
      };
      img.src = data.imageData;
    });

    socket.on("request-canvas-state", (requestedBoardId: string) => {
      if (requestedBoardId === boardId) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const dataUrl = canvas.toDataURL("image/png");
        socket.emit("send-canvas-state", {
          boardId,
          state: {
            imageData: dataUrl,
            textElements,
            arrows
          }
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [boardId]);

  // Canvas setup and resize handler
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
      ctx.fillStyle = "#000000";
      ctx.font = "16px Arial";
      redrawCanvas();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  // Initial drawing load
  useEffect(() => {
    if (!boardId) return;

    const fetchDrawing = async () => {
      const res = await fetch(`/api/board/${boardId}/save`);
      const data = await res.json();
      const imgData = data.drawing;

      if (!imgData) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);

        if (data.textElements) setTextElements(data.textElements);
        if (data.arrows) setArrows(data.arrows);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setDrawingHistory([imageData]);
        setHistoryIndex(0);
      };
      img.src = imgData;
    };

    fetchDrawing();
  }, [boardId]);

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setDrawingHistory((prev) => [
      ...prev.slice(0, historyIndex + 1),
      imageData,
    ]);
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw from history
    if (historyIndex >= 0) {
      ctx.putImageData(drawingHistory[historyIndex], 0, 0);
    }

    // Redraw text elements
    textElements.forEach(({ text, position }) => {
      ctx.fillText(text, position.x, position.y);
    });

    // Redraw arrows
    arrows.forEach((arrow) => {
      drawArrow(ctx, arrow.start, arrow.end);
    });

    // Draw current preview
    if (isDrawing) {
      switch (canvasState.mode) {
        case CanvasMode.Pencil:
          if (
            canvasState.currentStroke &&
            canvasState.currentStroke.length > 1
          ) {
            ctx.beginPath();
            ctx.moveTo(
              canvasState.currentStroke[0].x,
              canvasState.currentStroke[0].y
            );
            for (let i = 1; i < canvasState.currentStroke.length; i++) {
              ctx.lineTo(
                canvasState.currentStroke[i].x,
                canvasState.currentStroke[i].y
              );
            }
            ctx.stroke();
          }
          break;

        case CanvasMode.Rectangle:
          if (canvasState.origin && canvasState.currentPosition) {
            ctx.beginPath();
            ctx.rect(
              canvasState.origin.x,
              canvasState.origin.y,
              canvasState.currentPosition.x - canvasState.origin.x,
              canvasState.currentPosition.y - canvasState.origin.y
            );
            ctx.stroke();
          }
          break;

        case CanvasMode.Circle:
          if (canvasState.origin && canvasState.currentPosition) {
            const radius = Math.sqrt(
              Math.pow(
                canvasState.currentPosition.x - canvasState.origin.x,
                2
              ) +
                Math.pow(
                  canvasState.currentPosition.y - canvasState.origin.y,
                  2
                )
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
          break;

        case CanvasMode.Arrow:
          if (canvasState.start && canvasState.end) {
            drawArrow(ctx, canvasState.start, canvasState.end);
          }
          break;
      }
    }
  }, [
    canvasState,
    drawingHistory,
    historyIndex,
    isDrawing,
    textElements,
    arrows,
  ]);

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point
  ) => {
    // Draw line
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

    // Draw arrow head
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - 15 * Math.cos(angle - Math.PI / 6),
      end.y - 15 * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      end.x - 15 * Math.cos(angle + Math.PI / 6),
      end.y - 15 * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  };

  const exportCanvasAsImage = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL("image/png");
  };

  const syncCanvasState = useCallback(() => {
    if (isSyncing) return;
    
    const dataUrl = exportCanvasAsImage();
    if (!dataUrl) return;

    socket.emit("sync-canvas", {
      boardId,
      imageData: dataUrl,
      textElements,
      arrows,
    });
  }, [boardId, textElements, arrows, isSyncing]);

  const autoSaveDrawing = async () => {
    const dataUrl = exportCanvasAsImage();
    if (!dataUrl) return;

    await fetch(`/api/board/${boardId}/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        drawing: dataUrl,
        textElements,
        arrows,
      }),
    });
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);

    switch (canvasState.mode) {
      case CanvasMode.Pencil:
        setCanvasState({
          mode: CanvasMode.Pencil,
          currentStroke: [{ x, y }],
        });
        break;

      case CanvasMode.Rectangle:
      case CanvasMode.Circle:
        setCanvasState({
          mode: canvasState.mode,
          origin: { x, y },
          currentPosition: { x, y },
        });
        break;

      case CanvasMode.Arrow:
        setCanvasState({
          mode: CanvasMode.Arrow,
          start: { x, y },
          end: { x, y },
        });
        break;

      case CanvasMode.Text:
        const text = prompt("Enter text:", "");
        if (text) {
          setTextElements((prev) => [...prev, { text, position: { x, y } }]);
          saveToHistory();
          syncCanvasState();
          autoSaveDrawing();
        }
        break;
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isSyncing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Clear and redraw from history for preview
    if (historyIndex >= 0) {
      ctx.putImageData(drawingHistory[historyIndex], 0, 0);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Redraw persistent elements (text and completed arrows)
    textElements.forEach(({ text, position }) => {
      ctx.fillText(text, position.x, position.y);
    });
    arrows.forEach((arrow) => {
      drawArrow(ctx, arrow.start, arrow.end);
    });

    // Handle current drawing tool
    switch (canvasState.mode) {
      case CanvasMode.Pencil:
        if (canvasState.currentStroke) {
          ctx.beginPath();
          ctx.moveTo(
            canvasState.currentStroke[0].x,
            canvasState.currentStroke[0].y
          );
          for (let i = 1; i < canvasState.currentStroke.length; i++) {
            ctx.lineTo(
              canvasState.currentStroke[i].x,
              canvasState.currentStroke[i].y
            );
          }
          ctx.stroke();

          const lastPoint =
            canvasState.currentStroke[canvasState.currentStroke.length - 1];
          const newPoint = { x, y };

          socket.emit("drawing", {
            boardId,
            x0: lastPoint.x,
            y0: lastPoint.y,
            x1: newPoint.x,
            y1: newPoint.y,
          });
        }
        setCanvasState((prev) => ({
          ...prev,
          currentStroke: [...(prev.currentStroke || []), { x, y }],
        }));
        break;

      case CanvasMode.Rectangle:
        if (canvasState.origin) {
          ctx.beginPath();
          ctx.rect(
            canvasState.origin.x,
            canvasState.origin.y,
            x - canvasState.origin.x,
            y - canvasState.origin.y
          );
          ctx.stroke();
        }
        setCanvasState((prev) => ({
          ...prev,
          currentPosition: { x, y },
        }));
        break;

      case CanvasMode.Circle:
        if (canvasState.origin) {
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
        setCanvasState((prev) => ({
          ...prev,
          currentPosition: { x, y },
        }));
        break;

      case CanvasMode.Arrow:
        if (canvasState.start) {
          drawArrow(ctx, canvasState.start, { x, y });
        }
        setCanvasState((prev) => ({
          ...prev,
          end: { x, y },
        }));
        break;

      case CanvasMode.Eraser:
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(x, y, eraserSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        break;
    }
  };

  const endDrawing = () => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    switch (canvasState.mode) {
      case CanvasMode.Pencil:
        if (canvasState.currentStroke && canvasState.currentStroke.length > 1) {
          saveToHistory();
          syncCanvasState();
          autoSaveDrawing();
        }
        break;

      case CanvasMode.Rectangle:
      case CanvasMode.Circle:
        if (canvasState.origin && canvasState.currentPosition) {
          saveToHistory();
          syncCanvasState();
          autoSaveDrawing();
        }
        break;

      case CanvasMode.Arrow:
        if (canvasState.start && canvasState.end) {
          setArrows((prev) => [
            ...prev,
            {
              start: canvasState.start!,
              end: canvasState.end!,
            },
          ]);
          saveToHistory();
          syncCanvasState();
          autoSaveDrawing();
        }
        break;

      case CanvasMode.Eraser:
        saveToHistory();
        syncCanvasState();
        autoSaveDrawing();
        break;
    }

    setIsDrawing(false);
  };

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;

    setHistoryIndex((prev) => prev - 1);
    syncCanvasState();
  }, [historyIndex, syncCanvasState]);

  const redo = useCallback(() => {
    if (historyIndex >= drawingHistory.length - 1) return;

    setHistoryIndex((prev) => prev + 1);
    syncCanvasState();
  }, [drawingHistory.length, historyIndex, syncCanvasState]);

  useEffect(() => {
    redrawCanvas();
  }, [
    canvasState,
    drawingHistory,
    historyIndex,
    textElements,
    arrows,
    redrawCanvas,
  ]);

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
        eraserSize={eraserSize}
        setEraserSize={setEraserSize}
      />
      <Info />
      <Participans />
    </main>
  );
}