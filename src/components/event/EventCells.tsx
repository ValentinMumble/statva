import {Table} from '@chakra-ui/react';
import {Event} from '../../models';
import {CassetteEventCells, ChainEventCells, FallEventCells, SaddleEventCells, TireEventCells} from '../event';

type EventCellsProps<EventType> = {
  event: EventType;
};

const EventCells = ({event}: EventCellsProps<Event>) => {
  switch (event.type) {
    case 'chain':
      return <ChainEventCells event={event} />;
    case 'cassette':
      return <CassetteEventCells event={event} />;
    case 'tire':
      return <TireEventCells event={event} />;
    case 'saddle':
      return <SaddleEventCells event={event} />;
    case 'fall':
      return <FallEventCells event={event} />;
    default:
      return (
        <>
          <Table.Cell />
          <Table.Cell />
        </>
      );
  }
};

export {EventCells};
export type {EventCellsProps};
