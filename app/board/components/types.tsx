export enum CanvasMode {
  None = "None",
  Pencil = "Pencil",
  Rectangle = "Rectangle",
  Circle = "Circle",
  Text = "Text",
  Arrow = "Arrow",
  Eraser = "Eraser",
}

export type Point = {
  x: number;
  y: number;
};

export type Stroke = Point[];

export type CanvasState =
  | { mode: CanvasMode.None; currentStroke?: Stroke }
  | { mode: CanvasMode.Pencil; currentStroke?: Stroke }
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
    }
  | {
      mode: CanvasMode.Arrow;
      start?: Point;
      end?: Point;
      currentStroke?: Stroke;
    }
  | { mode: CanvasMode.Eraser; eraserSize?: number; currentStroke?: Stroke };

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
