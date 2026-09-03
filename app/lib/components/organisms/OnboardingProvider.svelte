<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { confetti } from '@neoconfetti/svelte';
  import { HugeiconsIcon } from '@hugeicons/svelte';
  import { page } from '$app/state';
  import { api, ApiError } from '$lib/api/client';
  import { dashboardText } from '$lib/i18n/dashboard.js';
  import { locale } from '$lib/i18n/index.js';
  import ChallengeWidget from './ChallengeWidget.svelte';
  import Spotlight from './Spotlight.svelte';
  import {
    WorkflowSquare01Icon,
    Layers01Icon,
    UserCheck01Icon,
    UserGroupIcon,
    WhatsappIcon,
    Add01Icon,
    Award01Icon
  } from '@hugeicons/core-free-icons';

  type OnboardingState = {
    completedChallenges: string[];
    seenTours: string[];
  };

  type TourStep = {
    target?: string;
    title: string;
    body: string;
    placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  };

  type Tour = {
    key: string;
    route: string;
    pattern?: RegExp;
    queryParam?: string;
    requireElement?: string | string[];
    requireAbsent?: string | string[];
    steps: TourStep[];
  };

  let { children }: { children: import('svelte').Snippet } = $props();

  const tr = (key: string, values?: Record<string, string | number>) =>
    dashboardText($locale, key, values);

  let obState = $state<OnboardingState>({
    completedChallenges: [],
    seenTours: []
  });
  let loading = $state(true);
  let activeTour = $state<Tour | null>(null);

  // Challenge definitions
  const challenges = $derived([
    { key: 'create_workflow', label: tr('onboarding.challengeCreateWorkflow'), desc: tr('onboarding.challengeCreateWorkflowDesc'), icon: WorkflowSquare01Icon, href: '/dashboard/workflows', ctaLabel: tr('onboarding.ctaCreateWorkflow'), completed: obState.completedChallenges.includes('create_workflow') },
    { key: 'add_stage', label: tr('onboarding.challengeAddStage'), desc: tr('onboarding.challengeAddStageDesc'), icon: Layers01Icon, href: '/dashboard/workflows', ctaLabel: tr('onboarding.ctaAddStage'), completed: obState.completedChallenges.includes('add_stage') },
    { key: 'add_checklist', label: tr('onboarding.challengeAddChecklist'), desc: tr('onboarding.challengeAddChecklistDesc'), icon: Add01Icon, href: '/dashboard/workflows', ctaLabel: tr('onboarding.ctaAddChecklist'), completed: obState.completedChallenges.includes('add_checklist') },
    { key: 'invite_member', label: tr('onboarding.challengeInviteMember'), desc: tr('onboarding.challengeInviteMemberDesc'), icon: UserGroupIcon, href: '/dashboard/members', ctaLabel: tr('onboarding.ctaInviteMember'), completed: obState.completedChallenges.includes('invite_member') },
    { key: 'connect_wa', label: tr('onboarding.challengeConnectWa'), desc: tr('onboarding.challengeConnectWaDesc'), icon: WhatsappIcon, href: '/dashboard/settings/integrations', ctaLabel: tr('onboarding.ctaConnectWa'), completed: obState.completedChallenges.includes('connect_wa') },
    { key: 'add_customer', label: tr('onboarding.challengeAddCustomer'), desc: tr('onboarding.challengeAddCustomerDesc'), icon: UserCheck01Icon, href: '/dashboard/workflows', ctaLabel: tr('onboarding.ctaAddCustomer'), completed: obState.completedChallenges.includes('add_customer') }
  ]);
  const allChallengesDone = $derived(
    obState.completedChallenges.length === challenges.length && challenges.length > 0
  );

  let showCelebration = $state(false);
  const CELEBRATION_KEY = 'flowboard-celebration-shown';

  $effect(() => {
    if (allChallengesDone && !localStorage.getItem(CELEBRATION_KEY)) {
      showCelebration = true;
      localStorage.setItem(CELEBRATION_KEY, '1');
    }
  });

  // Tour definitions per route
  const tours: Tour[] = [
    {
      key: 'dashboard',
      route: '/dashboard',
      steps: [
        { title: tr('onboarding.welcomeDashboard'), body: tr('onboarding.welcomeDashboardDesc') },
        { target: '[data-onboarding="stats-overview"]', title: tr('onboarding.tourDashStats'), body: tr('onboarding.tourDashStatsDesc'), placement: 'auto' },
        { target: '[data-onboarding="quick-create-workflow"]', title: tr('onboarding.tourDashCreate'), body: tr('onboarding.tourDashCreateDesc'), placement: 'auto' },
        { target: '[data-onboarding="workflows-section"]', title: tr('onboarding.tourDashWorkflows'), body: tr('onboarding.tourDashWorkflowsDesc'), placement: 'auto' },
        { target: '[data-onboarding="workspaces-section"]', title: tr('onboarding.tourDashWorkspaces'), body: tr('onboarding.tourDashWorkspacesDesc'), placement: 'auto' },
        { target: '[data-onboarding="team-section"]', title: tr('onboarding.tourDashTeam'), body: tr('onboarding.tourDashTeamDesc'), placement: 'auto' },
        { target: '[data-onboarding="shortcuts-section"]', title: tr('onboarding.tourDashShortcuts'), body: tr('onboarding.tourDashShortcutsDesc'), placement: 'auto' }
      ]
    },
    {
      key: 'workflows-empty',
      route: '/dashboard/workflows',
      requireAbsent: '[data-onboarding="workflows-grid"]',
      steps: [
        { title: tr('onboarding.welcomeWorkflows'), body: tr('onboarding.welcomeWorkflowsDesc') },
        { target: '[data-onboarding="create-workflow"]', title: tr('onboarding.tourWfCreate'), body: tr('onboarding.tourWfCreateDesc'), placement: 'auto' }
      ]
    },
    {
      key: 'workflows',
      route: '/dashboard/workflows',
      requireElement: '[data-onboarding="workflows-grid"]',
      steps: [
        { title: tr('onboarding.welcomeWorkflows'), body: tr('onboarding.welcomeWorkflowsDesc') },
        { target: '[data-onboarding="create-workflow"]', title: tr('onboarding.tourWfCreate'), body: tr('onboarding.tourWfCreateDesc'), placement: 'auto' },
        { target: '[data-onboarding="workflow-search"]', title: tr('onboarding.tourWfSearch'), body: tr('onboarding.tourWfSearchDesc'), placement: 'auto' },
        { target: '[data-onboarding="workflows-grid"]', title: tr('onboarding.tourWfGrid'), body: tr('onboarding.tourWfGridDesc'), placement: 'auto' },
        { target: '[data-onboarding="workflow-card"]', title: tr('onboarding.tourWfCard'), body: tr('onboarding.tourWfCardDesc'), placement: 'auto' },
        { target: '[data-onboarding="workflow-edit"]', title: tr('onboarding.tourWfEdit'), body: tr('onboarding.tourWfEditDesc'), placement: 'auto' },
        { target: '[data-onboarding="workflow-setup-btn"]', title: tr('onboarding.tourWfSetup'), body: tr('onboarding.tourWfSetupDesc'), placement: 'auto' },
        { target: '[data-onboarding="workflow-open-btn"]', title: tr('onboarding.tourWfOpenBoard'), body: tr('onboarding.tourWfOpenBoardDesc'), placement: 'auto' }
      ]
    },
    {
      key: 'board-stats',
      route: '/dashboard/workflows/[workflowId]',
      pattern: /^\/dashboard\/workflows\/[^/]+$/,
      steps: [
        { title: tr('onboarding.welcomeBoard'), body: tr('onboarding.welcomeBoardDesc') },
        { target: '[data-onboarding="workflow-tabs"]', title: tr('onboarding.tourBoardTabs'), body: tr('onboarding.tourBoardTabsDesc'), placement: 'auto' },
        { target: '[data-onboarding="add-customer-btn"]', title: tr('onboarding.tourBoardAddCustomer'), body: tr('onboarding.tourBoardAddCustomerDesc'), placement: 'auto' },
        { target: '[data-onboarding="import-csv-btn"]', title: tr('onboarding.tourBoardImport'), body: tr('onboarding.tourBoardImportDesc'), placement: 'auto' },
        { target: '[data-onboarding="stats-content"]', title: tr('onboarding.tourBoardStats'), body: tr('onboarding.tourBoardStatsDesc'), placement: 'auto' }
      ]
    },
    {
      key: 'board-kanban-empty',
      route: '/dashboard/workflows/[workflowId]',
      pattern: /^\/dashboard\/workflows\/[^/]+$/,
      queryParam: 'kanban',
      requireAbsent: '[data-onboarding="kanban-board"]',
      steps: [
        { title: tr('onboarding.welcomeBoard'), body: tr('onboarding.welcomeBoardDesc') },
        { target: '[data-onboarding="workflow-tabs"]', title: tr('onboarding.tourBoardTabs'), body: tr('onboarding.tourBoardTabsDesc'), placement: 'auto' },
        { target: '[data-onboarding="add-customer-btn"]', title: tr('onboarding.tourBoardAddCustomer'), body: tr('onboarding.tourBoardAddCustomerDesc'), placement: 'auto' },
        { target: '[data-onboarding="import-csv-btn"]', title: tr('onboarding.tourBoardImport'), body: tr('onboarding.tourBoardImportDesc'), placement: 'auto' }
      ]
    },
    {
      key: 'board-kanban',
      route: '/dashboard/workflows/[workflowId]',
      pattern: /^\/dashboard\/workflows\/[^/]+$/,
      queryParam: 'kanban',
      requireElement: '[data-onboarding="kanban-board"]',
      steps: [
        { title: tr('onboarding.welcomeBoard'), body: tr('onboarding.welcomeBoardDesc') },
        { target: '[data-onboarding="workflow-tabs"]', title: tr('onboarding.tourBoardTabs'), body: tr('onboarding.tourBoardTabsDesc'), placement: 'auto' },
        { target: '[data-onboarding="add-customer-btn"]', title: tr('onboarding.tourBoardAddCustomer'), body: tr('onboarding.tourBoardAddCustomerDesc'), placement: 'auto' },
        { target: '[data-onboarding="import-csv-btn"]', title: tr('onboarding.tourBoardImport'), body: tr('onboarding.tourBoardImportDesc'), placement: 'auto' },
        { target: '[data-onboarding="board-filter-bar"]', title: tr('onboarding.tourBoardFilter'), body: tr('onboarding.tourBoardFilterDesc'), placement: 'auto' },
        { target: '[data-onboarding="kanban-stage"]', title: tr('onboarding.tourBoardKanbanStage'), body: tr('onboarding.tourBoardKanbanStageDesc'), placement: 'auto' },
        { target: '[data-onboarding="kanban-add-card"]', title: tr('onboarding.tourBoardKanbanAddCard'), body: tr('onboarding.tourBoardKanbanAddCardDesc'), placement: 'auto' },
        { target: '[data-onboarding="kanban-board"]', title: tr('onboarding.tourBoardKanban'), body: tr('onboarding.tourBoardKanbanDesc'), placement: 'auto' }
      ]
    },
    {
      key: 'board-table-empty',
      route: '/dashboard/workflows/[workflowId]',
      pattern: /^\/dashboard\/workflows\/[^/]+$/,
      queryParam: 'table',
      requireAbsent: '[data-onboarding="table-view"]',
      steps: [
        { title: tr('onboarding.welcomeBoard'), body: tr('onboarding.welcomeBoardDesc') },
        { target: '[data-onboarding="workflow-tabs"]', title: tr('onboarding.tourBoardTabs'), body: tr('onboarding.tourBoardTabsDesc'), placement: 'auto' },
        { target: '[data-onboarding="add-customer-btn"]', title: tr('onboarding.tourBoardAddCustomer'), body: tr('onboarding.tourBoardAddCustomerDesc'), placement: 'auto' },
        { target: '[data-onboarding="import-csv-btn"]', title: tr('onboarding.tourBoardImport'), body: tr('onboarding.tourBoardImportDesc'), placement: 'auto' }
      ]
    },
    {
      key: 'board-table',
      route: '/dashboard/workflows/[workflowId]',
      pattern: /^\/dashboard\/workflows\/[^/]+$/,
      queryParam: 'table',
      requireElement: '[data-onboarding="table-view"]',
      steps: [
        { title: tr('onboarding.welcomeBoard'), body: tr('onboarding.welcomeBoardDesc') },
        { target: '[data-onboarding="workflow-tabs"]', title: tr('onboarding.tourBoardTabs'), body: tr('onboarding.tourBoardTabsDesc'), placement: 'auto' },
        { target: '[data-onboarding="add-customer-btn"]', title: tr('onboarding.tourBoardAddCustomer'), body: tr('onboarding.tourBoardAddCustomerDesc'), placement: 'auto' },
        { target: '[data-onboarding="import-csv-btn"]', title: tr('onboarding.tourBoardImport'), body: tr('onboarding.tourBoardImportDesc'), placement: 'auto' },
        { target: '[data-onboarding="board-filter-bar"]', title: tr('onboarding.tourBoardFilter'), body: tr('onboarding.tourBoardFilterDesc'), placement: 'auto' },
        { target: '[data-onboarding="table-view"]', title: tr('onboarding.tourBoardTable'), body: tr('onboarding.tourBoardTableDesc'), placement: 'auto' },
        { target: '[data-onboarding="table-row"]', title: tr('onboarding.tourBoardTableRow'), body: tr('onboarding.tourBoardTableRowDesc'), placement: 'auto' },
        { target: '[data-onboarding="table-detail-btn"]', title: tr('onboarding.tourBoardTableDetail'), body: tr('onboarding.tourBoardTableDetailDesc'), placement: 'auto' }
      ]
    },
    {
      key: 'setup-empty',
      route: '/dashboard/workflows/[workflowId]/setup',
      pattern: /^\/dashboard\/workflows\/[^/]+\/setup$/,
      requireAbsent: ['[data-onboarding="stage-lane"]', '[data-onboarding="workflow-settings-form"]'],
      steps: [
        { title: tr('onboarding.welcomeSetup'), body: tr('onboarding.welcomeSetupDesc') },
        { target: '[data-onboarding="setup-tab"]', title: tr('onboarding.tourSetupTab'), body: tr('onboarding.tourSetupTabDesc'), placement: 'auto' },
        { target: '[data-onboarding="add-stage-btn"]', title: tr('onboarding.tourSetupAddStage'), body: tr('onboarding.tourSetupAddStageDesc'), placement: 'auto' }
      ]
    },
    {
      key: 'setup',
      route: '/dashboard/workflows/[workflowId]/setup',
      pattern: /^\/dashboard\/workflows\/[^/]+\/setup$/,
      requireElement: '[data-onboarding="stage-lane"]',
      steps: [
        { title: tr('onboarding.welcomeSetup'), body: tr('onboarding.welcomeSetupDesc') },
        { target: '[data-onboarding="setup-tab"]', title: tr('onboarding.tourSetupTab'), body: tr('onboarding.tourSetupTabDesc'), placement: 'auto' },
        { target: '[data-onboarding="add-stage-btn"]', title: tr('onboarding.tourSetupAddStage'), body: tr('onboarding.tourSetupAddStageDesc'), placement: 'auto' },
        { target: '[data-onboarding="stage-lane"]', title: tr('onboarding.tourSetupStage'), body: tr('onboarding.tourSetupStageDesc'), placement: 'auto' },
        { target: '[data-onboarding="stage-controls"]', title: tr('onboarding.tourSetupStageControls'), body: tr('onboarding.tourSetupStageControlsDesc'), placement: 'auto' },
        { target: '[data-onboarding="checklist-item"]', title: tr('onboarding.tourSetupChecklist'), body: tr('onboarding.tourSetupChecklistDesc'), placement: 'auto' },
        { target: '[data-onboarding="add-checklist-btn"]', title: tr('onboarding.tourSetupAddChecklist'), body: tr('onboarding.tourSetupAddChecklistDesc'), placement: 'auto' },
        { target: '[data-onboarding="add-stage-ghost"]', title: tr('onboarding.tourSetupAddStageGhost'), body: tr('onboarding.tourSetupAddStageGhostDesc'), placement: 'auto' }
      ]
    },
    {
      key: 'setup-settings',
      route: '/dashboard/workflows/[workflowId]/setup',
      pattern: /^\/dashboard\/workflows\/[^/]+\/setup$/,
      requireElement: '[data-onboarding="workflow-settings-form"]',
      steps: [
        { title: tr('onboarding.welcomeSetupSettings'), body: tr('onboarding.welcomeSetupSettingsDesc') },
        { target: '[data-onboarding="settings-tab"]', title: tr('onboarding.tourSettingsTab'), body: tr('onboarding.tourSettingsTabDesc'), placement: 'auto' },
        { target: '[data-onboarding="workflow-settings-form"]', title: tr('onboarding.tourSetupSettingsForm'), body: tr('onboarding.tourSetupSettingsFormDesc'), placement: 'auto' }
      ]
    },
    {
      key: 'members',
      route: '/dashboard/members',
      steps: [
        { title: tr('onboarding.welcomeMembers'), body: tr('onboarding.welcomeMembersDesc') },
        { target: '[data-onboarding="invite-member"]', title: tr('onboarding.tourMembersInvite'), body: tr('onboarding.tourMembersInviteDesc'), placement: 'auto' },
        { target: '[data-onboarding="members-stats"]', title: tr('onboarding.tourMembersStats'), body: tr('onboarding.tourMembersStatsDesc'), placement: 'auto' },
        { target: '[data-onboarding="member-role-filter"]', title: tr('onboarding.tourMembersFilter'), body: tr('onboarding.tourMembersFilterDesc'), placement: 'auto' },
        { target: '[data-onboarding="members-table"]', title: tr('onboarding.tourMembersTable'), body: tr('onboarding.tourMembersTableDesc'), placement: 'auto' }
      ]
    },
    {
      key: 'integrations',
      route: '/dashboard/settings/integrations',
      steps: [
        { title: tr('onboarding.welcomeIntegrations'), body: tr('onboarding.welcomeIntegrationsDesc') },
        { target: '[data-onboarding="wa-section"]', title: tr('onboarding.tourIntegConnect'), body: tr('onboarding.tourIntegConnectDesc'), placement: 'auto' },
        { target: '[data-onboarding="connect-wa"]', title: tr('onboarding.tourIntegAdd'), body: tr('onboarding.tourIntegAddDesc'), placement: 'auto' },
        { target: '[data-onboarding="api-keys-section"]', title: tr('onboarding.tourIntegApiKeys'), body: tr('onboarding.tourIntegApiKeysDesc'), placement: 'auto' },
        { target: '[data-onboarding="generate-api-key"]', title: tr('onboarding.tourIntegGenKey'), body: tr('onboarding.tourIntegGenKeyDesc'), placement: 'auto' }
      ]
    },
    {
      key: 'settings',
      route: '/dashboard/settings',
      steps: [
        { title: tr('onboarding.welcomeSettings'), body: tr('onboarding.welcomeSettingsDesc') },
        { target: '[data-onboarding="profile-settings-section"]', title: tr('onboarding.tourSettingsProfile'), body: tr('onboarding.tourSettingsProfileDesc'), placement: 'auto' },
        { target: '[data-onboarding="security-settings-section"]', title: tr('onboarding.tourSettingsSecurity'), body: tr('onboarding.tourSettingsSecurityDesc'), placement: 'auto' },
        { target: '[data-onboarding="notifications-settings-section"]', title: tr('onboarding.tourSettingsNotifications'), body: tr('onboarding.tourSettingsNotificationsDesc'), placement: 'auto' }
      ]
    }
  ];

  // Load state on mount
  onMount(() => {
    loadState();
  });

  async function loadState() {
    try {
      const res = await api.getOnboardingState();
      obState = res.state;
    } catch (err) {
      // Non-critical — onboarding is optional
      console.error('Failed to load onboarding state:', err);
    } finally {
      loading = false;
    }
  }

  // Find matching tour for current route
  function findTourForCurrentRoute() {
    const pathname = page.url.pathname;
    const tab = page.url.searchParams.get('tab');
    return tours.find((t) => {
      const routeMatch = t.pattern ? t.pattern.test(pathname) : t.route === pathname;
      if (!routeMatch) return false;
      // If tour specifies a queryParam, match it against ?tab=
      if (t.queryParam && tab !== t.queryParam) return false;
      // Tours without queryParam only match when there's no tab
      // or tab doesn't match any queryParam tour on this route
      if (!t.queryParam && tab && tours.some((t2) => t2.pattern?.test(pathname) && t2.queryParam === tab)) return false;
      // Check element presence conditions (supports string or array)
      const reqEls = t.requireElement ? (Array.isArray(t.requireElement) ? t.requireElement : [t.requireElement]) : [];
      const reqAbsent = t.requireAbsent ? (Array.isArray(t.requireAbsent) ? t.requireAbsent : [t.requireAbsent]) : [];
      if (reqEls.some((sel) => !document.querySelector(sel))) return false;
      if (reqAbsent.some((sel) => document.querySelector(sel))) return false;
      return true;
    });
  }

  // Trigger tour if not seen yet
  function maybeTriggerTour() {
    if (loading) return;
    const tour = findTourForCurrentRoute();
    if (tour && !obState.seenTours.includes(tour.key)) {
      activeTour = tour;
    }
  }

  // Listen for page-ready event from pages after their data loads
  function handlePageReady() {
    maybeTriggerTour();
  }

  onMount(() => {
    window.addEventListener('onboarding-page-ready', handlePageReady);
  });

  onDestroy(() => {
    window.removeEventListener('onboarding-page-ready', handlePageReady);
  });

  async function completeChallenge(key: string) {
    if (obState.completedChallenges.includes(key)) return;
    obState = { ...obState, completedChallenges: [...obState.completedChallenges, key] };
    try {
      const res = await api.updateOnboardingState({ completeChallenge: key });
      obState = res.state;
    } catch (err) {
      // Non-critical
      console.error('Failed to save challenge completion:', err);
    }
  }


  async function completeTour() {
    if (!activeTour) return;
    const tourKey = activeTour.key;
    activeTour = null;
    obState = { ...obState, seenTours: [...obState.seenTours, tourKey] };
    try {
      const res = await api.updateOnboardingState({ markTourSeen: tourKey });
      obState = res.state;
    } catch (err) {
      console.error('Failed to save tour seen:', err);
    }
  }

  function closeTour() {
    activeTour = null;
  }

  // Expose challenge completion to child components via a global event system
  // Using a CustomEvent so any component can trigger: dispatchEvent(new CustomEvent('onboarding-challenge', { detail: 'create_workflow' }))
  onMount(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === 'string') {
        completeChallenge(detail);
      }
    };
    window.addEventListener('onboarding-challenge', handler);
    return () => window.removeEventListener('onboarding-challenge', handler);
  });

  function replayTour() {
    const tour = findTourForCurrentRoute();
    if (tour) {
      activeTour = tour;
    }
  }

  // Expose replayTour globally
  onMount(() => {
    (window as any).__onboardingReplayTour = replayTour;
    return () => {
      delete (window as any).__onboardingReplayTour;
    };
  });
