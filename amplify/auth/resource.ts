/**
 * ============================================
 * AWS Amplify Gen 2 — Authentication
 * ============================================
 *
 * This file configures Amazon Cognito, the AWS service
 * that handles user authentication.
 *
 * What Cognito provides:
 *   - User sign-up with email verification
 *   - User sign-in with email + password
 *   - Password reset via email
 *   - JWT token management (access, ID, refresh tokens)
 *   - Session management (auto-refresh tokens)
 *
 * AWS Resources Created:
 *   1. Cognito User Pool — stores user accounts
 *   2. Cognito App Client — allows the React app to authenticate
 *   3. Email sender — sends verification codes
 *
 * File: amplify/auth/resource.ts
 */

import { defineAuth } from '@aws-amplify/backend';

/**
 * defineAuth() — Configures the Cognito User Pool.
 *
 * loginWith.email: true
 *   - Users sign up and sign in using their email address
 *   - Email verification is required (Cognito sends a code)
 *   - Password must meet Cognito's default policy:
 *     • Minimum 8 characters
 *     • At least 1 uppercase, 1 lowercase, 1 number, 1 symbol
 *
 * The Amplify frontend's <Authenticator> component
 * automatically connects to this Cognito User Pool
 * and renders the sign-in/sign-up forms.
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});
