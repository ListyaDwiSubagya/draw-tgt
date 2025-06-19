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
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingHistory, setDrawingHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [textElements, setTextElements] = useState<
    { text: string; position: Point }[]
  >([]);
  const [arrows, setArrows] = useState<{ start: Point; end: Point }[]>([]);
  const [eraserSize, setEraserSize] = useState(20);
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

    const socket = io("http://localhost:4000");
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("joinBoard", { boardId, userId: databaseUserId });
    });

    socket.on("drawingChange", ({ drawingData, userId: remoteUserId }) => {
      if (remoteUserId !== databaseUserId) {
        applyRemoteDrawing(drawingData);
      }
    });

    socket.on("pencilStroke", ({ stroke, userId: remoteUserId }) => {
      if (remoteUserId !== databaseUserId) {
        applyRemotePencilStroke(stroke);
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

    socket.on("erasure", ({ erasedArea, userId: remoteUserId }) => {
      if (remoteUserId !== databaseUserId) {
        applyRemoteErasure(erasedArea);
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
      }
    });

    socket.on("redo", (remoteUserId) => {
      if (
        remoteUserId !== databaseUserId &&
        historyIndex < drawingHistory.length - 1
      ) {
        setHistoryIndex((prev) => prev + 1);
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
  }, [boardId, databaseUserId, historyIndex, drawingHistory.length]);

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

    const fetchDrawing = async () => {
      try {
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
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          if (data.textElements) setTextElements(data.textElements);
          if (data.arrows) setArrows(data.arrows);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          if (isValidImageData(imageData)) {
            setDrawingHistory([imageData]);
            setHistoryIndex(0);
          }
        };
        img.src = imgData;
      } catch (error) {
        console.error("Error loading initial drawing:", error);
      }
    };

    fetchDrawing();
  }, [boardId]);

  const isValidImageData = (data: any): data is ImageData => {
    return (
      data &&
      data.data instanceof Uint8ClampedArray &&
      typeof data.width === "number" &&
      typeof data.height === "number"
    );
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

  const exportCanvasAsImage = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL("image/png");
  };

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (imageData) {
        setDrawingHistory((prev) => [
          ...prev.slice(0, historyIndex + 1),
          imageData,
        ]);
        setHistoryIndex((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Error saving to history:", error);
    }
  }, [historyIndex]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (historyIndex >= 0 && historyIndex < drawingHistory.length) {
      const imageData = drawingHistory[historyIndex];
      if (isValidImageData(imageData)) {
        ctx.putImageData(imageData, 0, 0);
      }
    }

    textElements.forEach(({ text, position }) => {
      ctx.fillText(text, position.x, position.y);
    });
    arrows.forEach((arrow) => {
      drawArrow(ctx, arrow.start, arrow.end);
    });

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
        case CanvasMode.Circle:
          if (canvasState.origin && canvasState.currentPosition) {
            ctx.beginPath();
            if (canvasState.mode === CanvasMode.Rectangle) {
              ctx.rect(
                canvasState.origin.x,
                canvasState.origin.y,
                canvasState.currentPosition.x - canvasState.origin.x,
                canvasState.currentPosition.y - canvasState.origin.y
              );
            } else {
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
              ctx.arc(
                canvasState.origin.x,
                canvasState.origin.y,
                radius,
                0,
                Math.PI * 2
              );
            }
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

    remoteCursors.forEach(({ position }) => {
      ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
      ctx.beginPath();
      ctx.arc(position.x, position.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [
    canvasState,
    drawingHistory,
    historyIndex,
    isDrawing,
    textElements,
    arrows,
    remoteCursors,
  ]);

  const applyRemoteDrawing = useCallback(
    (dataUrl: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        textElements.forEach(({ text, position }) => {
          ctx.fillText(text, position.x, position.y);
        });
        arrows.forEach((arrow) => {
          drawArrow(ctx, arrow.start, arrow.end);
        });
        saveToHistory();
      };
      img.src = dataUrl;
    },
    [textElements, arrows, saveToHistory]
  );

  const applyRemotePencilStroke = useCallback(
    (stroke: Point[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx || stroke.length < 2) return;

      redrawCanvas();

      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();

      setCanvasState((prev) => ({
        ...prev,
        currentStroke: [...(prev.currentStroke || []), ...stroke],
      }));
    },
    [redrawCanvas]
  );

  const drawRemoteShapePreview = useCallback(
    (
      tool: CanvasMode.Rectangle | CanvasMode.Circle,
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
      } else {
        const radius = Math.sqrt(
          Math.pow(currentPosition.x - origin.x, 2) +
            Math.pow(currentPosition.y - origin.y, 2)
        );
        ctx.arc(origin.x, origin.y, radius, 0, Math.PI * 2);
      }
      ctx.stroke();
    },
    [redrawCanvas]
  );

  const applyRemoteShape = useCallback(
    (
      tool: CanvasMode.Rectangle | CanvasMode.Circle,
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
      } else {
        const radius = Math.sqrt(
          Math.pow(currentPosition.x - origin.x, 2) +
            Math.pow(currentPosition.y - origin.y, 2)
        );
        ctx.arc(origin.x, origin.y, radius, 0, Math.PI * 2);
      }
      ctx.stroke();

      saveToHistory();
    },
    [redrawCanvas, saveToHistory]
  );

  const applyRemoteErasure = useCallback(
    (erasedArea: { x: number; y: number; size: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      redrawCanvas();

      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(erasedArea.x, erasedArea.y, erasedArea.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      saveToHistory();
    },
    [redrawCanvas, saveToHistory]
  );

  const syncCanvasState = useCallback(() => {
    if (isSyncing || !socketRef.current || !boardId || !databaseUserId) return;

    setIsSyncing(true);
    const dataUrl = exportCanvasAsImage();
    if (!dataUrl) {
      setIsSyncing(false);
      return;
    }

    socketRef.current.emit("drawing", {
      boardId,
      drawingData: dataUrl,
      userId: databaseUserId,
    });

    autoSaveDrawing().finally(() => setIsSyncing(false));
  }, [boardId, databaseUserId, isSyncing]);

  const autoSaveDrawing = async () => {
    const dataUrl = exportCanvasAsImage();
    if (!dataUrl) return;

    try {
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
    } catch (error) {
      console.error("Error auto-saving drawing:", error);
    }
  };

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

        if (canvasState.currentStroke && canvasState.currentStroke.length > 0) {
          ctx.beginPath();
          ctx.moveTo(
            canvasState.currentStroke[canvasState.currentStroke.length - 1].x,
            canvasState.currentStroke[canvasState.currentStroke.length - 1].y
          );
          ctx.lineTo(x, y);
          ctx.stroke();

          if (canvasState.currentStroke.length > 1) {
            const strokeToSync = canvasState.currentStroke.slice(-2);
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

      case CanvasMode.Eraser:
        const erasedX = x;
        const erasedY = y;
        const currentEraserSize = canvasState.eraserSize || eraserSize;

        const newTextElements = textElements.filter(({ position }) => {
          const dx = position.x - erasedX;
          const dy = position.y - erasedY;
          return Math.sqrt(dx * dx + dy * dy) > currentEraserSize;
        });

        if (newTextElements.length !== textElements.length) {
          setTextElements(newTextElements);
        }

        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(erasedX, erasedY, currentEraserSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";

        socketRef.current?.emit("erasure", {
          boardId,
          erasedArea: { x: erasedX, y: erasedY, size: currentEraserSize },
          userId: databaseUserId,
        });
        break;
    }
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
          shouldSaveAndSync = true;
        }
        break;

      case CanvasMode.Rectangle:
      case CanvasMode.Circle:
        if (canvasState.origin && canvasState.currentPosition) {
          ctx.beginPath();
          if (canvasState.mode === CanvasMode.Rectangle) {
            ctx.rect(
              canvasState.origin.x,
              canvasState.origin.y,
              canvasState.currentPosition.x - canvasState.origin.x,
              canvasState.currentPosition.y - canvasState.origin.y
            );
          } else {
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
            ctx.arc(
              canvasState.origin.x,
              canvasState.origin.y,
              radius,
              0,
              Math.PI * 2
            );
          }
          ctx.stroke();

          socketRef.current?.emit("shapeFinal", {
            boardId,
            tool: canvasState.mode,
            origin: canvasState.origin,
            currentPosition: canvasState.currentPosition,
            userId: databaseUserId,
          });

          shouldSaveAndSync = true;
        }
        break;

      case CanvasMode.Arrow:
        if (canvasState.start && canvasState.end) {
          drawArrow(ctx, canvasState.start, canvasState.end);
          setArrows((prev) => [
            ...prev,
            { start: canvasState.start!, end: canvasState.end! },
          ]);
          shouldSaveAndSync = true;
        }
        break;

      case CanvasMode.Eraser:
        shouldSaveAndSync = true;
        break;
    }

    setIsDrawing(false);
    setCanvasState({ mode: CanvasMode.None });

    if (shouldSaveAndSync) {
      saveToHistory();
      syncCanvasState();
      autoSaveDrawing();
    }
  };

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;

    setHistoryIndex((prev) => prev - 1);
    socketRef.current?.emit("undo", databaseUserId);
    syncCanvasState();
    autoSaveDrawing();
  }, [historyIndex, syncCanvasState, autoSaveDrawing, databaseUserId]);

  const redo = useCallback(() => {
    if (historyIndex >= drawingHistory.length - 1) return;

    setHistoryIndex((prev) => prev + 1);
    socketRef.current?.emit("redo", databaseUserId);
    syncCanvasState();
    autoSaveDrawing();
  }, [
    drawingHistory.length,
    historyIndex,
    syncCanvasState,
    autoSaveDrawing,
    databaseUserId,
  ]);

  useEffect(() => {
    redrawCanvas();
  }, [
    canvasState.currentStroke,
    canvasState.currentPosition,
    drawingHistory,
    historyIndex,
    textElements,
    arrows,
    remoteCursors,
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
      {textInputPos && (
        <input
          ref={textInputRef}
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onBlur={() => {
            if (textInput.trim() !== "") {
              const newTextElement = {
                text: textInput,
                position: textInputPos,
              };
              setTextElements((prev) => [...prev, newTextElement]);
              saveToHistory();
              socketRef.current?.emit("textAdded", {
                boardId,
                textElement: newTextElement,
                userId: databaseUserId,
              });
              autoSaveDrawing();
            }
            setTextInput("");
            setTextInputPos(null);
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
