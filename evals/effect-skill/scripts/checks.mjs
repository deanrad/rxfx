// Single source of truth for the effect-from-language grading rules.
// Used by scripts/grade.mjs (the no-Copilot-CLI local grader).
//
// Each entry mirrors what the matching tasks/<id>.yaml Waza task checks, so the
// suite can be graded either locally (here) or via Waza if/when Copilot CLI
// access is available. Keep this file authoritative for the local flow.
//
// - mustMatch / mustNotMatch : regexes tested against the generated effect.ts
// - compile                  : if true, the file must type-check via tsc + shim
// - asks                     : if true, this is a disambiguation case — grade a
//                              transcript/response text instead of a .ts file

export const tasks = [
  {
    id: 'tc-10-stream-chat-queueing',
    prompt: 'Stream a chat completion token-by-token; add new prompts to a queue.',
    mustMatch: [/createQueueingEffect/, /@rxfx\/effect/, /async function\*|AsyncGenerator|AsyncIterable/],
    mustNotMatch: [/createSwitchingEffect/, /createBlockingEffect/],
    compile: true,
  },
  {
    id: 'tc-02-save-blocking',
    prompt: 'Submit a form to the server; ignore repeat submits while one is in flight.',
    mustMatch: [/createBlockingEffect/, /@rxfx\/effect/],
    mustNotMatch: [/createQueueingEffect/, /createSwitchingEffect/],
    compile: true,
  },
  {
    id: 'tc-03-autocomplete-switching',
    prompt: 'Show an autocomplete list: fetch suggestions as the user types; a new keystroke cancels the in-flight request.',
    mustMatch: [/createSwitchingEffect/, /@rxfx\/effect/, /Observable/],
    mustNotMatch: [/createQueueingEffect/, /createBlockingEffect/],
    compile: true,
  },
  {
    id: 'tc-04-analytics-queueing',
    prompt: 'Send analytics events; run them one-at-a-time in order (serial).',
    mustMatch: [/createQueueingEffect/, /@rxfx\/effect/],
    mustNotMatch: [/createBlockingEffect/, /createSwitchingEffect/],
    compile: true,
  },
  {
    id: 'tc-06-notif-count-initialstate',
    prompt: 'Fetch notifications and keep a running count starting at 0.',
    mustMatch: [/createEffect\b/, /@rxfx\/effect/, /reduceWith/, /type State/],
    mustNotMatch: [],
    compile: true,
  },
  {
    id: 'tc-07-search-debounced',
    prompt: 'Search as the user types; wait 300ms after they stop and cancel stale searches.',
    mustMatch: [/createDebouncedEffect/, /300/, /@rxfx\/effect/],
    mustNotMatch: [],
    compile: true,
  },
  {
    id: 'tc-08-upload-ambiguous',
    prompt: 'Upload a file to the server.',
    asks: true,
    // The skill should ASK about concurrency (mention a mode) and pose a question.
    mustMatch: [/concurren|parallel|queue|cancel|blocking|switching|ignore|in flight/i, /\?/],
    mustNotMatch: [],
    compile: false,
  },
  {
    id: 'tc-11-record-toggling',
    prompt: 'A record button: press to start recording; press again to stop (toggle on/off).',
    mustMatch: [/createTogglingEffect/, /@rxfx\/effect/, /Observable/],
    mustNotMatch: [/createSwitchingEffect/, /createBlockingEffect/, /createQueueingEffect/],
    compile: true,
  },
  {
    id: 'tc-13-geocode-parallel',
    prompt:
      'Given a mailing address, geocode it by calling the maps API and return its latitude and longitude — a single result. Lookups are independent; run them all in parallel; nothing to cancel.',
    // Parallel default factory (createEffect / createImmediateEffect), a Promise
    // return kind, and no accumulated state — locks in three untested decisions.
    mustMatch: [/createEffect\b|createImmediateEffect\b/, /@rxfx\/effect/, /Promise</],
    mustNotMatch: [
      /createQueueingEffect/,
      /createBlockingEffect/,
      /createSwitchingEffect/,
      /createTogglingEffect/,
      /createDebouncedEffect/,
      /createThrottledEffect/,
      /reduceWith/,
      /Observable/,
    ],
    compile: true,
  },
];

export function findTask(id) {
  return tasks.find((t) => t.id === id);
}
