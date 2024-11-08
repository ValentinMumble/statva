import {useState, ReactNode, createContext, useEffect} from 'react';
import {extractEmoji, GetLabel, Labels} from '../models';
import {useFetcher} from '../hooks';

const LabelContext = createContext<[GetLabel, Labels, () => Promise<void>]>([() => '', {}, () => Promise.resolve()]);

type LabelProviderProps = {
  children?: ReactNode;
};

const LabelProvider = ({children}: LabelProviderProps) => {
  const [labels, setLabels] = useState<Labels>({});
  const getLabels = useFetcher<Labels>('labels.get');

  const fetchLabels = async () => {
    setLabels(await getLabels());
  };

  useEffect(() => {
    fetchLabels();
  }, [getLabels]);

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
