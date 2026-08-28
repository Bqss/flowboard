import { Elysia } from 'elysia';
import * as workspaces from '@handlers/workspaces';
import * as apiKeys from '@handlers/api-keys';
import { createRequireAuth } from '@middlewares';
import { resolveWorkspaceMember } from '@middlewares/workspace';
import {
  WorkspaceIdParam,
  WorkspaceMemberParam,
  UpdateWorkspaceSchema,
  CreateInviteSchema,
  AcceptInviteSchema,
  InviteTokenParam,
  CreateApiKeySchema,
  ApiKeyParam,
  UpdateApiKeySchema,
  RevokeApiKeySchema
} from '@validators';

export const createWorkspacesRoutes = () => {
  const workspaceMemberGuard = new Elysia()
    .derive({ as: 'scoped' }, async ({ cookie, params }) =>
      resolveWorkspaceMember(cookie, params.workspaceId)
    )
    .onBeforeHandle({ as: 'scoped' }, (ctx) => {
      const { workspace, membership, set } = ctx as typeof ctx & {
        workspace: unknown;
        membership: unknown;
      };
      if (!workspace || !membership) {
        set.status = 403;
        return { error: 'Forbidden' };
      }
    });

  return new Elysia({ prefix: '/workspaces' })
    // Public — invite links must work before the recipient logs in.
    .get('/invites/:token', workspaces.showInvite, { params: InviteTokenParam })
    .use(createRequireAuth())
    .get('/', workspaces.list)
    .post('/invites/accept', workspaces.acceptInvite, { body: AcceptInviteSchema })
    .group('/:workspaceId', (app) =>
      app
        .use(workspaceMemberGuard)
        .get('/', workspaces.show, { params: WorkspaceIdParam })
        .patch('/', workspaces.update, { params: WorkspaceIdParam, body: UpdateWorkspaceSchema })
        .post('/switch', workspaces.switchActive, { params: WorkspaceIdParam })
        .get('/members', workspaces.members, { params: WorkspaceIdParam })
        .delete('/members/:userId', workspaces.removeMember, { params: WorkspaceMemberParam })
        .get('/invites', workspaces.invites, { params: WorkspaceIdParam })
        .post('/invites', workspaces.createInvite, {
          params: WorkspaceIdParam,
          body: CreateInviteSchema
        })
        // MCP API keys — owner only (guard inside handlers).
        .get('/api-keys', apiKeys.listApiKeys, { params: WorkspaceIdParam })
        .post('/api-keys', apiKeys.createApiKeyHandler, {
          params: WorkspaceIdParam,
          body: CreateApiKeySchema
        })
        .patch('/api-keys/:keyId', apiKeys.updateApiKeyHandler, {
          params: ApiKeyParam,
          body: UpdateApiKeySchema
        })
        .post('/api-keys/revoke', apiKeys.revokeApiKeyHandler, {
          params: WorkspaceIdParam,
          body: RevokeApiKeySchema
        })
        .post('/api-keys/rotate', apiKeys.rotateApiKeyHandler, {
          params: WorkspaceIdParam,
          body: RevokeApiKeySchema
        })
        .post('/api-keys/prompt', apiKeys.getApiKeyPromptHandler, {
          params: WorkspaceIdParam,
          body: RevokeApiKeySchema
        })
        .post('/api-keys/config', apiKeys.getApiKeyConfigHandler, {
          params: WorkspaceIdParam,
          body: RevokeApiKeySchema
        })
    );
};
