#!/usr/bin/env node
import commander from 'commander';
import { initTs } from './initTs';
commander.option('-i, --init', 'initial a typescript project', initTs);
commander.parse(process.argv);