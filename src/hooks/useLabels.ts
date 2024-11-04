import {useEffect, useState} from 'react';
import {extractEmoji, GetLabel, Labels} from '../models';

const useLabels = (): [GetLabel, Labels] => {
  const [labels, setLabels] = useState<Labels>({});

  useEffect(() => {
    const fetchLabels = async () => {
      const labels = await (await fetch('/labels.json')).json();

      setLabels(labels);
    };

    fetchLabels();
  }, []);

  return [
    (key, emojiOnly = false) =>
      null === key ? '🤷' : emojiOnly ? extractEmoji(labels[key] ?? key) : labels[key] ?? key,
    labels,
  ];
};

export {useLabels};
