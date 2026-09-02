/**
 * Gate 1: every file in /data validates against a schema in /data/schema.
 *
 * A data file with no schema is the gap the other gates cannot see through, so
 * an unschema'd file is itself a failure rather than something to skip.
 */

import { join } from 'node:path';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { DATA_DIR, SCHEMA_DIR, readJson, type GateContext } from './context';

function schemaFor(file: string): string | null {
  if (file.startsWith('rates.')) return 'rates.schema.json';
  if (file.startsWith('benefits.')) return 'benefits.schema.json';
  if (file === 'la-overrides.json') return 'la-overrides.schema.json';
  if (file === 'la-region-map.json') return 'la-region-map.schema.json';
  if (file === 'kinship-zones.json') return 'kinship-zones.schema.json';
  if (file === 'citations.json') return 'citations.schema.json';
  if (file === 'watchlist.json') return 'watchlist.schema.json';
  return null;
}

export function checkSchemas({ dataFiles, docs, report }: GateContext): void {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const compiled = new Map<string, ValidateFunction>();
  const compile = (name: string): ValidateFunction => {
    let validate = compiled.get(name);
    if (!validate) {
      validate = ajv.compile(readJson(join(SCHEMA_DIR, name)));
      compiled.set(name, validate);
    }
    return validate;
  };

  for (const file of dataFiles) {
    const schemaName = schemaFor(file);
    if (!schemaName) {
      report.fail('1 schema', `${file} has no schema in /data/schema, every data file must have one`);
      continue;
    }
    const validate = compile(schemaName);
    if (!validate(docs.get(file) ?? readJson(join(DATA_DIR, file)))) {
      for (const err of validate.errors ?? []) {
        report.fail('1 schema', `${file}${err.instancePath} ${err.message ?? ''}`);
      }
    }
  }
}
