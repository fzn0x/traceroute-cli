const { trace } = require("../lib/traceroute.js");

const argv = process.argv.slice(2);

trace(argv[0], (err, hops) => {
  if (err) {
    console.log(err);
    process.exit(1);
  }
  console.log(hops);
  process.exit(0);
});
