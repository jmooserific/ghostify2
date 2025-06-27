#!/usr/bin/env node

import { run } from '@oclif/core';

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  }); 