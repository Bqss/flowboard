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
  pricing: {
    title: string;
    body: string;
    eyebrow: string;
    note: string;
    perWorkspace: string;
    tiers: {
      name: string;
      price: string;
      period: string;
      description: string;
      cta: string;
      href: string;
      featured: boolean;
      features: string[];
    }[];
  };
  faq: {
    title: string;
    body: string;
    eyebrow: string;
    items: { question: string; answer: string }[];
    contactTitle: string;
    contactBody: string;
    contactCta: string;
    contactHref: string;
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
      title: 'Flowboard - Make the next handover obvious',
      description:
        'Flowboard gives customer-onboarding teams a visible path from intake to completion, with the next handover clear for everyone.'
    },
    language: {
      label: 'Language',
      options: { en: 'English', ms: 'Malay (Malaysia)' }
    },
    nav: {
      links: [
        { href: '#features', label: 'Features' },
        { href: '#how-it-works', label: 'How it works' },
        { href: '#use-cases', label: 'Example journey' },
        { href: '#pricing', label: 'Pricing' },
        { href: '#faq', label: 'FAQ' }
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
      title: 'Make every handover obvious.',
      body: 'Turn each customer journey into a visible route, with required work, replies, and owners attached.',
      openWorkspace: 'Open workspace',
      startFree: 'Start free',
      seeHow: 'See how it moves',
      workflow: 'Workflow',
      checklist: 'Checklist',
      handover: 'Handover',
      recordLabel: 'Demo record / 04-07',
      recordTitle: 'Customer handover record',
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
      title: 'One journey. One operational truth.',
      body: 'Context, required work, and attention stay together, so nobody has to reconstruct progress from private notes or chat.',
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
      title: 'Design the route. Let signals lead.',
      body: 'Owners define the system once. Staff see exactly what needs to move next, without adding another handoff tool.',
      steps: [
        {
          number: '01',
          title: 'Shape the journey',
          body: 'Build manually or start from an AI-assisted draft, then edit every stage.'
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
      title: 'See the whole journey move.',
      body: 'One operational spine connects every stage, required action, message, and owner from intake to completion.',
      tags: {
        workflow: 'Webinar registration',
        stageCount: '6 stages',
        activeCards: '12 active cards'
      },
      ariaLabel: 'Flowboard workflow spine for webinar registration',
      activeWorkflow: 'Active workflow',
      workflowName: 'Webinar registration',
      live: 'Illustrative',
      stages: [
        { label: 'Pending', detail: 'Verify customer data', count: '12' },
        { label: 'Confirmed', detail: 'Ready for the next step', count: '8' },
        { label: 'H-1 reminder', detail: 'WhatsApp scheduled', count: '20' },
        { label: 'Follow-up', detail: 'Waiting for a reply', count: '8' },
        { label: 'Converted', detail: 'Journey complete', count: '47' }
      ]
    },
    pricing: {
      title: 'Start free. Scale by workspace.',
      body: 'Flowboard is billed per workspace, not per login. Try the full system with your team, then keep operating without per-seat surprises.',
      eyebrow: 'Flowboard / pricing',
      note: 'Final quotas and pricing are being finalized. Start free today and we will migrate your workspace when paid plans launch.',
      perWorkspace: 'Billed per workspace',
      tiers: [
        {
          name: 'Trial',
          price: 'Free',
          period: 'for the trial period',
          description: 'Full access to workflows, checklists, reminders, and handovers with your team.',
          cta: 'Start free',
          href: '/register',
          featured: false,
          features: [
            'Unlimited workflows during trial',
            'Required checklists and gates',
            'WhatsApp actions and reminders',
            'Staff handovers',
            'Up to 5 team members'
          ]
        },
        {
          name: 'Workspace',
          price: 'Contact us',
          period: 'billed per workspace',
          description: 'Continue operating with higher quotas, billing portal access, and voucher redemption.',
          cta: 'Talk to us',
          href: '/register',
          featured: true,
          features: [
            'Higher seat, workflow, and WhatsApp quotas',
            'Billing portal: change plan, cancel, invoices',
            'Voucher redemption at checkout',
            'Priority handover support',
            'No per-seat billing'
          ]
        }
      ]
    },
    faq: {
      title: 'Questions, answered.',
      body: 'The specifics of how Flowboard fits a customer-onboarding operation, not a generic project board.',
      eyebrow: 'Flowboard / FAQ',
      items: [
        {
          question: 'Is Flowboard a project management tool?',
          answer: 'No. Flowboard is a customer-onboarding operations tracker. It is built around the journey a customer takes from intake to completion, with required work, replies, and handovers attached to that journey — not around generic tasks or cross-project boards.'
        },
        {
          question: 'Do customers log into Flowboard?',
          answer: 'No. Customers never log into the board. Staff work the customer journey on their behalf. Customers interact through WhatsApp actions and replies; those signals come back to the card where the team already works.'
        },
        {
          question: 'How do WhatsApp actions work?',
          answer: 'WhatsApp actions are customer-facing: scheduled reminders, confirmations, and follow-up messages tied to a stage. Replies return to the customer card as a signal, so a reply can become a visible handover instead of disappearing in a chat thread.'
        },
        {
          question: 'What is a handover in Flowboard?',
          answer: 'A handover is a lightweight, visible pass of context from one staff member to another. It carries the customer, the stage, the message context, and the next action — so the receiving staff member does not have to reconstruct the situation from private notes.'
        },
        {
          question: 'Can I customize workflows for different customer types?',
          answer: 'Yes. Each workflow has its own stages, required checklists, assignees, and automations. You can build a workflow manually or start from an AI-assisted draft, then edit every stage.'
        },
        {
          question: 'How is billing handled?',
          answer: 'Billing is per workspace, not per login. A trial gives full access to the system with your team. When paid plans launch, quotas for seats, workflows, and WhatsApp sends apply per workspace — never per individual user.'
        },
        {
          question: 'Is there a free trial?',
          answer: 'Yes. Start free with full access to workflows, checklists, reminders, and handovers. No credit card required to begin.'
        }
      ],
      contactTitle: 'Still have a question?',
      contactBody: 'We answer questions about how Flowboard fits a specific onboarding operation — not generic sales pitches.',
      contactCta: 'Start free and ask us',
      contactHref: '/register'
    },
    cta: {
      title: 'Give every customer a clear route.',
      body: 'Start with one workflow. Keep the journey visible. Let your team focus on customers instead of reconstructing status.',
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
            { label: 'Example journey', href: '#use-cases' },
            { label: 'Pricing', href: '#pricing' },
            { label: 'FAQ', href: '#faq' }
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
      title: 'Flowboard - Jadikan serahan seterusnya jelas',
      description:
        'Flowboard memberikan pasukan penerimaan pelanggan laluan yang jelas daripada penerimaan hingga selesai, dengan serahan seterusnya yang mudah difahami semua orang.'
    },
    language: {
      label: 'Bahasa',
      options: { en: 'English', ms: 'Bahasa Melayu' }
    },
    nav: {
      links: [
        { href: '#features', label: 'Ciri' },
        { href: '#how-it-works', label: 'Cara ia berfungsi' },
        { href: '#use-cases', label: 'Perjalanan contoh' },
        { href: '#pricing', label: 'Harga' },
        { href: '#faq', label: 'FAQ' }
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
      title: 'Jadikan setiap serahan jelas.',
      body: 'Tukarkan setiap perjalanan pelanggan menjadi laluan jelas dengan kerja wajib, balasan dan pemilik yang sentiasa terikat.',
      openWorkspace: 'Buka ruang kerja',
      startFree: 'Mula percuma',
      seeHow: 'Lihat cara ia bergerak',
      workflow: 'Aliran kerja',
      checklist: 'Senarai semak',
      handover: 'Serahan',
      recordLabel: 'Rekod demo / 04-07',
      recordTitle: 'Rekod serahan pelanggan',
      illustrative: 'Rekod contoh',
      customerLabel: 'Pelanggan',
      customer: 'Siti Aminah',
      customerContext: 'Pendaftaran webinar · pemilik: Diana',
      nextAction: 'Tindakan seterusnya',
      reviewReply: 'Semak balasan pelanggan',
      handoverCreated: 'Serahan staf dibuat',
      resetTrace: 'Set semula jejak',
      traceHandover: 'Jejak serahan',
      traceMessage: 'Balasan diterima pada 09:42. Diana mempunyai konteks dan langkah seterusnya.',
      replyMessage: 'Balasan boleh menjadi serahan yang jelas, bukan hilang dalam perbualan.',
      ariaLabel: 'Rekod serahan pelanggan Flowboard sebagai ilustrasi',
      stages: [
        { label: 'Penerimaan', detail: 'Pelanggan ditambah' },
        { label: 'Sahkan', detail: 'Semakan diperlukan' },
        { label: 'Susulan', detail: 'Balasan diterima' },
        { label: 'Selesai', detail: 'Perjalanan ditutup' }
      ]
    },
    features: {
      title: 'Satu perjalanan. Satu kebenaran operasi.',
      body: 'Konteks, kerja wajib dan perhatian kekal bersama supaya tiada siapa perlu membina semula kemajuan daripada nota atau perbualan.',
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
      title: 'Reka laluan. Biarkan isyarat memimpin.',
      body: 'Pemilik menentukan sistem sekali. Staf melihat apa yang perlu bergerak seterusnya tanpa menambah satu lagi alat serahan.',
      steps: [
        {
          number: '01',
          title: 'Bentuk perjalanan',
          body: 'Bina secara manual atau mulakan dengan draf berbantu AI, kemudian sunting setiap peringkat.'
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
      title: 'Lihat seluruh perjalanan bergerak.',
      body: 'Satu laluan operasi menghubungkan setiap peringkat, tindakan wajib, mesej dan pemilik daripada penerimaan hingga selesai.',
      tags: {
        workflow: 'Pendaftaran webinar',
        stageCount: '6 peringkat',
        activeCards: '12 kad aktif'
      },
      ariaLabel: 'Tulang belakang aliran kerja Flowboard untuk pendaftaran webinar',
      activeWorkflow: 'Aliran kerja aktif',
      workflowName: 'Pendaftaran webinar',
      live: 'Rekod contoh',
      stages: [
        { label: 'Menunggu', detail: 'Sahkan data pelanggan', count: '12' },
        { label: 'Disahkan', detail: 'Sedia untuk langkah seterusnya', count: '8' },
        { label: 'Peringatan H-1', detail: 'WhatsApp dijadualkan', count: '20' },
        { label: 'Susulan', detail: 'Menunggu balasan', count: '8' },
        { label: 'Berjaya', detail: 'Perjalanan selesai', count: '47' }
      ]
    },
    pricing: {
      title: 'Mula percuma. Skala mengikut ruang kerja.',
      body: 'Flowboard ditambah bil mengikut ruang kerja, bukan setiap log masuk. Cuba sistem penuh dengan pasukan anda, kemudian teruskan beroperasi tanpa kos setiap kerusi.',
      eyebrow: 'Flowboard / harga',
      note: 'Kuota dan harga akhir sedang dimuktamadkan. Mula percuma hari ini dan kami akan memindahkan ruang kerja anda apabila pelan berbayar dilancarkan.',
      perWorkspace: 'Dibil mengikut ruang kerja',
      tiers: [
        {
          name: 'Percubaan',
          price: 'Percuma',
          period: 'untuk tempoh percubaan',
          description: 'Akses penuh kepada aliran kerja, senarai semak, peringatan dan serahan dengan pasukan anda.',
          cta: 'Mula percuma',
          href: '/register',
          featured: false,
          features: [
            'Aliran kerja tanpa had semasa percubaan',
            'Senarai semak wajib dan pintu',
            'Tindakan dan peringatan WhatsApp',
            'Serahan staf',
            'Sehingga 5 ahli pasukan'
          ]
        },
        {
          name: 'Ruang kerja',
          price: 'Hubungi kami',
          period: 'dibil mengikut ruang kerja',
          description: 'Teruskan beroperasi dengan kuota lebih tinggi, akses portal bil, dan penebusan baucar.',
          cta: 'Bercakap dengan kami',
          href: '/register',
          featured: true,
          features: [
            'Kuota kerusi, aliran kerja dan WhatsApp lebih tinggi',
            'Portal bil: tukar pelan, batal, invois',
            'Penebusan baucar semasa bayar',
            'Sokongan serahan keutamaan',
            'Tiada bil setiap kerusi'
          ]
        }
      ]
    },
    faq: {
      title: 'Soalan, dijawab.',
      body: 'Butiran bagaimana Flowboard sesuai dengan operasi penerimaan pelanggan, bukan papan projek generik.',
      eyebrow: 'Flowboard / FAQ',
      items: [
        {
          question: 'Adakah Flowboard alat pengurusan projek?',
          answer: 'Tidak. Flowboard ialah penjejak operasi penerimaan pelanggan. Ia dibina berdasarkan perjalanan pelanggan dari penerimaan hingga selesai, dengan kerja wajib, balasan dan serahan terikat pada perjalanan itu — bukan tugas generik atau papan lintas projek.'
        },
        {
          question: 'Adakah pelanggan log masuk ke Flowboard?',
          answer: 'Tidak. Pelanggan tidak pernah log masuk ke papan. Staf menguruskan perjalanan pelanggan bagi pihak mereka. Pelanggan berinteraksi melalui tindakan dan balasan WhatsApp; isyarat itu kembali ke kad di mana pasukan sudah bekerja.'
        },
        {
          question: 'Bagaimana tindakan WhatsApp berfungsi?',
          answer: 'Tindakan WhatsApp berhadapan pelanggan: peringatan dijadualkan, pengesahan dan mesej susulan terikat pada peringkat. Balasan kembali ke kad pelanggan sebagai isyarat, jadi balasan boleh menjadi serahan yang jelas, bukan hilang dalam perbualan.'
        },
        {
          question: 'Apakah serahan dalam Flowboard?',
          answer: 'Serahan ialah penghantaran konteks yang ringan dan jelas dari seorang staf ke staf lain. Ia membawa pelanggan, peringkat, konteks mesej dan tindakan seterusnya — jadi staf penerima tidak perlu membina semula situasi daripada nota peribadi.'
        },
        {
          question: 'Bolehkah saya sesuaikan aliran kerja untuk jenis pelanggan berbeza?',
          answer: 'Ya. Setiap aliran kerja mempunyai peringkat, senarai semak wajib, penerima tugas dan automasi tersendiri. Anda boleh membina aliran kerja secara manual atau mulakan dengan draf berbantu AI, kemudian sunting setiap peringkat.'
        },
        {
          question: 'Bagaimana bil dikendalikan?',
          answer: 'Bil mengikut ruang kerja, bukan setiap log masuk. Percubaan memberikan akses penuh kepada sistem dengan pasukan anda. Apabila pelan berbayar dilancarkan, kuota kerusi, aliran kerja dan kiriman WhatsApp mengikut ruang kerja — bukan setiap pengguna individu.'
        },
        {
          question: 'Adakah terdapat percubaan percuma?',
          answer: 'Ya. Mula percuma dengan akses penuh kepada aliran kerja, senarai semak, peringatan dan serahan. Tiada kad kredit diperlukan untuk bermula.'
        }
      ],
      contactTitle: 'Masih ada soalan?',
      contactBody: 'Kami menjawab soalan tentang bagaimana Flowboard sesuai dengan operasi penerimaan tertentu — bukan jualan generik.',
      contactCta: 'Mula percuma dan tanya kami',
      contactHref: '/register'
    },
    cta: {
      title: 'Beri setiap pelanggan laluan yang jelas.',
      body: 'Mulakan dengan satu aliran kerja. Pastikan perjalanan kelihatan. Biar pasukan fokus pada pelanggan, bukan membina semula status.',
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
            { label: 'Contoh perjalanan', href: '#use-cases' },
            { label: 'Harga', href: '#pricing' },
            { label: 'FAQ', href: '#faq' }
          ]
        },
        {
          title: 'Untuk pasukan',
          links: [
            { label: 'Webinar', href: '#use-cases' },
            { label: 'Onboarding pelanggan', href: '#use-cases' },
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
