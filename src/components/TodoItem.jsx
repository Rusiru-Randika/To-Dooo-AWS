import { useState } from 'react';

export default function TodoItem({ todo, onToggle, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDesc, setEditDesc] = useState(todo.description);

  const handleSave = () => {
    if (!editTitle.trim()) return;
    onUpdate(todo.id, { title: editTitle, description: editDesc });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(todo.title);
    setEditDesc(todo.description);
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <div
      className={`todo-item todo-item--${todo.priority} ${todo.completed ? 'todo-item--completed' : ''} ${editing ? 'todo-item--editing' : ''}`}
      id={`todo-${todo.id}`}
    >
      <div className="todo-item__checkbox">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
          aria-label={`Mark "${todo.title}" as ${todo.completed ? 'incomplete' : 'complete'}`}
        />
      </div>

      <div className="todo-item__content">
        {editing ? (
          <>
            <input
              className="todo-item__edit-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Task title"
              autoFocus
            />
            <input
              className="todo-item__edit-input"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Description"
            />
            <div className="todo-item__edit-actions">
              <button className="todo-item__edit-btn todo-item__edit-btn--save" onClick={handleSave}>
                Save
              </button>
              <button className="todo-item__edit-btn todo-item__edit-btn--cancel" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="todo-item__title">{todo.title}</div>
            {todo.description && <div className="todo-item__desc">{todo.description}</div>}
            <div className="todo-item__meta">
              <span className={`todo-item__tag todo-item__tag--${todo.priority}`}>
                {todo.priority}
              </span>
              <span className="todo-item__tag todo-item__tag--category">
                {todo.category}
              </span>
            </div>
          </>
        )}
      </div>

      {!editing && (
        <div className="todo-item__actions">
          <button
            className="todo-item__action-btn"
            onClick={() => setEditing(true)}
            aria-label="Edit todo"
            title="Edit"
          >
            ✏️
          </button>
          <button
            className="todo-item__action-btn todo-item__action-btn--delete"
            onClick={() => onDelete(todo.id)}
            aria-label="Delete todo"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}
