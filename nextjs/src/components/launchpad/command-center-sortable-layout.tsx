"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";
import { t } from "@/lib/admin-t";

function SortableBlock({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const showHandle = isDragging
    ? "opacity-100"
    : "opacity-0 group-hover/cc-block:opacity-100 group-focus-within/cc-block:opacity-100";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("group/cc-block relative", isDragging && "z-[100] opacity-95")}
    >
      <button
        type="button"
        className={cn(
          "absolute right-1 top-1 z-10 flex size-7 touch-none items-center justify-center rounded-md border border-border/60 bg-background/95 text-muted-foreground shadow-sm transition-opacity duration-150",
          "cursor-grab hover:bg-muted hover:text-foreground active:cursor-grabbing",
          showHandle,
          !isDragging &&
            "pointer-events-none group-hover/cc-block:pointer-events-auto group-focus-within/cc-block:pointer-events-auto",
          isDragging && "pointer-events-auto",
        )}
        aria-label={t("Drag to reorder")}
        title={t("Drag to reorder")}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {children}
    </div>
  );
}

export function CommandCenterSortableBlocks<T extends string>({
  blockIds,
  onReorder,
  renderBlock,
  className,
}: {
  blockIds: T[];
  onReorder: (next: T[]) => void;
  renderBlock: (id: T) => React.ReactNode;
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = blockIds.indexOf(String(active.id) as T);
      const newIndex = blockIds.indexOf(String(over.id) as T);
      if (oldIndex < 0 || newIndex < 0) return;
      onReorder(arrayMove(blockIds, oldIndex, newIndex));
    },
    [blockIds, onReorder],
  );

  if (blockIds.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
        <div className={cn("space-y-5", className)}>
          {blockIds.map((id) => (
            <SortableBlock key={id} id={id}>
              {renderBlock(id)}
            </SortableBlock>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
