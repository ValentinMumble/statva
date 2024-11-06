import {useState, ReactNode, createContext, useEffect} from 'react';
import {extractEmoji, GetLabel, Labels} from '../models';
import {getLabels} from '../redis';

const LabelContext = createContext<[GetLabel, Labels, () => Promise<void>]>([() => '', {}, () => Promise.resolve()]);

type LabelProviderProps = {
  children?: ReactNode;
};

const LabelProvider = ({children}: LabelProviderProps) => {
  const [labels, setLabels] = useState<Labels>({});

  const fetchLabels = async () => {
    setLabels(await getLabels());
  };

  useEffect(() => {
    fetchLabels();
  }, []);

  return (
    <LabelContext.Provider
      value={[
        (key, emojiOnly = false) =>
          null === key ? '🤷' : emojiOnly ? extractEmoji(labels[key] ?? key) : labels[key] ?? key,
        labels,
        fetchLabels,
      ]}
    >
      {children}
    </LabelContext.Provider>
  );
};

export {LabelProvider, LabelContext};
