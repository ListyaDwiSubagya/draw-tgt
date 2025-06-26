import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://10.132.1.253:3000",
    methods: ["GET", "POST"],
  },
});

const prisma = new PrismaClient();

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinBoard", async ({ boardId, userId }) => {
    if (!boardId || !userId) {
      socket.emit(
        "error",
        "Board ID and User ID are required to join a board."
      );
      socket.disconnect();
      return;
    }

    try {
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        include: {
          organization: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!board) {
        socket.emit("error", "Board not found.");
        socket.disconnect();
        return;
      }

      const isMember = board.organization?.members.some(
        (member) => member.userId === userId
      );
      const isBoardCreator = board.createdById === userId;

      if (!isMember && !isBoardCreator) {
        socket.emit(
          "error",
          "Unauthorized: You are not a member of this board's team."
        );
        socket.disconnect();
        return;
      }

      socket.join(boardId);
      console.log(`User ${userId} joined board: ${boardId}`);
      io.to(boardId).emit("userJoined", userId);
    } catch (error) {
      console.error("Error joining board:", error);
      socket.emit("error", "Failed to join board due to server error.");
      socket.disconnect();
    }
  });

  socket.on("pencilStroke", ({ boardId, stroke, userId }) => {
    io.to(boardId).emit("pencilStroke", { stroke, userId });
  });

  socket.on(
    "shapePreview",
    ({ boardId, tool, origin, currentPosition, userId }) => {
      io.to(boardId).emit("shapePreview", {
        tool,
        origin,
        currentPosition,
        userId,
      });
    }
  );

  socket.on(
    "shapeFinal",
    ({ boardId, tool, origin, currentPosition, userId }) => {
      io.to(boardId).emit("shapeFinal", {
        tool,
        origin,
        currentPosition,
        userId,
      });
    }
  );

  socket.on("textAdded", ({ boardId, textElement, userId }) => {
    io.to(boardId).emit("textAdded", { textElement, userId });
  });

  socket.on("shapeAdded", ({ boardId, shape, userId }) => {
    io.to(boardId).emit("shapeAdded", { shape, userId });
  });

  socket.on("cursorMove", ({ boardId, position, userId }) => {
    io.to(boardId).emit("cursorMove", { position, userId });
  });

  socket.on("drawing", ({ boardId, vectorElements, userId }) => {
    console.log(
      `Received full drawing sync from ${userId} on board ${boardId}`
    );
    socket.to(boardId).emit("vectorSync", { vectorElements, userId });
  });

  socket.on("vectorSync", ({ boardId, vectorElements, userId }) => {
    io.to(boardId).emit("vectorSync", { vectorElements, userId });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
const HOST = "0.0.0.0";

server.listen(PORT, HOST, () => {
  console.log(`WebSocket server listening on http://${HOST}:${PORT}`);
});
