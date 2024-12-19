import {Table} from '@chakra-ui/react';
import {EventCellsProps} from './EventCells';
import {CassetteEvent} from '../../models';

const CassetteEventCells = ({event}: EventCellsProps<CassetteEvent>) => {
  return (
    <>
      <Table.Cell>
        {event.brand} {event.model}
      </Table.Cell>
      <Table.Cell>{event.range}</Table.Cell>
    </>
  );
};

export {CassetteEventCells};
