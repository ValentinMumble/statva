import {useContext} from 'react';
import {ActivityMetaContext} from '../providers';

const useActivityMeta = () => useContext(ActivityMetaContext);

export {useActivityMeta};
