import {useFtpTests} from './useFtpTests';

const useFtp = (): ((date: Date) => number) => {
  const tests = useFtpTests();

  return (date: Date) => {
    const relevantTests = tests.filter(test => test.date < date).sort((a, b) => b.date.getTime() - a.date.getTime());

    return relevantTests[0]?.ftp ?? tests[0].ftp;
  };
};

export {useFtp};
