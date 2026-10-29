import {readdirSync} from 'node:fs';
import {join} from 'node:path';

// Vercel's Hobby plan refuses a deployment with more than 12 functions, after a build that passed.
const MAX_FUNCTIONS = 12;

/** Every function Vercel makes of api/: its .ts files, outside the folders starting with an underscore. */
const functionsIn = (folder: string): string[] =>
  readdirSync(folder, {withFileTypes: true}).flatMap(entry =>
    entry.name.startsWith('_')
      ? []
      : entry.isDirectory()
        ? functionsIn(join(folder, entry.name))
        : entry.name.endsWith('.ts')
          ? [join(folder, entry.name)]
          : [],
  );

describe('functions', () => {
  it(`stay within the ${MAX_FUNCTIONS} a Hobby deployment takes`, () => {
    expect(functionsIn(join(__dirname, '..')).length).toBeLessThanOrEqual(MAX_FUNCTIONS);
  });
});
