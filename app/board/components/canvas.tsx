/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Toolbar from "./toolbar";
import { Info } from "./info";
import { Participans } from "./participans";
import { CanvasMode, Point, CanvasState, VectorElement } from "./types";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { useAuth, useUser } from "@clerk/nextjs";

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const { userId: clerkId } = useAuth();
  const { user } = useUser();
  const [databaseUserId, setDatabaseUserId] = useState<string | null>(null);
  const [currentColor, setCurrentColor] = useState("#000000");
  const [currentWidth, setCurrentWidth] = useState(3);

  const [canvasState, setCanvasState] = useState<CanvasState>({
    mode: CanvasMode.None,
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [textElements, setTextElements] = useState<
    { text: string; position: Point }[]
  >([]);
  const [vectorElements, setVectorElements] = useState<VectorElement[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textInputPos, setTextInputPos] = useState<Point | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [remoteCursors, setRemoteCursors] = useState<
    { userId: string; position: Point }[]
  >([]);

  const params = useParams();
  const boardId = params?.board as string;

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

  useEffect(() => {
    if (!boardId || !databaseUserId) return;

    const socket = io("http://10.132.1.253:4000");
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinBoard", { boardId, userId: databaseUserId });
    });

    socket.on("pencilStroke", ({ stroke, userId: remoteUserId }) => {
      if (remoteUserId !== databaseUserId) {
        setVectorElements((prev) => [
          ...prev,
          {
            type: "path",
            points: stroke,
            color: "black",
            width: 2,
          },
        ]);
        redrawCanvas();
      }
    });

    socket.on(
      "shapePreview",
      ({ tool, origin, currentPosition, userId: remoteUserId }) => {
        if (remoteUserId !== databaseUserId) {
          drawRemoteShapePreview(tool, origin, currentPosition);
        }
      }
    );

    socket.on(
      "shapeFinal",
      ({ tool, origin, currentPosition, userId: remoteUserId }) => {
        if (remoteUserId !== databaseUserId) {
          applyRemoteShape(tool, origin, currentPosition);
        }
      }
    );

    socket.on("textAdded", ({ textElement, userId: remoteUserId }) => {
      if (remoteUserId !== databaseUserId) {
        setTextElements((prev) => [...prev, textElement]);
        redrawCanvas();
      }
    });

    socket.on("shapeAdded", ({ shape, userId: remoteUserId }) => {
      if (remoteUserId !== databaseUserId) {
        setVectorElements((prev) => [...prev, shape]);
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

    socket.on("vectorSync", ({ vectorElements, userId: remoteUserId }) => {
      if (remoteUserId !== databaseUserId) {
        setVectorElements(vectorElements);
        redrawCanvas();
      }
    });

    socket.on("userJoined", (joinedUserId) => {
      console.log(`User ${joinedUserId} joined the board`);
    });

    socket.on("error", (message) => {
      console.error("WebSocket error:", message);
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from WebSocket server");
    });

    return () => {
      socket.disconnect();
    };
  }, [boardId, databaseUserId]);

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
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.strokeStyle = "#000000";
        ctx.fillStyle = "#000000";
        ctx.font = "16px Arial";
        redrawCanvas();
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  useEffect(() => {
    if (!boardId) return;

    const fetchVectorShapes = async () => {
      try {
        const res = await fetch(`/api/board/${boardId}/save`);
        const data = await res.json();

        if (data.vectorShapes && canvasRef.current) {
          setVectorElements(data.vectorShapes);
          redrawCanvas();
        }
      } catch (error) {
        console.error("Error loading vector shapes:", error);
      }
    };

    fetchVectorShapes();
  }, [boardId]);

  const drawVectorShapes = (
    ctx: CanvasRenderingContext2D,
    elements: VectorElement[]
  ) => {
    elements.forEach((element) => {
      ctx.strokeStyle = element.color || "black";
      ctx.fillStyle = element.color || "black";
      ctx.lineWidth = element.type === "path" ? element.width : currentWidth;

      switch (element.type) {
        case "path":
          ctx.beginPath();
          ctx.moveTo(element.points[0].x, element.points[0].y);
          for (let i = 1; i < element.points.length; i++) {
            ctx.lineTo(element.points[i].x, element.points[i].y);
          }
          ctx.stroke();
          break;

        case "rectangle":
          ctx.beginPath();
          ctx.rect(element.x, element.y, element.width, element.height);
          ctx.stroke();
          break;

        case "circle":
          ctx.beginPath();
          ctx.arc(element.cx, element.cy, element.radius, 0, Math.PI * 2);
          ctx.stroke();
          break;

        case "triangle":
          ctx.beginPath();
          ctx.moveTo(element.points[0].x, element.points[0].y);
          ctx.lineTo(element.points[1].x, element.points[1].y);
          ctx.lineTo(element.points[2].x, element.points[2].y);
          ctx.closePath();
          ctx.stroke();
          break;

        case "text":
          ctx.font = "16px Arial";
          ctx.fillText(element.content, element.x, element.y);
          break;

        case "arrow":
          drawArrow(ctx, element.start, element.end);
          break;
      }
    });
  };

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

  const drawTriangle = (
    ctx: CanvasRenderingContext2D,
    origin: Point,
    currentPosition: Point
  ) => {
    ctx.beginPath();
    ctx.moveTo(origin.x, currentPosition.y);
    ctx.lineTo(currentPosition.x, currentPosition.y);
    ctx.lineTo((origin.x + currentPosition.x) / 2, origin.y);
    ctx.closePath();
    ctx.stroke();
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawVectorShapes(ctx, vectorElements);

    if (isDrawing && canvasState.mode !== CanvasMode.None) {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentWidth;
      if (
        canvasState.mode === CanvasMode.Pencil &&
        canvasState.currentStroke &&
        canvasState.currentStroke.length > 1
      ) {
        ctx.beginPath();
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentWidth;

        const points = canvasState.currentStroke;
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
      }
      if (
        (canvasState.mode === CanvasMode.Rectangle ||
          canvasState.mode === CanvasMode.Circle ||
          canvasState.mode === CanvasMode.Triangle) &&
        canvasState.origin &&
        canvasState.currentPosition
      ) {
        const { origin, currentPosition } = canvasState;

        switch (canvasState.mode) {
          case CanvasMode.Rectangle: {
            const width = currentPosition.x - origin.x;
            const height = currentPosition.y - origin.y;
            ctx.strokeRect(origin.x, origin.y, width, height);
            break;
          }

          case CanvasMode.Circle: {
            const dx = currentPosition.x - origin.x;
            const dy = currentPosition.y - origin.y;
            const radius = Math.sqrt(dx * dx + dy * dy);
            ctx.beginPath();
            ctx.arc(origin.x, origin.y, radius, 0, Math.PI * 2);
            ctx.stroke();
            break;
          }

          case CanvasMode.Triangle: {
            ctx.beginPath();
            ctx.moveTo(origin.x, currentPosition.y);
            ctx.lineTo(currentPosition.x, currentPosition.y);
            ctx.lineTo((origin.x + currentPosition.x) / 2, origin.y);
            ctx.closePath();
            ctx.stroke();
            break;
          }
        }
      }
    }

    remoteCursors.forEach(({ position }) => {
      ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
      ctx.beginPath();
      ctx.arc(position.x, position.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [
    vectorElements,
    remoteCursors,
    currentColor,
    currentWidth,
    canvasState,
    isDrawing,
  ]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const drawRemoteShapePreview = useCallback(
    (
      tool:
        | CanvasMode.Rectangle
        | CanvasMode.Circle
        | CanvasMode.Triangle
        | CanvasMode.Pencil,
      origin: Point,
      currentPosition: Point
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      drawVectorShapes(ctx, vectorElements);

      ctx.save();
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = currentWidth;
      ctx.beginPath();

      if (tool === CanvasMode.Rectangle) {
        ctx.rect(
          origin.x,
          origin.y,
          currentPosition.x - origin.x,
          currentPosition.y - origin.y
        );
      } else if (tool === CanvasMode.Circle) {
        const radius = Math.sqrt(
          Math.pow(currentPosition.x - origin.x, 2) +
            Math.pow(currentPosition.y - origin.y, 2)
        );
        ctx.arc(origin.x, origin.y, radius, 0, Math.PI * 2);
      } else if (tool === CanvasMode.Triangle) {
        drawTriangle(ctx, origin, currentPosition);
      } else if (tool === CanvasMode.Pencil) {
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(currentPosition.x, currentPosition.y);
      }

      ctx.stroke();
      ctx.restore();
    },
    [vectorElements, currentWidth]
  );

  const applyRemoteShape = useCallback(
    (
      tool: CanvasMode.Rectangle | CanvasMode.Circle | CanvasMode.Triangle,
      origin: Point,
      currentPosition: Point
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      redrawCanvas();

      ctx.beginPath();
      if (tool === CanvasMode.Rectangle) {
        ctx.rect(
          origin.x,
          origin.y,
          currentPosition.x - origin.x,
          currentPosition.y - origin.y
        );
      } else if (tool === CanvasMode.Circle) {
        const radius = Math.sqrt(
          Math.pow(currentPosition.x - origin.x, 2) +
            Math.pow(currentPosition.y - origin.y, 2)
        );
        ctx.arc(origin.x, origin.y, radius, 0, Math.PI * 2);
      } else if (tool === CanvasMode.Triangle) {
        drawTriangle(ctx, origin, currentPosition);
      }
      ctx.stroke();
    },
    [redrawCanvas]
  );

  const syncCanvasState = useCallback(() => {
    if (isSyncing || !socketRef.current || !boardId || !databaseUserId) return;

    setIsSyncing(true);
    socketRef.current.emit("drawing", {
      boardId,
      vectorElements,
      userId: databaseUserId,
    });

    autoSaveDrawing().finally(() => setIsSyncing(false));
  }, [boardId, databaseUserId, isSyncing, vectorElements]);

  const autoSaveDrawing = async () => {
    try {
      const response = await fetch(`/api/board/${boardId}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vectorElements,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save drawing");
      }
      console.log("Vector drawing saved successfully");
    } catch (error) {
      console.error("Error saving drawing:", error);
    }
  };

  useEffect(() => {
    if (vectorElements.length > 0) {
      const timer = setTimeout(() => {
        autoSaveDrawing();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [vectorElements]);

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
      case CanvasMode.Triangle:
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

    switch (canvasState.mode) {
      case CanvasMode.Pencil:
        setCanvasState((prev) => ({
          ...prev,
          currentStroke: [...(prev.currentStroke || []), { x, y }],
        }));

        if (canvasState.currentStroke && canvasState.currentStroke.length > 0) {
          ctx.beginPath();
          ctx.moveTo(
            canvasState.currentStroke[canvasState.currentStroke.length - 1].x,
            canvasState.currentStroke[canvasState.currentStroke.length - 1].y
          );
          ctx.lineTo(x, y);
          ctx.stroke();

          if (canvasState.currentStroke.length > 1) {
            const strokeToSync = canvasState.currentStroke;
            socketRef.current?.emit("pencilStroke", {
              boardId,
              stroke: strokeToSync,
              userId: databaseUserId,
            });
          }
        }
        break;

      case CanvasMode.Rectangle:
      case CanvasMode.Circle:
      case CanvasMode.Triangle:
        setCanvasState((prev) => ({
          ...prev,
          currentPosition: { x, y },
        }));

        socketRef.current?.emit("shapePreview", {
          boardId,
          tool: canvasState.mode,
          origin: canvasState.origin,
          currentPosition: { x, y },
          userId: databaseUserId,
        });

        break;

      case CanvasMode.Arrow:
        setCanvasState((prev) => ({
          ...prev,
          end: { x, y },
        }));
        break;
    }

    redrawCanvas();
  };

  const endDrawing = () => {
    if (!isDrawing || !databaseUserId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let shouldSaveAndSync = false;

    switch (canvasState.mode) {
      case CanvasMode.Pencil:
        if (canvasState.currentStroke && canvasState.currentStroke.length > 1) {
          const newPath: VectorElement = {
            type: "path",
            points: canvasState.currentStroke,
            color: currentColor,
            width: currentWidth,
          };
          setVectorElements((prev) => [...prev, newPath]);
          shouldSaveAndSync = true;

          socketRef.current?.emit("pencilStroke", {
            boardId,
            stroke: canvasState.currentStroke,
            userId: databaseUserId,
          });
        }
        break;

      case CanvasMode.Rectangle:
        if (canvasState.origin && canvasState.currentPosition) {
          const newRect: VectorElement = {
            type: "rectangle",
            x: canvasState.origin.x,
            y: canvasState.origin.y,
            width: canvasState.currentPosition.x - canvasState.origin.x,
            height: canvasState.currentPosition.y - canvasState.origin.y,
            color: currentColor,
            strokeWidth: currentWidth,
          };
          setVectorElements((prev) => [...prev, newRect]);
          shouldSaveAndSync = true;

          socketRef.current?.emit("shapeAdded", {
            boardId,
            shape: newRect,
            userId: databaseUserId,
          });
        }
        break;

      case CanvasMode.Circle:
        if (canvasState.origin && canvasState.currentPosition) {
          const radius = Math.sqrt(
            Math.pow(canvasState.currentPosition.x - canvasState.origin.x, 2) +
              Math.pow(canvasState.currentPosition.y - canvasState.origin.y, 2)
          );
          const newCircle: VectorElement = {
            type: "circle",
            cx: canvasState.origin.x,
            cy: canvasState.origin.y,
            radius,
            color: currentColor,
            strokeWidth: currentWidth,
          };
          setVectorElements((prev) => [...prev, newCircle]);
          shouldSaveAndSync = true;

          socketRef.current?.emit("shapeAdded", {
            boardId,
            shape: newCircle,
            userId: databaseUserId,
          });
        }
        break;

      case CanvasMode.Triangle:
        if (canvasState.origin && canvasState.currentPosition) {
          const newTriangle: VectorElement = {
            type: "triangle",
            points: [
              { x: canvasState.origin.x, y: canvasState.currentPosition.y },
              canvasState.currentPosition,
              {
                x: (canvasState.origin.x + canvasState.currentPosition.x) / 2,
                y: canvasState.origin.y,
              },
            ],
            color: currentColor,
            strokeWidth: currentWidth,
          };
          setVectorElements((prev) => [...prev, newTriangle]);
          shouldSaveAndSync = true;

          socketRef.current?.emit("shapeAdded", {
            boardId,
            shape: newTriangle,
            userId: databaseUserId,
          });
        }
        break;

      case CanvasMode.Arrow:
        if (canvasState.start && canvasState.end) {
          const newArrow: VectorElement = {
            type: "arrow",
            start: canvasState.start,
            end: canvasState.end,
            color: currentColor,
            strokeWidth: currentWidth,
          };
          setVectorElements((prev) => [...prev, newArrow]);
          shouldSaveAndSync = true;

          socketRef.current?.emit("shapeAdded", {
            boardId,
            shape: newArrow,
            userId: databaseUserId,
          });
        }
        break;

      case CanvasMode.Text:
        if (textInput.trim() !== "" && textInputPos) {
          const newText: VectorElement = {
            type: "text",
            content: textInput,
            x: textInputPos.x,
            y: textInputPos.y,
            color: currentColor,
          };
          setVectorElements((prev) => [...prev, newText]);
          shouldSaveAndSync = true;

          socketRef.current?.emit("textAdded", {
            boardId,
            textElement: newText,
            userId: databaseUserId,
          });
        }
        break;
    }

    setIsDrawing(false);

    if (shouldSaveAndSync) {
      redrawCanvas();
      syncCanvasState();
    }
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
          onBlur={() => {
            if (textInput.trim() !== "") {
              endDrawing();
            }
            setTextInput("");
            setTextInputPos(null);
            setCanvasState({ mode: CanvasMode.None });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              textInputRef.current?.blur();
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
          }}
        />
      )}

      <Toolbar
        canvasState={canvasState}
        setCanvasState={setCanvasState}
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
