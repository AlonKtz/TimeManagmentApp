const TABLE_COLUMNS = {
  time_entries: new Set(['id', 'user_id', 'date', 'hours', 'start_time', 'end_time', 'note', 'mode', 'location', 'via_punch', 'created_at']),
  profiles: new Set(['id', 'email', 'name', 'role', 'created_at', 'punch_state', 'job_percent', 'custom_daily_hours']),
  settings: new Set(['key', 'value', 'updated_at']),
  day_overrides: new Set(['date', 'hours', 'note', 'type', 'disabled']),
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ENTRY_ID = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|e_\d+_[a-z0-9]+|(?:dayoff|sick|miluim)_\d{4}-\d{2}-\d{2}_[a-f0-9]{6})$/i;

function tableColumns(table) {
  const columns = TABLE_COLUMNS[table];
  if (!columns) throw new TypeError(`Unsupported table: ${table}`);
  return columns;
}

function validateColumn(table, column) {
  if (!tableColumns(table).has(column)) throw new TypeError(`Unsupported column: ${column}`);
}

function validateFilterValue(table, column, operator, value) {
  if (operator === 'in') {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
      throw new TypeError('The in filter requires a list of strings');
    }
    if (column === 'id' && table === 'time_entries') {
      if (value.some((id) => !ENTRY_ID.test(id))) throw new TypeError('Invalid entry ID filter value');
    } else if (column === 'id' || column === 'user_id') {
      if (value.some((id) => !UUID.test(id))) throw new TypeError('Invalid UUID filter value');
    } else if (column === 'date') {
      if (value.some((date) => !ISO_DATE.test(date))) throw new TypeError('Invalid date filter value');
    } else {
      throw new TypeError(`The in filter is not allowed for ${column}`);
    }
    return `in.(${value.join(',')})`;
  }
  if (!['eq', 'gte', 'lte'].includes(operator)) throw new TypeError(`Unsupported filter operator: ${operator}`);
  if (column === 'id' && table === 'time_entries') {
    if (operator !== 'eq' || typeof value !== 'string' || !ENTRY_ID.test(value)) throw new TypeError('Invalid entry ID filter value');
  } else if (column === 'id' || column === 'user_id') {
    if (operator !== 'eq' || typeof value !== 'string' || !UUID.test(value)) throw new TypeError('Invalid UUID filter value');
  } else if (column === 'date') {
    if (!['eq', 'gte', 'lte'].includes(operator) || typeof value !== 'string' || !ISO_DATE.test(value)) throw new TypeError('Invalid date filter value');
  } else if (column === 'key') {
    if (operator !== 'eq' || !['standardHours', 'holidayHours'].includes(value)) throw new TypeError('Invalid settings key');
  } else {
    throw new TypeError(`Filters are not allowed for ${column}`);
  }
  return `${operator}.${value}`;
}

export function buildSelectQuery(table, query = {}) {
  const columns = tableColumns(table);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === 'select') {
      if (typeof value !== 'string') throw new TypeError('Invalid select clause');
      const selected = value.split(',');
      selected.forEach((column) => validateColumn(table, column));
      params.set('select', selected.join(','));
    } else if (key === 'order') {
      if (typeof value !== 'string') throw new TypeError('Invalid order clause');
      const orders = value.split(',');
      const safeOrders = orders.map((order) => {
        const match = /^([a-z_]+)\.(asc|desc)$/i.exec(order);
        if (!match) throw new TypeError('Invalid order clause');
        validateColumn(table, match[1]);
        return `${match[1]}.${match[2]}`;
      });
      params.set('order', safeOrders.join(','));
    } else {
      validateColumn(table, key);
      const filters = Array.isArray(value) ? value : [value];
      if (!filters.length || filters.some((filter) => !filter || typeof filter !== 'object' || Array.isArray(filter))) {
        throw new TypeError(`Invalid filter for ${key}`);
      }
      for (const filter of filters) {
        const entries = Object.entries(filter);
        if (entries.length !== 1) throw new TypeError(`Invalid filter for ${key}`);
        params.append(key, validateFilterValue(table, key, entries[0][0], entries[0][1]));
      }
    }
  }
  return params.toString();
}

export function validateTable(table) {
  tableColumns(table);
  return table;
}

export function validateConflictColumns(table, columns) {
  const allowed = tableColumns(table);
  const parsed = String(columns).split(',');
  if (!parsed.length || parsed.some((column) => !allowed.has(column))) throw new TypeError('Invalid conflict column');
  return parsed.join(',');
}

export function validateBody(table, body) {
  const allowed = tableColumns(table);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new TypeError('Invalid request body');
  if (Object.keys(body).some((key) => !allowed.has(key))) throw new TypeError('Unsupported body column');
}

export function validateMatch(table, column, value) {
  validateColumn(table, column);
  validateFilterValue(table, column, 'eq', value);
  return { column, value };
}

export function validateDeleteList(table, column, values) {
  validateColumn(table, column);
  return validateFilterValue(table, column, 'in', values);
}
