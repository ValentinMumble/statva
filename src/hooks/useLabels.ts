import {useContext} from 'react';
import {LabelContext} from '../providers';

const useLabels = () => useContext(LabelContext);

export {useLabels};
