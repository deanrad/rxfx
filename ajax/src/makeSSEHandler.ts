import { Observable } from 'rxjs';

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
 * @returns An Observable of SSE messages
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
 */
export function createEventSourceObservable(config: EventSourceConfig) {
  return new Observable<EventSourceMessage>((observer) => {
    try {
      // Create EventSource with URL and credentials option
      const { url, withCredentials = false } = config;
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
    } catch (error) {
      observer.error(error);
    }

    // Cleanup function called when observable is unsubscribed
    return () => {};
  });
}
