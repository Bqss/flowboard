export type WorkflowDraftAction = {
  kind: 'none' | 'send' | 'followup';
  messageTemplate?: string | null;
  delayMinutes?: number;
  followupIfNoReply?: boolean;
};

export type WorkflowDraftChecklist = {
  label: string;
  required?: boolean;
  deadlineHours?: number | null;
  action?: WorkflowDraftAction;
};

export type WorkflowDraftStage = {
  name: string;
  color?: string;
  onReplyNotify?: boolean;
  overdueReminderHours?: number | null;
  autoMoveOnComplete?: boolean;
  checklists: WorkflowDraftChecklist[];
};

export type WorkflowDraft = {
  name: string;
  stages: WorkflowDraftStage[];
  urgency?: 'high' | 'medium' | 'low';
  deadlineValue?: number | null;
  deadlineUnit?: 'hours' | 'days';
  reminderBeforeValue?: number | null;
  reminderBeforeUnit?: 'hours' | 'days';
  repeatRule?: 'none' | 'daily' | 'weekly' | 'monthly';
  closureBy?: 'initiator' | 'assignee';
};

const STAGE_COLORS = ['indigo', 'amber', 'rose', 'emerald', 'violet', 'cyan'] as const;
const webinarDraft = (prompt: string): WorkflowDraft => {
  const nameMatch = prompt.match(/webinar\s+([^.,\n]+)/i);
  const name = nameMatch?.[1]?.trim()
    ? `Pendaftaran ${nameMatch[1].trim()}`
    : 'Pendaftaran Webinar';

  return {
    name,
    urgency: 'high',
    deadlineValue: 7,
    deadlineUnit: 'days',
    reminderBeforeValue: 24,
    reminderBeforeUnit: 'hours',
    repeatRule: 'none',
    closureBy: 'initiator',
    stages: [
      {
        name: 'Pending Users',
        color: 'indigo',
        autoMoveOnComplete: true,
        checklists: [
          { label: 'Verifikasi data pendaftar', required: true },
          { label: 'Kirim welcome WA', required: true, action: { kind: 'send', messageTemplate: 'Halo {{nama}}, terima kasih sudah mendaftar. Kami akan follow-up segera.', delayMinutes: 0 } }
        ]
      },
      {
        name: 'Confirmed',
        color: 'amber',
        autoMoveOnComplete: true,
        checklists: [
          { label: 'Konfirmasi pembayaran / slot', required: true },
          { label: 'Kirim detail webinar', required: true, action: { kind: 'send', messageTemplate: 'Halo {{nama}}, pendaftaran Anda sudah dikonfirmasi. Simpan tanggal webinar ya.', delayMinutes: 0 } }
        ]
      },
      {
        name: 'H-1 Reminder',
        color: 'rose',
        onReplyNotify: true,
        overdueReminderHours: 24,
        checklists: [
          { label: 'Kirim reminder H-1 pagi', required: true, deadlineHours: 24, action: { kind: 'send', messageTemplate: 'Halo {{nama}}, besok webinar dimulai. Jangan lupa hadir ya!', delayMinutes: 0 } },
          { label: 'Kirim link Zoom', required: true, deadlineHours: 24, action: { kind: 'send', messageTemplate: 'Link Zoom: {{link}} — sampai jumpa besok, {{nama}}!', delayMinutes: 5 } },
          { label: 'Follow-up sore jika belum bales', required: false, deadlineHours: 12, action: { kind: 'followup', messageTemplate: 'Halo {{nama}}, apakah sudah siap untuk webinar besok?', delayMinutes: 480, followupIfNoReply: true } }
        ]
      },
      {
        name: 'Attended',
        color: 'emerald',
        autoMoveOnComplete: true,
        checklists: [{ label: 'Tandai kehadiran', required: true }]
      },
      {
        name: 'Follow-up',
        color: 'violet',
        checklists: [
          { label: 'Kirim materi recording', required: false, action: { kind: 'send', messageTemplate: 'Terima kasih hadir, {{nama}}! Ini materi webinar: {{link}}', delayMinutes: 0 } },
          { label: 'Follow-up minat produk', required: true, deadlineHours: 48, action: { kind: 'followup', messageTemplate: 'Halo {{nama}}, apakah tertarik lanjut ke program berikutnya?', delayMinutes: 1440, followupIfNoReply: true } }
        ]
      },
      {
        name: 'Converted',
        color: 'cyan',
        checklists: [{ label: 'Update status closing', required: true }]
      }
    ]
  };
};

