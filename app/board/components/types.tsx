export enum CanvasMode {
  None = "None",
  Pencil = "Pencil",
  Rectangle = "Rectangle",
  Circle = "Circle",
  Text = "Text",
}

export type Point = {
  x: number;
  y: number;
};

export type Stroke = Point[];

export type CanvasState = {
  mode: CanvasMode;
  currentStroke?: Stroke;
  origin?: Point;
  currentPosition?: Point;
};

export interface ToolbarProps {
  canvasState: CanvasState;
  setCanvasState: (state: CanvasState) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}