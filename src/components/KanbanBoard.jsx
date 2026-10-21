import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { KANBAN_STATUSES } from '../constants/statuses';
import KanbanCard from './KanbanCard';

export default function KanbanBoard({ userFirms, onStatusChange, onCardClick }) {
  const columns = {};
  KANBAN_STATUSES.forEach((s) => { columns[s] = []; });
  userFirms.forEach((uf) => {
    const status = uf.status || 'Researching';
    if (columns[status]) columns[status].push(uf);
    else columns['Researching'].push(uf);
  });

  function handleDragEnd(result) {
    if (!result.destination) return;
    if (result.destination.droppableId === result.source.droppableId) return;
    onStatusChange(result.draggableId, result.destination.droppableId);
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          flex: 1,
          minHeight: 500,
        }}
      >
        {KANBAN_STATUSES.map((status) => {
          const isOffer = status === 'Offer';
          const isRejected = status === 'Rejected';

          return (
            <Droppable droppableId={status} key={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    minWidth: 220,
                    flexShrink: 0,
                    background: snapshot.isDraggingOver ? '#E3E6E8' : '#FFFFFF',
                    borderRight: '1px solid #E3E6E8',
                    borderTop: isOffer ? '2px solid #1F5C45' : 'none',
                    padding: '0 0 2rem 0',
                    opacity: isRejected ? 0.5 : 1,
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ padding: '12px 12px 8px' }}>
                    <div
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: 9,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: isOffer ? '#1F5C45' : '#5B6470',
                      }}
                    >
                      {status}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        fontSize: 14,
                        fontStyle: 'italic',
                        color: '#5B6470',
                      }}
                    >
                      {columns[status].length}
                    </div>
                  </div>

                  {columns[status].map((uf, index) => (
                    <KanbanCard
                      key={uf.id}
                      userFirm={uf}
                      index={index}
                      onClick={onCardClick}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
}
