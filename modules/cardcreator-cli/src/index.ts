#!/usr/bin/env node

import { createCard } from "cardcreator-library";

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("Usage: cardcreator <name> <description>");
  process.exit(1);
}

const [name, description] = args;
const card = createCard(name, description);
console.log(`Created card: ${card.name} - ${card.description}`);