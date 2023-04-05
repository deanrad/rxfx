import { after } from '@rxfx/after';
import { createBlockingService, Service } from './createService';
import { Bus } from '@rxfx/bus';

interface Persistence<T> {
  load: () => T;
  persist: (toSave: T) => void;
  effect: any;
}

interface ResumableRequests<State> {
  on: (s?: State) => void;
  off: () => void;
  config: (s: State) => void;
}

type Resumable<Config> =
  | { subtype: 'on'; config?: Config }
  | { subtype: 'config'; config: Config }
  | { subtype: 'off' };

export function createResumableService<TPersisted, TNext = void>(
  ns: string,
  bus: Bus<any>,
  opts: Persistence<TPersisted>
): Service<Resumable<TPersisted>, TNext, Error, TPersisted> &
  ResumableRequests<TPersisted> {
  const srv = createBlockingService<
    Resumable<TPersisted>,
    TNext,
    Error,
    TPersisted
  >(
    ns,
    bus,
    (req) => {
      if (req.subtype === 'on') {
        return opts.effect(req);
      }
    },
    (ACs) => (state, event) => {
      if (ACs.request.match(event)) {
        if (event.payload.subtype === 'config' && srv.isHandling.value) {
          return event.payload.config;
        }
        if (
          event.payload.subtype === 'on' &&
          event.payload.config !== undefined
        ) {
          return event.payload.config;
        }
      }
      return state;
    }
  );

  const requests: ResumableRequests<TPersisted> = {
    on: (config) => {
      srv.request({ subtype: 'on', config });
    },
    off: () => {
      srv.request({ subtype: 'off' });
    },
    config: (config) => {
      srv.request({ subtype: 'config', config });
    },
  };

  srv.observe({
    request(r) {
      if (r.subtype === 'off') {
        srv.cancelCurrent();
        return;
      }

      if (r.subtype === 'on' && r.config === undefined) {
        srv.request({
          subtype: 'config',
          config: opts.load(),
        });
      }
      if (r.subtype === 'on' && r.config !== undefined) {
        opts.persist(r.config);
      }

      if (r.subtype === 'config' && srv.isActive) {
        opts.persist(srv.state.value);
      }
    },
    finalized() {
      opts.persist(srv.state.value);
    },
  });

  return Object.assign(srv, requests);
}
