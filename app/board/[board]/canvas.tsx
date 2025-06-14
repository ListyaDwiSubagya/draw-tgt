// canvas.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Link as LinkIcon } from "lucide-react";
import { Type, Square, Circle, PencilLine, Undo, Redo } from 'lucide-react'; 
import { Poppins } from "next/font/google";
import { Participans } from "./participans";
import { Info } from "./info";

// Mendefinisikan mode kanvas dan tipe status kanvas.
// Catatan: Definisi ini diduplikasi di toolbar.tsx untuk memastikan kedua file mandiri.
export enum CanvasMode {
  None, // Tidak ada mode spesifik, status default
  Pressing, // Pengguna sedang menekan penunjuk (misalnya, tombol mouse, sentuh)
  Pencil, // Untuk menggambar dengan pensil
  Text, // Untuk menambahkan teks
  Rectangle, // Untuk menggambar persegi panjang
  Circle, // Untuk menggambar lingkaran
}

// Mendefinisikan tipe Point dan Stroke untuk menggambar.
export type Point = { x: number; y: number };
export type Stroke = Point[]; // Sebuah array poin membentuk satu goresan

// Mendefinisikan tipe CanvasState yang diperbarui.
export type CanvasState =
  | { mode: CanvasMode.None }
  | { mode: CanvasMode.Pressing; origin: Point } // Poin asal saat menekan
  | { mode: CanvasMode.Pencil; currentStroke: Stroke } // Goresan saat ini yang sedang digambar
  | { mode: CanvasMode.Text; } // Mode teks
  | { mode: CanvasMode.Rectangle; } // Mode persegi panjang
  | { mode: CanvasMode.Circle; }; // Mode lingkaran

// Mendefinisikan status gambar lengkap yang akan disimpan dalam riwayat.
export interface DrawingState {
  completedStrokes: Stroke[]; // Semua goresan yang telah diselesaikan
  // Anda akan menambahkan elemen lain yang digambar di sini (teks, bentuk, dll.)
}

// --- Komponen Mock untuk Demonstrasi dan Komponen yang Disediakan Pengguna ---
// Komponen-komponen ini disertakan di sini agar komponen Canvas utama dapat dijalankan.
// Dalam aplikasi nyata, ini akan berada di file terpisah masing-masing.

// Mock untuk fungsi utilitas 'cn' (dari "@/lib/utils").
const cn = (...args: any[]) => args.filter(Boolean).join(" ");

// Mock untuk komponen Button (dari "@/components/ui/button").
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "board" | "default" | "tool";
}
const Button = ({ children, variant, className, ...props }: ButtonProps) => {
  const baseClasses = "flex items-center justify-center rounded-md transition-colors";
  const variantClasses = {
    board: "bg-transparent hover:bg-neutral-100",
    default: "bg-blue-500 text-white hover:bg-blue-600",
    tool: "w-12 h-12 bg-white rounded-md flex items-center justify-center shadow-md hover:bg-gray-100 transition",
  };
  return (
    <button
      className={cn(baseClasses, variantClasses[variant || "default"], className)}
      {...props}
    >
      {children}
    </button>
  );
};

// Mock untuk komponen Next.js Image.
interface ImageProps {
  src: string;
  alt: string;
  height: number;
  width: number;
  className?: string;
}
const Image = ({ src, alt, height, width, className }: ImageProps) => (
  <img src={src} alt={alt} height={height} width={width} className={className} />
);

// Mock untuk komponen Next.js Link.
interface LinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}
const Link = ({ href, children, className }: LinkProps) => (
  <a href={href} className={className}>
    {children}
  </a>
);

/**
 * Komponen TabSeparator dari komponen Info pengguna.
 */
const TabSeparator = () => {
  return <div className="text-neutral-300 px-1.5">|</div>;
};


/**
 * Mock Participans component untuk merepresentasikan daftar pengguna aktif di kanvas.
 * Diposisikan di kanan atas seperti pada gambar.
 */
/**
 * Antarmuka untuk properti yang diharapkan oleh komponen Toolbar.
 */
interface ToolbarProps {
  canvasState: CanvasState;
  setCanvasState: (newState: CanvasState) => void;
  canRedo: boolean;
  canUndo: boolean;
  undo: () => void;
  redo: () => void;
}

/**
 * Komponen Toolbar (disertakan di sini untuk kompilasi mandiri).
 * Diposisikan sebagai bilah samping vertikal di kiri, seperti pada gambar.
 */


