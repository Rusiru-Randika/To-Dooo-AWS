/**
 * ============================================
 * App.jsx — Main Application Component
 * ============================================
 *
 * This is the root component that combines:
 *   1. AWS Amplify Authenticator (Cognito login/signup UI)
 *   2. TodoApp (the actual to-do interface)
 *
 * Flow:
 *   User opens app → <Authenticator> shows login screen
 *   → User signs in → Cognito returns JWT tokens
 *   → <Authenticator> renders <TodoApp> with user info
 *   → TodoApp loads user's todos from DynamoDB via AppSync
 *
 * File: src/App.jsx
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Authenticator — Pre-built Cognito login/signup component.
 *
 * This component from @aws-amplify/ui-react provides:
 *   - Sign In form (email + password)
 *   - Sign Up form (email + password + verification)
 *   - Forgot Password flow
 *   - Email verification (confirmation code)
 *   - Session persistence (auto-refresh JWT tokens)
 *
 * It connects to the Cognito User Pool defined in
 * amplify/auth/resource.ts, using the config from
 * amplify_outputs.json (loaded in main.jsx).
 *
 * The render prop pattern:
 *   <Authenticator>
 *     {({ signOut, user }) => <YourApp />}
 *   </Authenticator>
 *
 * The children ONLY render when the user is authenticated.
 * signOut() — Clears the Cognito session and shows login again.
 * user — Contains the authenticated user's info (email, ID, etc.)
 */
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';  // Default Authenticator styles (overridden by our dark theme in index.css)

import Header from './components/Header';
import StatsBar from './components/StatsBar';
import AddTodoForm from './components/AddTodoForm';
import Toolbar from './components/Toolbar';
import TodoItem from './components/TodoItem';
import Toast from './components/Toast';

/**
 * Import the Amplify-powered API functions.
 * These use generateClient() to talk to AppSync → DynamoDB.
 * See api.js for detailed comments on each function.
 */
import { fetchTodos, createTodo, updateTodo, toggleTodo, deleteTodo, clearCompleted } from './api';

/**
 * TodoApp — The main to-do interface.
 *
 * This component only renders AFTER successful Cognito authentication.
 * All data operations are scoped to the authenticated user via
 * AppSync's owner-based authorization.
 *
 * Props (from <Authenticator>):
 *   @param {Function} signOut - Clears Cognito session, returns to login
 *   @param {Object} user - Authenticated user info from Cognito
 *     user.signInDetails.loginId → user's email address
 *     user.userId → Cognito user ID (used as "owner" in DynamoDB)
 */