const genericOnboardingDraft = (prompt: string): WorkflowDraft => {
  const trimmed = prompt.trim();
  const name = trimmed.length > 48 ? `${trimmed.slice(0, 45)}…` : trimmed || 'Onboarding Pelanggan';

  return {
    name,
    urgency: 'medium',
    deadlineValue: null,
    deadlineUnit: 'days',
    repeatRule: 'none',
    closureBy: 'initiator',
    stages: [
      {
        name: 'Pending',
        color: 'indigo',
        autoMoveOnComplete: true,
        checklists: [
          { label: 'Validasi data pelanggan', required: true },
          { label: 'Kirim pesan sambutan', required: true, action: { kind: 'send', messageTemplate: 'Halo {{nama}}, selamat datang! Tim kami siap membantu proses onboarding Anda.', delayMinutes: 0 } }
        ]
      },
      {
        name: 'In Progress',
        color: 'amber',
        onReplyNotify: true,
        overdueReminderHours: 48,
        checklists: [{ label: 'Follow-up progress', required: true, deadlineHours: 48 }]
      },
      {
        name: 'Done',
        color: 'emerald',
        autoMoveOnComplete: true,
        checklists: [{ label: 'Konfirmasi selesai', required: true }]
      }
    ]
  };
};

const parseDraftJson = (raw: string): WorkflowDraft | null => {
  try {
    const parsed = JSON.parse(raw) as WorkflowDraft;
    if (!parsed?.name || !Array.isArray(parsed.stages) || parsed.stages.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
};

const generateWithRouter = async (prompt: string, userPhone?: string | null): Promise<WorkflowDraft | null> => {
  const apiKey = process.env.BASOFI_AI_API_KEY;
  const baseURL = process.env.BASOFI_AI_ENDPOINT;
  if (!apiKey || !baseURL) return null;

  const model = process.env.AI_MODEL ?? 'gemini-3-flash-preview';
  const phoneContext = userPhone ? `\nThe user's WhatsApp phone number is ${userPhone}. Use {{phone}} in templates where the customer should contact them back.` : '';

  const system = `You generate workflow drafts for actjom (Kanban task management).
Return ONLY valid JSON with shape:
{
  "name": string,
  "urgency": "high"|"medium"|"low" (default: "medium" — set "high" for time-critical tasks like payments, "low" for non-urgent follow-ups),
  "deadlineValue": number|null (default: null — deadline duration for the whole workflow, e.g. 5 means 5 days/hours to complete),
  "deadlineUnit": "hours"|"days" (default: "days"),
  "reminderBeforeValue": number|null (default: null — send reminder N hours/days before deadline, e.g. 24 means remind 24 hours before),
  "reminderBeforeUnit": "hours"|"days" (default: "hours"),
  "repeatRule": "none"|"daily"|"weekly"|"monthly" (default: "none" — set to "monthly" for recurring tasks like salary processing, "weekly" for weekly reports),
  "closureBy": "initiator"|"assignee" (default: "initiator" — who can mark the task complete: "initiator" means the workflow owner/PIC must verify, "assignee" means the person doing the work can self-close),
  "stages": [
    {
      "name": string,
      "color": "indigo"|"amber"|"rose"|"emerald"|"violet"|"cyan",
      "onReplyNotify": boolean (optional — notify assignee when customer replies),
      "overdueReminderHours": number|null (optional — reminder after N hours with no progress),
      "autoMoveOnComplete": boolean (optional — auto-advance card to next stage when all required checklists are done),
      "checklists": [
        {
          "label": string,
          "required": boolean,
          "deadlineHours": number|null (optional — deadline for this checklist item in hours),
          "action": {
            "kind": "none"|"send"|"followup",
            "messageTemplate": string|null,
            "delayMinutes": number,
            "followupIfNoReply": boolean
          } (optional)
        }
      ]
    }
  ]
}
Use Indonesian labels. WA templates must use {{nama}}, {{wa}}, {{product}}, {{tag}}, {{link}}.${phoneContext}
Set autoMoveOnComplete=true for stages where the customer should advance automatically once all required checklists are done (e.g. after payment confirmation, after attendance marking).
Set deadlineHours on time-sensitive checklist items (e.g. "Kirim reminder H-1" → deadlineHours: 24).
Include WA actions where the user mentions reminders or follow-up.
Set urgency="high" for payment/finance tasks, "medium" for standard onboarding, "low" for informational follow-ups.
Set repeatRule based on user's description: "gaji bulanan" or "monthly" → "monthly", "laporan mingguan" → "weekly", "harian" → "daily".
Set closureBy="initiator" when the task needs verification (e.g. payments need approval), "assignee" for self-managed tasks.
Set deadlineValue when the user mentions a time frame (e.g. "selesai dalam 5 hari" → deadlineValue: 5, deadlineUnit: "days").
Set reminderBeforeValue when the user wants advance notification (e.g. "ingatkan H-1" → reminderBeforeValue: 24, reminderBeforeUnit: "hours").`;

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      stream: false,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!res.ok) return null;

  const payload = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return null;

  return parseDraftJson(content);
};

export const generateWorkflowDraft = async (prompt: string, userPhone?: string | null): Promise<WorkflowDraft> => {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return genericOnboardingDraft('Onboarding Pelanggan');
  }

  const fromAi = await generateWithRouter(trimmed, userPhone);
  if (fromAi) return fromAi;

  const lower = trimmed.toLowerCase();
  if (lower.includes('webinar') || lower.includes('daftar') || lower.includes('reminder')) {
    return webinarDraft(trimmed);
  }

  return genericOnboardingDraft(trimmed);
};

