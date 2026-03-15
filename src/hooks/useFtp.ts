import {useQuery} from '@tanstack/react-query';
import {FTPTest, GetFtp} from '../models';
import {getFetcher} from './useFetcher';

const fetchFtpTests = getFetcher<FTPTest[]>('ftp_tests.get');

const useFtpTests = () => {
  return useQuery({
    queryKey: ['ftpTests'],
    queryFn: fetchFtpTests,
  });
};

const useFtp = () => {
  const {data: tests = [], refetch} = useFtpTests();

  const getFtp: GetFtp = (date: Date) => {
    const relevantTests = tests.filter(test => test.date < date);
    return relevantTests[0]?.ftp ?? tests.at(-1)?.ftp ?? 0;
  };

  return {getFtp, tests, refetch};
};

export {useFtp, useFtpTests};
