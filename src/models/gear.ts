type Gear = {
  id: string;
  type: 'bike' | 'shoes';
};

const GEAR: {[key: string]: Gear} = {
  b14644402: {id: 'b14644402', type: 'bike'},
  b12655849: {id: 'b12655849', type: 'bike'},
  b3121762: {id: 'b3121762', type: 'bike'},
  b13905696: {id: 'b13905696', type: 'bike'},
  b2417181: {id: 'b2417181', type: 'bike'},
  b11897955: {id: 'b11897955', type: 'bike'},
  b13424500: {id: 'b13424500', type: 'bike'},
  b2391730: {id: 'b2391730', type: 'bike'},
  b14723430: {id: 'b14723430', type: 'bike'},
  b13440652: {id: 'b13440652', type: 'bike'},
  g17370373: {id: 'g17370373', type: 'shoes'},
  g18329356: {id: 'g18329356', type: 'shoes'},
  g17385334: {id: 'g17385334', type: 'shoes'},
};

const SUPER6 = 'b13440652';

export {GEAR, SUPER6};
export type {Gear};
