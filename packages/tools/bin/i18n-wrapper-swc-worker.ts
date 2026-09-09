#!/usr/bin/env node

/**
 * i18n-wrapper-swc-worker CLI entry point
 *
 * High-performance translation wrapper using SWC + Worker Threads
 */

import { runCli } from "../scripts/t-wrapper/swc-worker/index";

void runCli();
