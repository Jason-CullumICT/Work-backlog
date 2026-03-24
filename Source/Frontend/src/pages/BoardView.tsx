import { useEffect, useState, useCallback } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import { fetchBoardData, transitionWorkItem } from '../api/client';
import type { BoardData, WorkItem } from '../types';
import { WorkItemCard } from '../components/WorkItemCard';

const STATUS_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  proposed: 'Proposed',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  in_dev: 'In Dev',
  done: 'Done',
};

export function BoardView() {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    try {
      const data = await fetchBoardData();
      setBoard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!board || !result.destination) return;

      const sourceStatus = result.source.droppableId;
      const destStatus = result.destination.droppableId;

      if (sourceStatus === destStatus) return;

      const sourceCol = board.columns.find((c) => c.status === sourceStatus);
      if (!sourceCol) return;

      const item = sourceCol.items[result.source.index];
      if (!item) return;

      // Optimistic update
      const prevBoard = board;
      const newColumns = board.columns.map((col) => {
        if (col.status === sourceStatus) {
          return { ...col, items: col.items.filter((i) => i.id !== item.id) };
        }
        if (col.status === destStatus) {
          const newItems = [...col.items];
          newItems.splice(result.destination!.index, 0, {
            ...item,
            status: destStatus as WorkItem['status'],
          });
          return { ...col, items: newItems };
        }
        return col;
      });
      setBoard({ columns: newColumns });
      setTransitionError(null);

      try {
        await transitionWorkItem(item.id, destStatus);
      } catch (err) {
        // Revert on failure
        setBoard(prevBoard);
        setTransitionError(
          err instanceof Error ? err.message : 'Transition failed',
        );
      }
    },
    [board],
  );

  if (loading) {
    return (
      <div data-testid="board-loading" className="flex items-center justify-center py-20">
        <div className="text-gray-500">Loading board...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="board-error" className="rounded-md bg-red-50 p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (!board) return null;

  return (
    <div data-testid="board-page">
      <h2 className="mb-4 text-2xl font-bold text-gray-900">Board</h2>

      {transitionError && (
        <div
          data-testid="transition-error"
          className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {transitionError}
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {board.columns.map((column) => (
            <div
              key={column.status}
              data-testid={`board-column-${column.status}`}
              className="flex w-64 min-w-[16rem] flex-col rounded-lg bg-gray-100"
            >
              <div className="flex items-center justify-between border-b border-gray-200 p-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  {STATUS_LABELS[column.status] || column.status}
                </h3>
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {column.items.length}
                </span>
              </div>
              <Droppable droppableId={column.status}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="flex-1 space-y-2 p-2"
                    style={{ minHeight: '4rem' }}
                  >
                    {column.items.map((item, index) => (
                      <Draggable
                        key={item.id}
                        draggableId={item.id}
                        index={index}
                      >
                        {(dragProvided) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                          >
                            <WorkItemCard item={item} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