export const normalizeWorkflowDraft = (draft: WorkflowDraft): WorkflowDraft => ({
  name: draft.name.trim() || 'Workflow Baru',
  stages: draft.stages.map((stage, index) => ({
    name: stage.name.trim() || `Stage ${index + 1}`,
    color: stage.color ?? STAGE_COLORS[index % STAGE_COLORS.length],
    onReplyNotify: stage.onReplyNotify ?? false,
    overdueReminderHours: stage.overdueReminderHours ?? null,
    autoMoveOnComplete: stage.autoMoveOnComplete ?? false,
    checklists: (stage.checklists ?? []).map((item) => ({
      label: item.label.trim(),
      required: item.required ?? true,
      deadlineHours: item.deadlineHours ?? null,
      action: item.action?.kind && item.action.kind !== 'none'
        ? {
            kind: item.action.kind,
            messageTemplate: item.action.messageTemplate ?? null,
            delayMinutes: item.action.delayMinutes ?? 0,
            followupIfNoReply: item.action.followupIfNoReply ?? item.action.kind === 'followup'
          }
        : { kind: 'none' as const }
    })).filter((item) => item.label.length > 0)
  })).filter((stage) => stage.name.length > 0),
  urgency: draft.urgency ?? 'medium',
  deadlineValue: draft.deadlineValue ?? null,
  deadlineUnit: draft.deadlineUnit ?? 'days',
  reminderBeforeValue: draft.reminderBeforeValue ?? null,
  reminderBeforeUnit: draft.reminderBeforeUnit ?? 'hours',
  repeatRule: draft.repeatRule ?? 'none',
  closureBy: draft.closureBy ?? 'initiator'
});
