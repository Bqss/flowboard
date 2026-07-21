/**
 * Turns Elysia/TypeBox validation errors into a Laravel-style payload:
 *
 *   {
 *     "message": "The email field must be a valid email address. (and 1 more error)",
 *     "errors": {
 *       "email": ["The email field must be a valid email address."],
 *       "address.street": ["The street field is required."],
 *       "items.0.name": ["The name field must be a string."]
 *     }
 *   }
 *
 * Nested objects and array items are handled for free: TypeBox reports each
 * failing leaf with a JSON-pointer `path` (`/items/0/name`), which we convert to
 * Laravel dot-notation (`items.0.name`).
 */

/**
 * One raw TypeBox value error, as surfaced by Elysia's `ValidationError.all`.
 * Loosely typed on purpose: Elysia types `schema` as the full `TSchema`, so we
 * accept anything here and read the constraint keywords we care about below.
 */
interface RawValidationError {
  path?: string;
  message?: string;
  value?: unknown;
  schema?: unknown;
}

/** The subset of JSON-schema keywords we build messages from. */
interface Constraints {
  type?: string;
  format?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

const constraintsOf = (schema: unknown): Constraints =>
  schema && typeof schema === 'object' ? (schema as Constraints) : {};

export interface FormattedValidationError {
  message: string;
  errors: Record<string, string[]>;
}

/** `/items/0/name` -> `items.0.name`; `/` or `` -> `` (root). */
const toDotPath = (path: string): string => path.replace(/^\//, '').replace(/\//g, '.');

/**
 * `team_name` / `teamName` -> `team name`, using the last non-numeric segment so
 * array items (`tags.1`) read as their field name (`tags`) rather than an index.
 */
const humanize = (field: string): string => {
  const segments = field.split('.').filter((s) => !/^\d+$/.test(s));
  const last = segments.pop() ?? field;
  return last
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim();
};

const article = (word: string): string => (/^[aeiou]/i.test(word) ? 'an' : 'a');

const jsTypeOf = (value: unknown): string =>
  Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;

const pluralize = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? '' : 's'}`;

/** Build a human message for a single failing field from its schema + value. */
const messageFor = (field: string, err: RawValidationError): string => {
  const name = humanize(field) || 'value';
  const schema = constraintsOf(err.schema);
  const { value } = err;

  if (value === undefined) return `The ${name} field is required.`;

  if (schema.format === 'email') return `The ${name} field must be a valid email address.`;
  if (schema.format === 'uuid') return `The ${name} field must be a valid UUID.`;
  if (schema.format === 'date-time' || schema.format === 'date')
    return `The ${name} field must be a valid date.`;

  // Type mismatch (e.g. number sent where a string is expected).
  if (schema.type) {
    const actual = jsTypeOf(value);
    const expected = schema.type === 'integer' ? 'number' : schema.type;
    const typeMatches = actual === expected || (schema.type === 'integer' && actual === 'number');
    if (!typeMatches) return `The ${name} field must be ${article(expected)} ${expected}.`;
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength)
      return `The ${name} field must be at least ${pluralize(schema.minLength, 'character')}.`;
    if (schema.maxLength !== undefined && value.length > schema.maxLength)
      return `The ${name} field must not be greater than ${pluralize(schema.maxLength, 'character')}.`;
    if (schema.pattern !== undefined) return `The ${name} field format is invalid.`;
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum)
      return `The ${name} field must be at least ${schema.minimum}.`;
    if (schema.maximum !== undefined && value > schema.maximum)
      return `The ${name} field must not be greater than ${schema.maximum}.`;
  }

  // Fall back to TypeBox's own message so nothing is ever silently dropped.
  return err.message ?? `The ${name} field is invalid.`;
};

export const formatValidationError = (
  errors: readonly RawValidationError[]
): FormattedValidationError => {
  const grouped: Record<string, string[]> = {};

  for (const err of errors) {
    const field = toDotPath(err.path ?? '');
    // Root-level errors (`path === ''`) are echoes of the per-field failures
    // below them; skip so the map stays keyed by concrete fields.
    if (field === '') continue;

    const message = messageFor(field, err);
    const bucket = (grouped[field] ??= []);
    if (!bucket.includes(message)) bucket.push(message);
  }

  const all = Object.values(grouped).flat();
  const [first] = all;
  const remaining = all.length - 1;
  const message =
    first === undefined
      ? 'The given data was invalid.'
      : remaining > 0
        ? `${first} (and ${pluralize(remaining, 'more error')})`
        : first;

  return { message, errors: grouped };
};