const Toolbar = ({
  canvasState,
  setCanvasState,
  canRedo,
  canUndo,
  undo,
  redo,
}: ToolbarProps) => {
  return (
    <div className="absolute top-1/2 left-2 -translate-y-1/2 bg-white rounded-md p-2 flex flex-col items-center shadow-md space-y-2">
      {/* Tombol Alat */}
      <Button variant="tool" onClick={() => setCanvasState({ mode: CanvasMode.Text })}>
        <Type className="h-5 w-5" />
      </Button>
      <Button variant="tool" onClick={() => setCanvasState({ mode: CanvasMode.Rectangle })}>
        <Square className="h-5 w-5" />
      </Button>
      <Button variant="tool" onClick={() => setCanvasState({ mode: CanvasMode.Circle })}>
        <Circle className="h-5 w-5" />
      </Button>
      <Button variant="tool" onClick={() => setCanvasState({ mode: CanvasMode.Pencil, currentStroke: [] })}>
        <PencilLine className="h-5 w-5" />
      </Button>

      {/* Pemisah Visual */}
      <div className="w-full h-px bg-gray-200 my-2" />

      {/* Tombol Undo/Redo */}
      <Button
        variant="tool"
        onClick={undo}
        disabled={!canUndo}
        className={cn("bg-gray-200", !canUndo && "opacity-50 cursor-not-allowed")}
      >
        <Undo className="h-5 w-5" />
      </Button>
      <Button
        variant="tool"
        onClick={redo}
        disabled={!canRedo}
        className={cn("bg-gray-200", !canRedo && "opacity-50 cursor-not-allowed")}
      >
        <Redo className="h-5 w-5" />
      </Button>

      {/* Tampilan mode kanvas saat ini (opsional, untuk debugging) */}
      {/* <p className="ml-4 text-sm font-medium text-gray-700">
        Mode Saat Ini:{" "}
        <span className="font-semibold">{CanvasMode[canvasState.mode]}</span>
      </p> */}
    </div>
  );
};


