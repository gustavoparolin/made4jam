import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SortableRow({ id, children, isBlock = false, hidden = false }: {
  id: string;
  children: React.ReactNode;
  isBlock?: boolean;
  /** Set to true to visually hide this row (e.g. song children while their block is being dragged) */
  hidden?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const baseStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 50 : 'auto',
    position: isDragging ? 'relative' as const : 'static' as const,
  };

  const style = hidden
    ? { ...baseStyle, visibility: 'hidden' as const, pointerEvents: 'none' as const }
    : baseStyle;

  if (isBlock) {
    return (
      <tr ref={setNodeRef} style={style} {...attributes} {...listeners} className="bg-gray-800 border-y-4 border-gray-900 cursor-move">
        {children}
      </tr>
    );
  }

  return (
    <tr ref={setNodeRef} style={style} {...attributes} {...listeners} className="border-b border-gray-700 hover:bg-gray-800/50 transition cursor-move">
      {children}
    </tr>
  );
}
