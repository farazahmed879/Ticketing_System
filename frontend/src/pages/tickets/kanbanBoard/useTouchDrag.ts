import { useState, useRef, useCallback } from "react";

interface TouchDragOptions {
  onDrop: (ticketId: string, statusId: string, targetStatusName: string) => void;
}

export const useTouchDrag = ({ onDrop }: TouchDragOptions) => {
  const [draggingTicket, setDraggingTicket] = useState<any | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredColumnId, setHoveredColumnId] = useState<string | null>(null);

  const startCoord = useRef<{ x: number; y: number } | null>(null);
  const holdTimer = useRef<any>(null);
  const isDraggingRef = useRef(false);
  const currentTicketRef = useRef<any | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent, ticket: any) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    startCoord.current = { x: touch.clientX, y: touch.clientY };
    currentTicketRef.current = ticket;
    isDraggingRef.current = false;

    // After 180ms hold without major movement, initiate touch drag
    holdTimer.current = setTimeout(() => {
      isDraggingRef.current = true;
      setDraggingTicket(ticket);
      setGhostPos({ x: touch.clientX, y: touch.clientY });
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(40);
      }
    }, 180);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];

    if (!isDraggingRef.current) {
      if (startCoord.current) {
        const dx = touch.clientX - startCoord.current.x;
        const dy = touch.clientY - startCoord.current.y;
        if (Math.hypot(dx, dy) > 10) {
          // User is scrolling or swiping; cancel drag timer
          if (holdTimer.current) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
          }
        }
      }
      return;
    }

    // Actively dragging: prevent scrolling and update ghost position
    if (e.cancelable) {
      e.preventDefault();
    }
    setGhostPos({ x: touch.clientX, y: touch.clientY });

    // Detect target status column under finger
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const colEl = el?.closest("[data-column-id]");
    const colId = colEl?.getAttribute("data-column-id") || null;
    setHoveredColumnId(colId);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent): boolean => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }

    const wasDragging = isDraggingRef.current;
    isDraggingRef.current = false;

    if (wasDragging && currentTicketRef.current) {
      const touch = e.changedTouches[0];
      if (touch) {
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        const colEl = el?.closest("[data-column-id]");
        if (colEl) {
          const statusId = colEl.getAttribute("data-column-id");
          const targetStatusName = colEl.getAttribute("data-status-name");
          if (statusId && targetStatusName) {
            onDrop(currentTicketRef.current.id, statusId, targetStatusName);
          }
        }
      }
    }

    setDraggingTicket(null);
    setGhostPos(null);
    setHoveredColumnId(null);
    startCoord.current = null;
    currentTicketRef.current = null;

    return wasDragging;
  }, [onDrop]);

  const handleTouchCancel = useCallback(() => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    isDraggingRef.current = false;
    setDraggingTicket(null);
    setGhostPos(null);
    setHoveredColumnId(null);
    startCoord.current = null;
    currentTicketRef.current = null;
  }, []);

  return {
    draggingTicket,
    ghostPos,
    hoveredColumnId,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  };
};

