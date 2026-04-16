# AWS Amplify Gen 2 Implementation Guide

This document explains exactly how AWS Amplify Gen 2 was implemented in the "To-Dooo" project to transition it from a local Node.js/Express backend to a fully serverless, cloud-native architecture.

## 1. The Migration Strategy

Previously, the app used a custom Express server (`server/index.js`) to store to-dos in an in-memory array. 
We replaced it with **AWS Amplify Gen 2**, which automatically provisions and configures Amazon Cloud services for us using Infrastructure-as-Code (TypeScript).

The core AWS services implemented are:
- **Amazon Cognito**: Handles User Authentication (Sign up, Sign in, Passwords).
- **AWS AppSync**: Provides a GraphQL API layer.
- **Amazon DynamoDB**: A NoSQL database that stores the actual "To-Dooo" items.
- **AWS Amplify Hosting**: For continuous deployment (CI/CD) and hosting the React frontend.

---

## 2. Infrastructure as Code (Backend Definition)

Amplify Gen 2 uses a `"code-first"` approach. The backend infrastructure is defined purely in TypeScript inside the `amplify/` directory.

### `amplify/backend.ts`
This is the root of our backend. It imports our `auth` and `data` definitions and passes them to `defineBackend`, effectively telling AWS: *"Provision these services for my app"*.

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';

defineBackend({
  auth,
  data,
});
```

### `amplify/auth/resource.ts`
This file configures **Amazon Cognito**. We defined that our app uses an email-based login system. Amplify handles the heavy lifting (like sending verification emails and securely storing passwords).

```typescript
import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true, // Users will sign up & log in with their email address.
  },
});
```

### `amplify/data/resource.ts`
This file is the core of our data model. We define a `Todo` model which Amplify automatically translates into an **Amazon DynamoDB** table and provisions an **AppSync GraphQL API** to interact with it.

We also implemented **Owner-Based Authorization** `.authorization((allow) => [allow.owner()])`. This guarantees that users can ONLY access the items they create. Data isolation is enforced on the server, not just hidden on the client.

```typescript
import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  Todo: a.model({
    title: a.string().required(),
    description: a.string().default(''),
    completed: a.boolean().default(false),
    priority: a.string().default('medium'),
    category: a.string().default('personal'),
  }).authorization((allow) => [
    allow.owner(), // Crucial: Users only see/edit their own data
  ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool', // Protects the API using Cognito sessions
  },
});
```

---

## 3. Frontend Integration

After configuring the backend, we needed the React frontend (`src/`) to talk to AWS. When deployed, Amplify auto-generates a file called `amplify_outputs.json` which contains the connection details (API Endpoints, Cognito Pool IDs, etc.).

### Initializing Amplify (`src/main.jsx`)
We initialize the Amplify client when the React application loads.

```javascript
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

Amplify.configure(outputs); // Connects the frontend to AWS resources
```

### Secure UI Component (`src/App.jsx`)
To secure the application without building custom login flows, we wrapped our main interface in the Amplify `<Authenticator>` UI component. 

If a user gets to the app and is *not* logged in, the `<Authenticator>` presents a Sign-in / Sign-up screen. If they are validated, it renders the `TodoApp`.

```javascript
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

export default function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <TodoApp signOut={signOut} user={user} />
      )}
    </Authenticator>
  );
}
```

### Client Data Operations (`src/api.js`)
Instead of using standard REST `fetch()` calls to a Node server, we use `generateClient()` provided by Amplify Data. Under the hood, this client executes GraphQL queries/mutations to AWS AppSync, and automatically includes the Cognito Auth token.

```javascript
import { generateClient } from 'aws-amplify/data';
const client = generateClient();

// Create a Todo
export async function createTodo(data) {
  const { data: todo } = await client.models.Todo.create({ ...data });
  return todo;
}

// Fetch Todos (AppSync auto-filters to ONLY return the logged-in user's todos)
export async function fetchTodos() {
  const { data: allTodos } = await client.models.Todo.list();
  return allTodos;
}

// Update a Todo
export async function updateTodo(id, data) {
  const { data: todo } = await client.models.Todo.update({ id, ...data });
  return todo;
}

// Delete a Todo
export async function deleteTodo(id) {
  await client.models.Todo.delete({ id });
}
```

---

## 4. UI Customization & Theme Engine

- **Dynamic Theme Engine (Light/Dark Mode)**: In `src/App.jsx`, we implemented a global `theme` state backed by `localStorage` that toggles a `data-theme="light"` attribute on the document root. A custom premium glassmorphism floating button is rendered globally alongside the Authenticator to toggle this state.
- **Authenticator CSS Overrides**: In `src/index.css`, scoped CSS variables targeting `[data-amplify-authenticator]` strictly force the Amplify login interface to dynamically inherit our custom Dark/Light color tokens (including detailed contrast fixes for password eyes and submit buttons).
- **Top bar**: We introduced a top bar inside `TodoApp` which displays the authenticated user's email (`user?.signInDetails?.loginId`) and a "Sign Out" button hooked up to the `signOut` function provided by the Authenticator.
- **Proxy Removal**: We removed the `/api` proxy mappings from `vite.config.js` because frontend HTTP requests now securely target AWS directly rather than a local Express proxy.

---

## Summary of the AWS Workflow
1. User interacts with `<Authenticator>`.
2. `<Authenticator>` securely logs them in using **Amazon Cognito**, receiving a JWT.
3. User adds a "To-Dooo".
4. `generateClient().models.Todo.create(...)` issues a request to **AWS AppSync**.
5. AppSync validates the JWT, checks that the user is an authorized owner, and writes the record to **Amazon DynamoDB**. 
6. Subsequent fetches pull strictly that user's data resulting in a secure, isolated state.
