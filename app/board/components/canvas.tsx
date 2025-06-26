/* eslint-disable @typescript-eslint/no-explicit-any */
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
  useUser();
  const [databaseUserId, setDatabaseUserId] = useState<string | null>(null);
  const [currentColor] = useState("#000000");
  const [currentWidth] = useState(3);

  const [canvasState, setCanvasState] = useState<CanvasState>({
    mode: CanvasMode.None,
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [textElements, setTextElements] = useState<
    { text: string; position: Point }[]
  >([]);
  const [vectorElements, setVectorElements] = useState<VectorElement[]>([]);
  const [arrows] = useState<{ start: Point; end: Point }[]>([]);
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

          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          drawVectorShapes(ctx, data.vectorShapes);
        }
      } catch (error) {
        console.error("Error loading vector shapes:", error);
      }
    };

    fetchVectorShapes();
  }, [boardId]);

  function drawVectorShapes(ctx: CanvasRenderingContext2D, elements: any[]) {
    elements.forEach((element) => {
      ctx.strokeStyle = element.color || "black";
      ctx.fillStyle = element.color || "black";

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
          ctx.font = element.font || "16px Arial";
          ctx.fillText(element.content, element.x, element.y);
          break;

        case "arrow":
          drawArrow(ctx, element.start, element.end, element.color);
          break;

        default:
          console.warn("Unknown element type:", element.type);
      }
    });
  }

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    _color?: any
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

  const exportCanvasAsImage = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.toDataURL("image/png");
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    vectorElements.forEach((element) => {
      ctx.strokeStyle = element.color;
      ctx.fillStyle = element.color;
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

    remoteCursors.forEach(({ position }) => {
      ctx.fillStyle = "rgba(0, 0, 255, 0.5)";
      ctx.beginPath();
      ctx.arc(position.x, position.y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [vectorElements, remoteCursors, currentWidth]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const applyRemoteDrawing = useCallback((svgData: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, []);

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

  const exportAsSVG = useCallback((): string => {
    const canvas = canvasRef.current;
    if (!canvas) return "";

    const svgWidth = canvas.width;
    const svgHeight = canvas.height;

    let svgContent = `
    <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
  `;

    vectorElements.forEach((element) => {
      switch (element.type) {
        case "path":
          svgContent += `<path d="M ${element.points
            .map((p) => `${p.x} ${p.y}`)
            .join(" L ")}" stroke="${element.color}" stroke-width="${
            element.width
          }" fill="none"/>`;
          break;

        case "rectangle":
          svgContent += `<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" stroke="${element.color}" stroke-width="${element.strokeWidth}" fill="none"/>`;
          break;

        case "circle":
          svgContent += `<circle cx="${element.cx}" cy="${element.cy}" r="${element.radius}" stroke="${element.color}" stroke-width="${element.strokeWidth}" fill="none"/>`;
          break;

        case "triangle":
          svgContent += `<polygon points="${element.points
            .map((p) => `${p.x},${p.y}`)
            .join(" ")}" stroke="${element.color}" stroke-width="${
            element.strokeWidth
          }" fill="none"/>`;
          break;

        case "text":
          svgContent += `<text x="${element.x}" y="${element.y}" fill="${element.color}" font-family="Arial" font-size="16">${element.content}</text>`;
          break;

        case "arrow":
          svgContent += `<line x1="${element.start.x}" y1="${element.start.y}" x2="${element.end.x}" y2="${element.end.y}" stroke="${element.color}" stroke-width="${element.strokeWidth}"/>`;

          const angle = Math.atan2(
            element.end.y - element.start.y,
            element.end.x - element.start.x
          );
          const arrowHead1 = {
            x: element.end.x - 15 * Math.cos(angle - Math.PI / 6),
            y: element.end.y - 15 * Math.sin(angle - Math.PI / 6),
          };
          const arrowHead2 = {
            x: element.end.x - 15 * Math.cos(angle + Math.PI / 6),
            y: element.end.y - 15 * Math.sin(angle + Math.PI / 6),
          };

          svgContent += `<polygon points="${element.end.x},${element.end.y} ${arrowHead1.x},${arrowHead1.y} ${arrowHead2.x},${arrowHead2.y}" fill="${element.color}"/>`;
          break;
      }
    });

    svgContent += "</svg>";
    return svgContent;
  }, [vectorElements]);

  const syncCanvasState = useCallback(() => {
    if (isSyncing || !socketRef.current || !boardId || !databaseUserId) return;

    setIsSyncing(true);

    const svgData = exportAsSVG();
    if (!svgData) {
      setIsSyncing(false);
      return;
    }

    socketRef.current.emit("drawing", {
      boardId,
      drawingData: svgData,
      userId: databaseUserId,
    });

    autoSaveDrawing().finally(() => setIsSyncing(false));
  }, [boardId, databaseUserId, isSyncing, exportAsSVG]);

  const autoSaveDrawing = async () => {
    try {
      const rasterData = exportCanvasAsImage();
      const vectorData = exportAsSVG();

      const response = await fetch(`/api/board/${boardId}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          drawing: rasterData,
          vectorData,
          vectorElements,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save drawing");
      }

      console.log("Drawing saved successfully");
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

        if (e.type === "mouseup") {
          if (
            canvasState.currentStroke &&
            canvasState.currentStroke.length > 1
          ) {
            const newPath: VectorElement = {
              type: "path",
              points: canvasState.currentStroke,
              color: "#000000",
              width: 3,
            };
            setVectorElements((prev) => [...prev, newPath]);
          }
        }
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
        }
        break;
    }

    setIsDrawing(false);
    if (shouldSaveAndSync) {
      redrawCanvas();
      syncCanvasState();
      autoSaveDrawing().then(() => {
        console.log("Drawing saved immediately");
      });
    }
  };

  useEffect(() => {
    redrawCanvas();
  }, [
    canvasState.currentStroke,
    canvasState.currentPosition,
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
              endDrawing();
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
        currentColor={""}
        setCurrentColor={function (): void {
          throw new Error("Function not implemented.");
        }}
        currentWidth={0}
        setCurrentWidth={function (): void {
          throw new Error("Function not implemented.");
        }}
      />
      <Info />
      <Participans />
    </main>
  );
}
