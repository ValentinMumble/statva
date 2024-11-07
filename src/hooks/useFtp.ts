import {useContext} from 'react';
import {FTPTest, GetFtp} from '../models';
import {AthleteContext} from '../providers';

const useFtp = (): [GetFtp, FTPTest[]] => {
  const [, tests] = useContext(AthleteContext);

  return [
    (date: Date) => {
      const relevantTests = tests.filter(test => test.date < date).sort((a, b) => b.date.getTime() - a.date.getTime());

      return relevantTests[0]?.ftp ?? tests.at(-1)?.ftp ?? 0;
    },
    tests,
  ];
};

export {useFtp};
