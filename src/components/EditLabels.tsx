import {useEffect, useState} from 'react';
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Table,
  Tbody,
  Td,
  Tr,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import {Labels, useLabels} from '../hooks';

const EditLabels = () => {
  const {isOpen, onOpen, onClose} = useDisclosure();
  const toast = useToast();
  const [, initialLabels] = useLabels();
  const [labels, setLabels] = useState<Labels>(initialLabels);

  const handleSave = () => async () => {
    await fetch(`${import.meta.env.VITE_SERVER_URL}/labels`, {
      method: 'POST',
      body: JSON.stringify(labels),
    });

    toast({
      status: 'success',
      description: 'Event removed',
    });
  };

  useEffect(() => {
    setLabels(initialLabels);
  }, [initialLabels]);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={onOpen}>
        🏷️
      </Button>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalBody>
            <Table size="sm">
              <Tbody>
                {Object.entries(labels).map(([key, value]) => (
                  <Tr key={key}>
                    <Td>
                      <Input size="sm" value={key} />
                    </Td>
                    <Td>
                      <Input size="sm" value={value} />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            <Button onClick={handleSave}>Save</Button>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export {EditLabels};
