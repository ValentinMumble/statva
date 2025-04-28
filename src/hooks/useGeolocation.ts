import {useState} from 'react';

const useGeolocation = (options?: PositionOptions) => {
  const [position, setPosition] = useState<GeolocationPosition>();

  const fetchPosition = () => {
    console.log('Fetching geolocation...');
    navigator.geolocation.getCurrentPosition(
      position => {
        console.log('Geolocation fetched:', position);
        setPosition(position)},
      error => console.error(error),
      options
    );
  };

  return [[position?.coords.latitude, position?.coords.longitude], fetchPosition] as const;
};

export {useGeolocation};
