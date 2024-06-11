import {useEffect, useState} from 'react';

type FTPTest = {
  date: Date;
  weight: number;
  ftp: number;
};

const useFtpTests = () => {
  const [ftpTests, setFtpTests] = useState<FTPTest[]>([]);

  useEffect(() => {
    const fetchFtpTests = async () => {
      const tests = await (await fetch('/ftp_tests.json')).json();

      setFtpTests(tests.map((test: FTPTest) => ({...test, date: new Date(test.date)})));
    };

    fetchFtpTests();
  }, []);

  return ftpTests;
};

export {useFtpTests};
