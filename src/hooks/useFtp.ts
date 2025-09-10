import {useContext} from 'react';
import {FTPTest, GetFtp} from '../models';
import {AthleteContext} from '../providers';

const useFtp = (): [GetFtp, FTPTest[], () => Promise<void>] => {
  const [, tests, refresh] = useContext(AthleteContext);

  return [
    (date: Date) => {
      const relevantTests = tests.filter(test => test.date < date);

      return relevantTests[0]?.ftp ?? tests.at(-1)?.ftp ?? 0;
    },
    tests,
    refresh,
  ];
};

export {useFtp};
