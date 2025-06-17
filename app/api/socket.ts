import { Server } from "socket.io";
import { NextApiRequest } from "next";

type CanvasData = {
  imageData: string;
  textElements: { text: string; position: { x: number; y: number } }[];
  arrows: { start: { x: number; y: number }; end: { x: number; y: number } }[];
};

const ioHandler = (req: NextApiRequest, res: any) => {
  if (!res.socket.server.io) {
    console.log("Initializing Socket.IO server...");
    
    const io = new Server(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    // Store canvas states per board
    const boardStates = new Map<string, CanvasData>();

    io.on("connection", (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle joining a board room
      socket.on("join", (boardId: string) => {
        socket.join(boardId);
        console.log(`Client ${socket.id} joined board: ${boardId}`);

        // Send current board state to the new user if available
        if (boardStates.has(boardId)) {
          socket.emit("sync-canvas", boardStates.get(boardId));
        } else {
          // If first user, initialize empty state
          const canvas = {
            imageData: "",
            textElements: [],
            arrows: []
          };
          boardStates.set(boardId, canvas);
          socket.emit("sync-canvas", canvas);
        }

        // Request current canvas state from other users in the room
        socket.to(boardId).emit("request-canvas-state", boardId);
      });

      // Handle drawing events (for pencil tool)
      socket.on("drawing", (data: { 
        boardId: string; 
        x0: number; 
        y0: number; 
        x1: number; 
        y1: number 
      }) => {
        socket.to(data.boardId).emit("drawing", { 
          x0: data.x0, 
          y0: data.y0, 
          x1: data.x1, 
          y1: data.y1 
        });
      });

      // Handle full canvas sync
      socket.on("sync-canvas", (data: { boardId: string } & CanvasData) => {
        // Update the board state
        boardStates.set(data.boardId, {
          imageData: data.imageData,
          textElements: data.textElements,
          arrows: data.arrows
        });

        // Broadcast to all users in the board except sender
        socket.to(data.boardId).emit("sync-canvas", {
          imageData: data.imageData,
          textElements: data.textElements,
          arrows: data.arrows
        });
      });

      // Handle canvas state requests
      socket.on("request-canvas-state", (boardId: string) => {
        if (boardStates.has(boardId)) {
          socket.emit("sync-canvas", boardStates.get(boardId));
        }
      });

      // Handle sending canvas state when requested
      socket.on("send-canvas-state", (data: { boardId: string; state: CanvasData }) => {
        // Update the board state
        boardStates.set(data.boardId, data.state);
        
        // Broadcast to all users in the board
        io.to(data.boardId).emit("sync-canvas", data.state);
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
        
        // Clean up empty rooms
        io.sockets.adapter.rooms.forEach((_, roomId) => {
          if (io.sockets.adapter.rooms.get(roomId)?.size === 0) {
            boardStates.delete(roomId);
          }
        });
      });

      // Error handling
      socket.on("error", (error) => {
        console.error(`Socket error from ${socket.id}:`, error);
      });
    });

    res.socket.server.io = io;
  }

  res.end();
};

export default ioHandler;