function TodoApp({ signOut, user }) {
  const [todos, setTodos] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });
  const [filter, setFilter] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Toast notification helpers
  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * loadTodos — Fetches todos from DynamoDB via AppSync.
   *
   * Calls fetchTodos() from api.js which:
   *   1. Runs client.models.Todo.list() → GraphQL query to AppSync
   *   2. AppSync checks JWT token → only returns current user's todos
   *   3. Client-side filters applied (active/completed, category, search)
   *   4. Returns { todos: [...], stats: { total, active, completed } }
   */
  const loadTodos = useCallback(async () => {
    try {
      const data = await fetchTodos(filter, category, search);
      setTodos(data.todos);
      setStats(data.stats);
    } catch {
      addToast('Failed to load todos', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter, category, search, addToast]);

  // Load todos on mount and when filters change
  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  /**
   * handleAdd — Creates a new todo via AppSync → DynamoDB.
   *
   * Flow:
   *   1. User fills form → clicks "Add"
   *   2. createTodo() sends GraphQL mutation to AppSync
   *   3. AppSync auto-sets: id, owner (Cognito user ID), createdAt
   *   4. DynamoDB stores the new item
   *   5. loadTodos() refreshes the list from DynamoDB
   */
  const handleAdd = async (data) => {
    try {
      await createTodo(data);
      await loadTodos();
      addToast('Task added successfully!');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  /**
   * handleToggle — Toggles todo completion via AppSync → DynamoDB.
   *
   * Flow:
   *   1. Fetches current todo state from DynamoDB
   *   2. Updates with opposite `completed` value
   *   3. AppSync verifies caller is the owner before allowing update
   */
  const handleToggle = async (id) => {
    try {
      const updated = await toggleTodo(id);
      addToast(updated.completed ? 'Task completed! 🎉' : 'Task reopened');
      await loadTodos();
    } catch {
      addToast('Failed to update task', 'error');
    }
  };

  /** handleUpdate — Updates todo title/description via AppSync → DynamoDB */
  const handleUpdate = async (id, data) => {
    try {
      await updateTodo(id, data);
      await loadTodos();
      addToast('Task updated!');
    } catch {
      addToast('Failed to update task', 'error');
    }
  };

  /**
   * handleDelete — Removes a todo via AppSync → DynamoDB.
   * AppSync checks owner authorization before deleting.
   */
  const handleDelete = async (id) => {
    try {
      await deleteTodo(id);
      await loadTodos();
      addToast('Task deleted');
    } catch {
      addToast('Failed to delete task', 'error');
    }
  };

  /** handleClearCompleted — Batch deletes all completed todos from DynamoDB */
  const handleClearCompleted = async () => {
    try {
      await clearCompleted();
      await loadTodos();
      addToast('Completed tasks cleared!');
    } catch {
      addToast('Failed to clear tasks', 'error');
    }
  };

  // Debounce search — waits 300ms after typing stops before querying
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTodos();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Loading state while initial DynamoDB query runs
  if (loading) {
    return (
      <div className="app">
        <Header />
        <div className="loading">
          <div className="loading__spinner" />
          <div className="loading__text">Loading your tasks...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Top bar: shows authenticated user's email + sign out button */}
      <div className="app__topbar">
        <span className="app__user">
          👋 {user?.signInDetails?.loginId || 'User'} {/* ← email from Cognito */}
        </span>
        <button className="app__signout" onClick={signOut}>
          Sign Out {/* ← Clears Cognito JWT session */}
        </button>
      </div>

      <Header />
      <StatsBar stats={stats} />
      <AddTodoForm onAdd={handleAdd} />
      <Toolbar
        filter={filter}
        onFilterChange={setFilter}
        category={category}
        onCategoryChange={setCategory}
        search={search}
        onSearchChange={setSearch}
      />

      {/* Todo list — each item comes from DynamoDB */}
      <div className="todo-list" id="todo-list">
        {todos.length === 0 ? (
          <div className="todo-list__empty">
            <div className="todo-list__empty-icon">📋</div>
            <div className="todo-list__empty-title">No tasks found</div>
            <div className="todo-list__empty-text">
              {search ? 'Try a different search term' : 'Add your first task above to get started!'}
            </div>
          </div>
        ) : (
          todos.map((todo, i) => (
            <TodoItem
              key={todo.id} /* ← DynamoDB auto-generated UUID */
              todo={todo}
              onToggle={handleToggle}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))
        )}
      </div>

      {/* Clear completed — batch deletes from DynamoDB */}
      {stats.completed > 0 && (
        <div className="clear-completed">
          <button
            className="clear-completed__btn"
            onClick={handleClearCompleted}
            id="clear-completed-btn"
          >
            🧹 Clear {stats.completed} completed task{stats.completed !== 1 ? 's' : ''}
          </button>
        </div>
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

/**
 * App — Root Component with Amplify Authenticator.
 *
 * <Authenticator> wraps the entire app:
 *   - If NOT authenticated → shows Cognito login/signup form
 *   - If authenticated → renders TodoApp with user info
 *
 * The Authenticator automatically:
 *   - Manages JWT tokens (access, ID, refresh)
 *   - Persists sessions (user stays logged in on refresh)
 *   - Handles token refresh (access tokens expire after 1 hour)
 *   - Provides signOut function to clear the session
 *
 * Dark theme styling is applied via CSS overrides in index.css
 * using [data-amplify-authenticator] selectors.
 */
export default function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <TodoApp signOut={signOut} user={user} />
      )}
    </Authenticator>
  );
}
