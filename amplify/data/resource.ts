/**
 * ============================================
 * AWS Amplify Gen 2 — Data Model
 * ============================================
 *
 * This file defines the data schema using Amplify's
 * schema builder. Each a.model() creates:
 *   1. A DynamoDB table (NoSQL database)
 *   2. An AWS AppSync GraphQL API with auto-generated
 *      CRUD operations (create, read, update, delete, list)
 *   3. IAM authorization rules
 *
 * The schema is defined using TypeScript, giving
 * full type safety in the React frontend when using
 * client.models.Todo.create(), .list(), etc.
 *
 * File: amplify/data/resource.ts
 */

import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

/**
 * a.schema() — Defines all data models for the app.
 *
 * Each a.model() inside the schema becomes:
 *   - A DynamoDB table with the model's fields as attributes
 *   - GraphQL types, queries, and mutations in AppSync
 *
 * Auto-generated fields (you don't define these):
 *   - id: string        → Unique UUID, auto-created
 *   - owner: string     → Cognito user ID, auto-set
 *   - createdAt: string  → ISO timestamp, auto-set on create
 *   - updatedAt: string  → ISO timestamp, auto-set on update
 */
const schema = a.schema({

  /**
   * Todo Model — The main data entity.
   *
   * This single model definition generates:
   *
   * DynamoDB Table:
   *   - Partition Key: id (String)
   *   - Attributes: title, description, completed, priority, category, owner
   *
   * AppSync GraphQL Operations:
   *   - createTodo(input)  → Mutation: inserts a new item
   *   - getTodo(id)        → Query: fetches one item by ID
   *   - listTodos          → Query: fetches all items (filtered by owner)
   *   - updateTodo(input)  → Mutation: updates an existing item
   *   - deleteTodo(id)     → Mutation: removes an item
   *
   * Frontend Usage:
   *   client.models.Todo.create({ title: "Buy milk" })
   *   client.models.Todo.list()
   *   client.models.Todo.update({ id: "...", completed: true })
   *   client.models.Todo.delete({ id: "..." })
   */
  Todo: a.model({
    title: a.string().required(),              // Task name — must be provided
    description: a.string().default(''),       // Task details — defaults to empty
    completed: a.boolean().default(false),     // Completion status — defaults to false
    priority: a.string().default('medium'),    // "low" | "medium" | "high"
    category: a.string().default('personal'),  // "personal" | "work" | "shopping" | "health" | "learning"
  })

  /**
   * .authorization() — Defines WHO can access this data.
   *
   * allow.owner():
   *   - AppSync automatically adds an "owner" field to each record
   *   - When a user creates a todo, owner = their Cognito user ID
   *   - On read/update/delete, AppSync checks: is the caller the owner?
   *   - If yes → allowed. If no → request denied (403).
   *
   * This means:
   *   ✅ User A can CRUD their own todos
   *   ❌ User A CANNOT see/edit/delete User B's todos
   *   ✅ Complete data isolation per user — enforced at API level
   */
  .authorization((allow) => [
    allow.owner(),
  ]),
});

/**
 * ClientSchema — Exports the schema type for frontend type safety.
 *
 * When the React app calls client.models.Todo.create({ ... }),
 * TypeScript knows exactly what fields are available and their types.
 */
export type Schema = ClientSchema<typeof schema>;

/**
 * defineData() — Configures the AppSync API settings.
 *
 * authorizationModes:
 *   - defaultAuthorizationMode: 'userPool'
 *     → Every API request must include a valid Cognito JWT token
 *     → Anonymous/unauthenticated access is NOT allowed
 *     → The Amplify client SDK handles token management automatically
 */
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',  // Requires Cognito sign-in
  },
});