export const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Status untuk mengelola mode interaksi kanvas saat ini.
  const [canvasState, setCanvasState] = useState<CanvasState>({
    mode: CanvasMode.None,
  });

  // `drawingState` menyimpan konten aktual yang digambar di kanvas.
  const [drawingState, setDrawingState] = useState<DrawingState>({
    completedStrokes: [],
  });

  // Riwayat untuk undo/redo, sekarang menyimpan snapshot dari `DrawingState`.
  const [history, setHistory] = useState<DrawingState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Menginisialisasi konteks kanvas dan riwayat
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctxRef.current = ctx;
        // Mengatur properti kanvas awal
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#000000"; // Warna goresan default
      }

      // Mengatur dimensi kanvas untuk mengisi induk
      const setCanvasDimensions = () => {
        canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
        canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
        // Menggambar ulang konten setelah mengubah ukuran
        redrawCanvas();
      };

      setCanvasDimensions(); // Pengaturan awal
      window.addEventListener("resize", setCanvasDimensions); // Perbarui saat mengubah ukuran

      // Menginisialisasi riwayat dengan drawingState saat ini
      if (historyIndex === -1) {
        setHistory([drawingState]);
        setHistoryIndex(0);
      }

      return () => {
        window.removeEventListener("resize", setCanvasDimensions);
      };
    }
  }, []); // Jalankan sekali saat mount

  // Menggambar ulang kanvas setiap kali drawingState atau historyIndex berubah
  useEffect(() => {
    redrawCanvas();
  }, [drawingState, historyIndex]);

  /**
   * Menghapus kanvas dan menggambar ulang semua goresan yang telah selesai.
   */
  const redrawCanvas = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Hapus seluruh kanvas

    const currentStrokesToDraw = history[historyIndex]?.completedStrokes || [];
    currentStrokesToDraw.forEach((stroke) => {
      if (stroke.length > 0) {
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.stroke();
      }
    });

    // Jika saat ini sedang menggambar, gambar juga `currentStroke` dari `canvasState`
    if (canvasState.mode === CanvasMode.Pencil && canvasState.currentStroke.length > 0) {
      const currentStroke = canvasState.currentStroke;
      ctx.beginPath();
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
      }
      ctx.stroke();
    }
  }, [history, historyIndex, canvasState]); // Bergantung pada riwayat dan status kanvas saat ini

  /**
   * Menambahkan snapshot baru dari drawingState ke array riwayat.
   * Jika pengguna telah membatalkan tindakan, menambahkan status baru akan menghapus semua
   * status "masa depan" (yang telah di-redo) dari riwayat.
   * @param newDrawingState DrawingState untuk ditambahkan ke riwayat.
   */
  const addStateToHistory = useCallback((newDrawingState: DrawingState) => {
    setHistory((prevHistory) => {
      // Jika kita tidak berada di akhir riwayat (berarti undo telah digunakan),
      // potong riwayat untuk membuang status "masa depan" sebelum menambahkan yang baru.
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      return [...newHistory, newDrawingState];
    });
    setHistoryIndex((prevIndex) => prevIndex + 1);
  }, [historyIndex]);

  /**
   * Mengurungkan tindakan terakhir dengan mengembalikan status gambar ke yang sebelumnya dalam riwayat.
   */
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setDrawingState(history[newIndex]); // Mengembalikan drawingState
      setCanvasState({ mode: CanvasMode.None }); // Mengatur ulang mode interaksi
    }
  }, [history, historyIndex]);

  /**
   * Mengulang tindakan yang dibatalkan dengan bergerak maju dalam array riwayat.
   */
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setDrawingState(history[newIndex]); // Menerapkan kembali drawingState
      setCanvasState({ mode: CanvasMode.None }); // Mengatur ulang mode interaksi
    }
  }, [history, historyIndex]);

  // Menentukan apakah tindakan undo/redo mungkin dilakukan berdasarkan indeks riwayat saat ini.
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // --- Penangan Peristiwa Penunjuk (untuk interaksi seperti menggambar, menggeser, dll.) ---

  /**
   * Menangani saat penunjuk (mouse atau sentuh) diletakkan di kanvas.
   * Mengatur mode kanvas ke `Pressing` atau `Pencil` dan menyimpan poin awal.
   */
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const point = { x: e.clientX, y: e.clientY };

      if (canvasState.mode === CanvasMode.Pencil) {
        // Mulai goresan baru
        setCanvasState({
          mode: CanvasMode.Pencil,
          currentStroke: [point],
        });
      } else {
        setCanvasState({ mode: CanvasMode.Pressing, origin: point });
      }
    },
    [canvasState.mode]
  );

  /**
   * Menangani saat penunjuk bergerak di atas kanvas.
   * Jika dalam mode `Pencil`, ini berarti operasi menggambar sedang berlangsung.
   */
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      if (canvasState.mode === CanvasMode.Pencil) {
        const newPoint: Point = { x: e.clientX, y: e.clientY };
        // Perbarui currentStroke di canvasState. redrawCanvas akan menangani penggambaran.
        setCanvasState({
          mode: CanvasMode.Pencil,
          currentStroke: [...canvasState.currentStroke, newPoint],
        });
      } else if (canvasState.mode === CanvasMode.Pressing) {
        // Tangani dragging/panning dalam mode Pressing jika diperlukan
        console.log("Dragging in Pressing mode:", e.clientX, e.clientY);
      }
    },
    [canvasState]
  );

  /**
   * Menangani saat penunjuk diangkat dari kanvas.
   * Mengatur ulang mode kanvas ke `None` dan menyelesaikan goresan.
   */
  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (canvasState.mode === CanvasMode.Pencil) {
        const completedStroke = canvasState.currentStroke;
        if (completedStroke.length > 0) {
          // Tambahkan goresan yang telah selesai ke drawingState
          const newDrawingState: DrawingState = {
            completedStrokes: [...drawingState.completedStrokes, completedStroke],
          };
          setDrawingState(newDrawingState); // Perbarui status gambar utama
          addStateToHistory(newDrawingState); // Tambahkan ke riwayat
        }
      }
      setCanvasState({ mode: CanvasMode.None }); // Mengatur ulang mode
    },
    [canvasState, drawingState, addStateToHistory]
  );

  return (
    <main
      className="h-screen w-screen relative bg-neutral-100 touch-none overflow-hidden"
    >
      {/* Kanvas untuk menggambar */}
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="absolute top-0 left-0" // Memposisikan kanvas di atas latar belakang
        // Atribut width dan height eksplisit untuk membantu hidrasi
        width={0} // Akan diperbarui secara dinamis oleh useEffect
        height={0} // Akan diperbarui secara dinamis oleh useEffect
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'none' // Mencegah tindakan sentuh default seperti scrolling/zooming
        }}
      />

      {/* Komponen Info (kiri atas) */}
      <Info />

      {/* Komponen Participans (kanan atas) */}
      <Participans />

      {/* Komponen Toolbar (kiri tengah) */}
      <Toolbar
        canvasState={canvasState}
        setCanvasState={setCanvasState}
        canRedo={canRedo}
        canUndo={canUndo}
        undo={undo}
        redo={redo}
      />

      {/* Pesan info tentang mode interaksi dapat dihapus atau diganti dengan elemen UI kanvas */}
      {/* <div className="p-8 bg-white rounded-lg shadow-xl text-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Interactive Canvas Area
        </h1>
        <p className="text-lg text-gray-600">
          Current Interaction Mode:{" "}
          <span className="font-semibold">{CanvasMode[canvasState.mode]}</span>
        </p>
        <p className="text-sm text-gray-500 mt-2">
          (Check console for pointer event logs)
        </p>
      </div> */}
    </main>
  );
};

export default Canvas;
