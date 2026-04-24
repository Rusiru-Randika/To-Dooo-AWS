import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  Todo: a.model({
    title: a.string().required(),              
    description: a.string().default(''),      
    completed: a.boolean().default(false),     
    priority: a.string().default('medium'),    
    category: a.string().default('personal'),  
  })

  .authorization((allow) => [
    allow.owner(),
  ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',  
  },
});
