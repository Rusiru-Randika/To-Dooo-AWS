/**
 * ============================================
 * AWS Amplify Gen 2 — Backend Definition
 * ============================================
 *
 * This is the ROOT entry point for the Amplify backend.
 * It tells AWS which cloud services to provision.
 *
 * When Amplify deploys, it reads this file and uses
 * AWS CDK (Cloud Development Kit) under the hood to
 * create CloudFormation stacks that provision:
 *   - Amazon Cognito (auth)
 *   - AWS AppSync + DynamoDB (data)
 *
 * File: amplify/backend.ts
 */

import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';   // Cognito User Pool configuration
import { data } from './data/resource';   // AppSync API + DynamoDB table

/**
 * defineBackend() — Registers all backend resources.
 *
 * Each key maps to an Amplify "construct":
 *   - auth → provisions Amazon Cognito User Pool + App Client
 *   - data → provisions AWS AppSync GraphQL API + DynamoDB tables
 *
 * After deployment, Amplify auto-generates `amplify_outputs.json`
 * containing connection details (endpoints, API keys, pool IDs)
 * that the React frontend uses to connect.
 */
defineBackend({
  auth,
  data,
});
