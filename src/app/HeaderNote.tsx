import {createContext, ReactNode, useContext} from 'react';
import {createPortal} from 'react-dom';

// The spot beside the title in the phone header, once it is on screen.
const HeaderNoteSlot = createContext<HTMLElement | null>(null);

/** A short note for the phone header, beside the page's title, like "998" on Activities. */
const HeaderNote = ({children}: {children: ReactNode}) => {
  const slot = useContext(HeaderNoteSlot);

  return null === slot ? null : createPortal(children, slot);
};

export {HeaderNote, HeaderNoteSlot};
