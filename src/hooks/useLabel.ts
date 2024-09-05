import {useEffect, useState} from 'react';

type Labels = {
  [key: string]: string;
};

const useLabel = () => {
  const [labels, setLabels] = useState<Labels>({});

  useEffect(() => {
    const fetchLabels = async () => {
      const labels = await (await fetch('/labels.json')).json();

      setLabels(labels);
    };

    fetchLabels();
  }, []);

  return (key: string) => labels[key] ?? key;
};

export {useLabel};
