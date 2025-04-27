import {useRoutes} from '../hooks';

const AddCheckIn = () => {
  const routes = useRoutes();

  return (
    <div>
      <h1>Add Check In</h1>
      <p>This is the Add Check In page.</p>
      {routes?.length}
    </div>
  );
};

export {AddCheckIn};
