type CheckIn = {
  id: string;
  lat: number;
  lng: number;
  date: Date;
  routeId: string;
};

const getCheckInText = (checkIn: CheckIn, isLast: boolean) => {
  const isToday = new Date().toDateString() === checkIn.date.toDateString();
  const date = checkIn.date.toLocaleDateString();
  const time = checkIn.date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${isLast ? 'Last check-in: ' : ''}${isToday ? 'Today' : date}, ${time}`;
};

export {getCheckInText};
export type {CheckIn};
