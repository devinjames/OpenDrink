/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CSV_HEADER, entriesToCsv, exportFileName } from './export.ts';

test('empty history exports just the header', () => {
  assert.equal(entriesToCsv({}, 2), `${CSV_HEADER}\n`);
});

test('rows are oldest first with weekday and status', () => {
  const csv = entriesToCsv({ '2026-09-29': 3, '2026-09-27': 0, '2026-09-28': 1 }, 2);
  assert.equal(
    csv,
    [
      CSV_HEADER,
      '2026-09-27,Sun,0,sober',
      '2026-09-28,Mon,1,moderate',
      '2026-09-29,Tue,3,heavy',
      '',
    ].join('\n')
  );
});

test('status follows the given threshold', () => {
  assert.match(entriesToCsv({ '2026-09-29': 3 }, 4), /,3,moderate\n$/);
});

test('file name uses the local date', () => {
  assert.equal(exportFileName(new Date(2026, 0, 5)), 'opendrink-2026-01-05.csv');
});
