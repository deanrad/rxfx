import { Observable, Subscription, last } from 'rxjs';
import { createResumableService } from '../src/createResumable';
import { defaultBus as bus } from '@rxfx/bus';

describe.only(createResumableService, () => {
  let lastKnownBrightness = 0;
  let isOn = false;
  const allSubs = new Subscription();

  const load = () => lastKnownBrightness;
  const persist = (n: number) => {
    lastKnownBrightness = n;
  };
  const effect = () =>
    new Observable(() => {
      isOn = true;
      return () => {
        isOn = false;
      };
    });

  afterEach(() => {
    allSubs.unsubscribe();
  });

  it('persists config from off to on, and resumes with it', async () => {
    const seen = [];
    allSubs.add(bus.spy(seen.push.bind(seen)));

    const homeLight = createResumableService<number>('light', bus, {
      load,
      persist,
      effect,
    });

    // Config is loaded upon 'on'
    homeLight.on();
    expect(homeLight.state.value).toBe(lastKnownBrightness);

    // Config is written upon 'off'
    lastKnownBrightness = -1;
    homeLight.off();
    expect(homeLight.isHandling.value).toBeFalsy();
    expect(lastKnownBrightness).toEqual(0);

    // Config can be set while on
    homeLight.on();
    homeLight.config(3);
    expect(homeLight.state.value).toEqual(3);
    expect(lastKnownBrightness).toEqual(3);

    // Config is still saved upon shutdown
    lastKnownBrightness = -1;
    homeLight.off();
    expect(lastKnownBrightness).toEqual(3);

    // Config doesnt take effect while shutdown
    expect(homeLight.isHandling.value).toBeFalsy();
    homeLight.config(4);
    expect(homeLight.state.value).toEqual(3);

    // Can be turned on with config
    homeLight.on(7);
    expect(homeLight.state.value).toEqual(7);
    expect(lastKnownBrightness).toEqual(7);
  });
});
