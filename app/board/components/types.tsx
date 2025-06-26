export enum CanvasMode {
  None = "None",
  Pencil = "Pencil",
  Rectangle = "Rectangle",
  Circle = "Circle",
  Text = "Text",
  Arrow = "Arrow",
  Triangle = "Triangle",
}

export type Point = {
  x: number;
  y: number;
};

export type Stroke = Point[];

export type CanvasState =
  | { mode: CanvasMode.None; currentStroke?: Stroke; currentPosition?: Point }
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
      mode: CanvasMode.Triangle;
      origin?: Point; // Tambahkan ini
      currentPosition?: Point; // Ini sudah ada, tapi pastikan
      currentStroke?: Stroke;
    };

export interface ToolbarProps {
  canvasState: CanvasState;
  setCanvasState: (state: CanvasState) => void;
  currentColor: string; // Tambahkan ini
  setCurrentColor: (color: string) => void; // Tambahkan ini
  currentWidth: number; // Tambahkan ini
  setCurrentWidth: (width: number) => void; // Tambahkan ini
}

export type VectorElement =
  | {
      type: "path";
      points: Point[];
      color: string;
      width: number;
    }
  | {
      type: "rectangle";
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      strokeWidth: number;
    }
  | {
      type: "circle";
      cx: number;
      cy: number;
      radius: number;
      color: string;
      strokeWidth: number;
    }
  | {
      type: "triangle";
      points: [Point, Point, Point];
      color: string;
      strokeWidth: number;
    }
  | {
      type: "text";
      content: string;
      x: number;
      y: number;
      color: string;
    }
  | {
      type: "arrow";
      start: Point;
      end: Point;
      color: string;
      strokeWidth: number;
    };
