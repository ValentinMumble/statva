import {IconType} from 'react-icons';
import {LuBike, LuChartLine, LuHouse, LuList, LuSettings, LuTrophy, LuUsers} from 'react-icons/lu';

type NavItem = {to: string; label: string; icon: IconType; onPhone: boolean; club?: boolean};

// The five most used pages sit in the phone's tab bar; the others are in its header.
const NAV: NavItem[] = [
  {to: '/', label: 'Home', icon: LuHouse, onPhone: true},
  {to: '/activities', label: 'Activities', icon: LuList, onPhone: true},
  {to: '/bike', label: 'Bike', icon: LuBike, onPhone: true},
  {to: '/stats', label: 'Stats', icon: LuChartLine, onPhone: true},
  {to: '/records', label: 'Records', icon: LuTrophy, onPhone: true},
  {to: '/club', label: 'Club', icon: LuUsers, onPhone: false, club: true},
  {to: '/settings', label: 'Settings', icon: LuSettings, onPhone: false},
];

/** The pages to list: the club's only for a rider with a club, under the club's name. */
const navFor = (clubName: string | null): NavItem[] =>
  NAV.filter(({club}) => !club || null !== clubName).map(item =>
    item.club && null !== clubName ? {...item, label: clubName} : item,
  );

const isActive = (to: string, pathname: string): boolean => ('/' === to ? '/' === pathname : pathname.startsWith(to));

export {isActive, NAV, navFor};
export type {NavItem};
