import { Draggable } from '@hello-pangea/dnd';

function daysRemaining(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

function deadlineColor(days) {
  if (days === null) return null;
  if (days < 7) return '#8A5A12';
  if (days < 14) return '#1F5C45';
  return '#1F5C45';
}

export default function KanbanCard({ userFirm, index, onClick }) {
  const firm = userFirm.firms;
  const days = daysRemaining(firm?.app_window_end);
  const color = deadlineColor(days);

  return (
    <Draggable draggableId={userFirm.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onClick(userFirm)}
          className="kanban-card"
          style={{
            background: snapshot.isDragging ? '#E7F0EC' : '#F6F7F5',
            border: '1px solid #E3E6E8',
            margin: 8,
            padding: 12,
            cursor: 'pointer',
            borderRadius: 2,
            ...provided.draggableProps.style,
          }}
        >
          <div
            style={{
              fontFamily: "'EB Garamond', Georgia, serif",
              fontSize: 14,
              fontWeight: 500,
              color: '#14181F',
              lineHeight: 1.3,
            }}
          >
            {firm?.name || 'Unknown Firm'}
          </div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 8,
              textTransform: 'uppercase',
              color: '#5B6470',
              marginTop: 2,
              letterSpacing: '0.05em',
            }}
          >
            {firm?.city}, {firm?.state}
          </div>
          {days !== null && (
            <div
              style={{
                marginTop: 6,
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                color,
                border: `1px solid ${color}`,
                borderRadius: 2,
                padding: '2px 5px',
                display: 'inline-block',
              }}
            >
              {days}d remaining
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
