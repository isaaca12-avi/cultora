export const NAV = {
  logoLink: "nav-logo-link",
  home: "nav-home-link",
  dashboard: "nav-dashboard-link",
  goals: "nav-goals-link",
  plans: "nav-plans-link",
  knowledge: "nav-knowledge-link",
  login: "nav-login-link",
  register: "nav-register-link",
  logout: "nav-logout-button",
  profileMenu: "nav-profile-menu",
};

export const LANDING = {
  ctaStart: "landing-cta-start",
  ctaLogin: "landing-cta-login",
  goalCard: (key) => `landing-goal-${key}`,
};

export const AUTH = {
  emailInput: "auth-email-input",
  passwordInput: "auth-password-input",
  nameInput: "auth-name-input",
  submitLogin: "auth-submit-login",
  submitRegister: "auth-submit-register",
  switchToRegister: "auth-switch-register",
  switchToLogin: "auth-switch-login",
  errorMessage: "auth-error-message",
};

export const PROFILE = {
  agentType: "profile-agent-type",
  discipline: "profile-discipline",
  stage: "profile-stage",
  territory: "profile-territory",
  teamSize: "profile-team-size",
  income: "profile-monthly-income",
  audience: "profile-audience-base",
  formalized: "profile-formalized",
  bio: "profile-bio",
  submit: "profile-submit-button",
};

export const GOALS = {
  card: (key) => `goal-catalog-card-${key}`,
  textInput: "goal-text-input",
  submit: "goal-submit-button",
};

export const DIAGNOSTIC = {
  questionText: "diagnostic-question-text",
  answerInput: "diagnostic-answer-input",
  submitAnswer: "diagnostic-submit-answer",
  progress: "diagnostic-progress",
  generatePlan: "diagnostic-generate-plan",
};

export const PLAN = {
  title: "plan-title",
  situation: "plan-situation",
  reading: "plan-reading",
  cause: (i) => `plan-cause-${i}`,
  priority: (i) => `plan-priority-${i}`,
  item: (id) => `plan-item-${id}`,
  itemStatus: (id) => `plan-item-status-${id}`,
  itemStart: (id) => `plan-item-start-${id}`,
  itemDone: (id) => `plan-item-done-${id}`,
  indicator: (i) => `plan-indicator-${i}`,
};

export const DASHBOARD = {
  root: "dashboard-root",
  statSessions: "dashboard-stat-sessions",
  statPlans: "dashboard-stat-plans",
  statCompletion: "dashboard-stat-completion",
  upcomingList: "dashboard-upcoming-list",
  newDiagnostic: "dashboard-new-diagnostic-button",
};

export const KNOWLEDGE = {
  root: "knowledge-root",
  category: (key) => `knowledge-category-${key}`,
  doc: (id) => `knowledge-doc-${id}`,
};

export const AGENTS = {
  root: "agents-root",
  back: "agents-back-link",
  publishMine: "agents-publish-mine-cta",
  search: "agents-search-input",
  filterToggle: "agents-filter-toggle",
  filterCity: "agents-filter-city",
  filterDiscipline: "agents-filter-discipline",
  filterRole: "agents-filter-role",
  filterType: "agents-filter-agent-type",
  filterAvailability: "agents-filter-availability",
  filterCapability: (v) => `agents-filter-capability-${v}`,
  filterInterest: (v) => `agents-filter-interest-${v}`,
  clearFilters: "agents-clear-filters",
  card: (id) => `agent-card-${id}`,
  view: (id) => `agent-view-${id}`,
  save: (id) => `agent-save-${id}`,
  profileName: "agent-profile-name",
  profileContact: "agent-profile-contact",
  profileSave: "agent-profile-save",
  profileInvite: "agent-profile-invite",
  count: "agents-result-count",
  myForm: {
    role: "my-agent-role",
    agentType: "my-agent-type",
    discipline: "my-agent-discipline",
    city: "my-agent-city",
    availability: "my-agent-availability",
    submit: "my-agent-submit",
    unpublish: "my-agent-unpublish",
  },
};
