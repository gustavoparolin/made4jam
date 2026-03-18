import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SortableRow({ id, children, isBlock = false }: { id: string, children: React.ReactNode, isBlock?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
    zIndex: isDragging ? 50 : 'auto',
    position: isDragging ? 'relative' as const : 'static' as const,
  };

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
