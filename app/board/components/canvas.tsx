/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Toolbar from "./toolbar";
import { Info } from "./info";
import { Participans } from "./participans";
import { CanvasMode, Point, CanvasState } from "./types";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useAuth, useUser } from "@clerk/nextjs";

type VectorElement =
  | { type: "pencil"; points: Point[]; color: string; width: number }
  | { type: "rectangle"; from: Point; to: Point; color: string; width: number }
  | {
      type: "circle";
      center: Point;
      radius: number;
      color: string;
      width: number;
    }
  | { type: "text"; text: string; position: Point; color: string; size: number }
  | { type: "arrow"; from: Point; to: Point; color: string; width: number }
  | { type: "erase"; points: Point[]; size: number };

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const { userId: clerkId } = useAuth();
  const { user } = useUser();
  const [databaseUserId, setDatabaseUserId] = useState<string | null>(null);

  // State declarations
  const [canvasState, setCanvasState] = useState<CanvasState>({
    mode: CanvasMode.None,
  });
  const [vectorElements, setVectorElements] = useState<VectorElement[]>([]);
  const [drawingHistory, setDrawingHistory] = useState<VectorElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textInputPos, setTextInputPos] = useState<Point | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [remoteCursors, setRemoteCursors] = useState<
    { userId: string; position: Point }[]
  >([]);
  const [currentColor, setCurrentColor] = useState("#000000");
  const [currentWidth, setCurrentWidth] = useState(3);

  const params = useParams();
  const boardId = params?.board as string;

  // Fetch database user ID
  useEffect(() => {
    if (!clerkId) return;

    const fetchDatabaseUserId = async () => {
      try {
        const response = await fetch(`/api/user/${clerkId}`);
        if (response.ok) {
          const data = await response.json();
          setDatabaseUserId(data.id);
        }
      } catch (error) {
        console.error("Error fetching user ID:", error);
      }
    };

    fetchDatabaseUserId();
  }, [clerkId]);

  // Socket.io setup
  useEffect(() => {
    if (!boardId || !databaseUserId) return;

    const socket = io("http://10.132.1.246:4000");
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinBoard", { boardId, userId: databaseUserId });
    });

    socket.on("initialVectorData", (elements: VectorElement[]) => {
      setVectorElements(elements);
      setDrawingHistory([elements]);
      setHistoryIndex(0);
    });

    socket.on("vectorElementAdded", ({ element, userId: remoteUserId }) => {
      if (remoteUserId !== databaseUserId) {
        setVectorElements((prev) => [...prev, element]);
        redrawCanvas();
      }
    });

    socket.on("vectorElementsUpdated", ({ elements, userId: remoteUserId }) => {
      if (remoteUserId !== databaseUserId) {
        setVectorElements(elements);
        redrawCanvas();
      }
    });

    socket.on("cursorMove", ({ position, userId: remoteUserId }) => {
      if (remoteUserId !== databaseUserId) {
        setRemoteCursors((prev) => {
          const existing = prev.find((c) => c.userId === remoteUserId);
          if (existing) {
            return prev.map((c) =>
              c.userId === remoteUserId ? { ...c, position } : c
            );
          }
          return [...prev, { userId: remoteUserId, position }];
        });
      }
    });

    socket.on("undo", (remoteUserId) => {
      if (remoteUserId !== databaseUserId && historyIndex > 0) {
        setHistoryIndex((prev) => prev - 1);
        setVectorElements(drawingHistory[historyIndex - 1]);
      }
    });

    socket.on("redo", (remoteUserId) => {
      if (
        remoteUserId !== databaseUserId &&
        historyIndex < drawingHistory.length - 1
      ) {
        setHistoryIndex((prev) => prev + 1);
        setVectorElements(drawingHistory[historyIndex + 1]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [boardId, databaseUserId, historyIndex, drawingHistory]);

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        redrawCanvas();
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  // Load initial data
  useEffect(() => {
    if (!boardId || !socketRef.current) return;

    socketRef.current.emit("requestInitialData", { boardId });
  }, [boardId]);

  // Redraw canvas based on vector elements
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all vector elements
    vectorElements.forEach((element) => {
      if ("color" in element) {
        ctx.strokeStyle = element.color;
        ctx.fillStyle = element.color;
      }

      switch (element.type) {
        case "pencil":
          ctx.lineWidth = element.width;
          if (element.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(element.points[0].x, element.points[0].y);
            for (let i = 1; i < element.points.length; i++) {
              ctx.lineTo(element.points[i].x, element.points[i].y);
            }
            ctx.stroke();
          }
          break;

        case "rectangle":
          ctx.lineWidth = element.width;
          ctx.beginPath();
          ctx.rect(
            element.from.x,
            element.from.y,
            element.to.x - element.from.x,
            element.to.y - element.from.y
          );
          ctx.stroke();
          break;

        case "circle":
          ctx.lineWidth = element.width;
          ctx.beginPath();
          ctx.arc(
            element.center.x,
            element.center.y,
            element.radius,
            0,
            Math.PI * 2
          );
          ctx.stroke();
          break;

        case "text":
          ctx.font = `${element.size}px Arial`;
          ctx.fillText(element.text, element.position.x, element.position.y);
          break;

        case "arrow":
          ctx.lineWidth = element.width;
          drawArrow(ctx, element.from, element.to);
          break;

        case "erase":
          // Eraser marks are typically not drawn, but could be visualized
          break;
      }
    });

    // Draw temporary elements (preview)
    drawTemporaryElements(ctx);

    // Draw remote cursors
    remoteCursors.forEach(({ position }) => {
      ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
      ctx.beginPath();
      ctx.arc(position.x, position.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [vectorElements, remoteCursors, canvasState]);

  // Helper function to draw arrows
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point
  ) => {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();

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

  // Draw temporary elements (preview while drawing)
  const drawTemporaryElements = (ctx: CanvasRenderingContext2D) => {
    if (!isDrawing) return;

    ctx.strokeStyle = currentColor;
    ctx.fillStyle = currentColor;
    ctx.lineWidth = currentWidth;

    switch (canvasState.mode) {
      case CanvasMode.Pencil:
        if (canvasState.currentStroke && canvasState.currentStroke.length > 1) {
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
            Math.pow(canvasState.currentPosition.x - canvasState.origin.x, 2) +
              Math.pow(canvasState.currentPosition.y - canvasState.origin.y, 2)
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
  };

  // Save current state to history
  const saveToHistory = useCallback(() => {
    setDrawingHistory((prev) => [
      ...prev.slice(0, historyIndex + 1),
      [...vectorElements],
    ]);
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex, vectorElements]);

  // Sync with server and other clients
  const syncCanvasState = useCallback(() => {
    if (isSyncing || !socketRef.current || !boardId || !databaseUserId) return;

    setIsSyncing(true);
    socketRef.current.emit("vectorUpdate", {
      boardId,
      elements: vectorElements,
      userId: databaseUserId,
    });
    autoSaveDrawing().finally(() => setIsSyncing(false));
  }, [boardId, databaseUserId, isSyncing, vectorElements]);

  // Auto-save to database
  const autoSaveDrawing = async () => {
    try {
      await fetch(`/api/board/${boardId}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          elements: vectorElements,
          format: "vector",
        }),
      });
    } catch (error) {
      console.error("Error saving vector data:", error);
    }
  };

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!databaseUserId) {
      alert("You must be logged in to draw.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    socketRef.current?.emit("cursorMove", {
      position: { x, y },
      userId: databaseUserId,
    });

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
        setTextInputPos({ x, y });
        setTimeout(() => {
          textInputRef.current?.focus();
        }, 0);
        break;

      case CanvasMode.Eraser:
        setCanvasState({
          mode: CanvasMode.Eraser,
          currentStroke: [{ x, y }],
        });
        break;
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isSyncing || !databaseUserId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    socketRef.current?.emit("cursorMove", {
      position: { x, y },
      userId: databaseUserId,
    });

    redrawCanvas();

    switch (canvasState.mode) {
      case CanvasMode.Pencil:
        setCanvasState((prev) => ({
          ...prev,
          currentStroke: [...(prev.currentStroke || []), { x, y }],
        }));
        break;

      case CanvasMode.Rectangle:
      case CanvasMode.Circle:
        setCanvasState((prev) => ({
          ...prev,
          currentPosition: { x, y },
        }));
        break;

      case CanvasMode.Arrow:
        setCanvasState((prev) => ({
          ...prev,
          end: { x, y },
        }));
        break;

      case CanvasMode.Eraser:
        // Handle eraser logic
        setCanvasState((prev) => ({
          ...prev,
          currentStroke: [...(prev.currentStroke || []), { x, y }],
        }));
        break;
    }
  };

  const endDrawing = () => {
    if (!isDrawing || !databaseUserId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let newElement: VectorElement | null = null;

    switch (canvasState.mode) {
      case CanvasMode.Pencil:
        if (canvasState.currentStroke && canvasState.currentStroke.length > 1) {
          newElement = {
            type: "pencil",
            points: canvasState.currentStroke,
            color: currentColor,
            width: currentWidth,
          };
        }
        break;

      case CanvasMode.Rectangle:
        if (canvasState.origin && canvasState.currentPosition) {
          newElement = {
            type: "rectangle",
            from: canvasState.origin,
            to: canvasState.currentPosition,
            color: currentColor,
            width: currentWidth,
          };
        }
        break;

      case CanvasMode.Circle:
        if (canvasState.origin && canvasState.currentPosition) {
          const radius = Math.sqrt(
            Math.pow(canvasState.currentPosition.x - canvasState.origin.x, 2) +
              Math.pow(canvasState.currentPosition.y - canvasState.origin.y, 2)
          );
          newElement = {
            type: "circle",
            center: canvasState.origin,
            radius,
            color: currentColor,
            width: currentWidth,
          };
        }
        break;

      case CanvasMode.Arrow:
        if (canvasState.start && canvasState.end) {
          newElement = {
            type: "arrow",
            from: canvasState.start,
            to: canvasState.end,
            color: currentColor,
            width: currentWidth,
          };
        }
        break;

      case CanvasMode.Eraser:
        if (canvasState.currentStroke) {
          // For eraser, we need to remove elements that intersect with the eraser path
          const eraserSize = canvasState.eraserSize || 20;
          const newElements = vectorElements.filter((element) => {
            if (element.type === "pencil") {
              // Simple collision detection between eraser and pencil strokes
              return !canvasState.currentStroke?.some((point) => {
                return element.points.some((p) => {
                  const dx = p.x - point.x;
                  const dy = p.y - point.y;
                  return Math.sqrt(dx * dx + dy * dy) < eraserSize;
                });
              });
            }
            return true;
          });

          if (newElements.length !== vectorElements.length) {
            setVectorElements(newElements);
            saveToHistory();
            syncCanvasState();
          }
        }
        break;
    }

    if (newElement) {
      setVectorElements((prev) => [...prev, newElement!]);
      saveToHistory();
      syncCanvasState();

      // Broadcast the new element to other clients
      socketRef.current?.emit("vectorElementAdded", {
        boardId,
        element: newElement,
        userId: databaseUserId,
      });
    }

    setIsDrawing(false);
    setCanvasState({ mode: CanvasMode.None });
  };

  // Undo/redo functionality
  const undo = useCallback(() => {
    if (historyIndex <= 0) return;

    setHistoryIndex((prev) => prev - 1);
    setVectorElements(drawingHistory[historyIndex - 1]);
    socketRef.current?.emit("undo", databaseUserId);
    syncCanvasState();
  }, [historyIndex, drawingHistory, syncCanvasState, databaseUserId]);

  const redo = useCallback(() => {
    if (historyIndex >= drawingHistory.length - 1) return;

    setHistoryIndex((prev) => prev + 1);
    setVectorElements(drawingHistory[historyIndex + 1]);
    socketRef.current?.emit("redo", databaseUserId);
    syncCanvasState();
  }, [historyIndex, drawingHistory.length, syncCanvasState, databaseUserId]);

  // Handle text input
  const handleTextSubmit = () => {
    if (textInput.trim() !== "" && textInputPos) {
      const newElement: VectorElement = {
        type: "text",
        text: textInput,
        position: textInputPos,
        color: currentColor,
        size: 16,
      };

      setVectorElements((prev) => [...prev, newElement]);
      saveToHistory();
      syncCanvasState();

      socketRef.current?.emit("vectorElementAdded", {
        boardId,
        element: newElement,
        userId: databaseUserId,
      });
    }
    setTextInput("");
    setTextInputPos(null);
  };

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

      {textInputPos && (
        <input
          ref={textInputRef}
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onBlur={handleTextSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleTextSubmit();
            }
          }}
          style={{
            position: "absolute",
            top: textInputPos.y,
            left: textInputPos.x,
            font: "16px Arial",
            padding: "2px",
            border: "1px solid #ccc",
            zIndex: 10,
            color: currentColor,
          }}
          autoFocus
        />
      )}

      <Toolbar
        canvasState={canvasState}
        setCanvasState={setCanvasState}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < drawingHistory.length - 1}
        undo={undo}
        redo={redo}
        currentColor={currentColor}
        setCurrentColor={setCurrentColor}
        currentWidth={currentWidth}
        setCurrentWidth={setCurrentWidth}
      />
      <Info />
      <Participans />
    </main>
  );
}
