import {IconType} from 'react-icons';
import {LuBike, LuChartLine, LuHouse, LuList, LuMap, LuSettings, LuTrophy} from 'react-icons/lu';

type NavItem = {to: string; label: string; icon: IconType; onPhone: boolean};

// The five most used pages sit in the phone's tab bar; the others are in its header.
const NAV: NavItem[] = [
  {to: '/', label: 'Home', icon: LuHouse, onPhone: true},
  {to: '/activities', label: 'Activities', icon: LuList, onPhone: true},
  {to: '/bike', label: 'Bike', icon: LuBike, onPhone: true},
  {to: '/stats', label: 'Stats', icon: LuChartLine, onPhone: true},
  {to: '/records', label: 'Records', icon: LuTrophy, onPhone: true},
  {to: '/routes', label: 'Routes', icon: LuMap, onPhone: false},
  {to: '/settings', label: 'Settings', icon: LuSettings, onPhone: false},
];

const isActive = (to: string, pathname: string): boolean => ('/' === to ? '/' === pathname : pathname.startsWith(to));

export {isActive, NAV};
export type {NavItem};
