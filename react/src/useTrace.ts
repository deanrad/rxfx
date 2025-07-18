import { EffectRunner, trace } from '@rxfx/effect';
import { useWhileMounted } from './useWhileMounted';

export function useTrace(
  fx: EffectRunner<any, any>,
  name: string = 'fx',
  traceFn = (type: string, payload: any) => {
    console.log(`${type}: ${JSON.stringify(payload)}`);
  }
) {
  useWhileMounted(() => trace(fx, name, traceFn));
}
