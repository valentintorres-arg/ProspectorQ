import type { Etapa, TipoInteraccion } from '@/lib/types';

export type Lang = 'es' | 'en';

// Entradas con conteo tienen su propia función en vez de un string fijo:
// permite que cada idioma resuelva plural/orden de palabras como corresponda
// ("1 punto" vs "2 puntos", "1 point" vs "2 points").
export interface Dictionary {
  common: {
    cancel: string;
  };
  nav: {
    tagline: string;
    mapa: string;
    zonas: string;
    pipeline: string;
    dashboard: string;
    dashboardShort: string;
    newZone: string;
    logout: string;
    collapseMenu: string;
    expandMenu: string;
    notifications: string;
    chat: string;
    upgrade: string;
  };
  theme: {
    toLight: string;
    toDark: string;
  };
  language: {
    toEnglish: string;
    toSpanish: string;
  };
  login: {
    tagline: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    showPassword: string;
    hidePassword: string;
    submit: string;
    submitting: string;
    invalidCredentials: string;
  };
  mapCanvas: {
    drawZone: string;
    markAtLeast: (n: number) => string;
    pointsCount: (n: number) => string;
    closeZone: string;
    cancel: string;
    searching: string;
  };
  mapa: {
    results: string;
    viewSavedZones: string;
    drawPrompt: string;
    reSearching: (name: string) => string;
    searchByName: string;
    allCategories: string;
    onlyEnriched: string;
    freshnessAny: string;
    freshnessWeek: string;
    freshnessMonth: string;
    freshnessFilterHint: string;
    selectAll: (n: number) => string;
    enrichSelection: string;
    enriching: string;
    addAllToPipeline: string;
    adding: string;
    noResultsYet: string;
    enriched: string;
    basic: string;
    enrichWithGoogle: string;
    addToPipeline: string;
    inPipeline: string;
    defaultZoneName: (date: string) => string;
    reSearchZoneName: (name: string, date: string) => string;
    errorSearching: string;
    errorLoadingZone: string;
    errorEnriching: string;
    errorAddingToPipeline: string;
    unexpectedError: string;
  };
  zonas: {
    title: string;
    subtitle: string;
    newZone: string;
    noZonesYet: string;
    active: string;
    businessesFoundLabel: (n: number) => string;
    viewAndReSearch: string;
    loading: string;
    errorLoading: string;
    unexpectedError: string;
  };
  pipeline: {
    title: string;
    searchPlaceholder: string;
    allCategories: string;
    exportCsv: string;
    dropHere: string;
    overdue: string;
    today: string;
    upcoming: string;
    csvHeaders: string[];
    loading: string;
    errorLoading: string;
    unexpectedError: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    zonesSearched: string;
    businessesFound: string;
    leadsInPipeline: string;
    successRate: string;
    funnelByStage: string;
    topCategories: string;
    noCategoriesYet: string;
    errorLoading: string;
    unexpectedError: string;
  };
  leadDetail: {
    backToPipeline: string;
    active: string;
    call: string;
    website: string;
    stage: string;
    nextAction: string;
    date: string;
    notes: string;
    saving: string;
    history: string;
    addNotePlaceholder: string;
    add: string;
    adding: string;
    noInteractionsYet: string;
    errorLoading: string;
    errorSaving: string;
    errorAddingInteraction: string;
    unexpectedError: string;
  };
  etapas: Record<Etapa, string>;
  interacciones: Record<TipoInteraccion, string>;
}