</script>

{@render children()}

{#if !loading && !allChallengesDone}
  <ChallengeWidget
    {challenges}
    labels={{
      title: tr('onboarding.challengesTitle'),
      progress: (done, total) => tr('onboarding.challengesProgress', { done, total }),
      complete: tr('onboarding.challengesComplete'),
      notStarted: tr('onboarding.challengeNotStarted'),
      completed: tr('onboarding.challengeCompleted'),
      goalLabel: tr('onboarding.goalLabel')
    }}
  />
{/if}

{#if activeTour}
  <Spotlight
    steps={activeTour.steps}
    open={true}
    onClose={closeTour}
    onComplete={completeTour}
    labels={{
      next: tr('onboarding.tourNext'),
      prev: tr('onboarding.tourPrev'),
      done: tr('onboarding.tourDone'),
      skip: tr('onboarding.tourSkip'),
      step: (current, total) => tr('onboarding.tourStep', { current, total })
    }}
  />
{/if}

{#if showCelebration}
  <div class="fixed inset-0 z-[300] flex items-center justify-center" style="background: var(--overlay-scrim); backdrop-filter: blur(4px);">
    <div use:confetti={{ particleCount: 200, duration: 4000, particleSize: 8 }} class="absolute inset-0 pointer-events-none" aria-hidden="true"></div>
    <div class="relative z-[301] mx-4 w-full max-w-md rounded-2xl border border-hairline bg-card p-8 text-center shadow-[var(--shadow-modal)]">
      <div class="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <HugeiconsIcon icon={Award01Icon} size={32} strokeWidth={1.8} />
      </div>
      <h2 class="ds-page-title text-ink">{tr('onboarding.celebrationTitle')}</h2>
      <p class="ds-body mt-2 text-mute">{tr('onboarding.celebrationDesc')}</p>
      <button
        type="button"
        onclick={() => (showCelebration = false)}
        class="mt-6 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
      >
        {tr('onboarding.celebrationCta')}
      </button>
    </div>
  </div>
{/if}
