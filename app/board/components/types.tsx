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
  | { mode: CanvasMode.None }
  | { mode: CanvasMode.Pencil; currentStroke?: Stroke }
  | { mode: CanvasMode.Rectangle; origin?: Point; currentPosition?: Point }
  | { mode: CanvasMode.Circle; origin?: Point; currentPosition?: Point }
  | { mode: CanvasMode.Text; text: string; position?: Point }
  | { mode: CanvasMode.Arrow; start?: Point; end?: Point }
  | { mode: CanvasMode.Eraser; eraserSize?: number };

export interface ToolbarProps {
  canvasState: CanvasState;
  setCanvasState: (state: CanvasState) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}