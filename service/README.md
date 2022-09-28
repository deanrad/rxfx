# 𝗥𝘅𝑓𝑥 `service`

A set of conventions over an `@rxfx/bus` that

- Turn errors into events
- Has a naming convention for events
- Allows a reducer to populate an Observable of state
- Has an Observable of whether a request handling is active
- Allows for cancelation of in-flight requests

Compare to `createAsyncThunk` from Redux Toolkit.