import {GetFtp} from '../models';
import {useFtpTests} from './useFtpTests';

const useFtp = (): GetFtp => {
  const tests = useFtpTests();

  return (date: Date) => {
    const relevantTests = tests.filter(test => test.date < date).sort((a, b) => b.date.getTime() - a.date.getTime());

    return relevantTests[0]?.ftp ?? tests.at(-1)?.ftp ?? 0;
  };
};

export {useFtp};
