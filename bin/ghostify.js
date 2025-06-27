#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@oclif/core");
(0, core_1.run)()
    .then(() => {
    process.exit(0);
})
    .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
//# sourceMappingURL=ghostify.js.map