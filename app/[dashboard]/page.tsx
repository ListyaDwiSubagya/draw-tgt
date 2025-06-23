/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog"; // Import DialogDescription
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"; // Pastikan Button diimport
import BoardCard, { BoardCardProps } from "./_components/BoardCard";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId");

  const [boards, setBoards] = useState<BoardCardProps[]>([]);
  // State untuk modal "Create New Board"
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [newBoardImageFile, setNewBoardImageFile] = useState<File | null>(null);
  const [newBoardImagePreview, setNewBoardImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // State untuk modal "Edit Board"
  const [openEditModal, setOpenEditModal] = useState(false);
  const [boardToEdit, setBoardToEdit] = useState<BoardCardProps | null>(null);
  const [editedBoardTitle, setEditedBoardTitle] = useState("");

  // State untuk modal "Delete Board"
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<BoardCardProps | null>(null);


  useEffect(() => {
    const fetchBoards = async () => {
      if (!orgId) return;

      try {
        const res = await fetch(`/api/organization/${orgId}/boards`);
        if (!res.ok) throw new Error("Failed to fetch boards");

        const data = await res.json();

        const boardList: BoardCardProps[] = data.map((board: any) => ({
          id: board.id,
          type: "existing",
          title: board.title,
          imageUrl: board.imageUrl || "",
        }));

        setBoards(boardList);
      } catch (err) {
        console.error(err);
      }
    };

    fetchBoards();
  }, [orgId]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewBoardImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewBoardImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setNewBoardImageFile(null);
      setNewBoardImagePreview(null);
    }
  };

  const handleAddBoard = async () => {
    if (!orgId || !newBoardTitle.trim()) {
      alert("Board title is required.");
      return;
    }

    setLoading(true);
    let imageUrl = "/default-board-image.svg";

    try {
      if (newBoardImageFile) {
        const formData = new FormData();
        formData.append("image", newBoardImageFile);

        const uploadRes = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload image");
        }

        const uploadData = await uploadRes.json();
        imageUrl = uploadData.imageUrl;
      }

      const res = await fetch(`/api/organization/${orgId}/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newBoardTitle, imageUrl }),
      });

      if (!res.ok) throw new Error("Failed to create board");

      const newBoard = await res.json();

      setBoards((prev) => [
        {
          id: newBoard.id,
          type: "existing",
          title: newBoard.title,
          imageUrl: newBoard.imageUrl || "",
        },
        ...prev,
      ]);

      setNewBoardTitle("");
      setNewBoardImageFile(null);
      setNewBoardImagePreview(null);
      setOpenCreateModal(false); // Menggunakan state modal create
    } catch (err) {
      console.error(err);
      alert("Failed to create board or upload image.");
    } finally {
      setLoading(false);
    }
  };

  // Mengubah handleEditBoard untuk membuka modal
  const handleEditBoard = (board: BoardCardProps) => {
    setBoardToEdit(board);
    setEditedBoardTitle(board.title);
    setOpenEditModal(true);
  };

  // Fungsi untuk update board setelah diedit di modal
  const handleUpdateBoard = async () => {
    if (!boardToEdit || !editedBoardTitle.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/board/${boardToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editedBoardTitle }),
      });

      if (!res.ok) throw new Error("Failed to update board");

      const updated = await res.json();

      setBoards((prev) =>
        prev.map((b) => (b.id === boardToEdit.id ? { ...b, title: updated.title } : b))
      );
      setOpenEditModal(false);
      setBoardToEdit(null);
      setEditedBoardTitle("");
    } catch (err) {
      console.error(err);
      alert("Failed to update board.");
    } finally {
      setLoading(false);
    }
  };

  // Mengubah handleDeleteBoard untuk membuka modal konfirmasi
  const handleDeleteBoard = (board: BoardCardProps) => {
    setBoardToDelete(board);
    setOpenDeleteModal(true);
  };

  // Fungsi untuk menghapus board setelah konfirmasi di modal
  const handleConfirmDeleteBoard = async () => {
    if (!boardToDelete) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/board/${boardToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete board");

      setBoards((prev) => prev.filter((b) => b.id !== boardToDelete.id));
      setOpenDeleteModal(false);
      setBoardToDelete(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete board.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-semibold text-gray-800 mb-8">Team boards</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {/* Modal for creating board */}
        <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
          <DialogTrigger asChild>
            <div className="cursor-pointer">
              <BoardCard id="new-board" type="new" title="New board" imageUrl="" />
            </div>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Create new board</DialogTitle>
            <div className="space-y-4">
              <Input
                placeholder="Board title"
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddBoard()}
              />
              <div>
                <label htmlFor="board-image" className="block text-sm font-medium text-gray-700 mb-1">
                  Board Image (Optional)
                </label>
                <Input
                  id="board-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {newBoardImagePreview && (
                  <div className="mt-3">
                    <img src={newBoardImagePreview} alt="Image Preview" className="w-full h-32 object-cover rounded-md border border-gray-200" />
                  </div>
                )}
              </div>

              <Button
                onClick={handleAddBoard}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Render existing boards and pass new handle functions */}
        {boards.map((board) => (
          <BoardCard
            key={board.id}
            {...board}
            onEdit={() => handleEditBoard(board)} // Pass the whole board object
            onDelete={() => handleDeleteBoard(board)} // Pass the whole board object
          />
        ))}
      </div>

      {/* Modal for Editing Board Name */}
      <Dialog open={openEditModal} onOpenChange={setOpenEditModal}>
        <DialogContent>
          <DialogTitle>Edit Board Name</DialogTitle>
          <DialogDescription>
            Enter the new name for "{boardToEdit?.title}".
          </DialogDescription>
          <div className="space-y-4">
            <Input
              placeholder="New board title"
              value={editedBoardTitle}
              onChange={(e) => setEditedBoardTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUpdateBoard()}
            />
            <Button
              onClick={handleUpdateBoard}
              disabled={loading || !editedBoardTitle.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md transition disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal for Deleting Board */}
      <Dialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
        <DialogContent>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the board "{boardToDelete?.title}"?
            This action cannot be undone.
          </DialogDescription>
          <div className="flex justify-end gap-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setOpenDeleteModal(false);
                setBoardToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteBoard}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}