import { useState } from 'react';

const CATEGORIES = ['personal', 'work', 'shopping', 'health', 'learning'];
const PRIORITIES = ['low', 'medium', 'high'];

export default function AddTodoForm({ onAdd }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('personal');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({ title, description, priority, category });
    setTitle('');
    setDescription('');
    setPriority('medium');
    setCategory('personal');
  };

  return (
    <form className="add-form" onSubmit={handleSubmit} id="add-todo-form">
      <div className="add-form__row">
        <input
          id="todo-title-input"
          className="add-form__input add-form__input--title"
          type="text"
          placeholder="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" className="add-form__btn" id="add-todo-btn">
          <span>＋</span> Add
        </button>
      </div>
      <div className="add-form__row">
        <input
          id="todo-desc-input"
          className="add-form__input"
          type="text"
          placeholder="Add a description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autoComplete="off"
        />
        <select
          id="todo-priority-select"
          className="add-form__select"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢'} {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
        <select
          id="todo-category-select"
          className="add-form__select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}
