const { Bus } = require("@rxfx/bus");
const bus = new Bus();

// Errors in listeners- since they aren't raised to trigger-ers - are
// available on bus.errors. Listeners simply fail like they blew a fuse.
bus.errors.subscribe((e) => console.error(e));

// This is a kind of 'spy'
// bus.listen(
// 	() => true,
// 	({ type, payload }) => console.log(type, payload)
// );

module.exports = { bus };
