import { from, Observable, of } from 'rxjs';
import { ajax } from 'rxjs/ajax';
import { mergeMap } from 'rxjs/operators';

/**
 * How the HTTP fetchMany is made
 */
export interface FetchManyHTTPOptions {
  url: string;
  method?: string;
  body?: string;
  headers?: Object;
  withCredentials?: Boolean;
  timeout?: number;
}

/**
 * Gets the resource, returning an Observable of resources referred to by the URL
 * It is cancelable, and if you have the oboejs library, you'll get full streaming.
 * Otherwise, you'll get an Observable that batches all its 'next' notifications at
 * the end - which is no worse than normal AJAX performance.
 * @argument opts: HTTP Options
 * @argument expandKey: Example 'items[*]', 'items' (shorthand for `items[*]`), `data.items`
 */
export const fetchMany = (
  opts: FetchManyHTTPOptions,
  expandKey: string
): Observable<any> => {
  //@ts-ignore
  if (typeof oboe === 'undefined') {
    console.warn(
      'OboeJS not detected- streamed GET will be run in compatibility mode'
    );
  }

  opts.method ||= 'GET';
  opts.headers ||= {};
  opts.withCredentials ||= false;
  opts.timeout ||= 30 * 1000;

  //@ts-ignore
  return typeof oboe === 'undefined'
    ? rxGet(expandKey, opts)
    : oboeGet(expandKey, opts);
};

// An Observable of the response, expanded to individual results if applicable.
function rxGet(expandKey: string, opts: FetchManyHTTPOptions): Observable<any> {
  // @ts-ignore
  return ajax(opts).pipe(
    mergeMap((ajax) => {
      const resultArr = expandKey
        ? // @ts-ignore
          ajax.response[expandKey]
        : ajax.response;
      return Array.isArray(resultArr) ? from(resultArr) : of(resultArr);
    })
  );
}

function oboeGet(
  _expandKey: string,
  opts: FetchManyHTTPOptions
): Observable<any> {
  return new Observable((o) => {
    let userCanceled = false;
    // Treat `items` same as `items[*]`
    let expandKey =
      _expandKey + (_expandKey && _expandKey.match(/\w+s$/i) ? '[*]' : '');

    // @ts-ignore
    oboe(opts) // Get items from a url
      // Matched items could be single or multiple items depending on expandKey
      .node(expandKey, function (items: any) {
        if (userCanceled) {
          o.complete();
          // @ts-ignore
          this.abort();
          return;
        }
        o.next(items);
      })
      .done(() => o.complete());

    // When a caller unsubscribes, we'll get max one more
    return () => {
      userCanceled = true;
    };
  });
}
