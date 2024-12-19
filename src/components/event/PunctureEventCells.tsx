import {Table} from '@chakra-ui/react';
import {EventCellsProps} from './EventCells';
import {PunctureEvent} from '../../models';
import {useLabels} from '../../hooks';

const PunctureEventCells = ({event}: EventCellsProps<PunctureEvent>) => {
  const [label] = useLabels();

  return (
    <>
      <Table.Cell>{label(event.bike, true)}</Table.Cell>
      <Table.Cell />
    </>
  );
};

export {PunctureEventCells};
