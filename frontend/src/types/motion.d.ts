declare module 'motion/react' {
  export interface MotionProps {
    initial?: any;
    animate?: any;
    exit?: any;
    transition?: any;
    drag?: string | boolean;
    dragConstraints?: any;
    dragElastic?: number;
    onDragEnd?: (event: any, info: any) => void;
    className?: string;
    children?: any;
    onClick?: () => void;
    [key: string]: any;
  }
  
  export interface PanInfo {
    offset: { x: number; y: number };
    delta: { x: number; y: number };
    velocity: { x: number; y: number };
    point: { x: number; y: number };
  }
  
  export const motion: {
    [key: string]: React.ComponentType<MotionProps>;
    div: React.ComponentType<MotionProps>;
  };
  
  export interface AnimatePresenceProps {
    mode?: 'wait' | 'sync';
    children?: any;
    initial?: boolean;
    onExitComplete?: () => void;
  }
  
  export const AnimatePresence: React.ComponentType<AnimatePresenceProps>;
}

