import { type Ctx } from '@core';
import { generateWorkflowDraft } from '@services/ai-workflow';
import { createWorkflowFromDraft, WorkflowError } from '@services/workflow';

type WorkspaceParams = { workspaceId: string };

type GenerateDraftBody = { prompt: string };

type SaveDraftBody = {
  name: string;
  stages: Array<{
    name: string;
    color?: string;
    onReplyNotify?: boolean;
    overdueReminderHours?: number | null;
    autoMoveOnComplete?: boolean;
    checklists: Array<{
      label: string;
      required?: boolean;
      deadlineHours?: number | null;
      action?: {
        kind: 'none' | 'send' | 'followup';
        messageTemplate?: string | null;
        delayMinutes?: number;
        followupIfNoReply?: boolean;
      };
    }>;
  }>;
  urgency?: 'high' | 'medium' | 'low';
  deadlineValue?: number | null;
  deadlineUnit?: 'hours' | 'days';
  reminderBeforeValue?: number | null;
  reminderBeforeUnit?: 'hours' | 'days';
  repeatRule?: 'none' | 'daily' | 'weekly' | 'monthly';
  closureBy?: 'initiator' | 'assignee';
};

export async function generateDraft({
  user,
  workspace,
  membership,
  body,
  set
}: Ctx<GenerateDraftBody, WorkspaceParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  if (membership.role !== 'owner') {
    set.status = 403;
    return { error: 'Owner access required' };
  }

  const draft = await generateWorkflowDraft(body.prompt, user.phone);
  return { draft, provider: process.env.BASOFI_AI_API_KEY ? 'ai' : 'heuristic' };
}

export async function saveDraft({
  user,
  workspace,
  membership,
  body,
  set
}: Ctx<SaveDraftBody, WorkspaceParams>) {
  if (!user || !workspace || !membership) {
    set.status = 403;
    return { error: 'Forbidden' };
  }

  if (membership.role !== 'owner') {
    set.status = 403;
    return { error: 'Owner access required' };
  }

  try {
    const { workflow, stages } = await createWorkflowFromDraft(workspace.id, user.id, body);

    return {
      workflow: {
        id: workflow.id,
        name: workflow.name,
        ownerId: workflow.ownerId,
        defaultAssigneeId: workflow.defaultAssigneeId,
        urgency: workflow.urgency,
        deadlineValue: workflow.deadlineValue,
        deadlineUnit: workflow.deadlineUnit,
        reminderBeforeValue: workflow.reminderBeforeValue,
        reminderBeforeUnit: workflow.reminderBeforeUnit,
        repeatRule: workflow.repeatRule,
        closureBy: workflow.closureBy
      },
      stages: stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
        position: stage.position
      }))
    };
  } catch (error) {
    if (error instanceof WorkflowError) {
      set.status = 400;
      return { error: error.message };
    }
    throw error;
  }
}
