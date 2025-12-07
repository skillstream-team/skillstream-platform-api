/**
 * Whiteboard DTOs
 * Handles interactive whiteboard functionality
 */

export interface CreateWhiteboardDto {
  courseId?: string;
  liveStreamId?: string;
  title: string;
  description?: string;
  backgroundColor?: string;
  width?: number;
  height?: number;
  isPublic?: boolean;
}

export interface UpdateWhiteboardDto {
  title?: string;
  description?: string;
  backgroundColor?: string;
  isActive?: boolean;
  isPublic?: boolean;
}

export interface WhiteboardResponseDto {
  id: string;
  courseId?: string;
  liveStreamId?: string;
  title: string;
  description?: string;
  createdBy: string;
  creator: {
    id: string;
    username: string;
    email: string;
  };
  isActive: boolean;
  isPublic: boolean;
  backgroundColor: string;
  width: number;
  height: number;
  actionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWhiteboardActionDto {
  whiteboardId: string;
  actionType: 'draw' | 'erase' | 'clear' | 'undo' | 'redo' | 'add_text' | 'add_shape';
  data: {
    // For draw actions
    points?: Array<{ x: number; y: number; pressure?: number }>;
    color?: string;
    brushSize?: number;
    tool?: string;
    
    // For erase actions
    eraseRegion?: { x: number; y: number; width: number; height: number };
    
    // For text/shape actions
    text?: string;
    shape?: 'rectangle' | 'circle' | 'line' | 'arrow';
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    style?: {
      fillColor?: string;
      strokeColor?: string;
      strokeWidth?: number;
    };
    
    // For undo/redo
    actionId?: string;
  };
}

export interface WhiteboardActionResponseDto {
  id: string;
  whiteboardId: string;
  userId: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  actionType: string;
  data: any;
  timestamp: Date;
  createdAt: Date;
}

export interface WhiteboardWithActionsDto extends WhiteboardResponseDto {
  actions: WhiteboardActionResponseDto[];
}
