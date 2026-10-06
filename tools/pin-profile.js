// Re-pins a shipped brand profile; the work is the kit's pin.js, which drafts use too.
// Usage: node tools/pin-profile.js <brand>
process.env.PRISM_DRAFTS = "/nonexistent";
process.argv[1] = require("path").join(__dirname, "..", "plugin", "prism", "skills", "prism-produce", "kit", "pin.js");
require(process.argv[1]);
