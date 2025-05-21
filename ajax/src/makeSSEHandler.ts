import { Observable } from 'rxjs';
import { EventSource } from 'eventsource';

interface EventSourceConfig {
  url: string;
  withCredentials?: boolean;
  headers?: Record<string, string>;
}

interface EventSourceMessage {
  type: string;
  data: string;
  lastEventId?: string;
  origin?: string;
  retry?: number;
}

/**
 * Creates a function that returns an RxJS Observable for consuming Server-Sent Events
 *
 * @param config - EventSource configuration
 * @returns A function that returns an Observable of SSE messages
 */
export function createEventSourceObservable(config: EventSourceConfig) {
  return new Observable<EventSourceMessage>((observer) => {
    let eventSource: EventSource;

    try {
      // Create EventSource with URL and credentials option
      const { url, withCredentials = false } = config;

      // Handle custom headers if provided using a proxy or fetch + ReadableStream
      if (config.headers && Object.keys(config.headers).length > 0) {
        // Implementation approach using a ReadableStream and fetch with headers
        const fetchWithHeaders = async () => {
          const response = await fetch(url, {
            headers: config.headers,
            credentials: withCredentials ? 'include' : 'same-origin',
          });

          if (!response.ok) {
            observer.error(new Error(`HTTP error, status: ${response.status}`));
            return;
          }

          if (!response.body) {
            observer.error(new Error('Response body is null'));
            return;
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let eventData = '';
          let eventType = 'message';
          let eventId = '';
          let retry: number | undefined = undefined;

          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r\n|\r|\n/);
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line === '') {
                // End of message, dispatch it if there's data
                if (eventData) {
                  observer.next({
                    type: eventType,
                    data: eventData,
                    lastEventId: eventId || undefined,
                    retry,
                  });
                }

                // Reset for next message
                eventData = '';
                eventType = 'message';
                continue;
              }

              // Ignore comments (lines starting with :)
              if (line.startsWith(':')) continue;

              // Process field:value
              const colonIndex = line.indexOf(':');
              let field, value;

              if (colonIndex === -1) {
                // Field with no value
                field = line;
                value = '';
              } else {
                field = line.slice(0, colonIndex);
                // Skip initial space after colon if present
                value = line.slice(colonIndex + 1).startsWith(' ')
                  ? line.slice(colonIndex + 2)
                  : line.slice(colonIndex + 1);
              }

              switch (field) {
                case 'event':
                  eventType = value;
                  break;
                case 'data':
                  // Append data with newline if we already have data
                  eventData = eventData ? eventData + '\n' + value : value;
                  break;
                case 'id':
                  eventId = value;
                  break;
                case 'retry':
                  const retryMs = parseInt(value, 10);
                  if (!isNaN(retryMs)) {
                    retry = retryMs;
                  }
                  break;
              }
            }
          }
        };

        fetchWithHeaders().catch((err) => observer.error(err));
      } else {
        // Standard EventSource implementation without custom headers
        eventSource = new EventSource(url, { withCredentials });

        // Handle message event (default)
        eventSource.onmessage = (event: MessageEvent) => {
          observer.next({
            type: 'message',
            data: event.data,
            lastEventId: event.lastEventId || undefined,
            origin: event.origin,
          });
        };

        // Handle all events including named events
        eventSource.addEventListener('open', () => {
          // Connection established, no need to emit anything
        });

        // Handle errors
        eventSource.onerror = (error) => {
          observer.error(error);
        };

        // Setup a dynamic event listener for any named events
        const originalAddEventListener =
          eventSource.addEventListener.bind(eventSource);
        // @ts-ignore
        eventSource.addEventListener = function (
          type: string,
          listener: EventListener,
          options?: AddEventListenerOptions | boolean
        ) {
          if (type !== 'message' && type !== 'open' && type !== 'error') {
            // For any custom named event, we also want to track it in our observable
            originalAddEventListener(
              type,
              (event: Event) => {
                const messageEvent = event as MessageEvent;
                observer.next({
                  type,
                  data: messageEvent.data,
                  lastEventId: messageEvent.lastEventId || undefined,
                  origin: messageEvent.origin,
                });

                // Then call the original listener
                listener(event);
              },
              options
            );
          } else {
            // For standard events, just use the original method
            originalAddEventListener(type, listener, options);
          }
        };
      }
    } catch (error) {
      observer.error(error);
    }

    // Cleanup function called when observable is unsubscribed
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  });
}

export default createEventSourceObservable;
