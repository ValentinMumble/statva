import {useContext} from 'react';
import {EnvContext} from '../providers';

const useEnv = () => useContext(EnvContext);

export {useEnv};
