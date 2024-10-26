import {useEffect, useState} from 'react';
import {Button, Input, Table, useDisclosure} from '@chakra-ui/react';
import {Labels, useLabels} from '../hooks';
import {DialogBackdrop, DialogContent, DialogRoot} from './ui';

const EditLabels = () => {
  const {open, onOpen, onClose} = useDisclosure();
  const [, initialLabels] = useLabels();
  const [labels, setLabels] = useState<Labels>(initialLabels);

  const handleSave = () => async () => {
    await fetch(`${import.meta.env.VITE_SERVER_URL}/labels`, {
      method: 'POST',
      body: JSON.stringify(labels),
    });

    // toast({
    //   status: 'success',
    //   description: 'Event removed',
    // }); //todo
  };

  useEffect(() => {
    setLabels(initialLabels);
  }, [initialLabels]);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={onOpen}>
        🏷️
      </Button>
      <DialogRoot open={open} onOpenChange={onClose} size="xl">
        <DialogBackdrop />
        <DialogContent>
          <Table.Root size="sm">
            <Table.Body>
              {Object.entries(labels).map(([key, value]) => (
                <Table.Row key={key}>
                  <Table.Cell>
                    <Input size="sm" value={key} />
                  </Table.Cell>
                  <Table.Cell>
                    <Input size="sm" value={value} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
          <Button onClick={handleSave}>Save</Button>
        </DialogContent>
      </DialogRoot>
    </>
  );
};

export {EditLabels};
