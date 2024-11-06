import {useState, ReactNode, createContext, useEffect} from 'react';
import {extractEmoji, GetLabel, Labels} from '../models';

const LabelContext = createContext<[GetLabel, Labels]>([() => '', {}]);

type LabelProviderProps = {
  children?: ReactNode;
};

const LabelProvider = ({children}: LabelProviderProps) => {
  const [labels, setLabels] = useState<Labels>({});

  useEffect(() => {
    const fetchLabels = async () => {
      const labels = await (await fetch('/labels.json')).json();

      setLabels(labels);
    };

    fetchLabels();
  }, []);

  return (
    <LabelContext.Provider
      value={[
        (key, emojiOnly = false) =>
          null === key ? '🤷' : emojiOnly ? extractEmoji(labels[key] ?? key) : labels[key] ?? key,
        labels,
      ]}
    >
      {children}
    </LabelContext.Provider>
  );
};

export {LabelProvider, LabelContext};
