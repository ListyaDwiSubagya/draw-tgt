export enum CanvasMode {
  None = "None",
  Pencil = "Pencil",
  Rectangle = "Rectangle",
  Circle = "Circle",
  Text = "Text",
  Arrow = "Arrow",
  Eraser = "Eraser",
  Triangle ="Triangle"
}

export type Point = {
  x: number;
  y: number;
};

export type Stroke = Point[];

export type CanvasState =
  | { mode: CanvasMode.None; currentStroke?: Stroke; currentPosition?: Point; }
  | { mode: CanvasMode.Pencil; currentStroke?: Stroke; currentPosition?: Point }
  | {
      mode: CanvasMode.Rectangle;
      origin?: Point;
      currentPosition?: Point;
      currentStroke?: Stroke;
    }
  | {
      mode: CanvasMode.Circle;
      origin?: Point;
      currentPosition?: Point;
      currentStroke?: Stroke;
    }
  | {
      mode: CanvasMode.Text;
      text: string;
      position?: Point;
      currentStroke?: Stroke;
      currentPosition?: Point;
    }
  | {
      mode: CanvasMode.Arrow;
      start?: Point;
      end?: Point;
      currentStroke?: Stroke;
      currentPosition?: Point;
    }
  | {
      mode: CanvasMode.Eraser;
      eraserSize?: number;
      currentStroke?: Stroke;
      currentPosition?: Point;
    }
  | 
    {
      mode: CanvasMode.Triangle;
      origin?: Point; // Tambahkan ini
      currentPosition?: Point; // Ini sudah ada, tapi pastikan
      // currentStroke tidak perlu ada di sini
  };

export interface ToolbarProps {
  canvasState: CanvasState;
  setCanvasState: (state: CanvasState) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  eraserSize: number;
  setEraserSize: (size: number) => void;
}
