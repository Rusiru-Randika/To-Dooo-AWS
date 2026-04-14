/**
 * ============================================
 * API Layer — Amplify Data Client
 * ============================================
 *
 * This file handles all data operations using the
 * Amplify-generated GraphQL client. It replaces what
 * was previously done with Express REST API calls.
 *
 * How it works:
 *   1. generateClient() creates a GraphQL client that
 *      automatically includes the user's Cognito JWT token
 *      in every request.
 *
 *   2. client.models.Todo.create/list/update/delete()
 *      sends GraphQL mutations/queries to AWS AppSync.
 *
 *   3. AppSync validates the JWT token, checks authorization
 *      rules (owner-based), and performs the DynamoDB operation.
 *
 * Key difference from REST:
 *   Before: fetch('/api/todos')  → Express server → in-memory array
 *   After:  client.models.Todo.list() → AppSync → DynamoDB
 *
 * File: src/api.js
 */

import { generateClient } from 'aws-amplify/data';

/**
 * generateClient() — Creates the Amplify Data client.
 *
 * This client:
 *   - Auto-attaches Cognito JWT token to every request
 *   - Sends requests to the AppSync GraphQL endpoint
 *   - Returns typed responses matching the schema in
 *     amplify/data/resource.ts
 *
 * The client is a singleton — create it once, use it everywhere.
 */
const client = generateClient();

/**
 * fetchTodos — Retrieves all todos for the current user.
 *
 * How it works:
 *   1. client.models.Todo.list() → sends a GraphQL query to AppSync
 *   2. AppSync automatically filters by owner = current Cognito user
 *      (User A can NEVER see User B's todos)
 *   3. Returns all todos owned by the authenticated user
 *   4. Client-side filtering is applied for filter/category/search
 *
 * @param {string} filter - "all" | "active" | "completed"
 * @param {string} category - "all" | "personal" | "work" | etc.
 * @param {string} search - Search term to filter by title/description
 * @returns {{ todos: Array, stats: { total, active, completed } }}
 */
export async function fetchTodos(filter = 'all', category = 'all', search = '') {
  // GraphQL Query: listTodos (filtered by owner automatically)
  const { data: allTodos, errors } = await client.models.Todo.list();

  if (errors) {
    console.error('Fetch errors:', errors);
    throw new Error('Failed to fetch todos');
  }

  let filtered = [...(allTodos || [])];

  // Client-side filtering (AppSync returns all user's todos, we filter in the browser)
  if (filter === 'active') filtered = filtered.filter((t) => !t.completed);
  if (filter === 'completed') filtered = filtered.filter((t) => t.completed);

  if (category && category !== 'all') {
    filtered = filtered.filter((t) => t.category === category);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
    );
  }

  // Sort: incomplete first → by priority → by date
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  filtered.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (priorityOrder[a.priority] !== priorityOrder[b.priority])
      return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // Calculate stats from ALL todos (not filtered)
  const total = allTodos?.length || 0;
  const active = allTodos?.filter((t) => !t.completed).length || 0;
  const completed = allTodos?.filter((t) => t.completed).length || 0;

  return {
    todos: filtered,
    stats: { total, active, completed },
  };
}

/**
 * createTodo — Creates a new todo in DynamoDB.
 *
 * How it works:
 *   1. Sends a GraphQL mutation: createTodo(input: { ... })
 *   2. AppSync validates the Cognito JWT token
 *   3. AppSync auto-adds: id (UUID), owner (user ID), createdAt, updatedAt
 *   4. DynamoDB stores the new item
 *   5. Returns the created todo with all auto-generated fields
 *
 * @param {Object} data - { title, description, priority, category }
 * @returns {Object} The created todo item
 */
export async function createTodo(data) {
  const { data: todo, errors } = await client.models.Todo.create({
    title: data.title,
    description: data.description || '',
    completed: false,
    priority: data.priority || 'medium',
    category: data.category || 'personal',
  });

  if (errors) {
    console.error('Create errors:', errors);
    throw new Error('Failed to create todo');
  }

  return todo;
}

/**
 * updateTodo — Updates an existing todo in DynamoDB.
 *
 * How it works:
 *   1. Sends a GraphQL mutation: updateTodo(input: { id, ...data })
 *   2. AppSync checks: is the caller the owner of this todo?
 *      ✅ Yes → update proceeds
 *      ❌ No → request denied (403 Forbidden)
 *   3. DynamoDB updates the item, auto-updates the updatedAt timestamp
 *
 * @param {string} id - The todo's unique ID
 * @param {Object} data - Fields to update (e.g., { title, description })
 * @returns {Object} The updated todo item
 */
export async function updateTodo(id, data) {
  const { data: todo, errors } = await client.models.Todo.update({
    id,
    ...data,
  });

  if (errors) {
    console.error('Update errors:', errors);
    throw new Error('Failed to update todo');
  }

  return todo;
}

/**
 * toggleTodo — Toggles the completed status of a todo.
 *
 * How it works:
 *   1. First fetches the current todo to get its completed status
 *   2. Then updates it with the opposite value
 *   3. Both operations go through AppSync → DynamoDB
 *   4. Owner authorization is checked on both get and update
 *
 * @param {string} id - The todo's unique ID
 * @returns {Object} The updated todo with toggled completion
 */
export async function toggleTodo(id) {
  // Step 1: Fetch current state from DynamoDB via AppSync
  const { data: existing } = await client.models.Todo.get({ id });
  if (!existing) throw new Error('Todo not found');

  // Step 2: Update with opposite completed value
  const { data: todo, errors } = await client.models.Todo.update({
    id,
    completed: !existing.completed,
  });

  if (errors) {
    console.error('Toggle errors:', errors);
    throw new Error('Failed to toggle todo');
  }

  return todo;
}

/**
 * deleteTodo — Deletes a todo from DynamoDB.
 *
 * How it works:
 *   1. Sends a GraphQL mutation: deleteTodo(input: { id })
 *   2. AppSync checks: is the caller the owner?
 *      ✅ Yes → delete from DynamoDB
 *      ❌ No → denied
 *
 * @param {string} id - The todo's unique ID
 */
export async function deleteTodo(id) {
  const { errors } = await client.models.Todo.delete({ id });
  if (errors) {
    console.error('Delete errors:', errors);
    throw new Error('Failed to delete todo');
  }
}

/**
 * clearCompleted — Deletes ALL completed todos.
 *
 * How it works:
 *   1. Lists all todos for the current user (owner-filtered by AppSync)
 *   2. Filters for completed ones client-side
 *   3. Sends parallel delete mutations for each completed todo
 *   4. Promise.all waits for all deletes to finish
 *
 * Note: Each delete is a separate GraphQL mutation to AppSync.
 * DynamoDB handles concurrent deletes efficiently.
 */
export async function clearCompleted() {
  // Get all todos (AppSync auto-filters by owner)
  const { data: allTodos } = await client.models.Todo.list();
  const completed = (allTodos || []).filter((t) => t.completed);

  // Delete each completed todo in parallel
  await Promise.all(
    completed.map((t) => client.models.Todo.delete({ id: t.id }))
  );

  return { message: 'Cleared completed todos' };
}
