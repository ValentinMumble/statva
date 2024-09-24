import {useEffect, useState} from 'react';

type Labels = {
  [key: string]: string;
};

const useLabels = (): [(key: string) => string, Labels] => {
  const [labels, setLabels] = useState<Labels>({});

  useEffect(() => {
    const fetchLabels = async () => {
      const labels = await (await fetch('/labels.json')).json();

      setLabels(labels);
    };

    fetchLabels();
  }, []);

  return [(key: string) => labels[key] ?? key, labels];
};

export {useLabels};
export type {Labels};
