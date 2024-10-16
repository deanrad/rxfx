|                             | Effect                | Service                     | Bus                                       |
| --------------------------- | --------------------- | --------------------------- | ----------------------------------------- |
| Architecture                | Higher-order function | Stateful, Observable Object | Event Publishers and Listener Subscribers |
| size                        | 10Kb                  | 35Kb                        | 20Kb                                      |
| call                        | `fx(args)`            | `svc.request(req)`          | `bus.trigger(evt)`                        |
| aggregate state from events | —                     | ✅                          | —                                         |
| `isActive` tracking         | ✅                    | ✅                          | ✅                                        |
| Globally Cancel             | ✅                    | ✅                          | ✅                                        |
| Concurrency Control         | ✅                    | ✅                          | ✅                                        |
| Error-Safety                | ✅                    | ✅                          | ✅ \*                                     |
| Error-Destination           | `fx.errors`           | `svc.errors` and the bus    | `bus.listen(... { error: () => {}})`      |

\* If an `error` Observer is provided, a bus listener will continue to listen.
Otherwise the listener, and only that listener is terminated upon an unhandled Promise rejection or Observable error.
No exception is thrown to the triggerer, and no other listener is interrupted.
