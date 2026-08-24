import type { Locale } from './index.js';

export type LandingCopy = {
  meta: {
    title: string;
    description: string;
  };
  language: {
    label: string;
    options: Record<Locale, string>;
  };
  nav: {
    links: { href: string; label: string }[];
    openMenu: string;
    closeMenu: string;
    openWorkspace: string;
    signOut: string;
    signIn: string;
    startFree: string;
    workspace: string;
    start: string;
  };
  hero: {
    title: string;
    body: string;
    openWorkspace: string;
    startFree: string;
    seeHow: string;
    workflow: string;
    checklist: string;
    handover: string;
    recordLabel: string;
    recordTitle: string;
    illustrative: string;
    customerLabel: string;
    customer: string;
    customerContext: string;
    nextAction: string;
    reviewReply: string;
    handoverCreated: string;
    resetTrace: string;
    traceHandover: string;
    traceMessage: string;
    replyMessage: string;
    ariaLabel: string;
    stages: { label: string; detail: string }[];
  };
  features: {
    title: string;
    body: string;
    link: string;
    eyebrow: string;
    panelTitle: string;
    signalsCount: string;
    signals: { label: string; title: string; body: string; meta: string }[];
  };
  howItWorks: {
    title: string;
    body: string;
    steps: { number: string; title: string; body: string }[];
    ownerMode: string;
    ownerTitle: string;
    ownerBody: string;
    staffMode: string;
    staffTitle: string;
    staffBody: string;
  };
  useCases: {
    title: string;
    body: string;
    tags: { workflow: string; stageCount: string; activeCards: string };
    ariaLabel: string;
    activeWorkflow: string;
    workflowName: string;
    live: string;
    stages: { label: string; detail: string; count: string }[];
  };
  cta: {
    title: string;
    body: string;
    openWorkspace: string;
    startFree: string;
    signIn: string;
  };
  footer: {
    description: string;
    columns: { title: string; links: { label: string; href: string }[] }[];
    workflow: string;
  };
};

