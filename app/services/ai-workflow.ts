export type WorkflowDraftAction = {
  kind: 'none' | 'send' | 'followup';
  messageTemplate?: string | null;
  delayMinutes?: number;
  followupIfNoReply?: boolean;
};

export type WorkflowDraftChecklist = {
  label: string;
  required?: boolean;
  action?: WorkflowDraftAction;
};

export type WorkflowDraftStage = {
  name: string;
  color?: string;
  onReplyNotify?: boolean;
  overdueReminderHours?: number | null;
  checklists: WorkflowDraftChecklist[];
};

export type WorkflowDraft = {
  name: string;
  stages: WorkflowDraftStage[];
};

const STAGE_COLORS = ['indigo', 'amber', 'rose', 'emerald', 'violet', 'cyan'] as const;

const webinarDraft = (prompt: string): WorkflowDraft => {
  const nameMatch = prompt.match(/webinar\s+([^.,\n]+)/i);
  const name = nameMatch?.[1]?.trim()
    ? `Pendaftaran ${nameMatch[1].trim()}`
    : 'Pendaftaran Webinar';

  return {
    name,
    stages: [
      {
        name: 'Pending Users',
        color: 'indigo',
        checklists: [
          { label: 'Verifikasi data pendaftar', required: true },
          { label: 'Kirim welcome WA', required: true, action: { kind: 'send', messageTemplate: 'Halo {{nama}}, terima kasih sudah mendaftar. Kami akan follow-up segera.', delayMinutes: 0 } }
        ]
      },
      {
        name: 'Confirmed',
        color: 'amber',
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
          { label: 'Kirim reminder H-1 pagi', required: true, action: { kind: 'send', messageTemplate: 'Halo {{nama}}, besok webinar dimulai. Jangan lupa hadir ya!', delayMinutes: 0 } },
          { label: 'Kirim link Zoom', required: true, action: { kind: 'send', messageTemplate: 'Link Zoom: {{link}} — sampai jumpa besok, {{nama}}!', delayMinutes: 5 } },
          { label: 'Follow-up sore jika belum bales', required: false, action: { kind: 'followup', messageTemplate: 'Halo {{nama}}, apakah sudah siap untuk webinar besok?', delayMinutes: 480, followupIfNoReply: true } }
        ]
      },
      {
        name: 'Attended',
        color: 'emerald',
        checklists: [{ label: 'Tandai kehadiran', required: true }]
      },
      {
        name: 'Follow-up',
        color: 'violet',
        checklists: [
          { label: 'Kirim materi recording', required: false, action: { kind: 'send', messageTemplate: 'Terima kasih hadir, {{nama}}! Ini materi webinar: {{link}}', delayMinutes: 0 } },
          { label: 'Follow-up minat produk', required: true, action: { kind: 'followup', messageTemplate: 'Halo {{nama}}, apakah tertarik lanjut ke program berikutnya?', delayMinutes: 1440, followupIfNoReply: true } }
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
    stages: [
      {
        name: 'Pending',
        color: 'indigo',
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
        checklists: [{ label: 'Follow-up progress', required: true }]
      },
      {
        name: 'Done',
        color: 'emerald',
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

const generateWithOpenAi = async (prompt: string): Promise<WorkflowDraft | null> => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const system = `You generate onboarding workflow drafts for Flowboard (Kanban for customer onboarding).
Return ONLY valid JSON with shape:
{
  "name": string,
  "stages": [
    {
      "name": string,
      "color": "indigo"|"amber"|"rose"|"emerald"|"violet"|"cyan",
      "onReplyNotify": boolean (optional),
      "overdueReminderHours": number|null (optional),
      "checklists": [
        {
          "label": string,
          "required": boolean,
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
Use Indonesian labels. WA templates must use {{nama}}, {{wa}}, {{product}}, {{tag}}, {{link}}.
Include WA actions where the user mentions reminders or follow-up.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      temperature: 0.4,
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

export const generateWorkflowDraft = async (prompt: string): Promise<WorkflowDraft> => {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return genericOnboardingDraft('Onboarding Pelanggan');
  }

  const fromAi = await generateWithOpenAi(trimmed);
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
    checklists: (stage.checklists ?? []).map((item) => ({
      label: item.label.trim(),
      required: item.required ?? true,
      action: item.action?.kind && item.action.kind !== 'none'
        ? {
            kind: item.action.kind,
            messageTemplate: item.action.messageTemplate ?? null,
            delayMinutes: item.action.delayMinutes ?? 0,
            followupIfNoReply: item.action.followupIfNoReply ?? item.action.kind === 'followup'
          }
        : { kind: 'none' as const }
    })).filter((item) => item.label.length > 0)
  })).filter((stage) => stage.name.length > 0)
});
