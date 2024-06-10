import {useEffect, useState} from 'react';

type ChainInstallEvent = {
  chain: string;
  date: Date;
};

const useChainEvents = () => {
  const [chainEvents, setChainEvents] = useState<ChainInstallEvent[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const events = await (await fetch('../src/static/chain_events.json')).json();

      setChainEvents(events.map((event: ChainInstallEvent) => ({...event, date: new Date(event.date)})));
    };

    fetchEvents();
  }, []);

  return chainEvents;
};

export {useChainEvents};
