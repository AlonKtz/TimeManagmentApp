export const STORAGE_KEYS = {
  users: 'tt_users',
  session: 'tt_session',
  entries: 'tt_entries',
  settings: 'tt_settings',
  activePunch: 'tt_active_punch',
  daysOff: 'tt_days_off',
};

export const HEB_DAYS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
export const HEB_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

export const LOCATIONS = {
  office: { label: 'מהמשרד', icon: 'office' },
  home:   { label: 'מהבית',  icon: 'home' },
};
export const DEFAULT_LOCATION = 'office';

export const HOLIDAY_TYPES = {
  chag:       { label: 'חג',                                    defaultHours: 0 },
  erev:       { label: 'ערב חג',                                defaultHours: 5 },
  cholhamoed: { label: 'חול המועד',                             defaultHours: 6 },
  memorial:   { label: 'יום הזיכרון (ערב יום העצמאות)',        defaultHours: 5 },
};

export const ISRAELI_HOLIDAYS = {
  '2026-04-01': { type: 'erev',       note: 'ערב פסח' },
  '2026-04-02': { type: 'chag',       note: 'פסח — חג ראשון' },
  '2026-04-05': { type: 'cholhamoed', note: 'חול המועד פסח' },
  '2026-04-06': { type: 'cholhamoed', note: 'חול המועד פסח' },
  '2026-04-07': { type: 'erev',       note: 'ערב שביעי של פסח' },
  '2026-04-08': { type: 'chag',       note: 'שביעי של פסח' },
  '2026-04-20': { type: 'memorial',   note: 'ערב יום הזיכרון' },
  '2026-04-21': { type: 'memorial',   note: 'יום הזיכרון (ערב יום העצמאות)' },
  '2026-04-22': { type: 'chag',       note: 'יום העצמאות' },
  '2026-05-20': { type: 'erev',       note: 'ערב שבועות' },
  '2026-05-21': { type: 'chag',       note: 'שבועות' },
  '2026-09-13': { type: 'chag',       note: 'ראש השנה תשפ"ז — חג שני' },
  '2026-09-20': { type: 'erev',       note: 'ערב יום כיפור' },
  '2026-09-21': { type: 'chag',       note: 'יום כיפור' },
  '2026-09-27': { type: 'cholhamoed', note: 'חול המועד סוכות' },
  '2026-09-28': { type: 'cholhamoed', note: 'חול המועד סוכות' },
  '2026-09-29': { type: 'cholhamoed', note: 'חול המועד סוכות' },
  '2026-09-30': { type: 'cholhamoed', note: 'חול המועד סוכות' },
  '2026-10-01': { type: 'erev',       note: 'ערב שמחת תורה (הושענא רבה)' },
};

export const DEFAULT_SETTINGS = {
  standardHours: { 0: 9, 1: 9, 2: 9, 3: 9, 4: 8.5 },
  holidayHours: {
    chag: 0,
    erev: 5,
    cholhamoed: 6,
    memorial: 5,
  },
  overrides: {},
  disabledHolidays: [],
};