export const landingCopy: Record<Locale, LandingCopy> = {
  en: {
    meta: {
      title: 'Flowboard — Make the next handover obvious',
      description:
        'Flowboard gives customer-onboarding teams a visible path from intake to completion, with the next handover clear for everyone.'
    },
    language: {
      label: 'Language',
      options: { en: 'English', ms: 'Malay (Malaysia)' }
    },
    nav: {
      links: [
        { href: '#features', label: 'System' },
        { href: '#how-it-works', label: 'How it moves' },
        { href: '#use-cases', label: 'The ledger' }
      ],
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      openWorkspace: 'Open workspace',
      signOut: 'Sign out',
      signIn: 'Sign in',
      startFree: 'Start free',
      workspace: 'Workspace',
      start: 'Start'
    },
    hero: {
      title: 'Make the next handover obvious.',
      body: 'Keep every customer journey moving from intake to completion. Flowboard gives owners the system and staff the next action.',
      openWorkspace: 'Open workspace',
      startFree: 'Start free',
      seeHow: 'See how it moves',
      workflow: 'Workflow',
      checklist: 'Checklist',
      handover: 'Handover',
      recordLabel: 'Demo record / 04—07',
      recordTitle: 'Customer handover ledger',
      illustrative: 'Illustrative',
      customerLabel: 'Customer',
      customer: 'Siti Aminah',
      customerContext: 'Webinar registration · owner: Diana',
      nextAction: 'Next action',
      reviewReply: 'Review customer reply',
      handoverCreated: 'Staff handover created',
      resetTrace: 'Reset trace',
      traceHandover: 'Trace handover',
      traceMessage: 'Reply received at 09:42. Diana has the context and the next step.',
      replyMessage: 'A reply can become a visible handover instead of disappearing in a chat thread.',
      ariaLabel: 'Illustrative Flowboard customer handover record',
      stages: [
        { label: 'Intake', detail: 'Customer added' },
        { label: 'Confirm', detail: 'Required checks' },
        { label: 'Follow-up', detail: 'Reply received' },
        { label: 'Complete', detail: 'Journey closed' }
      ]
    },
    features: {
      title: 'The work is visible before it becomes urgent.',
      body: 'Flowboard turns customer operations into a shared view of context, progress, and attention. No status lives in one person’s private notes.',
      link: 'See the operating rhythm',
      eyebrow: 'Flowboard / customer operations',
      panelTitle: 'Signals your team can act on',
      signalsCount: '3 signals',
      signals: [
        {
          label: 'Context',
          title: 'One card, one journey.',
          body: 'Customer, workflow, assignee, and next step stay together.',
          meta: 'CUSTOMER'
        },
        {
          label: 'Execution',
          title: 'Required work stays in view.',
          body: 'Checklists make progress legible before a handoff.',
          meta: 'CHECKLIST'
        },
        {
          label: 'Attention',
          title: 'The system surfaces what is stuck.',
          body: 'Waiting Action, reminders, and replies point to the next move.',
          meta: 'SIGNAL'
        }
      ]
    },
    howItWorks: {
      title: 'Set up once. Keep the team moving.',
      body: 'The owner defines the operating rhythm. The team gets a clear next action. Flowboard connects both sides without adding another handoff tool.',
      steps: [
        {
          number: '01',
          title: 'Shape the journey',
          body: 'Start manually or let the AI wizard draft the first version of your workflow.'
        },
        {
          number: '02',
          title: 'Make the work explicit',
          body: 'Stages, required checklists, and automations live beside the customer.'
        },
        {
          number: '03',
          title: 'Follow the signal',
          body: 'Staff work the next card while Flowboard calls out reminders, replies, and handovers.'
        }
      ],
      ownerMode: 'Owner mode',
      ownerTitle: 'Define the system.',
      ownerBody: 'Set stages, checklists, assignees, and the rules that keep work moving.',
      staffMode: 'Staff mode',
      staffTitle: 'Move the work.',
      staffBody: 'Open the next card, complete the required step, and act on the signal.'
    },
    useCases: {
      title: 'A workflow that reads like the work.',
      body: 'Replace the spreadsheet maze with one operational spine. Every stage answers the same question: what should happen next?',
      tags: {
        workflow: 'Webinar registration',
        stageCount: '6 stages',
        activeCards: '12 active cards'
      },
      ariaLabel: 'Flowboard workflow spine for webinar registration',
      activeWorkflow: 'Active workflow',
      workflowName: 'Webinar registration',
      live: 'Live',
      stages: [
        { label: 'Pending', detail: 'Verify customer data', count: '12' },
        { label: 'Confirmed', detail: 'Ready for the next step', count: '8' },
        { label: 'H-1 reminder', detail: 'WhatsApp scheduled', count: '20' },
        { label: 'Follow-up', detail: 'Waiting for a reply', count: '8' },
        { label: 'Converted', detail: 'Journey complete', count: '47' }
      ]
    },
    cta: {
      title: 'Put the next step where the team can see it.',
      body: 'Start with one workflow. Keep the journey visible. Let the team spend its energy on customers instead of reconstructing status.',
      openWorkspace: 'Open workspace',
      startFree: 'Start free',
      signIn: 'Sign in'
    },
    footer: {
      description: 'Customer operations, kept in view from first intake to final handover.',
      columns: [
        {
          title: 'Product',
          links: [
            { label: 'Features', href: '#features' },
            { label: 'How it works', href: '#how-it-works' },
            { label: 'Example journey', href: '#use-cases' }
          ]
        },
        {
          title: 'For teams',
          links: [
            { label: 'Webinars', href: '#use-cases' },
            { label: 'Customer onboarding', href: '#use-cases' },
            { label: 'Operational follow-up', href: '#features' }
          ]
        },
        {
          title: 'Workspace',
          links: [
            { label: 'Sign in', href: '/login' },
            { label: 'Start free', href: '/register' },
            { label: 'Open dashboard', href: '/dashboard' }
          ]
        }
      ],
      workflow: 'Workflow / Checklist / Handover'
    }
  },
  ms: {
    meta: {
      title: 'Flowboard — Jadikan serahan seterusnya jelas',
      description:
        'Flowboard memberikan pasukan penerimaan pelanggan laluan yang jelas daripada penerimaan hingga selesai, dengan serahan seterusnya yang mudah difahami semua orang.'
    },
    language: {
      label: 'Bahasa',
      options: { en: 'English', ms: 'Bahasa Melayu' }
    },
    nav: {
      links: [
        { href: '#features', label: 'Sistem' },
        { href: '#how-it-works', label: 'Cara ia bergerak' },
        { href: '#use-cases', label: 'Lejar' }
      ],
      openMenu: 'Buka menu',
      closeMenu: 'Tutup menu',
      openWorkspace: 'Buka ruang kerja',
      signOut: 'Log keluar',
      signIn: 'Log masuk',
      startFree: 'Mula percuma',
      workspace: 'Ruang kerja',
      start: 'Mula'
    },
    hero: {
      title: 'Jadikan serahan seterusnya jelas.',
      body: 'Pastikan setiap perjalanan pelanggan bergerak daripada penerimaan hingga selesai. Flowboard memberikan pemilik sistem dan staf tindakan seterusnya.',
      openWorkspace: 'Buka ruang kerja',
      startFree: 'Mula percuma',
      seeHow: 'Lihat cara ia bergerak',
      workflow: 'Aliran kerja',
      checklist: 'Senarai semak',
      handover: 'Serahan',
      recordLabel: 'Rekod demo / 04—07',
      recordTitle: 'Lejar serahan pelanggan',
      illustrative: 'Ilustrasi',
      customerLabel: 'Pelanggan',
      customer: 'Siti Aminah',
      customerContext: 'Pendaftaran webinar · pemilik: Diana',
      nextAction: 'Tindakan seterusnya',
      reviewReply: 'Semak balasan pelanggan',
      handoverCreated: 'Serahan staf dibuat',
      resetTrace: 'Set semula jejak',
      traceHandover: 'Jejak serahan',
      traceMessage: 'Balasan diterima pada 09:42. Diana mempunyai konteks dan langkah seterusnya.',
      replyMessage: 'Balasan boleh menjadi serahan yang jelas, bukan hilang dalam perbualan chat.',
      ariaLabel: 'Rekod serahan pelanggan Flowboard sebagai ilustrasi',
      stages: [
        { label: 'Penerimaan', detail: 'Pelanggan ditambah' },
        { label: 'Sahkan', detail: 'Semakan diperlukan' },
        { label: 'Susulan', detail: 'Balasan diterima' },
        { label: 'Selesai', detail: 'Perjalanan ditutup' }
      ]
    },
    features: {
      title: 'Kerja kelihatan sebelum menjadi mendesak.',
      body: 'Flowboard menukar operasi pelanggan menjadi paparan bersama tentang konteks, kemajuan dan perhatian. Tiada status tersembunyi dalam nota peribadi seseorang.',
      link: 'Lihat rentak operasi',
      eyebrow: 'Flowboard / operasi pelanggan',
      panelTitle: 'Isyarat yang boleh diambil tindakan oleh pasukan',
      signalsCount: '3 isyarat',
      signals: [
        {
          label: 'Konteks',
          title: 'Satu kad, satu perjalanan.',
          body: 'Pelanggan, aliran kerja, penerima tugas dan langkah seterusnya kekal bersama.',
          meta: 'PELANGGAN'
        },
        {
          label: 'Pelaksanaan',
          title: 'Kerja wajib kekal dalam paparan.',
          body: 'Senarai semak menjadikan kemajuan jelas sebelum serahan.',
          meta: 'SENARAI SEMAK'
        },
        {
          label: 'Perhatian',
          title: 'Sistem menyerlahkan perkara yang tersekat.',
          body: 'Tindakan Menunggu, peringatan dan balasan menunjukkan langkah seterusnya.',
          meta: 'ISYARAT'
        }
      ]
    },
    howItWorks: {
      title: 'Sediakan sekali. Pastikan pasukan terus bergerak.',
      body: 'Pemilik menentukan rentak operasi. Pasukan mendapat tindakan seterusnya yang jelas. Flowboard menghubungkan kedua-duanya tanpa menambah satu lagi alat serahan.',
      steps: [
        {
          number: '01',
          title: 'Bentuk perjalanan',
          body: 'Mulakan secara manual atau biarkan wizard AI menyediakan draf versi pertama aliran kerja.'
        },
        {
          number: '02',
          title: 'Jelaskan kerja',
          body: 'Peringkat, senarai semak wajib dan automasi berada di sisi pelanggan.'
        },
        {
          number: '03',
          title: 'Ikut isyarat',
          body: 'Staf mengurus kad seterusnya sementara Flowboard menonjolkan peringatan, balasan dan serahan.'
        }
      ],
      ownerMode: 'Mod pemilik',
      ownerTitle: 'Tentukan sistem.',
      ownerBody: 'Tetapkan peringkat, senarai semak, penerima tugas dan peraturan yang memastikan kerja terus bergerak.',
      staffMode: 'Mod staf',
      staffTitle: 'Gerakkan kerja.',
      staffBody: 'Buka kad seterusnya, lengkapkan langkah wajib dan bertindak berdasarkan isyarat.'
    },
    useCases: {
      title: 'Aliran kerja yang mencerminkan kerja.',
      body: 'Gantikan labirin hamparan dengan satu tulang belakang operasi. Setiap peringkat menjawab soalan yang sama: apakah yang perlu berlaku seterusnya?',
      tags: {
        workflow: 'Pendaftaran webinar',
        stageCount: '6 peringkat',
        activeCards: '12 kad aktif'
      },
      ariaLabel: 'Tulang belakang aliran kerja Flowboard untuk pendaftaran webinar',
      activeWorkflow: 'Aliran kerja aktif',
      workflowName: 'Pendaftaran webinar',
      live: 'Aktif',
      stages: [
        { label: 'Menunggu', detail: 'Sahkan data pelanggan', count: '12' },
        { label: 'Disahkan', detail: 'Sedia untuk langkah seterusnya', count: '8' },
        { label: 'Peringatan H-1', detail: 'WhatsApp dijadualkan', count: '20' },
        { label: 'Susulan', detail: 'Menunggu balasan', count: '8' },
        { label: 'Berjaya', detail: 'Perjalanan selesai', count: '47' }
      ]
    },
    cta: {
      title: 'Letakkan langkah seterusnya di tempat yang boleh dilihat pasukan.',
      body: 'Mulakan dengan satu aliran kerja. Pastikan perjalanan kelihatan. Biarkan pasukan menggunakan tenaganya untuk pelanggan, bukan membina semula status.',
      openWorkspace: 'Buka ruang kerja',
      startFree: 'Mula percuma',
      signIn: 'Log masuk'
    },
    footer: {
      description: 'Operasi pelanggan, sentiasa kelihatan dari penerimaan pertama hingga serahan akhir.',
      columns: [
        {
          title: 'Produk',
          links: [
            { label: 'Ciri', href: '#features' },
            { label: 'Cara ia berfungsi', href: '#how-it-works' },
            { label: 'Contoh perjalanan', href: '#use-cases' }
          ]
        },
        {
          title: 'Untuk pasukan',
          links: [
            { label: 'Webinar', href: '#use-cases' },
            { label: 'Penerimaan pelanggan', href: '#use-cases' },
            { label: 'Susulan operasi', href: '#features' }
          ]
        },
        {
          title: 'Ruang kerja',
          links: [
            { label: 'Log masuk', href: '/login' },
            { label: 'Mula percuma', href: '/register' },
            { label: 'Buka papan pemuka', href: '/dashboard' }
          ]
        }
      ],
      workflow: 'Aliran kerja / Senarai semak / Serahan'
    }
  }
};
